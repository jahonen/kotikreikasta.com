/**
 * Bluesky Analytics Tracker
 * No official analytics API - tracks from our socialShares subcollection
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { DailyMetrics } from './analytics-types';

/**
 * Fetch Bluesky analytics from our own post tracking
 * Since Bluesky doesn't have an official analytics API,
 * we aggregate data from our socialShares subcollection
 */
export async function fetchBlueskyAnalytics(days: number = 30): Promise<DailyMetrics[]> {
  const db = admin.firestore();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  try {
    // Query blog posts with Bluesky shares
    const blogPostsSnapshot = await db.collection('blog_posts')
      .where('socialMediaStatus.bluesky.published', '==', true)
      .get();
    
    // Query listings with Bluesky shares
    const listingsSnapshot = await db.collection('listings')
      .where('socialMediaStatus.bluesky.published', '==', true)
      .get();
    
    const allDocs = [...blogPostsSnapshot.docs, ...listingsSnapshot.docs];
    
    // Aggregate metrics by date
    const dailyMetrics = new Map<string, Partial<DailyMetrics>>();
    
    for (const doc of allDocs) {
      const data = doc.data();
      const blueskyStatus = data.socialMediaStatus?.bluesky;
      
      if (!blueskyStatus?.publishedAt) {
        continue;
      }
      
      const publishDate = blueskyStatus.publishedAt.toDate();
      
      if (publishDate < cutoffDate) {
        continue; // Skip posts older than our range
      }
      
      const dateStr = publishDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!dailyMetrics.has(dateStr)) {
        dailyMetrics.set(dateStr, {
          date: dateStr,
          platform: 'bluesky',
          impressions: 0,
          engagements: 0,
          likes: 0,
          shares: 0,
          replies: 0,
          followers: 0,
          follower_change: 0,
        });
      }
      
      const metrics = dailyMetrics.get(dateStr)!;
      
      // Try to get detailed metrics from socialShares subcollection
      try {
        const sharesSnapshot = await db
          .collection(doc.ref.parent.path)
          .doc(doc.id)
          .collection('socialShares')
          .where('platform', '==', 'bluesky')
          .get();
        
        // Estimate impressions (Bluesky doesn't provide this)
        // Use a conservative estimate based on followers
        const shareCount = sharesSnapshot.docs.length;
        metrics.impressions = (metrics.impressions || 0) + (shareCount * 100); // Placeholder
        
        // Increment post count
        metrics.shares = (metrics.shares || 0) + shareCount;
      } catch (error) {
        functions.logger.warn('Failed to fetch Bluesky share details', {
          docId: doc.id,
          error: error,
        });
      }
    }
    
    // Calculate engagement rates
    const sortedDates = Array.from(dailyMetrics.keys()).sort();
    const result: DailyMetrics[] = [];
    
    for (const date of sortedDates) {
      const metrics = dailyMetrics.get(date)!;
      
      // Estimate engagement (we don't have real data from Bluesky API)
      // Use shares (reposts) as a proxy
      metrics.engagements = (metrics.shares || 0) * 5; // Rough estimate
      
      // Calculate engagement rate
      const impressions = metrics.impressions || 0;
      const engagements = metrics.engagements || 0;
      metrics.engagement_rate = impressions > 0 ? (engagements / impressions) * 100 : 0;
      
      result.push(metrics as DailyMetrics);
    }
    
    functions.logger.info('Bluesky analytics aggregated from socialShares', {
      days: result.length,
      posts: allDocs.length,
    });
    
    return result;
    
  } catch (error: any) {
    functions.logger.error('Bluesky analytics aggregation failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    throw error;
  }
}
