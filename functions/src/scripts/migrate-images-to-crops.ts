/**
 * Migration script to add multi-aspect-ratio crops to existing blog and listing images
 * 
 * Usage:
 * npm run migrate-images
 */

import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import sharp from 'sharp';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'kotikreikasta.appspot.com',
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ASPECT_RATIOS = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '3:4': 3 / 4,
  '9:16': 9 / 16,
};

const ASPECT_RATIO_DIMENSIONS = {
  '16:9': { width: 2868, height: 1613 },
  '4:3': { width: 2868, height: 2151 },
  '1:1': { width: 2868, height: 2868 },
  '3:4': { width: 2151, height: 2868 },
  '9:16': { width: 1613, height: 2868 },
};

/**
 * Calculate center crop for a given aspect ratio
 */
function calculateCenterCrop(
  imageWidth: number,
  imageHeight: number,
  targetRatio: number
): CropArea {
  const imageRatio = imageWidth / imageHeight;
  
  let cropWidth: number;
  let cropHeight: number;
  
  if (imageRatio > targetRatio) {
    // Image is wider than target - crop width
    cropHeight = imageHeight;
    cropWidth = cropHeight * targetRatio;
  } else {
    // Image is taller than target - crop height
    cropWidth = imageWidth;
    cropHeight = cropWidth / targetRatio;
  }
  
  const x = (imageWidth - cropWidth) / 2;
  const y = (imageHeight - cropHeight) / 2;
  
  return {
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(y)),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate crops for an image
 */
async function generateCropsForImage(
  imageUrl: string,
  storagePath: string,
  docId: string
): Promise<Record<string, string>> {
  console.log(`[MIGRATE] Processing image: ${imageUrl}`);
  
  try {
    // Download original image
    const imageBuffer = await downloadImage(imageUrl);
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions');
    }
    
    console.log(`[MIGRATE] Image dimensions: ${metadata.width}x${metadata.height}`);
    
    const crops: Record<string, string> = {};
    
    // Generate each crop
    for (const [ratio, targetRatio] of Object.entries(ASPECT_RATIOS)) {
      const cropArea = calculateCenterCrop(
        metadata.width,
        metadata.height,
        targetRatio
      );
      
      const dimensions = ASPECT_RATIO_DIMENSIONS[ratio as keyof typeof ASPECT_RATIO_DIMENSIONS];
      
      console.log(`[MIGRATE] Creating ${ratio} crop`, { cropArea, dimensions });
      
      const croppedBuffer = await sharp(imageBuffer)
        .extract({
          left: cropArea.x,
          top: cropArea.y,
          width: cropArea.width,
          height: cropArea.height,
        })
        .resize(dimensions.width, dimensions.height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 85,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();
      
      // Upload crop to storage
      const cropPath = `${storagePath}/${docId}/${ratio.replace(':', '-')}.jpg`;
      const cropRef = bucket.file(cropPath);
      await cropRef.save(croppedBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            aspectRatio: ratio,
            migratedAt: new Date().toISOString(),
          },
        },
      });
      await cropRef.makePublic();
      
      crops[ratio] = `https://storage.googleapis.com/${bucket.name}/${cropPath}`;
      console.log(`[MIGRATE] Created ${ratio} crop: ${crops[ratio]}`);
    }
    
    return crops;
  } catch (error: any) {
    console.error(`[MIGRATE] Failed to process image ${imageUrl}:`, error.message);
    throw error;
  }
}

/**
 * Migrate blog posts
 */
