
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { firebaseConfig } from './firebase-config';

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// Connect to Firebase Emulators in development (solo si la variable está habilitada)
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9150', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('🔥 Connected to Firebase Emulators');
  } catch (error) {
    console.warn('⚠️ Firebase Emulators already connected or failed to connect:', error);
  }
}

// Initialize Analytics only on the client side
let analytics: Analytics | undefined;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.error("Failed to initialize Firebase Analytics", error);
  }
}

export { app, auth, db, storage, analytics };
