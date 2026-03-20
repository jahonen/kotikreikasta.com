import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, secret, type } = body;

    // Verify secret to prevent unauthorized revalidation
    const revalidateSecret = process.env.REVALIDATE_SECRET || 'default-secret-change-me';
    if (secret !== revalidateSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const revalidatedPaths: string[] = [];

    // Revalidate the specified path
    try {
      revalidatePath(path);
      revalidatedPaths.push(path);
    } catch (err: any) {
      console.error('[REVALIDATE] Failed to revalidate path:', path, err?.message);
    }
    
    // Always revalidate the sitemap
    try {
      revalidatePath('/sitemap.xml');
      revalidatedPaths.push('/sitemap.xml');
    } catch (err: any) {
      console.error('[REVALIDATE] Failed to revalidate sitemap:', err?.message);
    }
    
    // Revalidate related pages based on content type
    if (path.startsWith('/blog/') || type === 'blog') {
      // Revalidate homepage (shows latest blogs)
      try {
        revalidatePath('/');
        revalidatedPaths.push('/');
      } catch (err: any) {
        console.error('[REVALIDATE] Failed to revalidate homepage:', err?.message);
      }
      
      // Revalidate blog list page
      try {
        revalidatePath('/blog');
        revalidatedPaths.push('/blog');
      } catch (err: any) {
        console.error('[REVALIDATE] Failed to revalidate /blog:', err?.message);
      }
    }
    
    if (path.startsWith('/listings/') || type === 'listing') {
      // Revalidate homepage (shows latest listings)
      try {
        revalidatePath('/');
        revalidatedPaths.push('/');
      } catch (err: any) {
        console.error('[REVALIDATE] Failed to revalidate homepage:', err?.message);
      }
      
      // Revalidate listings list page
      try {
        revalidatePath('/listings');
        revalidatedPaths.push('/listings');
      } catch (err: any) {
        console.error('[REVALIDATE] Failed to revalidate /listings:', err?.message);
      }
    }

    return NextResponse.json({ 
      revalidated: true, 
      paths: Array.from(new Set(revalidatedPaths)), // Remove duplicates
      now: Date.now() 
    });
  } catch (err: any) {
    console.error('[REVALIDATE] Unexpected error:', err);
    return NextResponse.json({ error: 'Error revalidating', detail: err?.message }, { status: 500 });
  }
}
