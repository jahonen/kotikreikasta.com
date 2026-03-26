/**
 * Bluesky Analytics Tracker
 * Uses AT Protocol API to fetch real engagement data
 * Note: Impressions and reach are not available in AT Protocol
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { DailyMetrics } from './analytics-types';

const secretClient = new SecretManagerServiceClient();

interface BlueskyCredentials {
  handle: string;
  appPassword: string;
}

interface BlueskyPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
  };
  record: {
    text: string;
    createdAt: string;
  };
  replyCount: number;
  repostCount: number;
  likeCount: number;
  indexedAt: string;
}

interface BlueskyProfile {
  did: string;
  handle: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
}

async function fetchBlueskyCredentials(): Promise<BlueskyCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [handleVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/BSKY_IDENTIFIER/versions/latest`,
    });
    const [passwordVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/BSKY_APP_PASSWORD/versions/latest`,
    });
    
    const handle = handleVersion.payload?.data?.toString() || '';
    const appPassword = passwordVersion.payload?.data?.toString() || '';
    
    if (!handle || !appPassword) {
      throw new Error('Missing Bluesky credentials');
    }
    
    return { handle, appPassword };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Bluesky credentials', { error: error?.message });
    throw new Error('bluesky_credentials_fetch_failed');
  }
}

async function createBlueskySession(credentials: BlueskyCredentials): Promise<string> {
  const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: credentials.handle,
      password: credentials.appPassword,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Bluesky auth failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.accessJwt;
}

/**
 * Fetch Bluesky analytics using AT Protocol API
 * Available: likes, reposts, replies, followers
 * Not available: impressions, reach (incompatible with federated architecture)
 */
export async function fetchBlueskyAnalytics(days: number = 30): Promise<DailyMetrics[]> {
  const db = admin.firestore();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  try {
    const credentials = await fetchBlueskyCredentials();
    const accessToken = await createBlueskySession(credentials);
    
    // Get profile to fetch current follower count
    const profileResponse = await fetch(
      `https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${credentials.handle}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch Bluesky profile: ${profileResponse.status}`);
    }
    
    const profile: BlueskyProfile = await profileResponse.json();
    const currentFollowers = profile.followersCount;
    
    // Fetch author's posts
    const postsResponse = await fetch(
      `https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor=${credentials.handle}&limit=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!postsResponse.ok) {
      throw new Error(`Failed to fetch Bluesky posts: ${postsResponse.status}`);
    }
    
    const postsData = await postsResponse.json();
    const posts: BlueskyPost[] = postsData.feed.map((item: any) => item.post);
    
    // Aggregate metrics by date
    const dailyMetrics = new Map<string, Partial<DailyMetrics>>();
    
    for (const post of posts) {
      const postDate = new Date(post.record.createdAt);
      
      if (postDate < cutoffDate) {
        continue;
      }
      
      const dateStr = postDate.toISOString().split('T')[0];
      
      if (!dailyMetrics.has(dateStr)) {
        dailyMetrics.set(dateStr, {
          date: dateStr,
          platform: 'bluesky',
          impressions: 0, // Not available in AT Protocol
          engagements: 0,
          likes: 0,
          shares: 0,
          replies: 0,
          followers: currentFollowers,
          follower_change: 0,
        });
      }
      
      const metrics = dailyMetrics.get(dateStr)!;
      
      // Real engagement data from AT Protocol
      metrics.likes = (metrics.likes || 0) + post.likeCount;
      metrics.shares = (metrics.shares || 0) + post.repostCount;
      metrics.replies = (metrics.replies || 0) + post.replyCount;
      metrics.engagements = (metrics.engagements || 0) + post.likeCount + post.repostCount + post.replyCount;
    }
    
    // Get historical follower data from Firestore cache if available
    const followerCache = await db.collection('analytics_cache')
      .doc('bluesky_followers')
      .get();
    
    let previousFollowers = currentFollowers;
    if (followerCache.exists) {
      const cacheData = followerCache.data();
      previousFollowers = cacheData?.count || currentFollowers;
    }
    
    // Update follower cache
    await db.collection('analytics_cache')
      .doc('bluesky_followers')
      .set({
        count: currentFollowers,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    
    // Calculate follower change
    const followerChange = currentFollowers - previousFollowers;
    
    // Convert to array and calculate engagement rates
    const sortedDates = Array.from(dailyMetrics.keys()).sort();
    const result: DailyMetrics[] = [];
    
    for (const date of sortedDates) {
      const metrics = dailyMetrics.get(date)!;
      
      // Set follower data
      metrics.followers = currentFollowers;
      metrics.follower_change = followerChange;
      
      // Calculate engagement rate based on followers (since impressions unavailable)
      // This is a common third-party approach for Bluesky
      const engagements = metrics.engagements || 0;
      metrics.engagement_rate = currentFollowers > 0 ? (engagements / currentFollowers) * 100 : 0;
      
      result.push(metrics as DailyMetrics);
    }
    
    functions.logger.info('Bluesky analytics fetched from AT Protocol', {
      days: result.length,
      posts: posts.length,
      followers: currentFollowers,
      followerChange,
    });
    
    return result;
    
  } catch (error: any) {
    functions.logger.error('Bluesky analytics fetch failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    throw error;
  }
}