async function migrateBlogPosts() {
  console.log('[MIGRATE] Starting blog posts migration...');
  
  const snapshot = await db.collection('blog_posts')
    .where('status', '==', 'published')
    .get();
  
  console.log(`[MIGRATE] Found ${snapshot.size} published blog posts`);
  
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Skip if already has crops
    if (data.featuredImage?.crops) {
      console.log(`[MIGRATE] Skipping ${doc.id} - already has crops`);
      skipped++;
      continue;
    }
    
    // Skip if no featured image
    if (!data.featuredImage?.url) {
      console.log(`[MIGRATE] Skipping ${doc.id} - no featured image`);
      skipped++;
      continue;
    }
    
    try {
      console.log(`[MIGRATE] Processing blog post ${doc.id}: ${data.title}`);
      
      const crops = await generateCropsForImage(
        data.featuredImage.url,
        'blog-images',
        doc.id
      );
      
      await doc.ref.update({
        'featuredImage.crops': crops,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`[MIGRATE] ✓ Successfully migrated blog post ${doc.id}`);
      processed++;
    } catch (error: any) {
      console.error(`[MIGRATE] ✗ Failed to migrate blog post ${doc.id}:`, error.message);
      failed++;
    }
  }
  
  console.log(`[MIGRATE] Blog posts migration complete: ${processed} processed, ${skipped} skipped, ${failed} failed`);
}

/**
 * Migrate listings
 */
async function migrateListings() {
  console.log('[MIGRATE] Starting listings migration...');
  
  const snapshot = await db.collection('listings')
    .where('status', '==', 'published')
    .get();
  
  console.log(`[MIGRATE] Found ${snapshot.size} published listings`);
  
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Skip if already has crops
    if (data.media?.featured?.crops) {
      console.log(`[MIGRATE] Skipping ${doc.id} - already has crops`);
      skipped++;
      continue;
    }
    
    // Skip if no featured image
    if (!data.media?.featured?.url) {
      console.log(`[MIGRATE] Skipping ${doc.id} - no featured image`);
      skipped++;
      continue;
    }
    
    try {
      console.log(`[MIGRATE] Processing listing ${doc.id}: ${data.title}`);
      
      const crops = await generateCropsForImage(
        data.media.featured.url,
        'listings',
        doc.id
      );
      
      // Also process gallery images if they exist
      const galleryUpdates: any[] = [];
      if (data.media?.gallery && Array.isArray(data.media.gallery)) {
        for (let i = 0; i < data.media.gallery.length; i++) {
          const galleryItem = data.media.gallery[i];
          
          if (galleryItem.crops?.['1:1']) {
            galleryUpdates.push(galleryItem);
            continue;
          }
          
          if (galleryItem.url) {
            try {
              const galleryCrops = await generateCropsForImage(
                galleryItem.url,
                'listings',
                `${doc.id}-gallery-${i}`
              );
              
              galleryUpdates.push({
                ...galleryItem,
                crops: { '1:1': galleryCrops['1:1'] },
              });
            } catch (error: any) {
              console.error(`[MIGRATE] Failed to process gallery image ${i}:`, error.message);
              galleryUpdates.push(galleryItem);
            }
          } else {
            galleryUpdates.push(galleryItem);
          }
        }
      }
      
      const updateData: any = {
        'media.featured.crops': crops,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      if (galleryUpdates.length > 0) {
        updateData['media.gallery'] = galleryUpdates;
      }
      
      await doc.ref.update(updateData);
      
      console.log(`[MIGRATE] ✓ Successfully migrated listing ${doc.id}`);
      processed++;
    } catch (error: any) {
      console.error(`[MIGRATE] ✗ Failed to migrate listing ${doc.id}:`, error.message);
      failed++;
    }
  }
  
  console.log(`[MIGRATE] Listings migration complete: ${processed} processed, ${skipped} skipped, ${failed} failed`);
}

/**
 * Main migration function
 */
export async function migrateImagesToCrops() {
  console.log('[MIGRATE] Starting image migration to multi-aspect-ratio crops...');
  
  try {
    await migrateBlogPosts();
    await migrateListings();
    
    console.log('[MIGRATE] ✓ Migration complete!');
  } catch (error: any) {
    console.error('[MIGRATE] ✗ Migration failed:', error);
    throw error;
  }
}

// Cloud Function for manual trigger
export const migrateImages = onRequest(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
  },
  async (req, res) => {
    try {
      await migrateImagesToCrops();
      res.status(200).send('Migration completed successfully');
    } catch (error: any) {
      console.error('Migration error:', error);
      res.status(500).send(`Migration failed: ${error.message}`);
    }
  }
);

// For local execution
if (require.main === module) {
  migrateImagesToCrops()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
