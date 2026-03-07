import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Singleton Firebase app instance for client-side usage
const firebaseConfig = {
  apiKey: "AIzaSyCnyVYfKz1JUieveROuTkNWlxXbHh_muMg",
  authDomain: "kotikreikasta.firebaseapp.com",
  projectId: "kotikreikasta",
  storageBucket: "kotikreikasta.firebasestorage.app",
  messagingSenderId: "854585552743",
  appId: "1:854585552743:web:2f08e4338fc58b825209c2",
  measurementId: "G-SWNFP6Z0D5",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
