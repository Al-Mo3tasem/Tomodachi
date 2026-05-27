// ============================================
// Tomodachi Firebase Config Template
// ============================================
// 1. Copy this file to config/firebase.js
// 2. Fill in your real values from Firebase Console
// 3. js/config/firebase.js IS deployed (GitHub Pages needs it). The Firebase
//    API key is safe to expose because it is domain-restricted.
// Project ID stays `hiraquest0` (immutable) until Phase R2 migrates to
// `tomodachi-prod`. See docs/Phases_and_Tasks.md Phase R2.

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "hiraquest0.firebaseapp.com",
  projectId: "hiraquest0",
  storageBucket: "hiraquest0.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID_HERE"
};

export const APP_CONFIG = {
  maxUsers: 2,
  defaultTheme: 'light',
  version: '4.1.0-phase4'
};
