import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { optimizeImage } from '../../../lib/image-optimizer';

function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'kotikreikasta.firebasestorage.app',
  });
}

const ALLOWED_PATH_PREFIXES = ['media/public/', 'media/admin/', 'blog/', 'blog-images/', 'listings/'];

function getBearerToken(req: NextRequest): string | null {
  const alt = req.headers.get('x-firebase-auth');
  if (alt) return alt;
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function POST(request: NextRequest) {
  try {
    const app = getFirebaseAdmin();

    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    let email = '';
    try {
      const decoded = await admin.auth(app).verifyIdToken(token);
      email = (decoded as any).email || '';
    } catch (e: any) {
      return NextResponse.json({ error: 'invalid_token', detail: e?.message || String(e) }, { status: 401 });
    }
    if (!/@kotikreikasta\.com$/i.test(email)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

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

    const normalizedPath = path.replace(/^\/+/, '');
    if (normalizedPath.includes('..') || !ALLOWED_PATH_PREFIXES.some((p) => normalizedPath.startsWith(p) || `${normalizedPath}/`.startsWith(p))) {
      return NextResponse.json({ error: 'invalid_path', allowed: ALLOWED_PATH_PREFIXES }, { status: 400 });
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
    const fullPath = `${normalizedPath}/${fileName}`;

    // Upload to Firebase Storage
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'kotikreikasta.firebasestorage.app';
    const bucket = admin.storage(app).bucket(bucketName);
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
