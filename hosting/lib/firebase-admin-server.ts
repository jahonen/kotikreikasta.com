import admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

let adminInitialized = false;

export function initializeFirebaseAdmin() {
  if (adminInitialized) return;
  
  if (!admin.apps.length) {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
      if (projectId) {
        admin.initializeApp({ projectId });
      } else {
        admin.initializeApp();
      }
      adminInitialized = true;
    } catch (e: any) {
      const msg = e?.message || String(e || '');
      if (!/already exists/i.test(msg)) {
        console.error('[FIREBASE_ADMIN_SERVER] Initialization failed:', e);
      }
      adminInitialized = true;
    }
  } else {
    adminInitialized = true;
  }
}

// Native Firestore client instance (singleton)
let nativeFirestoreClient: Firestore | null = null;

export async function getFirestore(): Promise<Firestore> {
  if (nativeFirestoreClient) {
    return nativeFirestoreClient;
  }
  
  // Use native @google-cloud/firestore with REST API instead of gRPC
  // This avoids gRPC connection issues in Cloud Run environments
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'kotikreikasta';
  
  nativeFirestoreClient = new Firestore({
    projectId,
    databaseId: '(default)',
    ignoreUndefinedProperties: true,
    // Force REST API instead of gRPC to avoid connection issues in serverless
    preferRest: true,
  });
  
  console.log('[FIREBASE_ADMIN_SERVER] Native Firestore client initialized with REST API for project:', projectId, 'database: (default)');
  
  return nativeFirestoreClient;
}

export async function getAuth() {
  initializeFirebaseAdmin();
  const app = admin.apps[0];
  return admin.auth(app);
}
