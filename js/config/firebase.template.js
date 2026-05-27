// ============================================
// Tomodachi Firebase Config Template
// Three-environment switcher (dev / staging / prod) selected by hostname
// per docs/PROJECT_RULES.md §6.2.
// ============================================
// 1. Copy this file to config/firebase.js.
// 2. Fill in values for all three environments from each project's
//    Firebase Console → ⚙️ Project Settings → General → Your apps →
//    SDK setup and configuration → Config.
//    - dev / staging values come from R2.01–R2.02 (Tomodachi Dev / Staging).
//    - prod currently holds the legacy hiraquest0 values. R2.11 cutover
//      flips prod to tomodachi-prod once data + Auth users are migrated.
// 3. js/config/firebase.js IS deployed (GitHub Pages needs it). Firebase
//    web API keys are safe to expose because they are domain-restricted.

const configs = {
  dev: {
    apiKey: "YOUR_DEV_API_KEY",
    authDomain: "YOUR_DEV_PROJECT.firebaseapp.com",
    projectId: "YOUR_DEV_PROJECT_ID",
    storageBucket: "YOUR_DEV_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_DEV_MESSAGING_SENDER_ID",
    appId: "YOUR_DEV_APP_ID"
  },
  staging: {
    apiKey: "YOUR_STAGING_API_KEY",
    authDomain: "YOUR_STAGING_PROJECT.firebaseapp.com",
    projectId: "YOUR_STAGING_PROJECT_ID",
    storageBucket: "YOUR_STAGING_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_STAGING_MESSAGING_SENDER_ID",
    appId: "YOUR_STAGING_APP_ID"
  },
  prod: {
    apiKey: "YOUR_PROD_API_KEY",
    authDomain: "YOUR_PROD_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROD_PROJECT_ID",
    storageBucket: "YOUR_PROD_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_PROD_MESSAGING_SENDER_ID",
    appId: "YOUR_PROD_APP_ID"
  }
};

export function getEnv() {
  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'dev';
  if (h.endsWith('.pages.dev') || h === 'staging.tomodachi.com') return 'staging';
  return 'prod';
}

export function getFirebaseConfig() {
  return configs[getEnv()];
}

export const APP_CONFIG = {
  maxUsers: 2,
  defaultTheme: 'light',
  version: '4.1.0-phase4'
};
