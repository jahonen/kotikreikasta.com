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

async function resolveProjectId(): Promise<string> {
  // 1) Prefer explicit env
  const envProject = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  if (envProject) return envProject;
  // 2) Try firebase-admin app options
  try {
    if (admin.apps.length) {
      const p = (admin.app().options as any)?.projectId;
      if (p) return String(p);
    }
  } catch {}
  // 3) Ask GoogleAuth (ADC) for project
  try {
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const p = await auth.getProjectId();
    if (p) return String(p);
  } catch {}
  return '';
}

async function readSecret(name: string, projectOverride?: string): Promise<string> {
  const client = new SecretManagerServiceClient();
  const project = projectOverride || (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT) || await resolveProjectId();
  const full = `projects/${project}/secrets/${name}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name: full });
  return version.payload?.data?.toString() ?? '';
}

function extractTitleFromMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(/^#\s+(.+)/);
    if (m) return m[1].trim();
  }
  return '';
}

async function generateMarkdown(description: string, guide: string, model: string, project: string, location = 'europe-west1'): Promise<string> {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await (client as any).getAccessToken();
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
  const system = `You are an expert Finnish real-estate content writer. Follow the writing guide strictly. Output valid GitHub-flavored Markdown only, with a single H1 title, well-structured sections, and no frontmatter.\n\nWriting guide:\n${guide}`;
  const user = `Write a blog article in Finnish based on this description. Audience: Finnish property buyers interested in Greece. Keep it factual, warm, and persuasive when appropriate.\n\nDescription:\n${description}`;
  const body = {
    systemInstruction: { role: 'system', parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 0.7, candidateCount: 1 },
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
  return text.trim();
}

export async function POST(req: NextRequest) {
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
  const description: string = (body?.description || '').trim();
  if (!description) return NextResponse.json({ error: 'missing_description' }, { status: 400 });

  const project = (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT) || await resolveProjectId();
  if (!project) {
    return NextResponse.json({ error: 'draft_failed', detail: 'missing_project_id' }, { status: 500 });
  }
  const guide = (process.env.BLOG_LLM_GUIDE as string) || await readSecret('BLOG_LLM_GUIDE', project).catch(() => '');
  const model = (process.env.GEMINI_COSTOPTIMIZED_MODEL as string) || await readSecret('GEMINI_COSTOPTIMIZED_MODEL', project).catch(() => 'gemini-1.5-flash-002');

  try {
    const md = await generateMarkdown(description, guide, model, project);
    const title = extractTitleFromMarkdown(md) || 'Blogiartikkeli';

    const db = admin.firestore();
    let urlStub = (title || 'artikkeli').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'artikkeli';
    let finalStub = urlStub;
    const coll = db.collection('blog_posts');
    const existing = await coll.where('urlStub', '==', finalStub).limit(1).get();
    if (!existing.empty) finalStub = `${urlStub}-2`;

    const docRef = await coll.add({
      title,
      contentMd: md,
      urlStub: finalStub,
      status: 'draft',
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: docRef.id, title, contentMd: md, urlStub: finalStub });
  } catch (e: any) {
    return NextResponse.json({ error: 'draft_failed', detail: e?.message || String(e) }, { status: 500 });
  }
}
