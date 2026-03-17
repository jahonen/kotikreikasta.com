import { NextResponse } from 'next/server';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const client = new SecretManagerServiceClient();

async function getGoogleMapsApiKey(): Promise<string | null> {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'kotikreikasta';
    const name = `projects/${projectId}/secrets/GOOGLE_MAPS_API_KEY/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const payload = version?.payload?.data;
    if (!payload) return null;
    return Buffer.isBuffer(payload) ? payload.toString('utf8') : String(payload);
  } catch (e: any) {
    console.error('Failed to fetch GOOGLE_MAPS_API_KEY from Secret Manager:', e?.message || String(e));
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const lat = Number(body?.center?.lat);
    const lng = Number(body?.center?.lng);
    let radius = Number(body?.radius ?? 2000);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'invalid_center' }, { status: 400 });
    }
    if (!Number.isFinite(radius) || radius <= 0) radius = 2000;
    radius = Math.max(50, Math.min(5000, Math.floor(radius)));

    // Try Secret Manager first (production), fallback to env var (local dev)
    let key = await getGoogleMapsApiKey();
    if (!key) {
      key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
    }
    if (!key) {
      return NextResponse.json({ error: 'missing_key' }, { status: 500 });
    }

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.primaryType',
      'places.types',
      'places.location',
    ].join(',');

    const payload = {
      maxResultCount: 20,
      rankPreference: 'POPULARITY',
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
    } as const;

    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(payload),
      // Resist caching to keep results fresh in admin wizard
      cache: 'no-store',
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return NextResponse.json({ error: 'upstream_error', status: res.status, detail: txt.slice(0, 500) }, { status: 502 });
    }

    const data = await res.json().catch(() => ({}));
    const places = Array.isArray((data as any)?.places) ? (data as any).places : [];
    return NextResponse.json({ places });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: e?.message || String(e) }, { status: 500 });
  }
}
