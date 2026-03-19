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

const secretClient = new SecretManagerServiceClient();

interface FacebookCredentials {
  pageId: string;
  systemToken: string;
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
      name: `projects/${project}/secrets/FACEBOOK_SCHEDULE/versions/latest`,
    });
    
    const payload = version.payload?.data?.toString() || '{}';
    return JSON.parse(payload);
  } catch (error: any) {
    functions.logger.warn('Failed to fetch FACEBOOK_SCHEDULE', { error: error?.message });
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

async function fetchFacebookCredentials(): Promise<FacebookCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [pageIdVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/FACEBOOK_PAGE_ID/versions/latest`,
    });
    const [systemTokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/META_SYSTEM_TOKEN/versions/latest`,
    });
    
    const pageId = pageIdVersion.payload?.data?.toString() || '';
    const systemToken = systemTokenVersion.payload?.data?.toString() || '';
    
    if (!pageId || !systemToken) {
      throw new Error('Missing Facebook credentials');
    }
    
    return { pageId, systemToken };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Facebook credentials', { error: error?.message });
    throw new Error('credentials_fetch_failed');
  }
}

async function getPageAccessToken(pageId: string, systemToken: string): Promise<string> {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${systemToken}`
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Failed to get Page Access Token', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`facebook_token_error_${response.status}`);
  }
  
  const data = await response.json();
  const pageAccessToken = data.access_token;
  
  if (!pageAccessToken) {
    throw new Error('No page access token returned');
  }
  
  return pageAccessToken;
}

async function postToFacebook(
  text: string,
  link: string,
  pageId: string,
  pageAccessToken: string
): Promise<{ postId: string; postUrl?: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/feed`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: text,
        link: link,
        access_token: pageAccessToken,
      }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Facebook post failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`facebook_post_error_${response.status}`);
  }
  
  const data = await response.json();
  const postId = data.id || '';
  const postUrl = postId ? `https://facebook.com/${postId}` : undefined;
  
  functions.logger.info('Posted to Facebook', { postId, textLength: text.length });
  
  return { postId, postUrl };
}

export const facebookPublisher = functions
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
        functions.logger.info('Facebook: Outside posting window, skipping', {
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
      
      functions.logger.info('Facebook publish started', {
        contentType,
        contentId,
        title,
      });
      
      const trackedUrl = buildTrackedURL(url, 'facebook', contentType as ContentType, contentId);
      
      const contentInput: ContentInput = {
        type: contentType,
        title,
        description,
        url: trackedUrl,
        metadata,
      };
      
      const generatedContent = await retryWithBackoff(
        () => generateSocialContent(contentInput, 'facebook', trackedUrl),
        undefined,
        'Vertex AI content generation'
      );
      
      const credentials = await retryWithBackoff(
        () => fetchFacebookCredentials(),
        undefined,
        'Fetch Facebook credentials'
      );
      
      const pageAccessToken = await retryWithBackoff(
        () => getPageAccessToken(credentials.pageId, credentials.systemToken),
        undefined,
        'Get Page Access Token'
      );
      
      const { postId, postUrl } = await retryWithBackoff(
        () => postToFacebook(generatedContent.text, trackedUrl, credentials.pageId, pageAccessToken),
        undefined,
        'Post to Facebook'
      );
      
      await trackSocialShare(
        contentCollection as 'listings' | 'blog_posts',
        contentId,
        'facebook',
        {
          postId,
          postUrl,
          text: generatedContent.text,
          characterCount: generatedContent.text.length,
          success: true,
        }
      );
      
      // Mark as published in Firestore
      const admin = require('firebase-admin');
      const db = admin.firestore();
      await db.collection(contentCollection).doc(contentId).update({
        [`socialMediaStatus.facebook.published`]: true,
        [`socialMediaStatus.facebook.publishedAt`]: admin.firestore.FieldValue.serverTimestamp(),
        [`socialMediaStatus.facebook.postId`]: postId,
        [`socialMediaStatus.facebook.postUrl`]: postUrl,
      });
      
      const duration = Date.now() - startTime;
      
      functions.logger.info('Facebook publish successful', {
        contentId,
        postId,
        postUrl,
        duration,
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Facebook publish failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
      
      const messageData = message.json as PublishMessage;
      if (messageData?.contentCollection && messageData?.contentId) {
        await trackSocialShare(
          messageData.contentCollection as 'listings' | 'blog_posts',
          messageData.contentId,
          'facebook',
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
