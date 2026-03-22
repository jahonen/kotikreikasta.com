/**
 * Utility functions for selecting optimal image crops for different platforms
 */

interface FeaturedImage {
  url: string;
  alt?: string;
  crops?: {
    '16:9'?: string;
    '4:3'?: string;
    '1:1'?: string;
    '3:4'?: string;
    '9:16'?: string;
  };
}

export type ImageContext = 'bluesky' | 'threads' | 'facebook' | 'twitter' | 'instagram';

/**
 * Platform-specific optimal aspect ratios
 * 
 * Bluesky: 16:9 (landscape preferred)
 * Threads: 1:1 (square preferred, Instagram-style)
 * Facebook: 16:9 (landscape for link previews)
 * Twitter/X: 16:9 (landscape for cards)
 * Instagram: 1:1 (square native format)
 */
const PLATFORM_ASPECT_RATIOS: Record<ImageContext, keyof NonNullable<FeaturedImage['crops']>> = {
  bluesky: '16:9',
  threads: '1:1',
  facebook: '16:9',
  twitter: '16:9',
  instagram: '1:1',
};

/**
 * Get the optimal crop for a given platform
 * Falls back to original URL if crops are not available
 */
export function getOptimalCropForPlatform(
  featuredImage: FeaturedImage | { url: string; crops?: any } | string | undefined | null,
  platform: ImageContext
): string | undefined {
  // Handle string input (legacy format)
  if (typeof featuredImage === 'string') {
    return featuredImage;
  }
  
  if (!featuredImage?.url) return undefined;
  
  // If no crops available, return original
  if (!featuredImage.crops) return featuredImage.url;
  
  const ratio = PLATFORM_ASPECT_RATIOS[platform];
  return featuredImage.crops[ratio] || featuredImage.url;
}

/**
 * Extract image URL from various formats and return optimal crop
 */
export function extractOptimalImage(
  featuredImage: FeaturedImage | { url: string; crops?: any } | string | undefined | null,
  platform: ImageContext
): string | undefined {
  if (!featuredImage) return undefined;
  
  // Handle string format
  if (typeof featuredImage === 'string') {
    return featuredImage;
  }
  
  // Handle object format with crops
  return getOptimalCropForPlatform(featuredImage, platform);
}

/**
 * Check if an image has crops available
 */
export function hasCrops(
  featuredImage: FeaturedImage | { url: string; crops?: any } | string | undefined | null
): boolean {
  if (typeof featuredImage === 'string') return false;
  return Boolean(featuredImage?.crops && Object.keys(featuredImage.crops).length > 0);
}
