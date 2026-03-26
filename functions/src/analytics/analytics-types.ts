/**
 * Analytics Types for Marketing Dashboard
 * Supports: Instagram, Facebook, Threads, X, Bluesky
 */

export type Platform = 'instagram' | 'facebook' | 'threads' | 'x' | 'bluesky';

export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  platform: Platform;
  impressions: number;
  reach?: number; // Not all platforms provide this
  engagements: number;
  engagement_rate: number; // percentage
  followers: number;
  follower_change: number; // net change from previous day
  shares: number; // retweets, reposts, shares
  likes?: number;
  comments?: number;
  saves?: number;
  replies?: number;
  quotes?: number;
  profile_views?: number;
}

export interface AnalyticsSnapshot {
  date: string; // YYYY-MM-DD
  platform: Platform;
  metrics: DailyMetrics;
  fetchedAt: FirebaseFirestore.Timestamp;
  source: 'api' | 'manual' | 'calculated';
}

export interface AnalyticsCache {
  lastFetchDate: string; // YYYY-MM-DD
  platforms: {
    [key in Platform]: {
      lastFetch: FirebaseFirestore.Timestamp;
      status: 'success' | 'error' | 'pending';
      error?: string;
    };
  };
}

export interface AggregatedMetrics {
  period: number; // days
  startDate: string;
  endDate: string;
  totals: {
    impressions: number;
    reach: number;
    engagements: number;
    avg_engagement_rate: number;
    net_followers: number;
    total_shares: number;
  };
  platforms: {
    [key in Platform]: {
      impressions: number;
      reach: number;
      engagements: number;
      engagement_rate: number;
      followers: number;
      follower_change: number;
      shares: number;
    };
  };
  timeline: Array<{
    date: string;
    instagram: { impressions: number; engagements: number };
    facebook: { impressions: number; engagements: number };
    threads: { impressions: number; engagements: number };
    x: { impressions: number; engagements: number };
    bluesky: { impressions: number; engagements: number };
  }>;
  projections?: {
    impressions: Array<{ date: string; value: number }>;
    followers: Array<{ date: string; value: number }>;
  };
}

export interface InstagramInsight {
  name: string;
  period: string;
  values: Array<{
    value: number;
    end_time: string;
  }>;
  title?: string;
  description?: string;
  id?: string;
}

export interface FacebookInsight {
  name: string;
  period: string;
  values: Array<{
    value: number;
    end_time: string;
  }>;
  title?: string;
  description?: string;
  id?: string;
}

export interface ThreadsMetrics {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}

export interface XTweetMetrics {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  bookmark_count: number;
  impression_count: number;
}

export interface XUserMetrics {
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count: number;
}

export interface BlueskyPostMetrics {
  likeCount: number;
  repostCount: number;
  replyCount: number;
}
