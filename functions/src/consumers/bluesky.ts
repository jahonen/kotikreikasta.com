import * as functions from 'firebase-functions/v1';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import {
  PlatformSchedule,
  PublicationQueueItem,
  ContentItem,
  FormattedPost,
  SocialSharingTracking,
} from '../types/social';

const secretClient = new SecretManagerServiceClient();

/**
 * Fetch schedule configuration from Google Secret Manager
 */
async function fetchSchedule(): Promise<PlatformSchedule> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const secretName = `projects/${project}/secrets/BSKY_SCHEDULE/versions/latest`;
  
  try {
    const [version] = await secretClient.accessSecretVersion({ name: secretName });
    const payload = version.payload?.data?.toString() || '{}';
    return JSON.parse(payload);
  } catch (error: any) {
    functions.logger.error('Failed to fetch BSKY_SCHEDULE', { error: error?.message });
    throw new Error('schedule_fetch_failed');
  }
}

/**
 * Fetch Bluesky credentials from Secret Manager
 */
async function fetchBlueskyCredentials(): Promise<{ identifier: string; password: string }> {
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
 * Parse time string "HH:MM" to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if current time is within a time window
 */
function isTimeInWindow(now: Date, window: { window: string; tz: string }): boolean {
  // Parse window format "07:00–08:30"
  const [startStr, endStr] = window.window.split('–').map(s => s.trim());
  
  // Convert current time to target timezone (EEST = UTC+3)
  // For simplicity, we'll work in UTC and adjust
  const tzOffset = window.tz === 'EEST' ? 3 : 0;
  const nowUTC = now.getUTCHours() * 60 + now.getUTCMinutes();
  const nowInTz = (nowUTC + (tzOffset * 60)) % (24 * 60);
  
  const windowStart = parseTimeToMinutes(startStr);
  const windowEnd = parseTimeToMinutes(endStr);
  
  return nowInTz >= windowStart && nowInTz <= windowEnd;
}

/**
 * Check if current time is within a posting window
 */
function isWithinPostingWindow(schedule: PlatformSchedule): boolean {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[now.getUTCDay()]; // Use UTC day for consistency
  
  const todaySchedule = schedule.schedule.find(s => s.day === currentDay);
  if (!todaySchedule) {
    functions.logger.info('No schedule for today', { day: currentDay });
    return false;
  }
  
  // Check primary window
  if (isTimeInWindow(now, todaySchedule.primary)) {
    functions.logger.info('Within primary posting window', { 
      day: currentDay, 
      window: todaySchedule.primary.window 
    });
    return true;
  }
  
  // Check secondary window if exists
  if (todaySchedule.secondary && isTimeInWindow(now, todaySchedule.secondary)) {
    functions.logger.info('Within secondary posting window', { 
      day: currentDay, 
      window: todaySchedule.secondary.window 
    });
    return true;
  }
  
  functions.logger.info('Not within any posting window', { 
    day: currentDay,
    currentTimeUTC: `${now.getUTCHours()}:${now.getUTCMinutes()}`
  });
  return false;
}

/**
 * Check rate limiting - ensure we don't post too frequently
 */
async function checkRateLimit(platform: string, minMinutes: number): Promise<boolean> {
  const db = getFirestore();
  const now = Timestamp.now();
  const minAgo = Timestamp.fromMillis(now.toMillis() - (minMinutes * 60 * 1000));
  
  // Check if we've posted recently
  const recentPosts = await db.collection('publication_queue')
    .where('platforms', 'array-contains', platform)
    .where('status', '==', 'published')
    .where('publishedAt', '>', minAgo)
    .limit(1)
    .get();
  
  if (!recentPosts.empty) {
    const lastPost = recentPosts.docs[0].data();
    const lastPostTime = lastPost.publishedAt as Timestamp;
    const minutesAgo = Math.floor((now.toMillis() - lastPostTime.toMillis()) / 60000);
    
    functions.logger.info('Rate limit check: too soon', { 
      platform,
      minutesSinceLastPost: minutesAgo,
      minRequired: minMinutes
    });
    return false;
  }
  
  return true;
}

/**
 * Query for next new content in publication queue
 */
async function getNextNewContent(platform: string): Promise<PublicationQueueItem | null> {
  const db = getFirestore();
  const now = Timestamp.now();
  
  const snapshot = await db.collection('publication_queue')
    .where('platforms', 'array-contains', platform)
    .where('status', '==', 'pending')
    .where('publishAfter', '<=', now)
    .orderBy('publishAfter', 'asc')
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    functions.logger.info('No new content in queue', { platform });
    return null;
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as PublicationQueueItem;
}

/**
 * Query for evergreen content to re-share
 */
async function getNextEvergreenContent(
  platform: string,
  schedule: PlatformSchedule
): Promise<ContentItem | null> {
  const db = getFirestore();
  const rules = schedule.evergreenRules;
  
  if (!rules.enabled) {
    functions.logger.info('Evergreen disabled', { platform });
    return null;
  }
  
  const now = Timestamp.now();
  const minAge = now.toMillis() - (rules.minContentAge * 24 * 60 * 60 * 1000);
  const minGap = now.toMillis() - (rules.minDaysBetweenShares * 24 * 60 * 60 * 1000);
  
  // Query blog posts
  const blogSnapshot = await db.collection('blog_posts')
    .where('status', '==', 'published')
    .where('publishedAt', '<', Timestamp.fromMillis(minAge))
    .orderBy('publishedAt', 'desc')
    .limit(50)
    .get();
  
  // Filter in-memory for socialSharing conditions (can't query nested maps easily)
  const eligibleBlogs = blogSnapshot.docs
    .map(doc => ({ id: doc.id, type: 'blog_post' as const, ...doc.data() } as ContentItem))
    .filter((blog: ContentItem) => {
      const platformData = blog.socialSharing?.platforms?.[platform];
      if (!platformData) return true; // Never shared on this platform
      
      const shareCount = platformData.shareCount || 0;
      const lastShared = platformData.lastShared;
      
      if (shareCount >= rules.maxSharesPerContent) return false;
      if (lastShared && lastShared.toMillis() > minGap) return false;
      
      return true;
    })
    .sort((a: ContentItem, b: ContentItem) => {
      const aLastShared = a.socialSharing?.platforms?.[platform]?.lastShared?.toMillis() || 0;
      const bLastShared = b.socialSharing?.platforms?.[platform]?.lastShared?.toMillis() || 0;
      return aLastShared - bLastShared; // Oldest share first
    });
  
  if (eligibleBlogs.length > 0) {
    functions.logger.info('Found evergreen blog post', { 
      id: eligibleBlogs[0].id,
      title: eligibleBlogs[0].title 
    });
    return eligibleBlogs[0];
  }
  
  functions.logger.info('No evergreen content available', { platform });
  return null;
}

/**
 * Format content for Bluesky post
 */
function formatBlueskyPost(content: ContentItem, schedule: PlatformSchedule): FormattedPost {
  const prefs = schedule.contentPreferences;
  const maxChars = prefs.maxCharacters;
  
  // Build URL
  const baseUrl = 'https://kotikreikasta.com';
  const slug = content.urlStub || content.slug;
  const url = content.type === 'blog_post' 
    ? `${baseUrl}/blog/${slug}?ref=bluesky`
    : `${baseUrl}/listings/${slug}?ref=bluesky`;
  
  // Build hashtags
  const hashtags = prefs.includeHashtags 
    ? ['#Kreikka', '#Kiinteistöt', content.type === 'blog_post' ? '#Blogi' : '#LomaAsunto']
    : [];
  
  // Build text
  const emoji = prefs.includeEmojis ? '🏝️ ' : '';
  const summary = content.summary || content.excerpt || '';
  const hashtagText = hashtags.join(' ');
  
  // Calculate available space
  const urlLength = url.length + 1; // +1 for space
  const hashtagLength = hashtagText.length > 0 ? hashtagText.length + 1 : 0;
  const availableForContent = maxChars - urlLength - hashtagLength - emoji.length;
  
  let text = emoji + content.title;
  if (summary && text.length < availableForContent - 10) {
    text += '\n\n' + summary;
  }
  
  // Truncate if needed
  if (text.length > availableForContent) {
    text = text.substring(0, availableForContent - 3) + '...';
  }
  
  // Combine
  const finalText = `${text}\n\n${url}${hashtagText ? '\n' + hashtagText : ''}`;
  
  // Extract optimal image URL for Bluesky (16:9 landscape preferred)
  let imageUrl: string | undefined;
  if (prefs.includeImages && content.featuredImage) {
    const { extractOptimalImage } = require('../utils/image-crop-utils');
    imageUrl = extractOptimalImage(content.featuredImage, 'bluesky');
  }
  
  return {
    text: finalText,
    url,
    hashtags: prefs.includeHashtags ? hashtags : undefined,
    images: imageUrl ? [imageUrl] : undefined,
  };
}

/**
 * Post to Bluesky API
 */
async function postToBluesky(
  post: FormattedPost,
  credentials: { identifier: string; password: string }
): Promise<string> {
  const endpoint = 'https://bsky.social/xrpc/com.atproto.repo.createRecord';
  
  const body = {
    repo: credentials.identifier,
    collection: 'app.bsky.feed.post',
    record: {
      text: post.text,
      createdAt: new Date().toISOString(),
    },
  };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${credentials.identifier}:${credentials.password}`).toString('base64')}`,
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Bluesky API error', { 
      status: response.status, 
      error: errorText 
    });
    throw new Error(`bluesky_api_error_${response.status}`);
  }
  
  const data = await response.json();
  const postId = data.uri || data.cid || '';
  
  functions.logger.info('Posted to Bluesky', { postId, textLength: post.text.length });
  return postId;
}

