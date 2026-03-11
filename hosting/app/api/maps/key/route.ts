import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  if (!key) {
    return NextResponse.json({ error: 'missing_key' }, { status: 500 });
  }
  return NextResponse.json({ key });
}
