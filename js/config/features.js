// ============================================
// Tomodachi — feature flags (PROJECT_RULES §5.2 slot)
// Per-environment defaults + a hardened override, so unfinished UI can ship
// to main (prod deploys on every push) without any real user seeing it.
//
// Resolution for `nativeShell` (docs/APP-BUILD-PLAN.md → Flag strategy):
//   1. window.__TOMODACHI_NATIVE__ === true  (the app shell)      → ON
//   2. URL ?ff_native_shell=true|false        (NON-prod hosts only) → honoured
//      AND persisted to localStorage so a tester keeps it; =false clears it.
//      On prod the param is ignored (warned once): a forwarded link can never
//      switch a real user to the unfinished shell. The lead previews v2 on
//      prod data by setting the localStorage key in DevTools.
//   3. localStorage FF_NATIVE_SHELL === 'true' | 'false'  (§5.4 string parse)
//   4. FEATURES[name][getEnv()]
// The pre-paint <head> script in index.html mirrors inputs 1, 3 and the
// hostname so the first paint already carries html[data-shell]; app.js
// init() re-asserts it from here. tests/unit/features.test.mjs proves parity.
// ============================================

import { getEnv } from './firebase.js?v=20260906g';

export const FEATURES = {
  nativeShell:        { dev: true,  staging: true,  prod: false },
  gamificationTiles:  { dev: false, staging: false, prod: false },
  friendCodes:        { dev: false, staging: false, prod: false },
  smartNotifications: { dev: false, staging: false, prod: false },
};

// Override plumbing exists only for flags listed here.
const OVERRIDES = {
  nativeShell: { storageKey: 'FF_NATIVE_SHELL', urlParam: 'ff_native_shell' },
};

const warned = new Set();

function readStorage(w, key) {
  try { return w.localStorage ? w.localStorage.getItem(key) : null; } catch (_e) { return null; }
}
function writeStorage(w, key, value) {
  try {
    if (!w.localStorage) return;
    if (value === null) w.localStorage.removeItem(key); else w.localStorage.setItem(key, value);
  } catch (_e) { /* storage unavailable — override simply does not persist */ }
}

/**
 * @param {string} name  key of FEATURES
 * @param {Window} [w]   injectable for unit tests (defaults to window)
 */
export function isEnabled(name, w = (typeof window !== 'undefined' ? window : undefined)) {
  const spec = FEATURES[name];
  if (!spec) return false;
  const env = getEnv();

  if (name === 'nativeShell' && w && w.__TOMODACHI_NATIVE__ === true) return true;

  const ov = OVERRIDES[name];
  if (ov && w) {
    let param = null;
    try { param = new URLSearchParams(w.location ? w.location.search : '').get(ov.urlParam); } catch (_e) { /* no location */ }
    if (param === 'true' || param === 'false') {
      if (env === 'prod') {
        if (!warned.has(name)) {
          warned.add(name);
          console.warn(`[features] ?${ov.urlParam} is ignored on prod; set localStorage.${ov.storageKey} instead.`);
        }
      } else {
        writeStorage(w, ov.storageKey, param === 'true' ? 'true' : null);
        return param === 'true';
      }
    }
    const stored = readStorage(w, ov.storageKey);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  }

  return spec[env] === true;
}

/** Convenience for the shell attribute value app.js stamps on <html>. */
export function shellVersion(w) {
  return isEnabled('nativeShell', w) ? 'v2' : 'v1';
}
