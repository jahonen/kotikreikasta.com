import { NextResponse } from 'next/server';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG as string).projectId;
    if (!projectId) {
      return NextResponse.json({ error: 'Project not detected' }, { status: 500 });
    }

    const client = new SecretManagerServiceClient();
    const name = `projects/${projectId}/secrets/MAPS_JS_BROWSER_KEY/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const key = (version as any).payload?.data?.toString() ?? (version as any).payload?.data;

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    const res = NextResponse.json({ key });
    res.headers.set('Cache-Control', 'private, max-age=300');
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to read key' }, { status: 500 });
  }
}
