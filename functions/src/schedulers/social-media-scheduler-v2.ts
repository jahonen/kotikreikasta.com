import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { createPublishTask } from '../utils/cloud-tasks';
import { canPostNow, getRecentlyPostedContentIds } from '../utils/deduplication';

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
    maxPostsPerWindow?: number;
    randomizeWithinWindow?: boolean;
    [key: string]: any;
  };
  evergreenRules: {
    minDaysBetweenShares: number;
    maxSharesPerContent: number;
    prioritizeNew: boolean;
    minContentAge: number;
    enabled: boolean;
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
  const [startStr, endStr] = window.window.split('–').map(s => s.trim());
  
  let tzOffset = 0;
  if (window.tz.includes('EEST')) {
    tzOffset = 3;
  } else if (window.tz.includes('EET')) {
    tzOffset = 2;
  }
  
  const nowUTC = now.getUTCHours() * 60 + now.getUTCMinutes();
  const nowInTz = (nowUTC + (tzOffset * 60)) % (24 * 60);
  
  const windowStart = parseTimeToMinutes(startStr);
  const windowEnd = parseTimeToMinutes(endStr);
  
  return nowInTz >= windowStart && nowInTz <= windowEnd;
}

/**
 * Check if current time is within posting window for a platform
 */
function isWithinPostingWindow(schedule: PlatformSchedule): boolean {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[now.getUTCDay()];
  
  const todaySchedule = schedule.schedule.find(s => s.day === currentDay);
  if (!todaySchedule) return false;
  
  return isTimeInWindow(now, todaySchedule.primary) || 
         (todaySchedule.secondary ? isTimeInWindow(now, todaySchedule.secondary) : false);
}

/**
 * Get the start time of the current posting window
 */
function getCurrentWindowStart(schedule: PlatformSchedule): Date | null {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[now.getUTCDay()];
  
  const todaySchedule = schedule.schedule.find(s => s.day === currentDay);
  if (!todaySchedule) return null;
  
  let activeWindow: TimeWindow | null = null;
  if (isTimeInWindow(now, todaySchedule.primary)) {
    activeWindow = todaySchedule.primary;
  } else if (todaySchedule.secondary && isTimeInWindow(now, todaySchedule.secondary)) {
    activeWindow = todaySchedule.secondary;
  }
  
  if (!activeWindow) return null;
  
  const [startStr] = activeWindow.window.split('–').map(s => s.trim());
  const [hours, minutes] = startStr.split(':').map(Number);
  
  let tzOffset = 0;
  if (activeWindow.tz.includes('EEST')) {
    tzOffset = 3;
  } else if (activeWindow.tz.includes('EET')) {
    tzOffset = 2;
  }
  
  const windowStart = new Date(now);
  windowStart.setUTCHours(hours - tzOffset, minutes, 0, 0);
  
  return windowStart;
}

/**
 * Generate random schedule time within posting window
 */
function randomizeScheduleTime(schedule: PlatformSchedule, windowStart: Date): Date {
  if (!schedule.postingBehavior.randomizeWithinWindow) {
    return new Date(Date.now() + 60000); // 1 minute from now
  }
  
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[now.getUTCDay()];
  
  const todaySchedule = schedule.schedule.find(s => s.day === currentDay);
  if (!todaySchedule) return new Date(Date.now() + 60000);
  
  let activeWindow: TimeWindow | null = null;
  if (isTimeInWindow(now, todaySchedule.primary)) {
    activeWindow = todaySchedule.primary;
  } else if (todaySchedule.secondary && isTimeInWindow(now, todaySchedule.secondary)) {
    activeWindow = todaySchedule.secondary;
  }
  
  if (!activeWindow) return new Date(Date.now() + 60000);
  
  const [, endStr] = activeWindow.window.split('–').map(s => s.trim());
  const [endHours, endMinutes] = endStr.split(':').map(Number);
  
  let tzOffset = 0;
  if (activeWindow.tz.includes('EEST')) {
    tzOffset = 3;
  } else if (activeWindow.tz.includes('EET')) {
    tzOffset = 2;
  }
  
  const windowEnd = new Date(now);
  windowEnd.setUTCHours(endHours - tzOffset, endMinutes, 0, 0);
  
  // Random time between now and window end
  const nowTime = Date.now();
  const endTime = windowEnd.getTime();
  const randomTime = nowTime + Math.random() * (endTime - nowTime);
  
  return new Date(randomTime);
}

/**
 * Fetch unpublished content for a platform, excluding recently posted
 */
