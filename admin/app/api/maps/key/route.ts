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

export async function GET() {
  try {
    const key = await getGoogleMapsApiKey();
    if (!key) {
      return NextResponse.json({ error: 'missing_key' }, { status: 500 });
    }
    return NextResponse.json({ key });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: e?.message || String(e) }, { status: 500 });
  }
}
