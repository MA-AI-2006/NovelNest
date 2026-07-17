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
    const response = await fetch('/api/config/firebase');
    if (!response.ok) {
      throw new Error('Firebase config endpoint returned ' + response.status);
    }
    const config = await response.json();
    
    // Basic verification of the config keys
    if (!config.apiKey || !config.projectId) {
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
