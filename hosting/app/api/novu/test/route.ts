import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Deprecated temporary test endpoint. Remove from client.
export async function POST() {
  return NextResponse.json({ error: 'deprecated' }, { status: 410 });
}
