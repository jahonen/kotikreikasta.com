/**
 * Analytics API Client for Admin Dashboard
 */

export interface PlatformMetrics {
  impressions: number;
  reach: number;
  engagements: number;
  engagement_rate: number;
  followers: number;
  follower_change: number;
  shares: number;
}

export interface TimelineDay {
  date: string;
  instagram: { impressions: number; engagements: number };
  facebook: { impressions: number; engagements: number };
  threads: { impressions: number; engagements: number };
  x: { impressions: number; engagements: number };
  bluesky: { impressions: number; engagements: number };
}

export interface AnalyticsData {
  period: number;
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
    instagram: PlatformMetrics;
    facebook: PlatformMetrics;
    threads: PlatformMetrics;
    x: PlatformMetrics;
    bluesky: PlatformMetrics;
  };
  timeline: TimelineDay[];
  projections?: {
    impressions: Array<{ date: string; value: number }>;
    followers: Array<{ date: string; value: number }>;
  };
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
  meta: {
    fetchedPlatforms: string[];
    totalSnapshots: number;
    duration: number;
  };
}

/**
 * Fetch analytics from Cloud Function
 */
export async function fetchAnalytics(
  period: number = 30,
  forceRefresh: boolean = false,
  idToken?: string
): Promise<AnalyticsData> {
  const url = `https://europe-west1-kotikreikasta.cloudfunctions.net/analyticsAggregator?period=${period}${forceRefresh ? '&refresh=true' : ''}`;
  
  const headers: HeadersInit = {};
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`Analytics fetch failed: ${response.status}`);
  }
  
  const result: AnalyticsResponse = await response.json();
  
  if (!result.success) {
    throw new Error('Analytics aggregation failed');
  }
  
  return result.data;
}
