import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Lazy initialization to avoid order issues
function getDb() {
  return admin.firestore();
}

const secretClient = new SecretManagerServiceClient();

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
}

/**
 * Fetch schedule from Secret Manager
 */
async function fetchSchedule(secretName: string): Promise<PlatformSchedule | null> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/${secretName}/versions/latest`,
    });
    
    const payload = version.payload?.data?.toString() || '{}';
    return JSON.parse(payload);
  } catch (error: any) {
    functions.logger.warn(`Failed to fetch ${secretName}`, { error: error?.message });
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
  // Parse window format "07:00–08:30"
  const [startStr, endStr] = window.window.split('–').map(s => s.trim());
  
  // Convert current time to target timezone
  // EET = UTC+2 (Eastern European Time)
  // EEST = UTC+3 (Eastern European Summer Time)
  // Handle both "EEST", "EET", and "EET/EEST" formats
  let tzOffset = 0;
  if (window.tz.includes('EEST')) {
    tzOffset = 3; // Summer time (late March to late October)
  } else if (window.tz.includes('EET')) {
    tzOffset = 2; // Winter time
  }
  
  const nowUTC = now.getUTCHours() * 60 + now.getUTCMinutes();
  const nowInTz = (nowUTC + (tzOffset * 60)) % (24 * 60);
  
  const windowStart = parseTimeToMinutes(startStr);
  const windowEnd = parseTimeToMinutes(endStr);
  
  const isInWindow = nowInTz >= windowStart && nowInTz <= windowEnd;
  
  functions.logger.info('Time window check', {
    window: window.window,
    tz: window.tz,
    tzOffset,
    nowUTC: `${Math.floor(nowUTC / 60)}:${String(nowUTC % 60).padStart(2, '0')}`,
    nowInTz: `${Math.floor(nowInTz / 60)}:${String(nowInTz % 60).padStart(2, '0')}`,
    windowStart: `${Math.floor(windowStart / 60)}:${String(windowStart % 60).padStart(2, '0')}`,
    windowEnd: `${Math.floor(windowEnd / 60)}:${String(windowEnd % 60).padStart(2, '0')}`,
    isInWindow,
  });
  
  return isInWindow;
}

/**
 * Check if current time is within posting window for a platform
 */
function isWithinPostingWindow(schedule: PlatformSchedule): boolean {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[now.getUTCDay()];
  
  const todaySchedule = schedule.schedule.find(s => s.day === currentDay);
  if (!todaySchedule) {
    return false;
  }
  
  // Check primary window
  if (isTimeInWindow(now, todaySchedule.primary)) {
    return true;
  }
  
  // Check secondary window if exists
  if (todaySchedule.secondary && isTimeInWindow(now, todaySchedule.secondary)) {
    return true;
  }
  
  return false;
}

/**
 * Fetch unpublished content for a platform from Firestore
 */
async function fetchUnpublishedContent(platform: string, limit: number = 1): Promise<any[]> {
  const collections = ['blog_posts', 'listings'];
  const unpublished: any[] = [];
  
  // Fetch from both collections, ordered by queuedAt (oldest first)
  for (const collection of collections) {
    const snapshot = await getDb().collection(collection)
      .where(`socialMediaStatus.${platform}.queued`, '==', true)
      .where(`socialMediaStatus.${platform}.published`, '==', false)
      .orderBy(`socialMediaStatus.${platform}.queuedAt`, 'asc')
      .limit(limit)
      .get();
    
    snapshot.forEach((doc: any) => {
      unpublished.push({
        id: doc.id,
        collection,
        data: doc.data(),
        queuedAt: doc.data().socialMediaStatus?.[platform]?.queuedAt,
      });
    });
  }
  
  // Sort by queuedAt across both collections and return only the requested limit
  unpublished.sort((a, b) => {
    const timeA = a.queuedAt?.toMillis() || 0;
    const timeB = b.queuedAt?.toMillis() || 0;
    return timeA - timeB;
  });
  
  return unpublished.slice(0, limit);
}

/**
 * Publish content to platform via Pub/Sub topic
 */
async function publishContent(platform: string, content: any): Promise<void> {
  const { PubSub } = require('@google-cloud/pubsub');
  const pubsub = new PubSub();
  
  // Build message data
  const messageData = {
    contentType: content.collection === 'listings' ? 'listing' : 'blog',
    contentId: content.id,
    contentCollection: content.collection,
    title: content.data.socialMediaMetadata?.title || content.data.title || '',
    description: content.data.socialMediaMetadata?.description || '',
    url: content.data.socialMediaUrl || '',
    metadata: content.data.socialMediaMetadata || {},
  };
  
  // Publish to Pub/Sub topic (all platforms use the same topic)
  const topicName = 'social-media-publishing';
  
  functions.logger.info(`Publishing to ${topicName}`, {
    platform,
    contentId: content.id,
    messageData,
  });
  
  try {
    const dataBuffer = Buffer.from(JSON.stringify(messageData));
    const messageId = await pubsub.topic(topicName).publish(dataBuffer);
    
    functions.logger.info(`Successfully published message to ${topicName}`, {
      platform,
      contentId: content.id,
      messageId,
    });
  } catch (error: any) {
    functions.logger.error(`Failed to publish to ${topicName}`, {
      platform,
      contentId: content.id,
      error: error?.message,
      stack: error?.stack,
    });
    throw error;
  }
}

/**
 * Scheduled function that checks all platform schedules and triggers publishers
 * Runs every 83 minutes
 */
export const socialMediaScheduler = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '256MB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const startTime = Date.now();
    const platforms = ['bluesky', 'x', 'facebook', 'threads', 'instagram'];
    const secretNames = {
      bluesky: 'BSKY_SCHEDULE',
      x: 'X_SCHEDULE',
      facebook: 'FACEBOOK_SCHEDULE',
      threads: 'THREADS_SCHEDULE',
      instagram: 'INSTAGRAM_SCHEDULE',
    };
    
    try {
      functions.logger.info('Social media scheduler triggered', {
        time: new Date().toISOString(),
      });
      
      const results: Record<string, string> = {};
      
      functions.logger.info('Processing platforms', { platforms });
      
      // Check each platform's schedule
      for (const platform of platforms) {
        functions.logger.info(`Processing platform: ${platform}`);
        const secretName = secretNames[platform as keyof typeof secretNames];
        const schedule = await fetchSchedule(secretName);
        
        if (!schedule) {
          functions.logger.warn(`No schedule found for ${platform}`, { secretName });
          results[platform] = 'no_schedule';
          continue;
        }
        
        // Check if within posting window
        if (isWithinPostingWindow(schedule)) {
          functions.logger.info(`${platform}: Within posting window, fetching next unpublished content`);
          
          // Fetch only 1 content item (oldest queued)
          const unpublished = await fetchUnpublishedContent(platform, 1);
          
          if (unpublished.length === 0) {
            functions.logger.info(`${platform}: No unpublished content found`);
            results[platform] = 'no_content';
            continue;
          }
          
          const content = unpublished[0];
          functions.logger.info(`${platform}: Publishing 1 content item`, {
            contentId: content.id,
            collection: content.collection,
          });
          
          // Publish the single content item
          try {
            await publishContent(platform, content);
            results[platform] = `published_${content.id}`;
            functions.logger.info(`${platform}: Successfully published ${content.id}`);
          } catch (error: any) {
            functions.logger.error(`${platform}: Failed to publish ${content.id}`, {
              error: error?.message,
            });
            results[platform] = `failed_${content.id}`;
          }
        } else {
          functions.logger.info(`${platform}: Outside posting window, skipping`);
          results[platform] = 'skipped';
        }
      }
      
      const duration = Date.now() - startTime;
      
      functions.logger.info('Social media scheduler completed', {
        results,
        duration,
      });
      
      res.status(200).json({
        ok: true,
        results,
        duration,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Social media scheduler failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
      
      res.status(500).json({
        error: 'scheduler_failed',
        detail: error?.message,
        duration,
      });
    }
  });
