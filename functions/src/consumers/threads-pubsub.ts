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

interface ThreadsCredentials {
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
      name: `projects/${project}/secrets/THREADS_SCHEDULE/versions/latest`,
    });
    
    const payload = version.payload?.data?.toString() || '{}';
    return JSON.parse(payload);
  } catch (error: any) {
    functions.logger.warn('Failed to fetch THREADS_SCHEDULE', { error: error?.message });
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

async function fetchThreadsCredentials(): Promise<ThreadsCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [userIdVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/THREADS_USER_ID/versions/latest`,
    });
    const [accessTokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/THREADS_ACCESS_TOKEN/versions/latest`,
    });
    
    const userId = userIdVersion.payload?.data?.toString() || '';
    const accessToken = accessTokenVersion.payload?.data?.toString() || '';
    
    if (!userId || !accessToken) {
      throw new Error('Missing Threads credentials');
    }
    
    return { userId, accessToken };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Threads credentials', { error: error?.message });
    throw new Error('credentials_fetch_failed');
  }
}

async function postToThreads(
  text: string,
  credentials: ThreadsCredentials
): Promise<{ postId: string; postUrl?: string }> {
  // Step 1: Create media container
  const createResponse = await fetch(
    `https://graph.threads.net/v1.0/${credentials.userId}/threads`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: text,
        access_token: credentials.accessToken,
      }),
    }
  );
  
  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    functions.logger.error('Threads create container failed', {
      status: createResponse.status,
      error: errorText,
    });
    throw new Error(`threads_create_error_${createResponse.status}`);
  }
  
  const createData = await createResponse.json();
  const containerId = createData.id;
  
  if (!containerId) {
    throw new Error('No container ID returned');
  }
  
  functions.logger.info('Threads container created', { containerId });
  
  // Step 2: Publish the container
  const publishResponse = await fetch(
    `https://graph.threads.net/v1.0/${credentials.userId}/threads_publish`,
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
    functions.logger.error('Threads publish failed', {
      status: publishResponse.status,
      error: errorText,
    });
    throw new Error(`threads_publish_error_${publishResponse.status}`);
  }
  
  const publishData = await publishResponse.json();
  const postId = publishData.id || '';
  const postUrl = postId ? `https://www.threads.net/@kotikreikasta/post/${postId}` : undefined;
  
  functions.logger.info('Posted to Threads', { postId, textLength: text.length });
  
  return { postId, postUrl };
}

export const threadsPublisher = functions
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
        functions.logger.info('Threads: Outside posting window, skipping', {
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
      
      functions.logger.info('Threads publish started', {
        contentType,
        contentId,
        title,
      });
      
      const trackedUrl = buildTrackedURL(url, 'threads', contentType as ContentType, contentId);
      
      const contentInput: ContentInput = {
        type: contentType,
        title,
        description,
        url: trackedUrl,
        metadata,
      };
      
      const generatedContent = await retryWithBackoff(
        () => generateSocialContent(contentInput, 'threads', trackedUrl),
        undefined,
        'Vertex AI content generation'
      );
      
      const finalPost = `${generatedContent.text}\n\n${trackedUrl}`;
      
      const credentials = await retryWithBackoff(
        () => fetchThreadsCredentials(),
        undefined,
        'Fetch Threads credentials'
      );
      
      const { postId, postUrl } = await retryWithBackoff(
        () => postToThreads(finalPost, credentials),
        undefined,
        'Post to Threads'
      );
      
      await trackSocialShare(
        contentCollection as 'listings' | 'blog_posts',
        contentId,
        'threads',
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
        [`socialMediaStatus.threads.published`]: true,
        [`socialMediaStatus.threads.publishedAt`]: admin.firestore.FieldValue.serverTimestamp(),
        [`socialMediaStatus.threads.postId`]: postId,
        [`socialMediaStatus.threads.postUrl`]: postUrl,
      });
      
      const duration = Date.now() - startTime;
      
      functions.logger.info('Threads publish successful', {
        contentId,
        postId,
        postUrl,
        duration,
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Threads publish failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
      
      const messageData = message.json as PublishMessage;
      if (messageData?.contentCollection && messageData?.contentId) {
        await trackSocialShare(
          messageData.contentCollection as 'listings' | 'blog_posts',
          messageData.contentId,
          'threads',
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
