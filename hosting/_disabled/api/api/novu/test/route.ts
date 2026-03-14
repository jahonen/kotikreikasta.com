import { NextResponse } from 'next/server';

const runtime = 'nodejs';
const dynamic = 'force-dynamic';

// Deprecated temporary test endpoint. Remove from client.
async function POST() {
  return NextResponse.json({ error: 'deprecated' }, { status: 410 });
}
