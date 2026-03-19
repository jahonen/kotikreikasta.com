import { Timestamp } from 'firebase-admin/firestore';

/**
 * Publication queue item for social media dissemination
 */
export interface PublicationQueueItem {
  id?: string;
  contentType: 'blog_post' | 'listing';
  contentId: string;
  platforms: string[];
  status: 'pending' | 'published' | 'failed';
  createdAt: Timestamp;
  publishAfter: Timestamp;
  delayHours: number;
  publishedAt?: Timestamp;
  error?: string;
  retryCount?: number;
}

/**
 * Individual social share record
 */
export interface SocialShare {
  sharedAt: Timestamp;
  postId?: string;
  queueId?: string;
}

/**
 * Platform-specific sharing tracking
 */
export interface PlatformSharing {
  shareCount: number;
  lastShared: Timestamp;
  shares: SocialShare[];
}

/**
 * Social sharing tracking for content items
 */
export interface SocialSharingTracking {
  totalShares: number;
  platforms: {
    [platform: string]: PlatformSharing;
  };
}

/**
 * Time window for scheduled posting
 */
export interface ScheduleWindow {
  window: string;
  tz: string;
}

/**
 * Daily schedule configuration
 */
export interface ScheduleDay {
  day: string;
  primary: ScheduleWindow;
  secondary?: ScheduleWindow;
}

/**
 * Evergreen content re-sharing rules
 */
export interface EvergreenRules {
  minDaysBetweenShares: number;
  maxSharesPerContent: number;
  prioritizeNew: boolean;
  minContentAge: number;
  enabled: boolean;
}

/**
 * Publish delay configuration
 */
export interface PublishDelay {
  enabled: boolean;
  blogPosts: {
    minHours: number;
    maxHours: number;
  };
  listings: {
    minHours: number;
    maxHours: number;
  };
  strategy: 'random_within_range';
}

/**
 * Posting behavior configuration
 */
export interface PostingBehavior {
  randomizeWithinWindow: boolean;
  minMinutesBetweenPosts: number;
  retryOnFailure: boolean;
  maxRetries: number;
  retryDelayMinutes: number;
}

/**
 * Content preferences for platform
 */
export interface ContentPreferences {
  preferredTypes: string[];
  maxCharacters: number;
  includeHashtags: boolean;
  includeEmojis: boolean;
  includeImages: boolean;
  maxImages: number;
  [key: string]: any;
}

/**
 * Complete platform schedule configuration
 */
export interface PlatformSchedule {
  platform: string;
  schedule: ScheduleDay[];
  evergreenRules: EvergreenRules;
  publishDelay: PublishDelay;
  postingBehavior: PostingBehavior;
  contentPreferences: ContentPreferences;
}

/**
 * Content item for social posting (blog or listing)
 */
export interface ContentItem {
  id: string;
  type: 'blog_post' | 'listing';
  title: string;
  slug: string;
  urlStub?: string;
  summary?: string;
  excerpt?: string;
  featuredImage?: string | { url: string; alt: string };
  images?: string[];
  publishedAt: Timestamp;
  status?: string;
  socialSharing?: SocialSharingTracking;
  contentMd?: string;
  seo?: any;
  [key: string]: any;
}

/**
 * Formatted post ready for platform API
 */
export interface FormattedPost {
  text: string;
  images?: string[];
  url: string;
  hashtags?: string[];
}
