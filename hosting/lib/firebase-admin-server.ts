import admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

let adminInitialized = false;
let firestoreInstance: Firestore | null = null;

export function initializeFirebaseAdmin() {
  if (adminInitialized) {
    return admin.apps[0] || null;
  }
  
  if (admin.apps.length > 0) {
    adminInitialized = true;
    return admin.apps[0];
  }
  
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'kotikreikasta';
    
    const app = admin.initializeApp({
      projectId,
      credential: admin.credential.applicationDefault(),
    });
    
    adminInitialized = true;
    console.log('[FIREBASE_ADMIN_SERVER] Admin SDK initialized for project:', projectId);
    return app;
  } catch (e: any) {
    const msg = e?.message || String(e || '');
    if (!/already exists/i.test(msg)) {
      console.error('[FIREBASE_ADMIN_SERVER] Initialization failed:', e);
      throw e;
    }
    adminInitialized = true;
    return admin.apps[0];
  }
}

export async function getFirestore() {
  if (firestoreInstance) {
    return firestoreInstance;
  }
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'kotikreikasta';
  
  // Use native Firestore client with REST API to avoid gRPC connection issues in Cloud Run
  firestoreInstance = new Firestore({
    projectId,
    preferRest: true,
    ignoreUndefinedProperties: true,
  });
  
  console.log('[FIREBASE_ADMIN_SERVER] Firestore instance created with REST API for project:', projectId);
  
  return firestoreInstance;
}

export async function getAuth() {
  initializeFirebaseAdmin();
  const app = admin.apps[0];
  return admin.auth(app);
}
