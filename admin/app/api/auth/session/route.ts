import { NextRequest, NextResponse } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

async function ensureAdminInitialized() {
  if (!admin.apps.length) {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
      console.log('[ADMIN_INIT] Attempting to initialize Firebase Admin SDK', {
        projectId,
        nodeEnv: process.env.NODE_ENV,
      });
      
      // Simply use Application Default Credentials - the Cloud Run service account
      // has firebase.admin role and can impersonate firebase-adminsdk-fbsvc
      if (projectId) {
        admin.initializeApp({
          projectId,
        });
      } else {
        admin.initializeApp();
      }
      
      console.log('[ADMIN_INIT] Firebase Admin SDK initialized successfully', {
        appsCount: admin.apps.length,
        hasDefaultApp: admin.apps.length > 0,
      });
      __adminInitError = null;
      
      // Get projectId from the initialized app
      if (admin.apps.length > 0) {
        try {
          const app = admin.apps[0];
          __adminProjectId = (app?.options as any)?.projectId || resolveEnvProjectId();
          console.log('[ADMIN_INIT] Retrieved projectId from app:', __adminProjectId);
        } catch (appErr: any) {
          console.error('[ADMIN_INIT] Error accessing app options:', appErr?.message);
          __adminProjectId = resolveEnvProjectId();
        }
      } else {
        __adminProjectId = resolveEnvProjectId();
      }
    } catch (e: any) {
      const msg = e?.message || String(e || '');
      console.error('[ADMIN_INIT] Firebase Admin SDK initialization failed', {
        error: msg,
        stack: e?.stack,
        projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT,
      });
      if (!/already exists/i.test(msg)) {
        __adminInitError = new Error(msg);
        __adminProjectId = resolveEnvProjectId();
        throw e;
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[SESSION_POST] Starting POST handler');
    try { 
      console.log('[SESSION_POST] About to call ensureAdminInitialized');
      await ensureAdminInitialized(); 
      console.log('[SESSION_POST] ensureAdminInitialized completed successfully');
    } catch (e: any) {
      console.error('[SESSION_POST] ensureAdminInitialized threw error:', e?.message);
      return NextResponse.json({
        error: 'admin_init_failed',
        detail: e?.message || String(e),
        diagnostics: {
          appsCount: admin.apps.length,
          projectId: __adminProjectId,
          envProject: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || null,
          hasFirebaseConfig: !!process.env.FIREBASE_CONFIG,
          errorStack: e?.stack?.substring(0, 500),
        },
      }, { status: 500 });
    }
    if (!admin.apps.length) {
      return NextResponse.json({
        error: 'admin_not_initialized',
        detail: 'Firebase Admin SDK failed to initialize',
        diagnostics: {
          appsCount: admin.apps.length,
          projectId: __adminProjectId,
          initError: __adminInitError?.message || null,
        },
      }, { status: 500 });
    }
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
    let adminProject = __adminProjectId;
    let app = admin.apps[0];
    if (admin.apps.length > 0) {
      adminProject = (app?.options as any)?.projectId || __adminProjectId;
    }
    try {
      await admin.auth(app).verifyIdToken(idToken);
    } catch (e: any) {
      return NextResponse.json({ error: 'invalid_id_token', detail: e?.message || String(e), adminProject }, { status: 401 });
    }
    try {
      const fiveDays = 5 * 24 * 60 * 60 * 1000;
      const sessionCookie = await admin.auth(app).createSessionCookie(idToken, { expiresIn: fiveDays });
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

export async function DELETE() {
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

export async function GET(req: NextRequest) {
  const requestCookies = await nextCookies();
  const raw = req.headers.get('cookie') || '';
  const sessionCookie = requestCookies.get('__session')?.value || (raw.split(';').map((p) => p.trim()).find((p) => p.startsWith('__session='))?.split('=')[1] ?? '');
  try { await ensureAdminInitialized(); } catch (e: any) {
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
  let adminProject = __adminProjectId;
  let app = admin.apps[0];
  if (admin.apps.length > 0) {
    adminProject = (app?.options as any)?.projectId || __adminProjectId;
  }
  if (!sessionCookie) {
    return NextResponse.json({ ok: false, hadCookie: false, adminProject, host: req.headers.get('host') || null }, { status: 200 });
  }
  try {
    const decoded = await admin.auth(app).verifySessionCookie(sessionCookie, true);
    return NextResponse.json({ ok: true, hadCookie: true, uid: decoded.uid, email: (decoded as any).email || null, adminProject }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, hadCookie: true, error: 'invalid_session', detail: e?.message || String(e), adminProject }, { status: 200 });
  }
}
