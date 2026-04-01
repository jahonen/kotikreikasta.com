import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { 
  ContentType, 
  buildTrackedURL, 
  retryWithBackoff 
} from '../utils/social-media-utils';
import { 
  ContentInput, 
  generateSocialContent, 
  formatPostWithLink 
} from '../utils/vertex-ai-content';
import { trackSocialShare } from '../utils/firestore-tracking';
import { fetchAndOptimizeImage } from '../utils/image-optimizer';

const secretClient = new SecretManagerServiceClient();

interface BlueskyCredentials {
  identifier: string;
  password: string;
}

interface TimeWindow {
  window: string;
  tz: string;
}

interface DaySchedule {
  day: string;
  primary: TimeWindow;
  secondary?: TimeWindow;
}

interface PlatformSchedule {
  platform: string;
  schedule: DaySchedule[];
  postingBehavior: {
    minMinutesBetweenPosts: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Pub/Sub message data structure
 */
interface PublishMessage {
  contentType: 'listing' | 'blog';
  contentId: string;
  contentCollection: 'listings' | 'blog_posts';
  title: string;
  description: string;
  url: string;
  metadata?: {
    location?: string;
    price?: number;
    area?: number;
    bedrooms?: number;
    [key: string]: any;
  };
}

/**
 * Fetch schedule from Secret Manager
 */
async function fetchSchedule(): Promise<PlatformSchedule | null> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/BSKY_SCHEDULE/versions/latest`,
    });
    
    const payload = version.payload?.data?.toString() || '{}';
    return JSON.parse(payload);
  } catch (error: any) {
    functions.logger.warn('Failed to fetch BSKY_SCHEDULE', { error: error?.message });
    return null;
  }
}

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if current time is within a time window
 */
function isTimeInWindow(now: Date, window: TimeWindow): boolean {
  const [startStr, endStr] = window.window.split('–').map(s => s.trim());
  
  const tzOffset = window.tz === 'EEST' ? 3 : 0;
  const nowUTC = now.getUTCHours() * 60 + now.getUTCMinutes();
  const nowInTz = (nowUTC + (tzOffset * 60)) % (24 * 60);
  
  const windowStart = parseTimeToMinutes(startStr);
  const windowEnd = parseTimeToMinutes(endStr);
  
  return nowInTz >= windowStart && nowInTz <= windowEnd;
}

/**
 * Check if current time is within posting window
 */
function isWithinPostingWindow(schedule: PlatformSchedule): boolean {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[now.getUTCDay()];
  
  const todaySchedule = schedule.schedule.find(s => s.day === currentDay);
  if (!todaySchedule) {
    return false;
  }
  
  if (isTimeInWindow(now, todaySchedule.primary)) {
    return true;
  }
  
  if (todaySchedule.secondary && isTimeInWindow(now, todaySchedule.secondary)) {
    return true;
  }
  
  return false;
}

/**
 * Fetch Bluesky credentials from Secret Manager
 */
export async function fetchBlueskyCredentials(): Promise<BlueskyCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [identifierVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/BSKY_IDENTIFIER/versions/latest`,
    });
    const [passwordVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/BSKY_APP_PASSWORD/versions/latest`,
    });
    
    const identifier = identifierVersion.payload?.data?.toString() || '';
    const password = passwordVersion.payload?.data?.toString() || '';
    
    if (!identifier || !password) {
      throw new Error('Missing Bluesky credentials');
    }
    
    return { identifier, password };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Bluesky credentials', { error: error?.message });
    throw new Error('credentials_fetch_failed');
  }
}

/**
 * Create Bluesky session
 */
export async function createSession(credentials: BlueskyCredentials): Promise<string> {
  const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: credentials.identifier,
      password: credentials.password,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Bluesky session creation failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`bluesky_session_error_${response.status}`);
  }
  
  const data = await response.json();
  const accessJwt = data.accessJwt;
  
  if (!accessJwt) {
    throw new Error('No access token returned');
  }
  
  return accessJwt;
}

/**
 * Detect links in text and create facets for Bluesky
 */
function createLinkFacets(text: string): any[] {
  const facets: any[] = [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;
    const end = start + url.length;
    
    // Convert to byte positions (Bluesky uses UTF-8 byte positions)
    const byteStart = Buffer.from(text.substring(0, start)).length;
    const byteEnd = Buffer.from(text.substring(0, end)).length;
    
    facets.push({
      index: {
        byteStart,
        byteEnd,
      },
      features: [{
        $type: 'app.bsky.richtext.facet#link',
        uri: url,
      }],
    });
  }
  
  return facets;
}

/**
 * Decode HTML entities in a string
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  };
  
  return text.replace(/&[a-z]+;|&#\d+;/gi, (match) => {
    return entities[match.toLowerCase()] || match;
  });
}

/**
 * Fetch OG metadata for URL to create embed card
 */
async function fetchOGMetadata(url: string): Promise<any | null> {
  try {
    functions.logger.info('Fetching OG metadata', { url });
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Kotikreikasta-Bot/1.0)',
      },
      redirect: 'follow',
    });
    
    if (!response.ok) {
      functions.logger.warn('Failed to fetch URL for OG metadata', { url, status: response.status });
      return null;
    }
    
    const html = await response.text();
    functions.logger.info('Fetched HTML', { url, htmlLength: html.length });
    
    // Extract OG tags with multiple patterns
    const extractOGTag = (property: string): string | null => {
      // Try property="og:..." pattern
      let match = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, 'i'));
      if (match) return match[1];
      
      // Try content first, then property
      match = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`, 'i'));
      if (match) return match[1];
      
      return null;
    };
    
    const ogTitle = extractOGTag('title');
    const ogDescription = extractOGTag('description');
    const ogImage = extractOGTag('image');
    
    // Decode HTML entities in extracted values
    const decodedTitle = ogTitle ? decodeHTMLEntities(ogTitle) : '';
    const decodedDescription = ogDescription ? decodeHTMLEntities(ogDescription) : '';
    const decodedImage = ogImage ? decodeHTMLEntities(ogImage) : '';
    
    functions.logger.info('Extracted OG tags', {
      url,
      hasTitle: !!decodedTitle,
      hasDescription: !!decodedDescription,
      hasImage: !!decodedImage,
      title: decodedTitle?.substring(0, 50),
      image: decodedImage?.substring(0, 100),
    });
    
    if (!decodedTitle && !decodedDescription && !decodedImage) {
      functions.logger.warn('No OG tags found', { url });
      return null;
    }
    
    return {
      title: decodedTitle,
      description: decodedDescription,
      image: decodedImage,
    };
  } catch (error: any) {
    functions.logger.error('Error fetching OG metadata', { url, error: error?.message, stack: error?.stack?.substring(0, 200) });
    return null;
  }
}