/**
 * Update social sharing tracking on content item
 */
async function updateSharingTracking(
  content: ContentItem,
  platform: string,
  postId: string,
  queueId?: string
): Promise<void> {
  const db = getFirestore();
  const collection = content.type === 'blog_post' ? 'blog_posts' : 'listings';
  const docRef = db.collection(collection).doc(content.id);
  
  const now = Timestamp.now();
  const shareRecord = {
    sharedAt: now,
    postId,
    queueId,
  };
  
  // Get current data
  const doc = await docRef.get();
  const data = doc.data() || {};
  const socialSharing: SocialSharingTracking = data.socialSharing || {
    totalShares: 0,
    platforms: {},
  };
  
  // Update platform data
  if (!socialSharing.platforms[platform]) {
    socialSharing.platforms[platform] = {
      shareCount: 0,
      lastShared: now,
      shares: [],
    };
  }
  
  socialSharing.platforms[platform].shareCount += 1;
  socialSharing.platforms[platform].lastShared = now;
  socialSharing.platforms[platform].shares.push(shareRecord);
  socialSharing.totalShares += 1;
  
  await docRef.set({ socialSharing }, { merge: true });
  
  functions.logger.info('Updated sharing tracking', {
    contentId: content.id,
    platform,
    shareCount: socialSharing.platforms[platform].shareCount,
    totalShares: socialSharing.totalShares,
  });
}

