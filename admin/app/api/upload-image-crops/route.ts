import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import sharp from 'sharp';

// Initialize Firebase Admin SDK
function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : undefined;

    return admin.initializeApp({
      credential: serviceAccount 
        ? admin.credential.cert(serviceAccount)
        : admin.credential.applicationDefault(),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'kotikreikasta.firebasestorage.app',
    });
  } catch (error) {
    console.error('[FIREBASE_ADMIN] Initialization failed', error);
    throw error;
  }
}

function getBucket() {
  const app = getFirebaseAdmin();
  return admin.storage(app).bucket();
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropCoordinates {
  '16:9': CropArea;
  '4:3': CropArea;
  '1:1': CropArea;
  '3:4': CropArea;
  '9:16': CropArea;
}

const ASPECT_RATIO_DIMENSIONS = {
  '16:9': { width: 2868, height: 1613 },
  '4:3': { width: 2868, height: 2151 },
  '1:1': { width: 2868, height: 2868 },
  '3:4': { width: 2151, height: 2868 },
  '9:16': { width: 1613, height: 2868 },
};

const IMAGE_SIZES = {
  full: { maxWidth: 2868, maxHeight: 2868, quality: 85, suffix: '' },
  og: { maxWidth: 1200, maxHeight: 1200, quality: 85, suffix: '-og' },
  thumbnail: { maxWidth: 400, maxHeight: 400, quality: 80, suffix: '-thumb' },
};

async function extractCrop(
  imageBuffer: Buffer,
  cropArea: CropArea,
  maxWidth: number,
  maxHeight: number,
  quality: number = 85
): Promise<Buffer> {
  // Get image metadata to validate crop area
  const metadata = await sharp(imageBuffer).metadata();
  const imageWidth = metadata.width || 0;
  const imageHeight = metadata.height || 0;

  // Validate and clamp crop coordinates
  const left = Math.max(0, Math.min(Math.round(cropArea.x), imageWidth - 1));
  const top = Math.max(0, Math.min(Math.round(cropArea.y), imageHeight - 1));
  const width = Math.max(1, Math.min(Math.round(cropArea.width), imageWidth - left));
  const height = Math.max(1, Math.min(Math.round(cropArea.height), imageHeight - top));

  console.log('[EXTRACT_CROP] Validated crop area', {
    original: cropArea,
    validated: { left, top, width, height },
    imageSize: { width: imageWidth, height: imageHeight },
  });

  const pipeline = sharp(imageBuffer)
    .rotate() // Auto-rotate based on EXIF before cropping
    .extract({ left, top, width, height })
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality,
      progressive: true,
      mozjpeg: true,
    });

  return pipeline.toBuffer();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const cropsJson = formData.get('crops') as string;
    const path = formData.get('path') as string;
    const docId = formData.get('docId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!cropsJson) {
      return NextResponse.json({ error: 'No crop coordinates provided' }, { status: 400 });
    }

    if (!path || !docId) {
      return NextResponse.json({ error: 'Path and docId required' }, { status: 400 });
    }

    const crops: CropCoordinates = JSON.parse(cropsJson);

    console.log('[UPLOAD_CROPS] Processing image with crops', {
      fileName: file.name,
      fileSize: file.size,
      path,
      docId,
    });

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // Optimize and upload original
    const optimizedOriginal = await sharp(originalBuffer)
      .rotate() // Auto-rotate based on EXIF
      .jpeg({
        quality: 90,
        progressive: true,
        mozjpeg: true,
      })
      .toBuffer();

    const bucket = getBucket();
    const originalPath = `${path}/${docId}/original.jpg`;
    const originalRef = bucket.file(originalPath);
    
    // Generate a download token for public access
    const downloadToken = require('crypto').randomBytes(32).toString('hex');
    
    await originalRef.save(optimizedOriginal, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          originalName: file.name,
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });
    
    const originalUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(originalPath)}?alt=media&token=${downloadToken}`;

    console.log('[UPLOAD_CROPS] Original uploaded', { url: originalUrl });

    // Process and upload each crop in 3 sizes
    const cropUrls: Record<string, any> = {};
    
    for (const [ratio, cropArea] of Object.entries(crops)) {
      const dimensions = ASPECT_RATIO_DIMENSIONS[ratio as keyof typeof ASPECT_RATIO_DIMENSIONS];
      
      console.log('[UPLOAD_CROPS] Processing crop', {
        ratio,
        cropArea,
        targetDimensions: dimensions,
      });

      cropUrls[ratio] = {};

      // Generate 3 sizes for each aspect ratio
      for (const [sizeName, sizeConfig] of Object.entries(IMAGE_SIZES)) {
        const croppedBuffer = await extractCrop(
          originalBuffer,
          cropArea,
          Math.min(dimensions.width, sizeConfig.maxWidth),
          Math.min(dimensions.height, sizeConfig.maxHeight),
          sizeConfig.quality
        );

        const cropPath = `${path}/${docId}/${ratio.replace(':', '-')}${sizeConfig.suffix}.jpg`;
        const cropRef = bucket.file(cropPath);
        
        // Generate a download token for public access
        const cropToken = require('crypto').randomBytes(32).toString('hex');
        
        await cropRef.save(croppedBuffer, {
          metadata: {
            contentType: 'image/jpeg',
            metadata: {
              aspectRatio: ratio,
              size: sizeName,
              originalName: file.name,
              firebaseStorageDownloadTokens: cropToken,
            },
          },
        });
        
        cropUrls[ratio][sizeName] = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(cropPath)}?alt=media&token=${cropToken}`;
        
        console.log('[UPLOAD_CROPS] Crop uploaded', {
          ratio,
          size: sizeName,
          url: cropUrls[ratio][sizeName],
        });
      }
    }

    console.log('[UPLOAD_CROPS] All crops uploaded successfully');

    return NextResponse.json({
      success: true,
      original: originalUrl,
      crops: cropUrls,
    });

  } catch (error: any) {
    console.error('[UPLOAD_CROPS] Upload failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
    });

    return NextResponse.json(
      { error: 'Upload failed', detail: error?.message },
      { status: 500 }
    );
  }
}
