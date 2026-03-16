import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, secret } = body;

    // Verify secret to prevent unauthorized revalidation
    const revalidateSecret = process.env.REVALIDATE_SECRET || 'default-secret-change-me';
    if (secret !== revalidateSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    // Revalidate the specified path
    revalidatePath(path);
    
    // Also revalidate the sitemap
    revalidatePath('/sitemap.xml');
    
    // Revalidate homepage if it's a blog post (to update latest blogs)
    if (path.startsWith('/blog/')) {
      revalidatePath('/');
    }

    return NextResponse.json({ 
      revalidated: true, 
      paths: [path, '/sitemap.xml', path.startsWith('/blog/') ? '/' : null].filter(Boolean),
      now: Date.now() 
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error revalidating', detail: err?.message }, { status: 500 });
  }
}
