import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';

interface PlatformSchedule {
  platform: string;
  schedule: Array<{
    day: string;
    primary: { window: string; tz: string };
    secondary?: { window: string; tz: string };
  }>;
  postingBehavior: {
    minMinutesBetweenPosts: number;
    maxPostsPerWindow?: number;
    [key: string]: any;
  };
  evergreenRules: {
    minDaysBetweenShares: number;
    [key: string]: any;
  };
}

/**
 * Get the timestamp of the last successful post for a platform
 */
export async function getLastPostTime(platform: string): Promise<Date | null> {
  const db = admin.firestore();
  
  try {
    const lastPost = await db.collectionGroup('socialShares')
      .where('platform', '==', platform)
      .where('success', '==', true)
      .orderBy('sharedAt', 'desc')
      .limit(1)
      .get();
    
    if (lastPost.empty) {
      return null;
    }
    
    return lastPost.docs[0].data().sharedAt.toDate();
  } catch (error: any) {
    functions.logger.error('Failed to get last post time', {
      platform,
      error: error?.message,
    });
    return null;
  }
}

/**
 * Get count of successful posts in the current posting window
 */
export async function getPostsInWindow(
  platform: string,
  windowStart: Date
): Promise<number> {
  const db = admin.firestore();
  
  try {
    const postsInWindow = await db.collectionGroup('socialShares')
      .where('platform', '==', platform)
      .where('success', '==', true)
      .where('sharedAt', '>=', admin.firestore.Timestamp.fromDate(windowStart))
      .get();
    
    return postsInWindow.size;
  } catch (error: any) {
    functions.logger.error('Failed to get posts in window', {
      platform,
      windowStart: windowStart.toISOString(),
      error: error?.message,
    });
    return 0;
  }
}

/**
 * Check if content was already posted to platform in current window
 */
export async function isAlreadyPosted(
  contentId: string,
  contentCollection: string,
  platform: string,
  windowStart: Date
): Promise<boolean> {
  const db = admin.firestore();
  
  try {
    const shares = await db.collection(contentCollection)
      .doc(contentId)
      .collection('socialShares')
      .where('platform', '==', platform)
      .where('sharedAt', '>=', admin.firestore.Timestamp.fromDate(windowStart))
      .where('success', '==', true)
      .limit(1)
      .get();
    
    return !shares.empty;
  } catch (error: any) {
    functions.logger.error('Failed to check if already posted', {
      contentId,
      platform,
      error: error?.message,
    });
    return false;
  }
}

/**
 * Check if platform can post now based on time constraints
 */
export async function canPostNow(
  platform: string,
  schedule: PlatformSchedule,
  windowStart: Date
): Promise<boolean> {
  // Check minMinutesBetweenPosts
  const lastPostTime = await getLastPostTime(platform);
  if (lastPostTime) {
    const minutesSinceLastPost = (Date.now() - lastPostTime.getTime()) / 60000;
    const minMinutes = schedule.postingBehavior.minMinutesBetweenPosts || 0;
    
    if (minutesSinceLastPost < minMinutes) {
      functions.logger.info('Too soon since last post', {
        platform,
        minutesSinceLastPost: Math.floor(minutesSinceLastPost),
        minMinutes,
      });
      return false;
    }
  }
  
  // Check maxPostsPerWindow
  const maxPosts = schedule.postingBehavior.maxPostsPerWindow || 999;
  const postsInWindow = await getPostsInWindow(platform, windowStart);
  
  if (postsInWindow >= maxPosts) {
    functions.logger.info('Window post limit reached', {
      platform,
      postsInWindow,
      maxPosts,
      windowStart: windowStart.toISOString(),
    });
    return false;
  }
  
  return true;
}

/**
 * Get list of content IDs that were recently posted to platform
 */
export async function getRecentlyPostedContentIds(
  platform: string,
  minDaysBetweenShares: number
): Promise<string[]> {
  const db = admin.firestore();
  const cutoffDate = new Date(Date.now() - minDaysBetweenShares * 24 * 60 * 60 * 1000);
  
  try {
    const recentPosts = await db.collectionGroup('socialShares')
      .where('platform', '==', platform)
      .where('success', '==', true)
      .where('sharedAt', '>=', admin.firestore.Timestamp.fromDate(cutoffDate))
      .get();
    
    // Extract content IDs from document paths
    // Path format: {collection}/{contentId}/socialShares/{shareId}
    const contentIds = recentPosts.docs.map(doc => {
      const pathParts = doc.ref.path.split('/');
      return pathParts[pathParts.length - 3]; // contentId is 3 levels up
    });
    
    // Remove duplicates
    return [...new Set(contentIds)];
  } catch (error: any) {
    functions.logger.error('Failed to get recently posted content IDs', {
      platform,
      error: error?.message,
    });
    return [];
  }
}
