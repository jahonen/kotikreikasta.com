import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { 
  ContentType, 
  buildTrackedURL, 
  retryWithBackoff 
} from '../utils/social-media-utils';
import { 
  ContentInput, 
  generateSocialContent 
} from '../utils/vertex-ai-content';
import { trackSocialShare } from '../utils/firestore-tracking';
import { ensureSquareCrop } from '../utils/image-auto-crop';

const secretClient = new SecretManagerServiceClient();

interface InstagramCredentials {
  userId: string;
  accessToken: string;
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
    maxPostsPerWindow: number;
    [key: string]: any;
  };
  [key: string]: any;
}

interface PublishMessage {
  contentType: 'listing' | 'blog';
  contentId: string;
  contentCollection: 'listings' | 'blog_posts';
  title: string;
  description: string;
  url: string;
  featuredImage?: any;
  metadata?: {
    location?: string;
    price?: number;
    area?: number;
    bedrooms?: number;
    [key: string]: any;
  };
}

async function fetchSchedule(): Promise<PlatformSchedule | null> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/INSTAGRAM_SCHEDULE/versions/latest`,
    });
    
    const payload = version.payload?.data?.toString() || '{}';
    return JSON.parse(payload);
  } catch (error: any) {
    functions.logger.warn('Failed to fetch INSTAGRAM_SCHEDULE', { error: error?.message });
    return null;
  }
}

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

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
 * Check if we've already posted in this window (enforce maxPostsPerWindow)
 */
async function checkWindowLimit(
  schedule: PlatformSchedule,
  contentCollection: string
): Promise<boolean> {
  const maxPosts = schedule.postingBehavior?.maxPostsPerWindow || 1;
  
  if (maxPosts === 0) return true; // No limit
  
  const admin = require('firebase-admin');
  const db = admin.firestore();
  
  // Get current window start time
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[now.getUTCDay()];
  const todaySchedule = schedule.schedule.find(s => s.day === currentDay);
  
  if (!todaySchedule) return false;
  
  // Determine which window we're in
  let windowStart: Date;
  if (isTimeInWindow(now, todaySchedule.primary)) {
    const [startStr] = todaySchedule.primary.window.split('–').map(s => s.trim());
    const [hours, minutes] = startStr.split(':').map(Number);
    windowStart = new Date(now);
    windowStart.setUTCHours(hours - 3, minutes, 0, 0); // EEST offset
  } else if (todaySchedule.secondary && isTimeInWindow(now, todaySchedule.secondary)) {
    const [startStr] = todaySchedule.secondary.window.split('–').map(s => s.trim());
    const [hours, minutes] = startStr.split(':').map(Number);
    windowStart = new Date(now);
    windowStart.setUTCHours(hours - 3, minutes, 0, 0); // EEST offset
  } else {
    return false;
  }
  
  // Count posts in this window
  const postsInWindow = await db.collectionGroup('socialShares')
    .where('platform', '==', 'instagram')
    .where('sharedAt', '>=', admin.firestore.Timestamp.fromDate(windowStart))
    .where('success', '==', true)
    .get();
  
  const count = postsInWindow.size;
  
  functions.logger.info('Instagram window limit check', {
    maxPosts,
    currentCount: count,
    windowStart: windowStart.toISOString(),
    withinLimit: count < maxPosts,
  });
  
  return count < maxPosts;
}

async function fetchInstagramCredentials(): Promise<InstagramCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [userIdVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/INSTAGRAM_ACCOUNT_ID/versions/latest`,
    });
    const [accessTokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/INSTAGRAM_ACCESS_TOKEN/versions/latest`,
    });
    
    const userId = userIdVersion.payload?.data?.toString() || '';
    const accessToken = accessTokenVersion.payload?.data?.toString() || '';
    
    if (!userId || !accessToken) {
      throw new Error('Missing Instagram credentials');
    }
    
    return { userId, accessToken };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Instagram credentials', { error: error?.message });
    throw new Error('credentials_fetch_failed');
  }
}

/**
 * Post to Instagram via Graph API
 * Two-step process: create container, then publish
 */
async function postToInstagram(
  caption: string,
  imageUrl: string,
  credentials: InstagramCredentials
): Promise<{ postId: string; postUrl?: string }> {
  functions.logger.info('Creating Instagram media container', {
    captionLength: caption.length,
    imageUrl: imageUrl.substring(0, 100),
  });
  
  // Step 1: Create media container
  const createResponse = await fetch(
    `https://graph.instagram.com/v18.0/${credentials.userId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
        access_token: credentials.accessToken,
      }),
    }
  );
  
  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    functions.logger.error('Instagram create container failed', {
      status: createResponse.status,
      error: errorText,
    });
    throw new Error(`instagram_create_error_${createResponse.status}`);
  }
  
  const createData = await createResponse.json();
  const containerId = createData.id;
  
  if (!containerId) {
    throw new Error('No container ID returned');
  }
  
  functions.logger.info('Instagram container created', { containerId });
  
  // Wait for Instagram to process the image (typically takes 10-30 seconds)
  functions.logger.info('Waiting for Instagram to process image...', { waitSeconds: 20 });
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  // Step 2: Publish the container
  const publishResponse = await fetch(
    `https://graph.instagram.com/v18.0/${credentials.userId}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: credentials.accessToken,
      }),
    }
  );
  
  if (!publishResponse.ok) {
    const errorText = await publishResponse.text();
    functions.logger.error('Instagram publish failed', {
      status: publishResponse.status,
      error: errorText,
    });
    throw new Error(`instagram_publish_error_${publishResponse.status}`);
  }
  
  const publishData = await publishResponse.json();
  const postId = publishData.id || '';
  
  // Instagram post URL format (may need media shortcode)
  const postUrl = postId ? `https://www.instagram.com/p/${postId}/` : undefined;
  
  functions.logger.info('Posted to Instagram', { postId, captionLength: caption.length });
  
  return { postId, postUrl };
}

