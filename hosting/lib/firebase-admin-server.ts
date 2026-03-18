import admin from 'firebase-admin';

let initialized = false;
let firestoreInstance: FirebaseFirestore.Firestore | null = null;

export function initializeFirebaseAdmin() {
  if (initialized) return;
  
  if (!admin.apps.length) {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'kotikreikasta';
      admin.initializeApp({ projectId });
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
  
  initializeFirebaseAdmin();
  const app = admin.apps[0];
  firestoreInstance = admin.firestore(app);
  
  // Configure Firestore settings for Cloud Run environment
  firestoreInstance.settings({
    ignoreUndefinedProperties: true,
  });
  
  return firestoreInstance;
}

export async function getAuth() {
  initializeFirebaseAdmin();
  const app = admin.apps[0];
  return admin.auth(app);
}
