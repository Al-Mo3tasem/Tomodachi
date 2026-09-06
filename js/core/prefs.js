// ============================================
// Tomodachi — preferences facade
// The ONLY module that touches localStorage (lint gate; the pre-paint <head>
// script and js/config/features.js are the two documented exceptions).
//
//   getPref('theme')            → string | null   (sync, cached)
//   setPref('theme', 'dark')    → writes localStorage + native Preferences
//   removePref('theme')
//
// Native shell: js/native/shell.js installs an adapter (setNativePrefsAdapter)
// so every write is mirrored into Capacitor Preferences, which survives WebView
// storage eviction; restoreFromNative() copies mirrored values back when
// localStorage lost them (boot) and reports which keys changed.
// Zero imports on purpose: core.js reads prefs at module-evaluation time.
// ============================================

// short name → storage key (the keys are the historical localStorage names)
export const KEYS = {
  audio: 'tomodachi-audio',
  practice: 'tomodachi-practice',
  input: 'tomodachi-input',
  duration: 'tomodachi-duration',
  wincon: 'tomodachi-wincon',
  duelinput: 'tomodachi-duelinput',
  coopinput: 'tomodachi-coopinput',
  theme: 'tomodachi-theme',
  lang: 'tomodachi-lang',
  consent: 'tomodachi-consent',
  notify: 'tomodachi-notify',
  lastBracket: 'tomodachi-last-bracket',
  glass: 'tomodachi-glass',
  haptics: 'tomodachi-haptics',
  digits: 'tomodachi-digits',
  textSize: 'tomodachi-text-size',
};

// One-shot migration hiraquest-* → tomodachi-* (R1.05a). Harmless after the
// first run; removable once every browser has migrated.
(function migrateLegacyKeys() {
  let s = null;
  try { s = typeof localStorage !== 'undefined' ? localStorage : null; } catch (_e) { s = null; }
  if (!s) return;
  for (const k of ['audio', 'practice', 'input', 'duration', 'wincon', 'duelinput', 'coopinput', 'theme', 'last-bracket']) {
    try {
      const oldV = s.getItem('hiraquest-' + k);
      if (oldV !== null && s.getItem('tomodachi-' + k) === null) { s.setItem('tomodachi-' + k, oldV); s.removeItem('hiraquest-' + k); }
    } catch (_e) { /* ignore */ }
  }
})();

const cache = new Map();
let native = null;   // { get(key): Promise<string|null>, set(key, value): Promise, remove(key): Promise }

function keyOf(name) {
  const k = KEYS[name];
  if (!k) throw new Error(`[prefs] unknown preference "${name}"`);
  return k;
}
function storage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (_e) { return null; }
}

export function getPref(name) {
  const k = keyOf(name);
  if (cache.has(k)) return cache.get(k);
  let v = null;
  try { const s = storage(); v = s ? s.getItem(k) : null; } catch (_e) { v = null; }
  cache.set(k, v);
  return v;
}

export function setPref(name, value) {
  const k = keyOf(name);
  const v = value === null || value === undefined ? null : String(value);
  cache.set(k, v);
  try { const s = storage(); if (s) { if (v === null) s.removeItem(k); else s.setItem(k, v); } } catch (_e) { /* quota / private mode */ }
  if (native) { (v === null ? native.remove(k) : native.set(k, v)).catch(() => {}); }
  return v;
}

export function removePref(name) { return setPref(name, null); }

/** Installed by the native shell adapter. */
export function setNativePrefsAdapter(adapter) { native = adapter || null; }

/**
 * Boot restore (native only): for every known key missing from localStorage
 * but present in native Preferences, copy it back. Resolves to the list of
 * restored short names so the caller can re-apply state (theme, audio…).
 */
export async function restoreFromNative() {
  if (!native) return [];
  const missing = Object.entries(KEYS).filter(([name]) => getPref(name) === null);
  const values = await Promise.all(missing.map(([, k]) => Promise.resolve().then(() => native.get(k)).catch(() => null)));
  const restored = [];
  missing.forEach(([name, k], i) => {
    const v = values[i];
    if (v === null || v === undefined) return;
    cache.set(k, String(v));
    try { const s = storage(); if (s) s.setItem(k, String(v)); } catch (_e) { /* ignore */ }
    restored.push(name);
  });
  return restored;
}

/** Test/support hook: forget the in-memory cache (localStorage untouched). */
export function _resetPrefCache() { cache.clear(); }
