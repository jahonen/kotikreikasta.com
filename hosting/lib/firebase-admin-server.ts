import admin from 'firebase-admin';

let adminInitialized = false;

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
      databaseURL: `https://${projectId}.firebaseio.com`,
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

let firestoreInstance: admin.firestore.Firestore | null = null;

export async function getFirestore() {
  if (firestoreInstance) {
    return firestoreInstance;
  }
  
  const app = initializeFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin app not initialized');
  }
  
  firestoreInstance = admin.firestore(app);
  
  console.log('[FIREBASE_ADMIN_SERVER] Firestore instance retrieved from Admin SDK');
  
  return firestoreInstance;
}

export async function getAuth() {
  initializeFirebaseAdmin();
  const app = admin.apps[0];
  return admin.auth(app);
}
