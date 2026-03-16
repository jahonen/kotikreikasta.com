import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

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

function makeCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
  return `${name}=${value}; Path=/; HttpOnly; ${secure}SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export async function POST(req: NextRequest) {
  ensureAdminInitialized();
  let body: any = {};
  try { body = await req.json(); } catch {}
  const idToken = String(body?.idToken || '');
  if (!idToken) return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  try {
    const decoded = await admin.auth().verifyIdToken(idToken, true);
    if (!decoded?.uid) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in ms
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
    const res = NextResponse.json({ ok: true, uid: decoded.uid });
    res.headers.set('Set-Cookie', makeCookie('__session', sessionCookie, Math.floor(expiresIn / 1000)));
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: 'verify_failed', detail: e?.message || String(e) }, { status: 401 });
  }
}

export async function GET(req: NextRequest) {
  ensureAdminInitialized();
  const cookie = req.cookies.get('__session')?.value;
  if (!cookie) return NextResponse.json({ ok: false });
  try {
    const decoded = await admin.auth().verifySessionCookie(cookie, true);
    return NextResponse.json({ ok: true, uid: decoded.uid, email: (decoded as any)?.email || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false });
  }
}

export async function DELETE(req: NextRequest) {
  ensureAdminInitialized();
  const cookie = req.cookies.get('__session')?.value;
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', makeCookie('__session', '', 0));
  if (cookie) {
    try { const decoded = await admin.auth().verifySessionCookie(cookie, true); await admin.auth().revokeRefreshTokens(decoded.sub); } catch {}
  }
  return res;
}
