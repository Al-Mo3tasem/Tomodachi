// ============================================
// Tomodachi — Firebase Initialization
// Centralizes the SDK so every module shares one app instance
// and one pinned SDK version.
// ============================================

import { firebaseConfig } from '../config/firebase.js?v=20260526a';
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

const app = initializeApp(firebaseConfig);

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
