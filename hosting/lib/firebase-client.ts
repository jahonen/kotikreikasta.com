'use client';
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAuth as _getAuth, type Auth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// Client-side lazy initialization supporting Firebase Hosting injected config
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
let appCheckInitialized = false;

function initAppCheck(app: FirebaseApp) {
  if (appCheckInitialized || typeof window === 'undefined') return;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return;
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckInitialized = true;
  } catch {
    // ignore if already initialized
  }
}

function ensureFirestoreInitialized(app: FirebaseApp) {
  try {
    // Helps in environments where HTTP/2, proxies or fetch streams cause transport errors
    initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
    } as any);
  } catch {
    // ignore if already initialized
  }
}

async function initIfNeeded(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (appInstance) return true;
  if (getApps().length) {
    appInstance = getApp();
    ensureFirestoreInitialized(appInstance);
    return true;
  }
  if (hasEnvConfig) {
    appInstance = initializeApp(envConfig as any);
    ensureFirestoreInitialized(appInstance!);
    initAppCheck(appInstance!);
    return true;
  }
  return false;
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
