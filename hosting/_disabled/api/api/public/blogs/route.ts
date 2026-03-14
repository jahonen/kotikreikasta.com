import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

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

async function GET(_req: NextRequest) {
  ensureAdminInitialized();
  try {
    const db = admin.firestore();
    const snap = await db
      .collection('blog_posts')
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .limit(500)
      .get();
    const toIso = (ts: any) => {
      try { return ts?.toDate?.()?.toISOString?.() || null; } catch { return null; }
    };
    const items = snap.docs.map((d) => {
      const data: any = d.data() || {};
      return {
        id: d.id,
        urlStub: data.urlStub || null,
        updatedAt: toIso(data.updatedAt) || toIso(data.publishedAt),
      };
    });
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: e?.message || String(e) }, { status: 500 });
  }
}
