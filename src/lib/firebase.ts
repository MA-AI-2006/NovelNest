import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app: any = null;
let auth: any = null;
let db: any = null;
let googleProvider: any = null;
let isInitialized = false;

export async function initFirebaseClient() {
  if (isInitialized) {
    return { app, auth, db, googleProvider, isInitialized };
  }

  try {
    let config: any = null;

    const metaEnv = (import.meta as any).env || {};

    // First, try loading Firebase config from client-side Vite environment variables
    if (metaEnv.VITE_FIREBASE_API_KEY) {
      config = {
        apiKey: metaEnv.VITE_FIREBASE_API_KEY,
        authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
        storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: metaEnv.VITE_FIREBASE_APP_ID,
        measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID
      };
      console.log('[Firebase Client] Successfully loaded Firebase config from client-side environment variables.');
    } else {
      // Otherwise, fall back to fetching config from Express API server
      try {
        const response = await fetch('/api/config/firebase');
        if (response.ok) {
          config = await response.json();
        }
      } catch (e) {
        console.warn('[Firebase Client] Server-side config fetch failed, checking standard fallback...');
      }
    }
    
    // Basic verification of the config keys
    if (!config || !config.apiKey || !config.projectId) {
      throw new Error('Firebase config is incomplete or not yet configured');
    }

    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    isInitialized = true;
    
    console.log('[Firebase Client] Successfully initialized with project:', config.projectId);
    return { app, auth, db, googleProvider, isInitialized };
  } catch (error: any) {
    console.warn('[Firebase Client] Client-side Firebase SDK initialization bypassed:', error.message || error);
    return { app: null, auth: null, db: null, googleProvider: null, isInitialized: false };
  }
}

export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider
};
