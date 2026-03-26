/**
 * Facebook Analytics Fetcher
 * Uses Facebook Page Insights API with META_SYSTEM_TOKEN
 */

import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { DailyMetrics, FacebookInsight } from './analytics-types';

const secretClient = new SecretManagerServiceClient();

interface FacebookCredentials {
  pageId: string;
  systemToken: string;
}

async function fetchFacebookCredentials(): Promise<FacebookCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [pageIdVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/FACEBOOK_PAGE_ID/versions/latest`,
    });
    const [systemTokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/META_SYSTEM_TOKEN/versions/latest`,
    });
    
    const pageId = pageIdVersion.payload?.data?.toString() || '';
    const systemToken = systemTokenVersion.payload?.data?.toString() || '';
    
    if (!pageId || !systemToken) {
      throw new Error('Missing Facebook credentials');
    }
    
    return { pageId, systemToken };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Facebook credentials', { error: error?.message });
    throw new Error('facebook_credentials_fetch_failed');
  }
}

/**
 * Fetch Facebook Page Insights for a date range
 */
export async function fetchFacebookAnalytics(days: number = 30): Promise<DailyMetrics[]> {
  const { pageId, systemToken } = await fetchFacebookCredentials();
  
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const until = new Date();
  
  try {
    // Fetch page insights
    const insightsUrl = `https://graph.facebook.com/v18.0/${pageId}/insights` +
      `?metric=page_impressions,page_impressions_unique,page_engaged_users,page_fans` +
      `&period=day` +
      `&since=${Math.floor(since.getTime() / 1000)}` +
      `&until=${Math.floor(until.getTime() / 1000)}` +
      `&access_token=${systemToken}`;
    
    const insightsResponse = await fetch(insightsUrl);
    
    if (!insightsResponse.ok) {
      const errorText = await insightsResponse.text();
      functions.logger.error('Facebook insights fetch failed', {
        status: insightsResponse.status,
        error: errorText,
      });
      throw new Error(`facebook_insights_error_${insightsResponse.status}`);
    }
    
    const insightsData = await insightsResponse.json();
    const insights = insightsData.data as FacebookInsight[];
    
    // Fetch recent posts for engagement metrics
    const postsUrl = `https://graph.facebook.com/v18.0/${pageId}/posts` +
      `?fields=id,created_time,shares,reactions.summary(true),comments.summary(true)` +
      `&limit=100` +
      `&access_token=${systemToken}`;
    
    const postsResponse = await fetch(postsUrl);
    const postsData = await postsResponse.json();
    const posts = postsData.data || [];
    
    // Organize insights by date
    const dailyMetrics = new Map<string, Partial<DailyMetrics>>();
    
    // Process insights
    for (const insight of insights) {
      for (const value of insight.values) {
        const date = value.end_time.split('T')[0]; // YYYY-MM-DD
        
        if (!dailyMetrics.has(date)) {
          dailyMetrics.set(date, { date, platform: 'facebook' });
        }
        
        const metrics = dailyMetrics.get(date)!;
        
        switch (insight.name) {
          case 'page_impressions':
            metrics.impressions = value.value;
            break;
          case 'page_impressions_unique':
            metrics.reach = value.value;
            break;
          case 'page_engaged_users':
            metrics.engagements = value.value;
            break;
          case 'page_fans':
            metrics.followers = value.value;
            break;
        }
      }
    }
    
    // Aggregate post engagement by date
    const engagementByDate = new Map<string, { likes: number; comments: number; shares: number }>();
    
    for (const post of posts) {
      const postDate = post.created_time.split('T')[0];
      
      if (!engagementByDate.has(postDate)) {
        engagementByDate.set(postDate, { likes: 0, comments: 0, shares: 0 });
      }
      
      const engagement = engagementByDate.get(postDate)!;
      engagement.likes += post.reactions?.summary?.total_count || 0;
      engagement.comments += post.comments?.summary?.total_count || 0;
      engagement.shares += post.shares?.count || 0;
    }
    
    // Merge engagement data
    for (const [date, engagement] of engagementByDate.entries()) {
      if (!dailyMetrics.has(date)) {
        dailyMetrics.set(date, { date, platform: 'facebook' });
      }
      
      const metrics = dailyMetrics.get(date)!;
      metrics.likes = engagement.likes;
      metrics.comments = engagement.comments;
      metrics.shares = engagement.shares;
      
      // If we don't have engaged_users from insights, calculate from post metrics
      if (!metrics.engagements) {
        metrics.engagements = engagement.likes + engagement.comments + engagement.shares;
      }
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
    
    functions.logger.info('Facebook analytics fetched successfully', {
      days: result.length,
      dateRange: `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`,
    });
    
    return result;
    
  } catch (error: any) {
    functions.logger.error('Facebook analytics fetch failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    throw error;
  }
}
