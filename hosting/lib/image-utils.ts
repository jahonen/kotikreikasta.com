/**
 * Utility functions for smart image selection based on context
 */

import { FeaturedImage } from './interfaces/blog-post';

export type ImageContext = 'og' | 'twitter' | 'hero' | 'card' | 'preview' | 'gallery';

/**
 * Get the optimal crop for a given context
 * Falls back to original URL if crops are not available
 */
export function getOptimalCrop(
  featuredImage: FeaturedImage | { url: string; crops?: any } | undefined | null,
  context: ImageContext = 'og'
): string {
  if (!featuredImage?.url) return '';
  
  // If no crops available, return original
  if (!featuredImage.crops) return featuredImage.url;
  
  const aspectRatioMap: Record<ImageContext, keyof NonNullable<FeaturedImage['crops']>> = {
    og: '16:9',        // OG images prefer landscape
    twitter: '16:9',   // Twitter cards prefer landscape
    hero: '16:9',      // Hero sections prefer landscape
    card: '4:3',       // Preview cards prefer standard
    preview: '1:1',    // Small previews prefer square
    gallery: '1:1',    // Gallery grids prefer square
  };
  
  const ratio = aspectRatioMap[context];
  return featuredImage.crops[ratio] || featuredImage.url;
}

/**
 * Get all available crops for an image
 */
export function getAllCrops(
  featuredImage: FeaturedImage | { url: string; crops?: any } | undefined | null
): Record<string, string> {
  if (!featuredImage?.crops) {
    return featuredImage?.url ? { original: featuredImage.url } : {};
  }
  
  return {
    original: featuredImage.url,
    ...featuredImage.crops,
  };
}

/**
 * Check if an image has crops available
 */
export function hasCrops(
  featuredImage: FeaturedImage | { url: string; crops?: any } | undefined | null
): boolean {
  return Boolean(featuredImage?.crops && Object.keys(featuredImage.crops).length > 0);
}
