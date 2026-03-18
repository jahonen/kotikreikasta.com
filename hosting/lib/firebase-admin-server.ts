import admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

let initialized = false;
let firestoreInstance: Firestore | null = null;

export function initializeFirebaseAdmin() {
  if (initialized) return;
  
  if (!admin.apps.length) {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
      if (projectId) {
        admin.initializeApp({ projectId });
      } else {
        admin.initializeApp();
      }
      initialized = true;
    } catch (e: any) {
      const msg = e?.message || String(e || '');
      if (!/already exists/i.test(msg)) {
        console.error('[FIREBASE_ADMIN_SERVER] Initialization failed:', e);
      }
      initialized = true;
    }
  } else {
    initialized = true;
  }
}

export async function getFirestore() {
  if (firestoreInstance) {
    return firestoreInstance;
  }
  
  // Use native @google-cloud/firestore instead of admin.firestore()
  // This avoids gRPC connection issues in Cloud Run
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'kotikreikasta';
  
  firestoreInstance = new Firestore({
    projectId,
    ignoreUndefinedProperties: true,
  });
  
  console.log('[FIREBASE_ADMIN_SERVER] Firestore initialized with native client for project:', projectId);
  
  return firestoreInstance;
}

export async function getAuth() {
  initializeFirebaseAdmin();
  const app = admin.apps[0];
  return admin.auth(app);
}