async function fetchUnpublishedContent(
  platform: string,
  schedule: PlatformSchedule
): Promise<any | null> {
  const db = admin.firestore();
  
  // Get IDs of recently posted content
  const excludeIds = await getRecentlyPostedContentIds(
    platform,
    schedule.evergreenRules.minDaysBetweenShares
  );
  
  functions.logger.info('Fetching unpublished content', {
    platform,
    excludeCount: excludeIds.length,
  });
  
  // Query blog posts
  let blogQuery = db.collection('blog_posts')
    .where(`socialMediaMetadata.platforms.${platform}`, '==', true)
    .where('status', '==', 'published');
  
  // Firestore 'not-in' supports max 10 values
  if (excludeIds.length > 0 && excludeIds.length <= 10) {
    blogQuery = blogQuery.where(admin.firestore.FieldPath.documentId(), 'not-in', excludeIds);
  }
  
  const blogPosts = await blogQuery
    .orderBy('publishedAt', 'desc')
    .limit(10)
    .get();
  
  // Query listings
  let listingQuery = db.collection('listings')
    .where(`socialMediaMetadata.platforms.${platform}`, '==', true)
    .where('status', '==', 'published');
  
  if (excludeIds.length > 0 && excludeIds.length <= 10) {
    listingQuery = listingQuery.where(admin.firestore.FieldPath.documentId(), 'not-in', excludeIds);
  }
  
  const listings = await listingQuery
    .orderBy('publishedAt', 'desc')
    .limit(10)
    .get();
  
  // Combine and filter out recently posted (if more than 10 excludes)
  const allContent = [
    ...blogPosts.docs.map(doc => ({ id: doc.id, collection: 'blog_posts', data: doc.data() })),
    ...listings.docs.map(doc => ({ id: doc.id, collection: 'listings', data: doc.data() })),
  ].filter(content => !excludeIds.includes(content.id));
  
  if (allContent.length === 0) {
    functions.logger.info('No unpublished content found', { platform });
    return null;
  }
  
  // Prioritize new content if enabled
  if (schedule.evergreenRules.prioritizeNew) {
    allContent.sort((a, b) => {
      const aTime = a.data.publishedAt?.toMillis() || 0;
      const bTime = b.data.publishedAt?.toMillis() || 0;
      return bTime - aTime; // Newest first
    });
  }
  
  return allContent[0];
}

/**
 * Scheduled function that checks all platform schedules and creates Cloud Tasks
 * Runs every hour
 */
export const socialMediaSchedulerV2 = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '256MB',
  })
  .region('europe-west1')
  .pubsub.schedule('0 * * * *') // Every hour
  .timeZone('Europe/Helsinki')
  .onRun(async (context) => {
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
      functions.logger.info('Social media scheduler V2 triggered', {
        time: new Date().toISOString(),
      });
      
      const results: Record<string, string> = {};
      
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
        if (!isWithinPostingWindow(schedule)) {
          functions.logger.info(`${platform}: Outside posting window, skipping`);
          results[platform] = 'outside_window';
          continue;
        }
        
        // Get current window start for deduplication
        const windowStart = getCurrentWindowStart(schedule);
        if (!windowStart) {
          functions.logger.warn(`${platform}: Could not determine window start`);
          results[platform] = 'no_window_start';
          continue;
        }
        
        // Check if we can post now (time + window limits)
        const canPost = await canPostNow(platform, schedule, windowStart);
        if (!canPost) {
          functions.logger.info(`${platform}: Cannot post now (time/window constraints)`);
          results[platform] = 'constraints_not_met';
          continue;
        }
        
        // Fetch next unpublished content
        const content = await fetchUnpublishedContent(platform, schedule);
        if (!content) {
          functions.logger.info(`${platform}: No unpublished content found`);
          results[platform] = 'no_content';
          continue;
        }
        
        // Generate schedule time (randomized within window if enabled)
        const scheduleTime = randomizeScheduleTime(schedule, windowStart);
        
        // Create Cloud Task
        try {
          await createPublishTask({
            payload: {
              contentId: content.id,
              platform,
              contentType: content.collection === 'listings' ? 'listing' : 'blog',
              contentCollection: content.collection,
            },
            scheduleTime,
            windowStart,
          });
          
          results[platform] = `task_created_${content.id}`;
          functions.logger.info(`${platform}: Task created for ${content.id}`, {
            scheduleTime: scheduleTime.toISOString(),
          });
        } catch (error: any) {
          functions.logger.error(`${platform}: Failed to create task`, {
            contentId: content.id,
            error: error?.message,
          });
          results[platform] = `task_failed_${content.id}`;
        }
      }
      
      const duration = Date.now() - startTime;
      
      functions.logger.info('Social media scheduler V2 completed', {
        results,
        duration,
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Social media scheduler V2 failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
    }
  });
