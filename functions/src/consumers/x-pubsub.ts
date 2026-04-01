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

const secretClient = new SecretManagerServiceClient();

interface XCredentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
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

async function fetchSchedule(): Promise<PlatformSchedule | null> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_SCHEDULE/versions/latest`,
    });
    
    const payload = version.payload?.data?.toString() || '{}';
    return JSON.parse(payload);
  } catch (error: any) {
    functions.logger.warn('Failed to fetch X_SCHEDULE', { error: error?.message });
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

export async function fetchXCredentials(): Promise<XCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [consumerKeyVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_CONSUMER_KEY/versions/latest`,
    });
    const [consumerSecretVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_CONSUMER_SECRET/versions/latest`,
    });
    const [accessTokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_ACCESS_TOKEN/versions/latest`,
    });
    const [accessTokenSecretVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_ACCESS_TOKEN_SECRET/versions/latest`,
    });
    
    const consumerKey = consumerKeyVersion.payload?.data?.toString() || '';
    const consumerSecret = consumerSecretVersion.payload?.data?.toString() || '';
    const accessToken = accessTokenVersion.payload?.data?.toString() || '';
    const accessTokenSecret = accessTokenSecretVersion.payload?.data?.toString() || '';
    
    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
      throw new Error('Missing X credentials');
    }
    
    return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
  } catch (error: any) {
    functions.logger.error('Failed to fetch X credentials', { error: error?.message });
    throw new Error('credentials_fetch_failed');
  }
}

export async function postToX(
  text: string,
  credentials: XCredentials
): Promise<{ postId: string; postUrl?: string }> {
  const crypto = await import('crypto');
  
  const oauth = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_token: credentials.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(32).toString('base64').replace(/\W/g, ''),
    oauth_version: '1.0',
  };
  
  const url = 'https://api.twitter.com/2/tweets';
  const method = 'POST';
  const body = JSON.stringify({ text });
  
  const parameterString = Object.keys(oauth)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauth[key as keyof typeof oauth])}`)
    .join('&');
  
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(parameterString)}`;
  const signingKey = `${encodeURIComponent(credentials.consumerSecret)}&${encodeURIComponent(credentials.accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
  
  const authHeader = 'OAuth ' + Object.keys(oauth)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauth[key as keyof typeof oauth])}"`)
    .concat(`oauth_signature="${encodeURIComponent(signature)}"`)
    .join(', ');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('X post failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`x_post_error_${response.status}`);
  }
  
  const data = await response.json();
  const postId = data.data?.id || '';
  const postUrl = postId ? `https://twitter.com/user/status/${postId}` : undefined;
  
  functions.logger.info('Posted to X', { postId, textLength: text.length });
  
  return { postId, postUrl };
}

export const xPublisher = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
  })
  .region('europe-west1')
  .pubsub.topic('social-media-publishing')
  .onPublish(async (message) => {
    const startTime = Date.now();
    
    try {
      const schedule = await fetchSchedule();
      if (schedule && !isWithinPostingWindow(schedule)) {
        functions.logger.info('X: Outside posting window, skipping', {
          currentTime: new Date().toISOString(),
        });
        return;
      }
      
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
      
      functions.logger.info('X publish started', {
        contentType,
        contentId,
        title,
      });
      
      const trackedUrl = buildTrackedURL(url, 'x', contentType as ContentType, contentId);
      
      const contentInput: ContentInput = {
        type: contentType,
        title,
        description,
        url: trackedUrl,
        metadata,
      };
      
      const generatedContent = await retryWithBackoff(
        () => generateSocialContent(contentInput, 'x', trackedUrl),
        undefined,
        'Vertex AI content generation'
      );
      
      const finalPost = formatPostWithLink(generatedContent.text, trackedUrl, 'x');
      
      const credentials = await retryWithBackoff(
        () => fetchXCredentials(),
        undefined,
        'Fetch X credentials'
      );
      
      const { postId, postUrl } = await retryWithBackoff(
        () => postToX(finalPost, credentials),
        undefined,
        'Post to X'
      );
      
      await trackSocialShare(
        contentCollection as 'listings' | 'blog_posts',
        contentId,
        'x',
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
        [`socialMediaStatus.x.published`]: true,
        [`socialMediaStatus.x.publishedAt`]: admin.firestore.FieldValue.serverTimestamp(),
        [`socialMediaStatus.x.postId`]: postId,
        [`socialMediaStatus.x.postUrl`]: postUrl,
      });
      
      const duration = Date.now() - startTime;
      
      functions.logger.info('X publish successful', {
        contentId,
        postId,
        postUrl,
        duration,
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('X publish failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
      
      const messageData = message.json as PublishMessage;
      if (messageData?.contentCollection && messageData?.contentId) {
        await trackSocialShare(
          messageData.contentCollection as 'listings' | 'blog_posts',
          messageData.contentId,
          'x',
          {
            postId: '',
            text: '',
            characterCount: 0,
            success: false,
            error: error?.message,
          }
        );
      }
      
      throw error;
    }
  });
