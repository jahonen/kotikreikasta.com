import admin from 'firebase-admin';

export function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }
  
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    
    const app = admin.initializeApp({
      projectId: projectId || 'kotikreikasta',
    });
    
    console.log('[FIREBASE_ADMIN_SERVER] Admin SDK initialized for project:', projectId || 'kotikreikasta');
    return app;
  } catch (e: any) {
    const msg = e?.message || String(e || '');
    if (!/already exists/i.test(msg)) {
      console.error('[FIREBASE_ADMIN_SERVER] Initialization failed:', e);
      throw e;
    }
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
  
  const db = admin.firestore(app);
  
  // Configure Firestore settings only once
  db.settings({
    ignoreUndefinedProperties: true,
  });
  
  firestoreInstance = db;
  
  console.log('[FIREBASE_ADMIN_SERVER] Firestore instance retrieved from Admin SDK');
  
  return db;
}

export async function getAuth() {
  initializeFirebaseAdmin();
  const app = admin.apps[0];
  return admin.auth(app);
}