/**
 * Upload image blob to Bluesky and get blob reference
 * Automatically optimizes and converts images (including HEIC to JPEG)
 */
async function uploadImageBlob(
  imageUrl: string,
  accessToken: string
): Promise<any | null> {
  try {
    // Fetch and optimize image using our image optimizer
    // This handles HEIC conversion, resizing, and optimization
    const optimized = await fetchAndOptimizeImage(imageUrl, 'socialMedia');
    
    functions.logger.info('Image optimized for Bluesky', {
      originalUrl: imageUrl,
      size: optimized.size,
      width: optimized.width,
      height: optimized.height,
      format: optimized.format,
      contentType: optimized.contentType,
    });
    
    // Upload to Bluesky
    const uploadResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
      method: 'POST',
      headers: {
        'Content-Type': optimized.contentType,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: optimized.buffer as any, // Buffer is compatible with fetch body
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      functions.logger.warn('Failed to upload image blob', { status: uploadResponse.status, error: errorText });
      return null;
    }
    
    const data = await uploadResponse.json();
    return data.blob;
  } catch (error: any) {
    functions.logger.warn('Error uploading image blob', { imageUrl, error: error?.message });
    return null;
  }
}

/**
 * Post to Bluesky with rich text facets and embed card
 */
export async function postToBluesky(
  text: string,
  url: string,
  accessToken: string,
  repo: string
): Promise<{ postId: string; postUrl?: string }> {
  // Fetch OG metadata for embed card first
  const ogMetadata = await fetchOGMetadata(url);
  
  let embed: any = undefined;
  let finalText = text;
  
  if (ogMetadata) {
    functions.logger.info('Creating Bluesky embed card', {
      hasTitle: !!ogMetadata.title,
      hasDescription: !!ogMetadata.description,
      hasImage: !!ogMetadata.image,
    });
    
    // Create external embed
    const external: any = {
      uri: url,
      title: ogMetadata.title || 'Kotikreikasta.com',
      description: ogMetadata.description || '',
    };
    
    // Upload image if available
    if (ogMetadata.image) {
      const imageBlob = await uploadImageBlob(ogMetadata.image, accessToken);
      if (imageBlob) {
        external.thumb = imageBlob;
        functions.logger.info('Image uploaded to Bluesky', { imageUrl: ogMetadata.image });
      } else {
        functions.logger.warn('Failed to upload image', { imageUrl: ogMetadata.image });
      }
    }
    
    embed = {
      $type: 'app.bsky.embed.external',
      external,
    };
    
    // Remove URL from text since we have an embed card
    // The embed card will show the link
    finalText = text.replace(/\n\nhttps?:\/\/[^\s]+$/i, '').trim();
    functions.logger.info('Removed URL from text for embed', { originalLength: text.length, newLength: finalText.length });
  }
  
  const facets = createLinkFacets(finalText);
  
  const record = {
    $type: 'app.bsky.feed.post',
    text: finalText,
    facets: facets.length > 0 ? facets : undefined,
    embed,
    createdAt: new Date().toISOString(),
  };
  
  functions.logger.info('Posting to Bluesky', {
    textLength: finalText.length,
    hasFacets: facets.length > 0,
    hasEmbed: !!embed,
  });
  
  const response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      repo,
      collection: 'app.bsky.feed.post',
      record,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Bluesky post failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`bluesky_post_error_${response.status}`);
  }
  
  const data = await response.json();
  const postId = data.uri || data.cid || '';
  
  // Construct post URL
  const postUrl = postId 
    ? `https://bsky.app/profile/kotikreikasta.bsky.social/post/${postId.split('/').pop()}`
    : '';
  
  functions.logger.info('Posted to Bluesky', { 
    postId, 
    textLength: text.length,
    hasEmbed: !!embed,
  });
  
  return { postId, postUrl };
}

