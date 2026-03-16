'use client';
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAuth as _getAuth, type Auth } from 'firebase/auth';

const envConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
const hasEnvConfig = Boolean(envConfig.apiKey && envConfig.appId && envConfig.projectId);

let appInstance: FirebaseApp | null = null;
let initPromise: Promise<boolean> | null = null;

async function initIfNeeded(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (appInstance) return true;
  if (getApps().length) {
    appInstance = getApp();
    return true;
  }
  if (hasEnvConfig) {
    appInstance = initializeApp(envConfig as any);
    return true;
  }
  if (!initPromise) {
    initPromise = (async () => {
      // Try local Hosting-injected config first (not available in Next dev)
      try {
        const r = await fetch('/__/firebase/init.json');
        if (r.ok) {
          const cfg = await r.json();
          appInstance = initializeApp(cfg);
          return true;
        }
      } catch {}
      // Dev fallback: fetch project config from the deployed public site
      try {
        const r2 = await fetch('https://kotikreikasta.web.app/__/firebase/init.json', { cache: 'no-store' });
        if (r2.ok) {
          const cfg2 = await r2.json();
          appInstance = initializeApp(cfg2);
          return true;
        }
      } catch {}
      return false;
    })();
  }
  return initPromise;
}

export async function getFirebaseApp(): Promise<FirebaseApp | null> {
  const ok = await initIfNeeded();
  return ok ? appInstance : null;
}

export async function getDbClient(): Promise<Firestore | null> {
  const app = await getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export async function getAuthClient(): Promise<Auth | null> {
  const app = await getFirebaseApp();
  return app ? _getAuth(app) : null;
}

export async function getStorageClient(): Promise<FirebaseStorage | null> {
  const app = await getFirebaseApp();
  return app ? getStorage(app) : null;
}
