import { NextRequest, NextResponse } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import admin from 'firebase-admin';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleAuth } from 'google-auth-library';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ensureAdminInitialized() {
  if (!admin.apps.length) {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
      if (projectId) {
        admin.initializeApp({ projectId });
      } else {
        admin.initializeApp();
      }
    } catch (e: any) {
      const msg = e?.message || String(e || '');
      if (!/already exists/i.test(msg)) {
        console.error('[ADMIN_INIT] blogs/publish initialization failed:', e);
      }
    }
  }
}

function getBearerToken(req: NextRequest): string | null {
  const alt = req.headers.get('x-firebase-auth');
  if (alt) return alt;
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const parts = h.split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  return null;
}

async function readSecret(name: string): Promise<string> {
  const client = new SecretManagerServiceClient();
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const full = `projects/${project}/secrets/${name}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name: full });
  return version.payload?.data?.toString() ?? '';
}

async function generateSeoForMarkdown(md: string, title: string, imageUrl?: string): Promise<{ metaTitle: string; metaDescription: string; keywords: string[]; ogTitle: string; ogDescription: string; imageAlt: string; }>{
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
  const guide = (process.env.BLOG_LLM_GUIDE as string) || await readSecret('BLOG_LLM_GUIDE').catch(() => '');
  const model = (process.env.GEMINI_QUALITY_MODEL as string) || await readSecret('GEMINI_QUALITY_MODEL').catch(() => 'gemini-1.5-pro-002');
  const location = 'global';
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await (client as any).getAccessToken();
  const host = location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
  const sys = `You are an expert Finnish SEO editor. Follow the writing guide for tone and terminology. Respond with STRICT JSON only. No markdown, no comments, no code fences.\n\nWriting guide (for context):\n${guide}`;
  const usr = `Given the following blog post in Markdown, generate high-quality SEO metadata in Finnish.\n\nReturn JSON with keys: metaTitle, metaDescription, keywords (array of 5-12), ogTitle, ogDescription, imageAlt.\n\nArticle Title: ${title}\nImage URL (if any): ${imageUrl || ''}\n\nMarkdown content:\n${md}`;
  const body = {
    systemInstruction: { role: 'system', parts: [{ text: sys }] },
    contents: [{ role: 'user', parts: [{ text: usr }] }],
    generationConfig: { temperature: 0.4, candidateCount: 1 },
  } as any;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token.token || token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`vertex_error_${res.status}: ${err}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
  try {
    const parsed = JSON.parse(text);
    const metaTitle = String(parsed.metaTitle || title).slice(0, 70);
    const metaDescription = String(parsed.metaDescription || '').slice(0, 160);
    const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.map((k: any) => String(k)).slice(0, 12) : [];
    const ogTitle = String(parsed.ogTitle || title).slice(0, 90);
    const ogDescription = String(parsed.ogDescription || metaDescription).slice(0, 200);
    const imageAlt = String(parsed.imageAlt || title).slice(0, 120);
    return { metaTitle, metaDescription, keywords, ogTitle, ogDescription, imageAlt };
  } catch {
    const firstLine = (md.split(/\n/).find((l: string) => l.trim()) || '').slice(0, 120);
    return {
      metaTitle: title.slice(0, 70),
      metaDescription: firstLine.slice(0, 160),
      keywords: [],
      ogTitle: title.slice(0, 90),
      ogDescription: firstLine.slice(0, 200),
      imageAlt: `${title} – kuva`,
    };
  }
}

