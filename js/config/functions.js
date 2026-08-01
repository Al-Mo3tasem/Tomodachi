// ============================================
// Tomodachi Cloud Functions client config
// Per-env base URL for the deployed Cloud Functions, selected by the
// same hostname switcher as js/config/firebase.js. Each Firebase project
// gets its own Functions URL — region: us-central1.
//
// dev   → Firebase Functions emulator on localhost:5001
// staging → tomodachi-staging Functions in us-central1
// prod    → tomodachi-prod Functions in us-central1
//
// All three values are filled. The emulator URL works the moment you
// run `firebase emulators:start --only functions` from the functions/
// directory.
// ============================================

import { getEnv } from './firebase.js?v=20260802a';

const baseUrls = {
  dev: 'http://localhost:5001/tomodachi-dev/us-central1',
  staging: 'https://us-central1-tomodachi-staging.cloudfunctions.net',
  prod: 'https://us-central1-tomodachi-prod.cloudfunctions.net'
};

export function getFunctionsBaseUrl() {
  return baseUrls[getEnv()];
}

// Convenience helper — pass the function name, get the full URL.
export function getFunctionUrl(name) {
  return `${baseUrls[getEnv()]}/${name}`;
}
