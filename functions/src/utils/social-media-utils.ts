import * as functions from 'firebase-functions/v1';

/**
 * Content type for social media posts
 */
export type ContentType = 'listing' | 'blog';

/**
 * Social media platform
 */
export type SocialPlatform = 'bluesky' | 'x' | 'facebook' | 'threads';

/**
 * Platform-specific character limits (including link)
 */
export const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  bluesky: 300,
  x: 280, // Reserve 23 chars for t.co link
  facebook: 5000,
  threads: 500,
};

/**
 * Generate UTM parameters for analytics tracking
 */
export function generateUTMParameters(
  platform: SocialPlatform,
  contentType: ContentType,
  contentId: string
): string {
  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: 'social',
    utm_campaign: contentType,
    utm_content: contentId,
  });
  
  return params.toString();
}

/**
 * Build full URL with UTM parameters
 */
export function buildTrackedURL(
  baseUrl: string,
  platform: SocialPlatform,
  contentType: ContentType,
  contentId: string
): string {
  const utmParams = generateUTMParameters(platform, contentType, contentId);
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${utmParams}`;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: string = 'operation'
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.initialDelayMs;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      functions.logger.info(`${context}: attempt ${attempt}/${config.maxAttempts}`);
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === config.maxAttempts) {
        functions.logger.error(`${context}: all attempts failed`, {
          attempts: config.maxAttempts,
          lastError: error?.message,
        });
        break;
      }
      
      // Check if error is retryable
      const isRetryable = isRetryableError(error);
      if (!isRetryable) {
        functions.logger.warn(`${context}: non-retryable error, aborting`, {
          error: error?.message,
        });
        throw error;
      }
      
      functions.logger.warn(`${context}: attempt ${attempt} failed, retrying in ${delay}ms`, {
        error: error?.message,
      });
      
      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }
  
  throw lastError || new Error(`${context} failed after ${config.maxAttempts} attempts`);
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
    return true;
  }
  
  // HTTP 5xx errors are retryable
  if (error?.message?.includes('_error_5')) {
    return true;
  }
  
  // Rate limit errors are retryable
  if (error?.message?.includes('_error_429')) {
    return true;
  }
  
  // Temporary errors are retryable
  if (error?.message?.includes('temporary') || error?.message?.includes('timeout')) {
    return true;
  }
  
  // 4xx errors (except 429) are not retryable
  if (error?.message?.includes('_error_4')) {
    return false;
  }
  
  // Default: retry
  return true;
}

/**
 * Validate URL format
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Truncate text to fit within character limit, preserving word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find last space before limit
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated.substring(0, maxLength - 3) + '...';
}
