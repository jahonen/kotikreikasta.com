import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { jwtVerify, importJWK, type JWK } from 'jose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROJECT_NUMBER = '854585552743';
const IAP_JWK_URL = 'https://www.gstatic.com/iap/verify/public_key-jwk';

let initialized = false;
let jwkCache: { keys: JWK[]; fetchedAt: number } | null = null;

function ensureAdminInitialized() {
  if (!initialized && !admin.apps.length) {
    const projectId =
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT;
    projectId ? admin.initializeApp({ projectId }) : admin.initializeApp();
    initialized = true;
  }
}

function decodeJwtPayload(token: string): any {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  } catch {
    return {};
  }
}

function decodeJwtHeader(token: string): any {
  try {
    return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
  } catch {
    return {};
  }
}

async function getIapJwks(): Promise<JWK[]> {
  const now = Date.now();
  if (jwkCache && now - jwkCache.fetchedAt < 60 * 60 * 1000) {
    return jwkCache.keys;
  }
  const res = await fetch(IAP_JWK_URL);
  const data = await res.json();
  const keys: JWK[] = data.keys ?? [];
  jwkCache = { keys, fetchedAt: now };
  return keys;
}

async function verifyIapJwt(iapJwt: string): Promise<{ email: string; sub: string }> {
  const header = decodeJwtHeader(iapJwt);
  const payload = decodeJwtPayload(iapJwt);
  const audience: string = payload.aud || '';

  if (!audience.startsWith(`/projects/${PROJECT_NUMBER}/`)) {
    throw new Error(`IAP JWT audience "${audience}" does not belong to project ${PROJECT_NUMBER}`);
  }

  const keys = await getIapJwks();
  const matchingKey = keys.find((k) => k.kid === header.kid);
  if (!matchingKey) {
    throw new Error(`No IAP public key found for kid: ${header.kid}`);
  }

  const publicKey = await importJWK(matchingKey, 'ES256');
  const { payload: verified } = await jwtVerify(iapJwt, publicKey, {
    audience,
    issuer: 'https://cloud.google.com/iap',
  });

  const email = (verified as any).email as string | undefined;
  const sub = verified.sub as string | undefined;
  if (!email || !sub) {
    throw new Error('IAP JWT missing email or sub claim');
  }
  return { email, sub };
}

export async function GET(req: NextRequest) {
  const iapJwt =
    req.headers.get('x-goog-iap-jwt-assertion') ||
    req.headers.get('X-Goog-IAP-JWT-Assertion');

  if (!iapJwt) {
    return NextResponse.json(
      { error: 'missing_iap_jwt', detail: 'Not behind IAP or JWT header absent' },
      { status: 401 }
    );
  }

  let email: string;
  let sub: string;
  try {
    ({ email, sub } = await verifyIapJwt(iapJwt));
  } catch (e: any) {
    return NextResponse.json(
      { error: 'invalid_iap_jwt', detail: e?.message || String(e) },
      { status: 401 }
    );
  }

  if (!email.endsWith('@kotikreikasta.com')) {
    return NextResponse.json(
      { error: 'unauthorized_domain', detail: `${email} is not a @kotikreikasta.com account` },
      { status: 403 }
    );
  }

  try {
    ensureAdminInitialized();
    const uid = `iap:${sub}`;
    const customToken = await admin.auth().createCustomToken(uid, {
      email,
      iap: true,
    });
    return NextResponse.json({ customToken, email, uid });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'token_mint_failed', detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
