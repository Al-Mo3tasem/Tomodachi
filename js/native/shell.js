// ============================================
// Tomodachi — native shell adapter (Capacitor)
// The ONLY web module that references window.Native (enforced by
// scripts/dev/lint-gates.mjs). Everything else imports the small adapters
// below; on the web build they all resolve to "not native" no-ops.
//
// Batch 0/1 scope (foundation):
//   • Android hardware/predictive back → sensible SPA behaviour
//   • app lifecycle events fan-out (audio stops speech on background)
//   • splash hide + native TTS adapters
// The screen-stack batch of the redesign replaces the back policy below;
// the facades batch (haptics.js, prefs.js, tts.js) builds on these adapters.
// ============================================

import { back as navBack } from '../core/nav.js?v=20260906f';
import { setNativePrefsAdapter } from '../core/prefs.js?v=20260906f';

const N = () => (typeof window !== 'undefined' ? window.Native : undefined);

/** True inside the Capacitor shell (bridge loaded and reports a native platform). */
export function isNative() {
  const n = N();
  return !!(n && n.isNative);
}

/** 'ios' | 'android' | 'web' */
export function nativePlatform() {
  const n = N();
  return n && n.isNative ? n.platform : 'web';
}

/** Native haptics vocabulary (tap/snap/tick/ok/no/warn), or null on the web. */
export function nativeHaptics() {
  const n = N();
  return n && n.isNative && n.haptics ? n.haptics : null;
}

/** Native text-to-speech adapter, or null on the web. */
export function nativeTts() {
  const n = N();
  return n && n.isNative && n.tts ? n.tts : null;
}

/** Hide the launch splash (no-op on the web). */
export function nativeSplashHide() {
  const n = N();
  if (n && n.isNative && n.splash) n.splash.hide();
}

// ----- lifecycle event bus (registrations are safe before the bridge loads) -----
const listeners = { appState: [], back: [] };

/** @param {'appState'} event  @param {(payload:any)=>void} fn */
export function onNativeEvent(event, fn) {
  if (listeners[event]) listeners[event].push(fn);
}

// ----- hardware / predictive back -----
// The router owns the policy (per-tab stacks, screens that consume back via
// onBack). At a root there is nothing to pop: background the app rather than
// kill it (Android convention); exitApp only where minimize is unavailable.
function handleBack() {
  if (navBack()) return;
  const n = N();
  if (n.app.minimize) n.app.minimize(); else n.app.exit();
}

function wire() {
  const n = N();
  if (!n || !n.isNative) return;
  document.documentElement.classList.add('is-native', `is-${n.platform}`);
  // every setPref() is mirrored into Capacitor Preferences from here on
  if (n.prefs) setNativePrefsAdapter({ get: (k) => n.prefs.get(k), set: (k, v) => n.prefs.set(k, v), remove: (k) => n.prefs.remove(k) });
  n.app.onBack(handleBack);
  n.app.onState((payload) => { for (const fn of listeners.appState) { try { fn(payload); } catch (_e) { /* listener error must not break the shell */ } } });
}

// Resolves once the bridge is wired: immediately on the web or when the
// bridge script already ran; otherwise on 'native-ready'. The native marker
// (window.__TOMODACHI_NATIVE__, set by native-env.js before any module) tells
// a shell build apart from the web, and a bounded wait keeps a broken bridge
// bundle from stalling boot.
const BRIDGE_WAIT_MS = 1500;
export function initNativeShell() {
  if (N()) { wire(); return Promise.resolve(); }
  const expectBridge = typeof window !== 'undefined' && window.__TOMODACHI_NATIVE__ === true;
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; wire(); resolve(); };
    document.addEventListener('native-ready', finish, { once: true });
    if (!expectBridge) { resolve(); return; }
    setTimeout(finish, BRIDGE_WAIT_MS);
  });
}
