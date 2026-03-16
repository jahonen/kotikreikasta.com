import { NextRequest, NextResponse } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import admin from 'firebase-admin';
import { Novu } from '@novu/node';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

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
        console.error('[ADMIN_INIT] novu/events/listing-created initialization failed:', e);
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

async function getNovuApiKey(): Promise<string> {
  if (process.env.NOVU_API_KEY) return process.env.NOVU_API_KEY as string;
  const client = new SecretManagerServiceClient();
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const name = `projects/${project}/secrets/NOVU_API_KEY/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });
  return version.payload?.data?.toString() ?? '';
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
      try {
        const body: any = await req.json();
        if (body?.token) token = String(body.token);
      } catch {}
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

  if (!email || !/@kotikreikasta\.com$/i.test(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const listingId = body?.listingId || '';
  const title = body?.title || '';

  try {
    const apiKey = await getNovuApiKey();
    if (!apiKey) return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });
    const backendUrl = process.env.NEXT_PUBLIC_NOVU_BACKEND_URL as string | undefined;
    const novu = new Novu(apiKey, ...(backendUrl ? [{ backendUrl }] : [{}] as any));

    await novu.trigger('listing-created', {
      to: { subscriberId: uid },
      payload: {
        listingId,
        title,
        createdBy: uid,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'trigger_failed', detail: e?.message || String(e) }, { status: 500 });
  }
}
