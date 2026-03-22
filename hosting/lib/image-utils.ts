/**
 * Utility functions for smart image selection based on context
 */

import { FeaturedImage } from './interfaces/blog-post';

export type ImageContext = 'og' | 'twitter' | 'hero' | 'card' | 'preview' | 'gallery' | 'thumbnail';
export type ImageSize = 'full' | 'og' | 'thumbnail';

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
    og: '16:9',        // OG images prefer landscape (1200px max for social media)
    twitter: '16:9',   // Twitter cards prefer landscape (1200px max)
    hero: '16:9',      // Hero sections prefer landscape (full size)
    card: '4:3',       // Preview cards prefer standard (full size)
    preview: '1:1',    // Small previews prefer square (full size)
    gallery: '1:1',    // Gallery grids prefer square (full size)
    thumbnail: '1:1',  // Thumbnails prefer square (400px)
  };
  
  const sizeMap: Record<ImageContext, ImageSize> = {
    og: 'og',          // Use 1200px version for OG metadata
    twitter: 'og',     // Use 1200px version for Twitter cards
    hero: 'full',      // Use full size for hero sections
    card: 'full',      // Use full size for cards
    preview: 'full',   // Use full size for previews
    gallery: 'full',   // Use full size for galleries
    thumbnail: 'thumbnail', // Use 400px version for thumbnails
  };
  
  const ratio = aspectRatioMap[context];
  const size = sizeMap[context];
  
  // Handle new nested structure: crops[ratio][size]
  const crop = featuredImage.crops[ratio];
  if (crop && typeof crop === 'object' && crop[size]) {
    return crop[size];
  }
  
  // Fallback to old structure or any available size
  if (typeof crop === 'string') {
    return crop;
  }
  
  if (crop && typeof crop === 'object') {
    return crop.full || crop.og || crop.thumbnail || featuredImage.url;
  }
  
  return featuredImage.url;
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
