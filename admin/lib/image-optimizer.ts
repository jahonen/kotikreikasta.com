import sharp from 'sharp';

/**
 * Image optimization configuration for different use cases
 */
export interface ImageOptimizationConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Predefined optimization presets for common use cases
 */
export const IMAGE_PRESETS = {
  // Social media OG images - optimized for sharing
  socialMedia: {
    maxWidth: 1200,
    maxHeight: 630,
    quality: 85,
    format: 'jpeg' as const,
    fit: 'cover' as const,
  },
  // Blog thumbnails
  blogThumbnail: {
    maxWidth: 800,
    maxHeight: 600,
    quality: 80,
    format: 'jpeg' as const,
    fit: 'cover' as const,
  },
  // Listing images
  listingImage: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'jpeg' as const,
    fit: 'inside' as const,
  },
  // Small thumbnails
  thumbnail: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 75,
    format: 'jpeg' as const,
    fit: 'cover' as const,
  },
} as const;

/**
 * Result of image optimization
 */
export interface OptimizedImage {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

/**
 * Optimize and convert images for web use
 * 
 * Features:
 * - HEIC/HEIF to JPEG/PNG conversion
 * - Image resizing with aspect ratio preservation
 * - Quality optimization
 * - Format conversion
 * - Automatic orientation correction (EXIF)
 * 
 * @param imageBuffer - Input image as Buffer or ArrayBuffer
 * @param config - Optimization configuration or preset name
 * @returns Optimized image with metadata
 */
export async function optimizeImage(
  imageBuffer: Buffer | ArrayBuffer,
  config: ImageOptimizationConfig | keyof typeof IMAGE_PRESETS = 'socialMedia'
): Promise<OptimizedImage> {
  try {
    // Convert ArrayBuffer to Buffer if needed
    const buffer = Buffer.isBuffer(imageBuffer) 
      ? imageBuffer 
      : Buffer.from(imageBuffer);

    // Get configuration
    const opts: ImageOptimizationConfig = typeof config === 'string' 
      ? IMAGE_PRESETS[config] 
      : config;

    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 85,
      format = 'jpeg',
      fit = 'inside',
    } = opts;

    console.log('[IMAGE_OPTIMIZER] Optimizing image', {
      inputSize: buffer.length,
      maxWidth,
      maxHeight,
      quality,
      format,
      fit,
    });

    // Create sharp instance with auto-rotation from EXIF
    let pipeline = sharp(buffer, {
      failOnError: false, // Don't fail on corrupt images, try to recover
    }).rotate(); // Auto-rotate based on EXIF orientation

    // Get original metadata
    const metadata = await pipeline.metadata();
    
    console.log('[IMAGE_OPTIMIZER] Input image metadata', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      space: metadata.space,
      channels: metadata.channels,
      hasAlpha: metadata.hasAlpha,
    });

    // Resize if needed
    if (maxWidth || maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit,
        withoutEnlargement: true, // Don't upscale images
      });
    }

    // Convert to target format with optimization
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality,
          progressive: true, // Progressive JPEG for better loading
          mozjpeg: true, // Use mozjpeg for better compression
        });
        break;
      
      case 'png':
        pipeline = pipeline.png({
          quality,
          compressionLevel: 9,
          progressive: true,
        });
        break;
      
      case 'webp':
        pipeline = pipeline.webp({
          quality,
          effort: 6, // Higher effort = better compression (0-6)
        });
        break;
    }

    // Execute the pipeline
    const outputBuffer = await pipeline.toBuffer({ resolveWithObject: true });

    const optimizedSize = outputBuffer.data.length;
    const compressionRatio = ((1 - optimizedSize / buffer.length) * 100).toFixed(1);

    console.log('[IMAGE_OPTIMIZER] Image optimization complete', {
      inputSize: buffer.length,
      outputSize: optimizedSize,
      compressionRatio: `${compressionRatio}%`,
      width: outputBuffer.info.width,
      height: outputBuffer.info.height,
      format: outputBuffer.info.format,
    });

    return {
      buffer: outputBuffer.data,
      contentType: `image/${format}`,
      width: outputBuffer.info.width,
      height: outputBuffer.info.height,
      size: optimizedSize,
      format: outputBuffer.info.format,
    };

  } catch (error: any) {
    console.error('[IMAGE_OPTIMIZER] Image optimization failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    throw new Error(`Image optimization failed: ${error?.message}`);
  }
}

/**
 * Fetch image from URL and optimize it
 * 
 * @param imageUrl - URL of the image to fetch and optimize
 * @param config - Optimization configuration or preset name
 * @returns Optimized image with metadata
 */
export async function fetchAndOptimizeImage(
  imageUrl: string,
  config: ImageOptimizationConfig | keyof typeof IMAGE_PRESETS = 'socialMedia'
): Promise<OptimizedImage> {
  try {
    console.log('[IMAGE_OPTIMIZER] Fetching image for optimization', { imageUrl });

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('[IMAGE_OPTIMIZER] Image fetched', {
      url: imageUrl,
      size: buffer.length,
      contentType: response.headers.get('content-type'),
    });

    return await optimizeImage(buffer, config);

  } catch (error: any) {
    console.error('[IMAGE_OPTIMIZER] Failed to fetch and optimize image', {
      imageUrl,
      error: error?.message,
    });
    throw error;
  }
}

/**
 * Check if image format is supported by sharp
 * 
 * @param contentType - MIME type of the image
 * @returns true if format is supported
 */
export function isSupportedImageFormat(contentType: string): boolean {
  const supportedFormats = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/tiff',
    'image/avif',
    'image/heic',
    'image/heif',
    'image/svg+xml',
  ];
  
  return supportedFormats.includes(contentType.toLowerCase());
}
