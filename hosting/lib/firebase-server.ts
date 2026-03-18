// Server-side Firebase Client SDK (not Admin SDK)
// This uses the client SDK on the server for public read operations
// No authentication required - relies on Firestore Security Rules

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let firestoreInstance: FirebaseFirestore.Firestore | null = null;

export async function getServerFirestore(): Promise<FirebaseFirestore.Firestore> {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  // Initialize Firebase Admin with minimal config for Firestore access
  if (getApps().length === 0) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kotikreikasta';
    
    // Check if we're using emulator
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      console.log('[FIREBASE_SERVER] Using Firestore emulator at', process.env.FIRESTORE_EMULATOR_HOST);
      initializeApp({ projectId });
    } else {
      // For production: Use Application Default Credentials
      // This works in Cloud Run without explicit credentials
      initializeApp({ projectId });
    }
  }

  firestoreInstance = getFirestore();
  
  // Connect to emulator if specified
  if (process.env.FIRESTORE_EMULATOR_HOST && !firestoreInstance['_settingsFrozen']) {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    firestoreInstance.settings({
      host: `${host}:${port}`,
      ssl: false,
    });
  }

  return firestoreInstance;
}
