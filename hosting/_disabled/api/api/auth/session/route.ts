import { NextRequest, NextResponse } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import admin from 'firebase-admin';

const runtime = 'nodejs';
const dynamic = 'force-dynamic';

// Initialize Admin once at module scope using the single-package import to avoid multi-copy issues
let __adminInitError: Error | null = null;
let __adminProjectId: string | null = null;
function resolveEnvProjectId(): string | null {
  try {
    if (process.env.FIREBASE_CONFIG) {
      const cfg = JSON.parse(process.env.FIREBASE_CONFIG);
      if (cfg?.projectId) return String(cfg.projectId);
    }
  } catch {}
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    null
  );
}
try {
  if (!admin.apps.length) {
    // Prefer ADC if present; otherwise let Admin SDK auto-discover project
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || undefined;
    const cred = admin.credential.applicationDefault?.();
    if (cred) {
      admin.initializeApp(projectId ? { credential: cred, projectId } as any : { credential: cred } as any);
    } else {
      admin.initializeApp(projectId ? ({ projectId } as any) : undefined as any);
    }
  }
  __adminProjectId = admin.apps.length
    ? ((admin.app().options as any)?.projectId || null)
    : resolveEnvProjectId();
  __adminInitError = null;
} catch (e: any) {
  __adminInitError = new Error(e?.message || String(e));
  try { console.error('ADMIN_INIT_ERROR', e); } catch {}
}

function ensureAdminInitialized() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp();
      __adminInitError = null;
    } catch (e: any) {
      // ignore duplicate-app errors; rethrow others
      const msg = e?.message || String(e || '');
      if (!/already exists/i.test(msg)) {
        throw e;
      }
    }
  }
}

async function POST(req: NextRequest) {
  try {
    try { ensureAdminInitialized(); } catch (e: any) {
      return NextResponse.json({
        error: 'admin_init_failed',
        detail: e?.message || String(e),
        diagnostics: {
          appsCount: admin.apps.length,
          projectId: __adminProjectId,
        },
      }, { status: 500 });
    }
    // If we have an app now, clear any stale init error from module load
    if (__adminInitError && admin.apps.length) {
      __adminInitError = null;
    }
    let idToken = '';
    try {
      const body: any = await req.json();
      idToken = body?.idToken || body?.token || '';
    } catch {}
    if (!idToken) {
      return NextResponse.json({ error: 'missing_id_token' }, { status: 400 });
    }
    if (__adminInitError && !admin.apps.length) {
      return NextResponse.json({
        error: 'admin_init_failed',
        detail: __adminInitError.message,
        diagnostics: {
          appsCount: admin.apps.length,
          projectId: __adminProjectId,
          envProject: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || null,
          hasADCEnv: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        },
      }, { status: 500 });
    }
    const adminProject = admin.apps.length ? ((admin.app().options as any)?.projectId || __adminProjectId) : __adminProjectId;
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch (e: any) {
      return NextResponse.json({ error: 'invalid_id_token', detail: e?.message || String(e), adminProject }, { status: 401 });
    }
    try {
      const fiveDays = 5 * 24 * 60 * 60 * 1000;
      const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn: fiveDays });
      const res = NextResponse.json({ ok: true, adminProject });
      res.cookies.set('__session', sessionCookie, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: fiveDays / 1000,
      });
      return res;
    } catch (e: any) {
      return NextResponse.json({ error: 'session_create_failed', detail: e?.message || String(e), adminProject }, { status: 401 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected_error', detail: e?.message || String(e) }, { status: 500 });
  }
}

async function DELETE() {
  // Clear cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set('__session', '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
  });
  return res;
}

async function GET(req: NextRequest) {
  const requestCookies = await nextCookies();
  const raw = req.headers.get('cookie') || '';
  const sessionCookie = requestCookies.get('__session')?.value || (raw.split(';').map((p) => p.trim()).find((p) => p.startsWith('__session='))?.split('=')[1] ?? '');
  try { ensureAdminInitialized(); } catch (e: any) {
    return NextResponse.json({ ok: false, hadCookie: !!sessionCookie, error: 'admin_init_failed', detail: e?.message || String(e), adminProject: __adminProjectId }, { status: 200 });
  }
  if (__adminInitError && admin.apps.length) {
    __adminInitError = null;
  }
  if (__adminInitError) {
    return NextResponse.json({
      ok: false,
      hadCookie: !!sessionCookie,
      error: 'admin_init_failed',
      detail: __adminInitError.message,
      adminProject: __adminProjectId,
      host: req.headers.get('host') || null,
      diagnostics: {
        appsCount: admin.apps.length,
        envProject: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || null,
        hasADCEnv: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      },
    }, { status: 200 });
  }
  const adminProject = admin.apps.length ? ((admin.app().options as any)?.projectId || __adminProjectId) : __adminProjectId;
  if (!sessionCookie) {
    return NextResponse.json({ ok: false, hadCookie: false, adminProject, host: req.headers.get('host') || null }, { status: 200 });
  }
  try {
    const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    return NextResponse.json({ ok: true, hadCookie: true, uid: decoded.uid, email: (decoded as any).email || null, adminProject }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, hadCookie: true, error: 'invalid_session', detail: e?.message || String(e), adminProject }, { status: 200 });
  }
}
