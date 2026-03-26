/**
 * Analytics Aggregator HTTP Endpoint
 * Fetches analytics from all platforms, caches in Firestore, returns aggregated data
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import { AggregatedMetrics, Platform, DailyMetrics, AnalyticsSnapshot } from './analytics-types';
import { shouldFetchPlatform, updateCache, storeSnapshot, getAllSnapshots } from './utils/firestore-cache';
import { generateProjection } from './utils/projection';
import { fetchInstagramAnalytics } from './instagram-analytics';
import { fetchFacebookAnalytics } from './facebook-analytics';
import { fetchThreadsAnalytics } from './threads-analytics';
import { fetchXAnalytics } from './x-analytics';
import { fetchBlueskyAnalytics } from './bluesky-analytics';

const PLATFORMS: Platform[] = ['instagram', 'facebook', 'threads', 'x', 'bluesky'];

/**
 * Fetch analytics for a specific platform
 */
async function fetchPlatformAnalytics(platform: Platform, days: number): Promise<DailyMetrics[]> {
  switch (platform) {
    case 'instagram':
      return await fetchInstagramAnalytics(days);
    case 'facebook':
      return await fetchFacebookAnalytics(days);
    case 'threads':
      return await fetchThreadsAnalytics(days);
    case 'x':
      return await fetchXAnalytics(days);
    case 'bluesky':
      return await fetchBlueskyAnalytics(days);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * Aggregate metrics across all platforms
 */
function aggregateMetrics(
  snapshots: AnalyticsSnapshot[],
  period: number
): AggregatedMetrics {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Group by platform
  const byPlatform = new Map<Platform, DailyMetrics[]>();
  for (const snapshot of snapshots) {
    if (!byPlatform.has(snapshot.platform)) {
      byPlatform.set(snapshot.platform, []);
    }
    byPlatform.get(snapshot.platform)!.push(snapshot.metrics);
  }
  
  // Calculate platform totals
  const platformTotals: AggregatedMetrics['platforms'] = {
    instagram: { impressions: 0, reach: 0, engagements: 0, engagement_rate: 0, followers: 0, follower_change: 0, shares: 0 },
    facebook: { impressions: 0, reach: 0, engagements: 0, engagement_rate: 0, followers: 0, follower_change: 0, shares: 0 },
    threads: { impressions: 0, reach: 0, engagements: 0, engagement_rate: 0, followers: 0, follower_change: 0, shares: 0 },
    x: { impressions: 0, reach: 0, engagements: 0, engagement_rate: 0, followers: 0, follower_change: 0, shares: 0 },
    bluesky: { impressions: 0, reach: 0, engagements: 0, engagement_rate: 0, followers: 0, follower_change: 0, shares: 0 },
  };
  
  for (const [platform, metrics] of byPlatform.entries()) {
    const totals = platformTotals[platform];
    
    for (const metric of metrics) {
      totals.impressions += metric.impressions || 0;
      totals.reach += metric.reach || 0;
      totals.engagements += metric.engagements || 0;
      totals.shares += metric.shares || 0;
      totals.follower_change += metric.follower_change || 0;
    }
    
    // Get latest follower count
    if (metrics.length > 0) {
      const latest = metrics[metrics.length - 1];
      totals.followers = latest.followers || 0;
    }
    
    // Calculate average engagement rate
    const totalImpressions = totals.impressions;
    const totalEngagements = totals.engagements;
    totals.engagement_rate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;
  }
  
  // Calculate overall totals
  const totals = {
    impressions: 0,
    reach: 0,
    engagements: 0,
    avg_engagement_rate: 0,
    net_followers: 0,
    total_shares: 0,
  };
  
  for (const platform of PLATFORMS) {
    const platformData = platformTotals[platform];
    totals.impressions += platformData.impressions;
    totals.reach += platformData.reach;
    totals.engagements += platformData.engagements;
    totals.net_followers += platformData.follower_change;
    totals.total_shares += platformData.shares;
  }
  
  // Calculate weighted average engagement rate
  totals.avg_engagement_rate = totals.impressions > 0 
    ? (totals.engagements / totals.impressions) * 100 
    : 0;
  
  // Build timeline (daily data for all platforms)
  const timelineMap = new Map<string, any>();
  
  for (const snapshot of snapshots) {
    if (!timelineMap.has(snapshot.date)) {
      timelineMap.set(snapshot.date, {
        date: snapshot.date,
        instagram: { impressions: 0, engagements: 0 },
        facebook: { impressions: 0, engagements: 0 },
        threads: { impressions: 0, engagements: 0 },
        x: { impressions: 0, engagements: 0 },
        bluesky: { impressions: 0, engagements: 0 },
      });
    }
    
    const day = timelineMap.get(snapshot.date)!;
    day[snapshot.platform] = {
      impressions: snapshot.metrics.impressions || 0,
      engagements: snapshot.metrics.engagements || 0,
    };
  }
  
  const timeline = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  
  // Generate 30-day projections
  const impressionsTimeline = timeline.map(t => ({
    date: t.date,
    value: PLATFORMS.reduce((sum, p) => sum + t[p].impressions, 0),
  }));
  
  const followersTimeline = snapshots
    .filter(s => s.metrics.followers > 0)
    .map(s => ({ date: s.date, value: s.metrics.followers }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const projections = {
    impressions: generateProjection(impressionsTimeline, 30),
    followers: generateProjection(followersTimeline, 30),
  };
  
  return {
    period,
    startDate,
    endDate: today,
    totals,
    platforms: platformTotals,
    timeline,
    projections,
  };
}

/**
 * Main HTTP endpoint for analytics aggregation
 */
// Initialize CORS middleware
const corsHandler = cors.default({ origin: true });

export const analyticsAggregator = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    // Handle CORS
    return corsHandler(req, res, async () => {
      const startTime = Date.now();
      
      if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
    
    // Optional: Verify Firebase Auth token if provided
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.split('Bearer ')[1];
        await admin.auth().verifyIdToken(idToken);
        functions.logger.info('Authenticated request');
      } catch (error: any) {
        functions.logger.warn('Auth verification failed', { error: error?.message });
        // Continue anyway - admin dashboard requires login
      }
    }
    
    try {
      const period = parseInt(req.query.period as string || '30', 10);
      const forceRefresh = req.query.refresh === 'true';
      
      if (period < 1 || period > 90) {
        res.status(400).json({ error: 'Period must be between 1 and 90 days' });
        return;
      }
      
      functions.logger.info('Analytics aggregation started', { period, forceRefresh });
      
      // Check if we need to fetch fresh data
      const platformsToFetch: Platform[] = [];
      
      for (const platform of PLATFORMS) {
        const needsFetch = forceRefresh || await shouldFetchPlatform(platform);
        if (needsFetch) {
          platformsToFetch.push(platform);
        }
      }
      
      // Fetch fresh data for platforms that need it
      if (platformsToFetch.length > 0) {
        functions.logger.info('Fetching fresh analytics', { platforms: platformsToFetch });
        
        const fetchPromises = platformsToFetch.map(async (platform) => {
          try {
            const metrics = await fetchPlatformAnalytics(platform, period);
            
            // Store snapshots in Firestore
            for (const metric of metrics) {
              await storeSnapshot({
                date: metric.date,
                platform: metric.platform,
                metrics: metric,
                source: 'api',
              });
            }
            
            await updateCache(platform, 'success');
            
            functions.logger.info('Platform analytics fetched', {
              platform,
              days: metrics.length,
            });
          } catch (error: any) {
            functions.logger.error('Platform analytics fetch failed', {
              platform,
              error: error?.message,
            });
            await updateCache(platform, 'error', error?.message);
          }
        });
        
        await Promise.all(fetchPromises);
      }
      
      // Retrieve all snapshots from Firestore
      const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      const snapshots = await getAllSnapshots(startDate, endDate);
      
      // Aggregate metrics
      const aggregated = aggregateMetrics(snapshots, period);
      
      const duration = Date.now() - startTime;
      
      functions.logger.info('Analytics aggregation complete', {
        period,
        platforms: PLATFORMS.length,
        snapshots: snapshots.length,
        duration,
      });
      
      res.status(200).json({
        success: true,
        data: aggregated,
        meta: {
          fetchedPlatforms: platformsToFetch,
          totalSnapshots: snapshots.length,
          duration,
        },
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Analytics aggregation failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
      
      res.status(500).json({
        success: false,
        error: error?.message || 'Internal server error',
      });
    }
    });
  });
