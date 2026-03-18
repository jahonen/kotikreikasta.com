import admin from 'firebase-admin';

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
      console.log('[FIREBASE_ADMIN_SERVER] Admin SDK initialized for project:', projectId || 'auto-detected');
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

export async function getFirestore() {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  // Configure Firestore settings for Cloud Run compatibility
  db.settings({
    ignoreUndefinedProperties: true,
  });
  
  console.log('[FIREBASE_ADMIN_SERVER] Firestore instance retrieved from Admin SDK');
  
  return db;
}

export async function getAuth() {
  initializeFirebaseAdmin();
  const app = admin.apps[0];
  return admin.auth(app);
}
