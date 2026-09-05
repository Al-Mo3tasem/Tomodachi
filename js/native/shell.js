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

import { showScreen, currentScreen } from '../core/core.js?v=20260906b';

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

// ----- back-button policy v0 -----
// Screens where "back" means "leave the app".
const ROOT_SCREENS = new Set(['screen-landing', 'screen-auth', 'screen-dashboard']);
// Screens with their own exit control (keeps their state machines clean).
const EXIT_BUTTON = {
  'screen-lesson': 'lesson-btn-exit',
  'screen-review': 'review-btn-exit',
};
// In-game screens ignore hardware back (a mis-tap must not kill a duel);
// the game's own ✕ handles quitting with confirmation.
const GAME_SCREENS = new Set(['screen-game', 'screen-duel', 'screen-coop']);

function handleBack() {
  const n = N();
  const cur = currentScreen();
  if (!cur || ROOT_SCREENS.has(cur)) { n.app.exit(); return; }
  if (GAME_SCREENS.has(cur)) return;
  const exitId = EXIT_BUTTON[cur];
  const btn = exitId && document.getElementById(exitId);
  if (btn) { btn.click(); return; }
  showScreen('screen-dashboard');
}

function wire() {
  const n = N();
  if (!n || !n.isNative) return;
  document.documentElement.classList.add('is-native', `is-${n.platform}`);
  n.app.onBack(handleBack);
  n.app.onState((payload) => { for (const fn of listeners.appState) { try { fn(payload); } catch (_e) { /* listener error must not break the shell */ } } });
}

export function initNativeShell() {
  if (N()) wire();
  else document.addEventListener('native-ready', wire, { once: true });
}
