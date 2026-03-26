/**
 * Threads Analytics Fetcher
 * Uses Threads Graph API to fetch metrics
 */

import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { DailyMetrics } from './analytics-types';

const secretClient = new SecretManagerServiceClient();

interface ThreadsCredentials {
  userId: string;
  accessToken: string;
}

async function fetchThreadsCredentials(): Promise<ThreadsCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [userIdVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/THREADS_USER_ID/versions/latest`,
    });
    const [tokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/THREADS_ACCESS_TOKEN/versions/latest`,
    });
    
    const userId = userIdVersion.payload?.data?.toString() || '';
    const accessToken = tokenVersion.payload?.data?.toString() || '';
    
    if (!userId || !accessToken) {
      throw new Error('Missing Threads credentials');
    }
    
    return { userId, accessToken };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Threads credentials', { error: error?.message });
    throw new Error('threads_credentials_fetch_failed');
  }
}

/**
 * Fetch Threads analytics for a date range
 */
export async function fetchThreadsAnalytics(days: number = 30): Promise<DailyMetrics[]> {
  const { userId, accessToken } = await fetchThreadsCredentials();
  
  try {
    // Fetch user profile for follower count
    const profileUrl = `https://graph.threads.net/v1.0/${userId}` +
      `?fields=username,threads_profile_picture_url,threads_biography` +
      `&access_token=${accessToken}`;
    
    const profileResponse = await fetch(profileUrl);
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      functions.logger.error('Threads profile fetch failed', {
        status: profileResponse.status,
        error: errorText,
      });
      throw new Error(`threads_profile_error_${profileResponse.status}`);
    }
    
    // Fetch threads (posts)
    const threadsUrl = `https://graph.threads.net/v1.0/${userId}/threads` +
      `?fields=id,text,timestamp,media_type,media_url,permalink,is_reply` +
      `&limit=100` +
      `&access_token=${accessToken}`;
    
    const threadsResponse = await fetch(threadsUrl);
    
    if (!threadsResponse.ok) {
      const errorText = await threadsResponse.text();
      functions.logger.error('Threads fetch failed', {
        status: threadsResponse.status,
        error: errorText,
      });
      throw new Error(`threads_fetch_error_${threadsResponse.status}`);
    }
    
    const threadsData = await threadsResponse.json();
    const threads = threadsData.data || [];
    
    // Fetch insights for each thread
    const dailyMetrics = new Map<string, Partial<DailyMetrics>>();
    
    for (const thread of threads) {
      const threadDate = thread.timestamp.split('T')[0]; // YYYY-MM-DD
      
      // Check if thread is within our date range
      const threadTime = new Date(thread.timestamp).getTime();
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
      
      if (threadTime < cutoffTime) {
        continue; // Skip threads older than our range
      }
      
      try {
        // Fetch insights for this thread
        const insightsUrl = `https://graph.threads.net/v1.0/${thread.id}/insights` +
          `?metric=views,likes,replies,reposts,quotes` +
          `&access_token=${accessToken}`;
        
        const insightsResponse = await fetch(insightsUrl);
        
        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          const insights = insightsData.data || [];
          
          if (!dailyMetrics.has(threadDate)) {
            dailyMetrics.set(threadDate, {
              date: threadDate,
              platform: 'threads',
              impressions: 0,
              engagements: 0,
              likes: 0,
              comments: 0,
              replies: 0,
              shares: 0,
              quotes: 0,
            });
          }
          
          const metrics = dailyMetrics.get(threadDate)!;
          
          for (const insight of insights) {
            const value = insight.values?.[0]?.value || 0;
            
            switch (insight.name) {
              case 'views':
                metrics.impressions = (metrics.impressions || 0) + value;
                break;
              case 'likes':
                metrics.likes = (metrics.likes || 0) + value;
                metrics.engagements = (metrics.engagements || 0) + value;
                break;
              case 'replies':
                metrics.replies = (metrics.replies || 0) + value;
                metrics.comments = (metrics.comments || 0) + value;
                metrics.engagements = (metrics.engagements || 0) + value;
                break;
              case 'reposts':
                metrics.shares = (metrics.shares || 0) + value;
                metrics.engagements = (metrics.engagements || 0) + value;
                break;
              case 'quotes':
                metrics.quotes = (metrics.quotes || 0) + value;
                metrics.engagements = (metrics.engagements || 0) + value;
                break;
            }
          }
        }
      } catch (error: any) {
        functions.logger.warn('Failed to fetch insights for thread', {
          threadId: thread.id,
          error: error?.message,
        });
        // Continue with other threads
      }
    }
    
    // Note: Threads API doesn't provide historical follower count
    // We'll need to track this ourselves or estimate
    const currentFollowers = 0; // Would need to track separately
    
    // Calculate engagement rates and follower changes
    const sortedDates = Array.from(dailyMetrics.keys()).sort();
    const result: DailyMetrics[] = [];
    
    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const metrics = dailyMetrics.get(date)!;
      
      // Calculate engagement rate
      const impressions = metrics.impressions || 0;
      const engagements = metrics.engagements || 0;
      metrics.engagement_rate = impressions > 0 ? (engagements / impressions) * 100 : 0;
      
      // Set follower data (would need separate tracking)
      metrics.followers = currentFollowers;
      metrics.follower_change = 0;
      
      result.push(metrics as DailyMetrics);
    }
    
    functions.logger.info('Threads analytics fetched successfully', {
      days: result.length,
      threads: threads.length,
    });
    
    return result;
    
  } catch (error: any) {
    functions.logger.error('Threads analytics fetch failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    throw error;
  }
}
