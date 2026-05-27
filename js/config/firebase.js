// ============================================
// Tomodachi Firebase Configuration
// Three-environment switcher (dev / staging / prod) selected by hostname
// per docs/PROJECT_RULES.md §6.2.
//
// `prod` currently holds the legacy `hiraquest0` values. The R2.11 cutover
// flips `prod` to `tomodachi-prod` AFTER R2.08–R2.10 migrate data + Auth
// users — do not edit configs.prod here. See docs/Phases_and_Tasks.md
// Phase R2 for the full sequence.
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
  // R2.04: prod holds hiraquest0 values. R2.11 cutover flips this to
  // tomodachi-prod AFTER R2.08–R2.10 migrate data + Auth users.
  prod: {
    apiKey: "AIzaSyA4GjLylUNt9Dihv0rIucMdlMFtFQhlewA",
    authDomain: "hiraquest0.firebaseapp.com",
    projectId: "hiraquest0",
    storageBucket: "hiraquest0.firebasestorage.app",
    messagingSenderId: "546831266198",
    appId: "1:546831266198:web:fbde52e91547a64217adb7"
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

// App Settings (unchanged surface — imported by app.js and core/core.js).
// maxUsers removed in R2.05; L1 gateway owns rate limiting going forward.
export const APP_CONFIG = {
  defaultTheme: 'light',
  version: '4.1.0-phase4'
};