export async function POST(req: NextRequest) {
  ensureAdminInitialized();
  const app = admin.apps[0];

  const requestCookies = await nextCookies();
  let sessionCookie = requestCookies.get('__session')?.value as string | undefined;
  if (!sessionCookie) {
    const raw = req.headers.get('cookie') || '';
    const match = raw.split(';').map((p) => p.trim()).find((p) => p.startsWith('__session='));
    if (match) sessionCookie = match.split('=')[1];
  }
  let uid = '';
  let email = '';
  if (sessionCookie) {
    try {
      const decoded = await admin.auth(app).verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
      email = (decoded as any).email || '';
    } catch {}
  }
  let body: any = {};
  try { body = await req.json(); } catch {}

  if (!uid) {
    const token = getBearerToken(req) || body?.token;
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const decoded = await admin.auth(app).verifyIdToken(token);
      uid = decoded.uid;
      email = (decoded as any).email || '';
    } catch (e: any) {
      return NextResponse.json({ error: 'invalid_token', detail: e?.message || String(e) }, { status: 401 });
    }
  }
  if (!/@kotikreikasta\.com$/i.test(email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id: string = (body?.id || '').trim();
  const title: string = (body?.title || '').trim();
  const contentMd: string = (body?.contentMd || '').trim();
  const imageUrl: string | undefined = body?.imageUrl || undefined;
  if (!id || !title || !contentMd) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  try {
    console.log('[PUBLISH] Starting SEO generation', { id, titleLength: title.length, contentLength: contentMd.length, hasImage: !!imageUrl });
    const seo = await generateSeoForMarkdown(contentMd, title, imageUrl);
    console.log('[PUBLISH] SEO generated successfully', { 
      metaTitleLength: seo.metaTitle.length,
      metaDescLength: seo.metaDescription.length,
      keywordsCount: seo.keywords.length,
      ogTitleLength: seo.ogTitle.length,
      ogDescLength: seo.ogDescription.length,
      imageAltLength: seo.imageAlt.length
    });

    const db = admin.firestore(app);
    const docRef = db.collection('blog_posts').doc(id);
    console.log('[PUBLISH] Updating Firestore document', { id });
    await docRef.set({
      title,
      contentMd,
      featuredImage: imageUrl ? { url: imageUrl, alt: seo.imageAlt } : admin.firestore.FieldValue.delete(),
      seo: {
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
        keywords: seo.keywords,
        ogTitle: seo.ogTitle,
        ogDescription: seo.ogDescription,
      },
      status: 'published',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('[PUBLISH] Adding to publication queue with social media delay');
    const now = admin.firestore.Timestamp.now();
    const delayHours = 12 + Math.floor(Math.random() * 13); // 12-24 hours random
    const publishAfter = new admin.firestore.Timestamp(
      now.seconds + (delayHours * 3600),
      now.nanoseconds
    );
    
    await db.collection('publication_queue').add({
      contentType: 'blog_post',
      contentId: id,
      platforms: ['bluesky', 'x'],
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      publishAfter,
      delayHours,
      retryCount: 0,
    });
    console.log('[PUBLISH] Queue item created with delay', { delayHours, publishAfter: publishAfter.toDate() });

    // Trigger ISR revalidation on the public site
    console.log('[PUBLISH] Triggering ISR revalidation');
    const urlStub = body?.urlStub || '';
    if (urlStub) {
      try {
        const revalidateSecret = process.env.REVALIDATE_SECRET || 'default-secret-change-me';
        const publicSiteUrl = process.env.PUBLIC_SITE_URL || 'https://kotikreikasta.com';
        const revalidateRes = await fetch(`${publicSiteUrl}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            path: `/blog/${urlStub}`,
            type: 'blog',
            secret: revalidateSecret 
          }),
        });
        
        if (revalidateRes.ok) {
          const revalidateData = await revalidateRes.json();
          console.log('[PUBLISH] ISR revalidation succeeded', {
            paths: revalidateData.paths,
            blogPath: `/blog/${urlStub}`
          });
        } else {
          console.error('[PUBLISH] ISR revalidation returned error', {
            status: revalidateRes.status,
            statusText: revalidateRes.statusText
          });
        }
      } catch (revalidateErr: any) {
        console.error('[PUBLISH] ISR revalidation failed', {
          error: revalidateErr?.message,
          urlStub
        });
        // Don't fail the publish if revalidation fails
      }
    }

    console.log('[PUBLISH] Publish completed successfully', { id });
    return NextResponse.json({ ok: true, id, seo });
  } catch (e: any) {
    console.error('[PUBLISH] Publish failed:', {
      error: e?.message,
      stack: e?.stack?.substring(0, 500),
      name: e?.name,
    });
    return NextResponse.json({ error: 'publish_failed', detail: e?.message || String(e) }, { status: 500 });
  }
}