/**
 * Mark queue item as published
 */
async function markAsPublished(queueId: string): Promise<void> {
  const db = getFirestore();
  await db.collection('publication_queue').doc(queueId).set({
    status: 'published',
    publishedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  
  functions.logger.info('Marked queue item as published', { queueId });
}

/**
 * Mark queue item as failed
 */
async function markAsFailed(queueId: string, error: string): Promise<void> {
  const db = getFirestore();
  await db.collection('publication_queue').doc(queueId).set({
    status: 'failed',
    error,
    publishedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  
  functions.logger.error('Marked queue item as failed', { queueId, error });
}

/**
 * Main Bluesky consumer function
 */
export const publishToBluesky = functions
  .runWith({ 
    timeoutSeconds: 120,
    memory: '256MB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const platform = 'bluesky';
    
    try {
      functions.logger.info('Bluesky consumer triggered');
      
      // Fetch schedule and credentials
      const [schedule, credentials] = await Promise.all([
        fetchSchedule(),
        fetchBlueskyCredentials(),
      ]);
      
      // Check if we should post now
      if (!isWithinPostingWindow(schedule)) {
        functions.logger.info('Not within posting window, skipping');
        res.status(200).json({ ok: true, message: 'not_in_window' });
        return;
      }
      
      // Check rate limiting
      const minMinutes = schedule.postingBehavior.minMinutesBetweenPosts;
      const canPost = await checkRateLimit(platform, minMinutes);
      if (!canPost) {
        functions.logger.info('Rate limit exceeded, skipping');
        res.status(200).json({ ok: true, message: 'rate_limited' });
        return;
      }
      
      // Try to get new content first
      let queueItem = await getNextNewContent(platform);
      let content: ContentItem | null = null;
      let isEvergreen = false;
      
      if (queueItem) {
        // Fetch the actual content
        const db = getFirestore();
        const collection = queueItem.contentType === 'blog_post' ? 'blog_posts' : 'listings';
        const contentDoc = await db.collection(collection).doc(queueItem.contentId).get();
        
        if (!contentDoc.exists) {
          functions.logger.error('Content not found', { 
            contentId: queueItem.contentId,
            type: queueItem.contentType 
          });
          await markAsFailed(queueItem.id!, 'content_not_found');
          res.status(404).json({ error: 'content_not_found' });
          return;
        }
        
        content = { 
          id: contentDoc.id, 
          type: queueItem.contentType,
          ...contentDoc.data() 
        } as ContentItem;
        
        functions.logger.info('Found new content in queue', { 
          queueId: queueItem.id,
          contentId: content.id,
          title: content.title 
        });
      } else if (schedule.evergreenRules.prioritizeNew) {
        // Try evergreen content
        content = await getNextEvergreenContent(platform, schedule);
        isEvergreen = true;
        
        if (content) {
          functions.logger.info('Using evergreen content', { 
            contentId: content.id,
            title: content.title 
          });
        }
      }
      
      // Nothing to post
      if (!content) {
        functions.logger.info('No content available to post');
        res.status(200).json({ ok: true, message: 'no_content' });
        return;
      }
      
      // Format and post
      const post = formatBlueskyPost(content, schedule);
      const postId = await postToBluesky(post, credentials);
      
      // Update tracking
      await updateSharingTracking(content, platform, postId, queueItem?.id);
      
      // Mark queue item as published (if from queue)
      if (queueItem) {
        await markAsPublished(queueItem.id!);
      }
      
      functions.logger.info('Successfully published to Bluesky', {
        contentId: content.id,
        postId,
        isEvergreen,
      });
      
      res.status(200).json({ 
        ok: true, 
        contentId: content.id,
        postId,
        isEvergreen,
      });
      
    } catch (error: any) {
      functions.logger.error('Bluesky consumer failed', { 
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
      });
      
      res.status(500).json({ 
        error: 'publish_failed', 
        detail: error?.message 
      });
    }
  });
