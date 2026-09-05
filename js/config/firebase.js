// ============================================
// Tomodachi Firebase Configuration
// Three-environment switcher (dev / staging / prod) selected by hostname
// per docs/PROJECT_RULES.md §6.2.
//
// As of R2.11 cutover (2026-05-28), `prod` points at `tomodachi-prod`.
// The legacy `hiraquest0` project is decommissioned in R2.13. The
// R2.08-R2.10 data migration tasks were skipped per project lead
// decision (no important data on hiraquest0 to preserve — fresh start
// on tomodachi-prod). See docs/Phases_and_Tasks.md Phase R2.
// ============================================
// Do NOT share this file publicly.

const configs = {
  dev: {
    apiKey: "AIzaSyDWV2yXH3K57q4xkkQ38MvhLB3YEATBTcg",
    authDomain: "tomodachi-dev.firebaseapp.com",
    projectId: "tomodachi-dev",
    storageBucket: "tomodachi-dev.firebasestorage.app",
    messagingSenderId: "98677636194",
    appId: "1:98677636194:web:5265948be2b4a37b2ca53b"
  },
  staging: {
    apiKey: "AIzaSyDSLFukzGZqEkgdRYBWx2HpWevwFLzCAsM",
    authDomain: "tomodachi-staging.firebaseapp.com",
    projectId: "tomodachi-staging",
    storageBucket: "tomodachi-staging.firebasestorage.app",
    messagingSenderId: "864790587559",
    appId: "1:864790587559:web:cb9dd6fc289aed0b239382"
  },
  // R2.11 cutover (2026-05-28): prod now points at tomodachi-prod.
  // R2.08-R2.10 data migration skipped per project lead decision.
  // hiraquest0 is decommissioned at R2.13.
  prod: {
    apiKey: "AIzaSyAqhgl6yqjScjljsMgmy6KVCBwAiUC12WM",
    authDomain: "tomodachi-prod.firebaseapp.com",
    projectId: "tomodachi-prod",
    storageBucket: "tomodachi-prod.firebasestorage.app",
    messagingSenderId: "599781223087",
    appId: "1:599781223087:web:41edcd915acd971709025a"
  }
};

export function getEnv() {
  // Native shell (Capacitor) override: the app loads from capacitor://localhost
  // (iOS) or https://localhost (Android), which would otherwise map to DEV.
  // scripts/native/build-www.mjs writes www/native-env.js that sets this.
  const forced = typeof window !== 'undefined' && window.__TOMODACHI_ENV__;
  if (forced && configs[forced]) return forced;
  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'dev';
  if (h.endsWith('.pages.dev') || h === 'staging.tomodachi.com') return 'staging';
  return 'prod';
}

// True inside the native app shell (set by www/native-env.js at build time).
export function isNativeShell() {
  return typeof window !== 'undefined' && window.__TOMODACHI_NATIVE__ === true;
}

export function getFirebaseConfig() {
  return configs[getEnv()];
}

// App Settings (unchanged surface — imported by app.js and core/core.js).
// maxUsers removed in R2.05; L1 gateway owns rate limiting going forward.
export const APP_CONFIG = {
  defaultTheme: 'light',
  version: '4.1.0-phase4'
};