/**
 * Pub/Sub-triggered function to publish content to Instagram
 */
export const instagramPublisher = functions
  .runWith({
    timeoutSeconds: 180, // Longer timeout for image processing
    memory: '512MB',
  })
  .region('europe-west1')
  .pubsub.topic('social-media-publishing')
  .onPublish(async (message) => {
    const startTime = Date.now();
    
    try {
      // Parse message data
      const messageData = message.json as PublishMessage;
      
      const {
        contentType,
        contentId,
        contentCollection,
        title,
        description,
        url,
        featuredImage,
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
      
      // Fetch schedule for window limit check
      // Note: Time window check is handled by the scheduler, not here
      const schedule = await fetchSchedule();
      
      // Check window limit (enforce maxPostsPerWindow)
      if (schedule) {
        const withinLimit = await checkWindowLimit(schedule, contentCollection);
        if (!withinLimit) {
          functions.logger.info('Instagram: Window post limit reached, skipping', {
            maxPostsPerWindow: schedule.postingBehavior?.maxPostsPerWindow,
          });
          return;
        }
      }
      
      functions.logger.info('Instagram publish started', {
        contentType,
        contentId,
        title,
      });
      
      // Build tracked URL (but won't be included in caption)
      const trackedUrl = buildTrackedURL(url, 'instagram', contentType as ContentType, contentId);
      
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
        () => generateSocialContent(contentInput, 'instagram', trackedUrl),
        undefined,
        'Vertex AI content generation'
      );
      
      // Instagram-specific: Don't include URL in caption, use "Linkki biossa" CTA
      const finalCaption = generatedContent.text;
      
      // Ensure 1:1 image exists (auto-generate if needed)
      const imageUrl = await retryWithBackoff(
        () => ensureSquareCrop(featuredImage, contentCollection, contentId),
        undefined,
        'Ensure 1:1 image crop'
      );
      
      functions.logger.info('Instagram image ready', {
        imageUrl: imageUrl.substring(0, 100),
      });
      
      // Fetch credentials
      const credentials = await retryWithBackoff(
        () => fetchInstagramCredentials(),
        undefined,
        'Fetch Instagram credentials'
      );
      
      // Post to Instagram
      const { postId, postUrl } = await retryWithBackoff(
        () => postToInstagram(finalCaption, imageUrl, credentials),
        undefined,
        'Post to Instagram'
      );
      
      // Track in Firestore
      await trackSocialShare(
        contentCollection as 'listings' | 'blog_posts',
        contentId,
        'instagram',
        {
          postId,
          postUrl,
          text: finalCaption,
          characterCount: finalCaption.length,
          success: true,
        }
      );
      
      // Mark as published in Firestore
      const admin = require('firebase-admin');
      const db = admin.firestore();
      await db.collection(contentCollection).doc(contentId).update({
        [`socialMediaStatus.instagram.published`]: true,
        [`socialMediaStatus.instagram.publishedAt`]: admin.firestore.FieldValue.serverTimestamp(),
        [`socialMediaStatus.instagram.postId`]: postId,
        [`socialMediaStatus.instagram.postUrl`]: postUrl,
      });
      
      const duration = Date.now() - startTime;
      
      functions.logger.info('Instagram publish successful', {
        contentId,
        postId,
        postUrl,
        duration,
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Instagram publish failed', {
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
          'instagram',
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
