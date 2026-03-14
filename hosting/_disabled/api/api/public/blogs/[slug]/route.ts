import { NextResponse } from 'next/server';
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

async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  ensureAdminInitialized();
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw || '').trim();
  if (!slug) return NextResponse.json({ error: 'missing_slug' }, { status: 400 });

  try {
    const db = admin.firestore();
    let docSnap: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot | null = null;

    // Try by urlStub
    const byStub = await db.collection('blog_posts').where('urlStub', '==', slug).limit(1).get();
    if (!byStub.empty) {
      docSnap = byStub.docs[0];
    }
    // Fallback to document ID
    if (!docSnap) {
      const byId = await db.collection('blog_posts').doc(slug).get();
      if (byId.exists) docSnap = byId;
    }
    if (!docSnap || (('exists' in docSnap) && !docSnap.exists)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const data: any = 'data' in docSnap ? (docSnap as any).data() : (docSnap as any).data();
    if (data.status !== 'published') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const toIso = (ts: any) => {
      try { return ts?.toDate?.()?.toISOString?.() || null; } catch { return null; }
    };

    return NextResponse.json({
      id: 'id' in docSnap ? (docSnap as any).id : (docSnap as any).id,
      title: data.title || '',
      contentMd: data.contentMd || '',
      urlStub: data.urlStub || null,
      featuredImage: data.featuredImage || null,
      seo: data.seo || null,
      publishedAt: toIso(data.publishedAt),
      updatedAt: toIso(data.updatedAt),
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: e?.message || String(e) }, { status: 500 });
  }
}
