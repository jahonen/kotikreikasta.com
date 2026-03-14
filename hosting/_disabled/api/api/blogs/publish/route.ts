import { NextRequest, NextResponse } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import admin from 'firebase-admin';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleAuth } from 'google-auth-library';

const runtime = 'nodejs';
const dynamic = 'force-dynamic';

function ensureAdminInitialized() {
  if (!admin.apps.length) {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || undefined;
      const cred = (admin.credential as any).applicationDefault?.();
      if (cred) {
        admin.initializeApp(projectId ? { credential: cred, projectId } as any : { credential: cred } as any);
      } else {
        admin.initializeApp(projectId ? ({ projectId } as any) : undefined as any);
      }
    } catch {}
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
  const location = 'europe-west1';
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await (client as any).getAccessToken();
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
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
    // Fallback heuristic
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

async function POST(req: NextRequest) {
  ensureAdminInitialized();

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
      const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
      email = (decoded as any).email || '';
    } catch {}
  }
  if (!uid) {
    let token = getBearerToken(req);
    if (!token) {
      try { const b: any = await req.json(); token = b?.token; } catch {}
    }
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      uid = decoded.uid;
      email = (decoded as any).email || '';
    } catch (e: any) {
      return NextResponse.json({ error: 'invalid_token', detail: e?.message || String(e) }, { status: 401 });
    }
  }
  if (!/@kotikreikasta\.com$/i.test(email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const id: string = (body?.id || '').trim();
  const title: string = (body?.title || '').trim();
  const contentMd: string = (body?.contentMd || '').trim();
  const imageUrl: string | undefined = body?.imageUrl || undefined;
  if (!id || !title || !contentMd) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  try {
    const seo = await generateSeoForMarkdown(contentMd, title, imageUrl);

    const db = admin.firestore();
    const docRef = db.collection('blog_posts').doc(id);
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
      status: 'queued',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Push to publication queue
    await db.collection('publication_queue').add({
      type: 'blog_post',
      action: 'publish',
      blogId: id,
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      seo,
    });

    return NextResponse.json({ ok: true, id, seo });
  } catch (e: any) {
    return NextResponse.json({ error: 'publish_failed', detail: e?.message || String(e) }, { status: 500 });
  }
}