/**
 * Pub/Sub-triggered function to publish content to Bluesky
 * Consumes messages from social-media-publishing topic with platform=bluesky
 */
export const blueskyPublisher = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
  })
  .region('europe-west1')
  .pubsub.topic('social-media-publishing')
  .onPublish(async (message) => {
    const startTime = Date.now();
    
    try {
      // Check schedule first - only process if within posting window
      const schedule = await fetchSchedule();
      if (schedule && !isWithinPostingWindow(schedule)) {
        functions.logger.info('Bluesky: Outside posting window, skipping', {
          currentTime: new Date().toISOString(),
        });
        // Don't process the message - it will remain in queue for next scheduler run
        return;
      }
      
      // Parse message data
      const messageData = message.json as PublishMessage;
      
      const {
        contentType,
        contentId,
        contentCollection,
        title,
        description,
        url,
        metadata,
      } = messageData;
      
      // Validate required fields
      if (!contentType || !contentId || !contentCollection || !title || !description || !url) {
        functions.logger.error('Missing required fields in message', { messageData });
        throw new Error('missing_required_fields');
      }
      
      if (contentType !== 'listing' && contentType !== 'blog') {
        functions.logger.error('Invalid content type', { contentType });
        throw new Error('invalid_content_type');
      }
      
      if (contentCollection !== 'listings' && contentCollection !== 'blog_posts') {
        functions.logger.error('Invalid content collection', { contentCollection });
        throw new Error('invalid_content_collection');
      }
      
      functions.logger.info('Bluesky publish started', {
        contentType,
        contentId,
        title,
      });
      
      // Build tracked URL with UTM parameters
      const trackedUrl = buildTrackedURL(url, 'bluesky', contentType as ContentType, contentId);
      
      // Prepare content input
      const contentInput: ContentInput = {
        type: contentType,
        title,
        description,
        url: trackedUrl,
        metadata,
      };
      
      // Generate content with Vertex AI
      const generatedContent = await retryWithBackoff(
        () => generateSocialContent(contentInput, 'bluesky', trackedUrl),
        undefined,
        'Vertex AI content generation'
      );
      
      // Format post with link
      const finalPost = formatPostWithLink(generatedContent.text, trackedUrl, 'bluesky');
      
      // Fetch credentials
      const credentials = await retryWithBackoff(
        () => fetchBlueskyCredentials(),
        undefined,
        'Fetch Bluesky credentials'
      );
      
      // Create session
      const accessToken = await retryWithBackoff(
        () => createSession(credentials),
        undefined,
        'Create Bluesky session'
      );
      
      // Post to Bluesky with embed card
      const { postId, postUrl } = await retryWithBackoff(
        () => postToBluesky(finalPost, trackedUrl, accessToken, credentials.identifier),
        undefined,
        'Post to Bluesky'
      );
      
      // Track in Firestore
      await trackSocialShare(
        contentCollection as 'listings' | 'blog_posts',
        contentId,
        'bluesky',
        {
          postId,
          postUrl,
          text: finalPost,
          characterCount: finalPost.length,
          success: true,
        }
      );
      
      // Mark as published in Firestore
      const admin = require('firebase-admin');
      const db = admin.firestore();
      await db.collection(contentCollection).doc(contentId).update({
        [`socialMediaStatus.bluesky.published`]: true,
        [`socialMediaStatus.bluesky.publishedAt`]: admin.firestore.FieldValue.serverTimestamp(),
        [`socialMediaStatus.bluesky.postId`]: postId,
        [`socialMediaStatus.bluesky.postUrl`]: postUrl,
      });
      
      const duration = Date.now() - startTime;
      
      functions.logger.info('Bluesky publish successful', {
        contentId,
        postId,
        postUrl,
        duration,
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Bluesky publish failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
      
      // Track failure in Firestore if we have the required info
      const messageData = message.json as PublishMessage;
      if (messageData?.contentCollection && messageData?.contentId) {
        await trackSocialShare(
          messageData.contentCollection as 'listings' | 'blog_posts',
          messageData.contentId,
          'bluesky',
          {
            postId: '',
            text: '',
            characterCount: 0,
            success: false,
            error: error?.message,
          }
        );
      }
      
      // Re-throw to mark Pub/Sub message as failed (will be retried)
      throw error;
    }
  });
