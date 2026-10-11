import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth';
import { FirebaseCustomConfig } from '../types';

export const DEFAULT_FIREBASE_CONFIG: FirebaseCustomConfig = {
  apiKey: "AIzaSyA42JqQ3UsqZaNdpvm0iI1aAw6sEuKwN5o",
  authDomain: "evaluacion360-9045e.firebaseapp.com",
  projectId: "evaluacion360-9045e",
  storageBucket: "evaluacion360-9045e.firebasestorage.app",
  messagingSenderId: "434818327221",
  appId: "1:434818327221:web:8f92739e3fcb5ec38214fc",
};

const STORAGE_KEY = 'talent360_custom_firebase_config';

export function getStoredFirebaseConfig(): FirebaseCustomConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading stored Firebase config', err);
  }
  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseCustomConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving Firebase config', err);
  }
}

export function clearStoredFirebaseConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error removing Firebase config', err);
  }
}

export function getEffectiveFirebaseConfig(): FirebaseCustomConfig {
  const custom = getStoredFirebaseConfig();
  if (custom && custom.apiKey && custom.projectId) {
    return custom;
  }

  const envApiKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY;
  const envProjectId = (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId) {
    return {
      apiKey: envApiKey,
      authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '',
    };
  }

  return DEFAULT_FIREBASE_CONFIG;
}

export const firebaseConfig = getEffectiveFirebaseConfig();

// Initialize Firebase App
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore & Auth
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// Attempt anonymous auth for evaluators if Anonymous Auth is enabled
signInAnonymously(auth).catch((err) => {
  // Silent fallback if anonymous auth isn't enabled in console
  console.info('Firebase auth initialization note:', err?.code || err);
});

export function getFirebaseDb(): Firestore {
  return db;
}

export function getFirebaseAuth(): Auth {
  return auth;
}

export function isFirebaseConfigured(): boolean {
  return !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
}

// Re-export Modular SDK Firestore utilities for direct usage
export {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
};
