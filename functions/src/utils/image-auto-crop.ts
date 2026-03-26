import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import sharp from 'sharp';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();

interface BorderConfig {
  borderColor: string;
  borderWidth: number;
  enabled: boolean;
}

/**
 * Fetch Instagram border configuration from Secret Manager
 */
async function fetchBorderConfig(): Promise<BorderConfig | null> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/INSTAGRAM_IMAGE_BORDER_CONFIG/versions/latest`,
    });
    
    const payload = version.payload?.data?.toString() || '{}';
    const config = JSON.parse(payload);
    
    return {
      borderColor: config.borderColor || '#0078D4',
      borderWidth: config.borderWidth || 50,
      enabled: config.enabled !== false,
    };
  } catch (error: any) {
    functions.logger.warn('Failed to fetch border config, using defaults', { error: error?.message });
    return {
      borderColor: '#0078D4',
      borderWidth: 50,
      enabled: true,
    };
  }
}

/**
 * Add azure blue border to image for Instagram branding
 */
async function addBorder(imageBuffer: Buffer, config: BorderConfig): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const originalSize = metadata.width || 1200;
  const borderedSize = originalSize + (config.borderWidth * 2);
  
  functions.logger.info('Adding border to image', {
    originalSize,
    borderedSize,
    borderColor: config.borderColor,
    borderWidth: config.borderWidth,
  });
  
  // Create bordered image with azure blue background
  const borderedBuffer = await sharp({
    create: {
      width: borderedSize,
      height: borderedSize,
      channels: 3,
      background: config.borderColor,
    },
  })
  .composite([{
    input: imageBuffer,
    top: config.borderWidth,
    left: config.borderWidth,
  }])
  .jpeg({ 
    quality: 85, 
    progressive: true, 
    mozjpeg: true 
  })
  .toBuffer();
  
  return borderedBuffer;
}

/**
 * Ensure a 1:1 square crop exists for an image
 * If it doesn't exist, generate it from the original and save to Firebase Storage
 * For Instagram, adds an azure blue border for brand consistency
 * 
 * @param featuredImage - The featured image object from Firestore
 * @param contentCollection - 'blog_posts' or 'listings'
 * @param contentId - Document ID
 * @returns URL of the 1:1 crop (existing or newly generated)
 */
export async function ensureSquareCrop(
  featuredImage: any,
  contentCollection: string,
  contentId: string
): Promise<string> {
  // Check if 1:1 bordered crop already exists for Instagram
  if (featuredImage?.crops?.['1:1']?.['og-bordered']) {
    functions.logger.info('Using existing 1:1 og-bordered crop', { contentId });
    return featuredImage.crops['1:1']['og-bordered'];
  }
  
  // Check if 1:1 crop already exists (prefer og size)
  if (featuredImage?.crops?.['1:1']?.og) {
    functions.logger.info('Using existing 1:1 og crop', { contentId });
    return featuredImage.crops['1:1'].og;
  }
  
  if (featuredImage?.crops?.['1:1']?.full) {
    functions.logger.info('Using existing 1:1 full crop', { contentId });
    return featuredImage.crops['1:1'].full;
  }
  
  // If no 1:1 crop exists, generate from original
  const originalUrl = featuredImage?.url;
  if (!originalUrl) {
    throw new Error('No original image URL available for auto-crop');
  }
  
  functions.logger.info('Generating 1:1 crop from original', { 
    contentId, 
    originalUrl: originalUrl.substring(0, 100) 
  });
  
  try {
    // Fetch original image
    const response = await fetch(originalUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch original image: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Get image dimensions
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    
    if (width === 0 || height === 0) {
      throw new Error('Invalid image dimensions');
    }
    
    functions.logger.info('Original image dimensions', { 
      contentId, 
      width, 
      height 
    });
    
    // Calculate center square crop
    const size = Math.min(width, height);
    const left = Math.floor((width - size) / 2);
    const top = Math.floor((height - size) / 2);
    
    // Generate 1:1 crop at 1200px (og size for social media)
    const croppedBuffer = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .extract({ left, top, width: size, height: size })
      .resize(1200, 1200, { 
        fit: 'inside', 
        withoutEnlargement: false 
      })
      .jpeg({ 
        quality: 85, 
        progressive: true, 
        mozjpeg: true 
      })
      .toBuffer();
    
    functions.logger.info('Generated 1:1 crop', { 
      contentId, 
      size: croppedBuffer.length 
    });
    
    // Fetch border configuration for Instagram
    const borderConfig = await fetchBorderConfig();
    
    // Add azure blue border for Instagram branding
    let borderedImageUrl: string | null = null;
    
    if (borderConfig && borderConfig.enabled) {
      functions.logger.info('Adding Instagram border', { 
        contentId,
        borderConfig 
      });
      
      const borderedBuffer = await addBorder(croppedBuffer, borderConfig);
      
      // Save bordered version to Firebase Storage
      const bucket = admin.storage().bucket();
      const borderedPath = `${contentCollection}/${contentId}/1-1-og-bordered.jpg`;
      const borderedFile = bucket.file(borderedPath);
      
      const crypto = await import('crypto');
      const borderedToken = crypto.randomBytes(32).toString('hex');
      
      await borderedFile.save(borderedBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            aspectRatio: '1:1',
            size: 'og-bordered',
            autoGenerated: 'true',
            bordered: 'true',
            borderColor: borderConfig.borderColor,
            borderWidth: borderConfig.borderWidth.toString(),
            firebaseStorageDownloadTokens: borderedToken,
          },
        },
      });
      
      borderedImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(borderedPath)}?alt=media&token=${borderedToken}`;
      
      functions.logger.info('Bordered image saved to Storage', { 
        contentId, 
        path: borderedPath,
        url: borderedImageUrl.substring(0, 100)
      });
    }
    
    // Save plain 1:1 crop to Firebase Storage
    const bucket = admin.storage().bucket();
    const path = `${contentCollection}/${contentId}/1-1-og.jpg`;
    const file = bucket.file(path);
    
    // Generate download token
    const crypto = await import('crypto');
    const downloadToken = crypto.randomBytes(32).toString('hex');
    
    await file.save(croppedBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          aspectRatio: '1:1',
          size: 'og',
          autoGenerated: 'true',
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });
    
    // Construct public URL
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`;
    
    functions.logger.info('Auto-generated 1:1 crop saved to Storage', { 
      contentId, 
      path,
      url: imageUrl.substring(0, 100)
    });
    
    // Update Firestore with new crops (both plain and bordered)
    const db = admin.firestore();
    const updateData: any = {
      'featuredImage.crops.1:1.og': imageUrl,
    };
    
    if (borderedImageUrl) {
      updateData['featuredImage.crops.1:1.og-bordered'] = borderedImageUrl;
    }
    
    await db.collection(contentCollection).doc(contentId).update(updateData);
    
    functions.logger.info('Firestore updated with auto-generated crops', { 
      contentId,
      hasBorderedVersion: !!borderedImageUrl 
    });
    
    // Return bordered URL for Instagram, plain URL as fallback
    return borderedImageUrl || imageUrl;
    
  } catch (error: any) {
    functions.logger.error('Failed to generate 1:1 crop', {
      contentId,
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    throw new Error(`auto_crop_failed: ${error?.message}`);
  }
}
