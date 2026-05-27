// ============================================
// Tomodachi — Firebase Initialization
// Centralizes the SDK so every module shares one app instance
// and one pinned SDK version.
// ============================================

import { getEnv, getFirebaseConfig } from '../config/firebase.js?v=20260527a';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  addDoc,
  limit
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const env = getEnv();
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);

// R2.04 verification: log env+projectId in dev/staging always, in prod
// only with ?debug=1. Satisfies the R2.04 acceptance criterion without
// permanent prod logging (docs/PROJECT_RULES.md §9.4).
const params = new URLSearchParams(location.search);
if (env !== 'prod' || params.has('debug')) {
  console.log('[firebase-init] env=%s projectId=%s', env, firebaseConfig.projectId);
}

export const auth = getAuth(app);

// Long polling avoids browser/network issues with Firestore streaming channels.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

// Re-export the SDK surface other modules need.
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  addDoc,
  limit
};
