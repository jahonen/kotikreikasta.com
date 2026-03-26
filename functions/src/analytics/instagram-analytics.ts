/**
 * Instagram Analytics Fetcher
 * Uses Instagram Graph API to fetch account insights
 */

import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { DailyMetrics, InstagramInsight } from './analytics-types';

const secretClient = new SecretManagerServiceClient();

interface InstagramCredentials {
  accessToken: string;
  accountId: string;
}

async function fetchInstagramCredentials(): Promise<InstagramCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [tokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/INSTAGRAM_ACCESS_TOKEN/versions/latest`,
    });
    const [accountIdVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/INSTAGRAM_APP_ID/versions/latest`,
    });
    
    const accessToken = tokenVersion.payload?.data?.toString() || '';
    const accountId = accountIdVersion.payload?.data?.toString() || '';
    
    if (!accessToken || !accountId) {
      throw new Error('Missing Instagram credentials');
    }
    
    return { accessToken, accountId };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Instagram credentials', { error: error?.message });
    throw new Error('instagram_credentials_fetch_failed');
  }
}

/**
 * Fetch Instagram insights for a date range
 */
export async function fetchInstagramAnalytics(days: number = 30): Promise<DailyMetrics[]> {
  const { accessToken, accountId } = await fetchInstagramCredentials();
  
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const until = new Date();
  
  try {
    // Fetch account-level insights
    const insightsUrl = `https://graph.instagram.com/v18.0/${accountId}/insights` +
      `?metric=impressions,reach,profile_views,follower_count` +
      `&period=day` +
      `&since=${Math.floor(since.getTime() / 1000)}` +
      `&until=${Math.floor(until.getTime() / 1000)}` +
      `&access_token=${accessToken}`;
    
    const insightsResponse = await fetch(insightsUrl);
    
    if (!insightsResponse.ok) {
      const errorText = await insightsResponse.text();
      functions.logger.error('Instagram insights fetch failed', {
        status: insightsResponse.status,
        error: errorText,
      });
      throw new Error(`instagram_insights_error_${insightsResponse.status}`);
    }
    
    const insightsData = await insightsResponse.json();
    const insights = insightsData.data as InstagramInsight[];
    
    // Fetch media for engagement metrics
    const mediaUrl = `https://graph.instagram.com/v18.0/${accountId}/media` +
      `?fields=id,timestamp,like_count,comments_count,media_type` +
      `&limit=100` +
      `&access_token=${accessToken}`;
    
    const mediaResponse = await fetch(mediaUrl);
    const mediaData = await mediaResponse.json();
    const media = mediaData.data || [];
    
    // Organize insights by date
    const dailyMetrics = new Map<string, Partial<DailyMetrics>>();
    
    // Process insights
    for (const insight of insights) {
      for (const value of insight.values) {
        const date = value.end_time.split('T')[0]; // YYYY-MM-DD
        
        if (!dailyMetrics.has(date)) {
          dailyMetrics.set(date, { date, platform: 'instagram' });
        }
        
        const metrics = dailyMetrics.get(date)!;
        
        switch (insight.name) {
          case 'impressions':
            metrics.impressions = value.value;
            break;
          case 'reach':
            metrics.reach = value.value;
            break;
          case 'profile_views':
            metrics.profile_views = value.value;
            break;
          case 'follower_count':
            metrics.followers = value.value;
            break;
        }
      }
    }
    
    // Aggregate media engagement by date
    const engagementByDate = new Map<string, { likes: number; comments: number; saves: number }>();
    
    for (const post of media) {
      const postDate = post.timestamp.split('T')[0];
      
      if (!engagementByDate.has(postDate)) {
        engagementByDate.set(postDate, { likes: 0, comments: 0, saves: 0 });
      }
      
      const engagement = engagementByDate.get(postDate)!;
      engagement.likes += post.like_count || 0;
      engagement.comments += post.comments_count || 0;
    }
    
    // Merge engagement data
    for (const [date, engagement] of engagementByDate.entries()) {
      if (!dailyMetrics.has(date)) {
        dailyMetrics.set(date, { date, platform: 'instagram' });
      }
      
      const metrics = dailyMetrics.get(date)!;
      metrics.likes = engagement.likes;
      metrics.comments = engagement.comments;
      metrics.saves = engagement.saves;
      metrics.engagements = engagement.likes + engagement.comments + engagement.saves;
      metrics.shares = 0; // Instagram doesn't provide share count
    }
    
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
      
      // Calculate follower change
      if (i > 0) {
        const prevDate = sortedDates[i - 1];
        const prevMetrics = dailyMetrics.get(prevDate)!;
        const prevFollowers = prevMetrics.followers || 0;
        const currentFollowers = metrics.followers || 0;
        metrics.follower_change = currentFollowers - prevFollowers;
      } else {
        metrics.follower_change = 0;
      }
      
      result.push(metrics as DailyMetrics);
    }
    
    functions.logger.info('Instagram analytics fetched successfully', {
      days: result.length,
      dateRange: `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`,
    });
    
    return result;
    
  } catch (error: any) {
    functions.logger.error('Instagram analytics fetch failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    throw error;
  }
}
