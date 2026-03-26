/**
 * X (Twitter) Analytics Fetcher
 * Uses X API v2 with OAuth 1.0a (pay-per-use model)
 */

import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { DailyMetrics, XTweetMetrics, XUserMetrics } from './analytics-types';
import * as crypto from 'crypto';

const secretClient = new SecretManagerServiceClient();

interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

async function fetchXCredentials(): Promise<XCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [apiKeyVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_CONSUMER_KEY/versions/latest`,
    });
    const [apiSecretVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_CONSUMER_SECRET/versions/latest`,
    });
    const [accessTokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_ACCESS_TOKEN/versions/latest`,
    });
    const [accessSecretVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_ACCESS_TOKEN_SECRET/versions/latest`,
    });
    
    const apiKey = apiKeyVersion.payload?.data?.toString() || '';
    const apiSecret = apiSecretVersion.payload?.data?.toString() || '';
    const accessToken = accessTokenVersion.payload?.data?.toString() || '';
    const accessSecret = accessSecretVersion.payload?.data?.toString() || '';
    
    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      throw new Error('Missing X API credentials');
    }
    
    return { apiKey, apiSecret, accessToken, accessSecret };
  } catch (error: any) {
    functions.logger.error('Failed to fetch X credentials', { error: error?.message });
    throw new Error('x_credentials_fetch_failed');
  }
}

/**
 * Generate OAuth 1.0a signature for X API
 */
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  credentials: XCredentials
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const signatureBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(credentials.apiSecret)}&${encodeURIComponent(credentials.accessSecret)}`;
  
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');
  
  return signature;
}

/**
 * Make authenticated request to X API v2
 */
async function makeXRequest(
  endpoint: string,
  queryParams: Record<string, string>,
  credentials: XCredentials
): Promise<any> {
  const url = `https://api.twitter.com${endpoint}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(32).toString('base64').replace(/\W/g, '');
  
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_token: credentials.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
  };
  
  const allParams = { ...oauthParams, ...queryParams };
  const signature = generateOAuthSignature('GET', url, allParams, credentials);
  
  const authHeader = 'OAuth ' + Object.entries({
    ...oauthParams,
    oauth_signature: signature,
  })
    .map(([key, value]) => `${encodeURIComponent(key)}="${encodeURIComponent(value)}"`)
    .join(', ');
  
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'Authorization': authHeader,
      'User-Agent': 'Kotikreikasta-Analytics/1.0',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('X API request failed', {
      status: response.status,
      error: errorText,
      endpoint,
    });
    throw new Error(`x_api_error_${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch X analytics for a date range
 */
export async function fetchXAnalytics(days: number = 30): Promise<DailyMetrics[]> {
  const credentials = await fetchXCredentials();
  
  const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  try {
    // First, get our user ID
    const meData = await makeXRequest('/2/users/me', {
      'user.fields': 'public_metrics,username',
    }, credentials);
    
    const userId = meData.data.id;
    const username = meData.data.username;
    const currentMetrics = meData.data.public_metrics as XUserMetrics;
    
    functions.logger.info('Fetching X analytics', { username, userId });
    
    // Fetch recent tweets with metrics
    const tweetsData = await makeXRequest('/2/tweets/search/recent', {
      query: `from:${username}`,
      start_time: startTime,
      'tweet.fields': 'public_metrics,created_at',
      max_results: '100',
    }, credentials);
    
    const tweets = tweetsData.data || [];
    
    // Aggregate metrics by date
    const dailyMetrics = new Map<string, Partial<DailyMetrics>>();
    
    for (const tweet of tweets) {
      const tweetDate = tweet.created_at.split('T')[0]; // YYYY-MM-DD
      
      if (!dailyMetrics.has(tweetDate)) {
        dailyMetrics.set(tweetDate, {
          date: tweetDate,
          platform: 'x',
          impressions: 0,
          engagements: 0,
          likes: 0,
          comments: 0,
          replies: 0,
          shares: 0,
          quotes: 0,
        });
      }
      
      const metrics = dailyMetrics.get(tweetDate)!;
      const tweetMetrics = tweet.public_metrics as XTweetMetrics;
      
      // Aggregate impressions and engagement
      metrics.impressions = (metrics.impressions || 0) + (tweetMetrics.impression_count || 0);
      metrics.likes = (metrics.likes || 0) + (tweetMetrics.like_count || 0);
      metrics.replies = (metrics.replies || 0) + (tweetMetrics.reply_count || 0);
      metrics.comments = (metrics.comments || 0) + (tweetMetrics.reply_count || 0);
      metrics.shares = (metrics.shares || 0) + (tweetMetrics.retweet_count || 0);
      metrics.quotes = (metrics.quotes || 0) + (tweetMetrics.quote_count || 0);
      
      // Total engagements
      metrics.engagements = (metrics.engagements || 0) + 
        (tweetMetrics.like_count || 0) +
        (tweetMetrics.reply_count || 0) +
        (tweetMetrics.retweet_count || 0) +
        (tweetMetrics.quote_count || 0);
    }
    
    // Calculate engagement rates and set follower data
    const sortedDates = Array.from(dailyMetrics.keys()).sort();
    const result: DailyMetrics[] = [];
    
    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const metrics = dailyMetrics.get(date)!;
      
      // Calculate engagement rate
      const impressions = metrics.impressions || 0;
      const engagements = metrics.engagements || 0;
      metrics.engagement_rate = impressions > 0 ? (engagements / impressions) * 100 : 0;
      
      // Set current follower count (we only have current, not historical)
      metrics.followers = currentMetrics.followers_count;
      
      // Follower change would need historical tracking
      metrics.follower_change = 0;
      
      result.push(metrics as DailyMetrics);
    }
    
    functions.logger.info('X analytics fetched successfully', {
      days: result.length,
      tweets: tweets.length,
      currentFollowers: currentMetrics.followers_count,
    });
    
    return result;
    
  } catch (error: any) {
    functions.logger.error('X analytics fetch failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    throw error;
  }
}
