import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { optimizeImage } from '../../../lib/image-optimizer';

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  admin.initializeApp({
    credential: serviceAccount 
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = admin.storage().bucket();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;
    const preset = (formData.get('preset') as string) || 'blogThumbnail';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!path) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 });
    }

    console.log('[UPLOAD] Processing image', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      path,
      preset,
    });

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Optimize image using our image optimizer
    const optimized = await optimizeImage(buffer, preset as any);

    console.log('[UPLOAD] Image optimized', {
      originalSize: file.size,
      optimizedSize: optimized.size,
      compressionRatio: `${((1 - optimized.size / file.size) * 100).toFixed(1)}%`,
      width: optimized.width,
      height: optimized.height,
      format: optimized.format,
    });

    // Determine file extension based on optimized format
    const ext = optimized.format === 'jpeg' ? 'jpg' : optimized.format;
    const fileName = `${Date.now()}-${file.name.replace(/\.[^.]+$/, '')}.${ext}`;
    const fullPath = `${path}/${fileName}`;

    // Upload to Firebase Storage
    const fileRef = bucket.file(fullPath);
    await fileRef.save(optimized.buffer, {
      metadata: {
        contentType: optimized.contentType,
        metadata: {
          originalName: file.name,
          originalSize: file.size.toString(),
          optimizedSize: optimized.size.toString(),
          width: optimized.width.toString(),
          height: optimized.height.toString(),
        },
      },
    });

    // Make file publicly accessible
    await fileRef.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fullPath}`;

    console.log('[UPLOAD] Upload successful', {
      path: fullPath,
      url: publicUrl,
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      metadata: {
        originalSize: file.size,
        optimizedSize: optimized.size,
        width: optimized.width,
        height: optimized.height,
        format: optimized.format,
      },
    });

  } catch (error: any) {
    console.error('[UPLOAD] Upload failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
    });

    return NextResponse.json(
      { error: 'Upload failed', detail: error?.message },
      { status: 500 }
    );
  }
}
