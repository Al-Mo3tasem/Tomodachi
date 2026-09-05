// ============================================
// Tomodachi — native shell wiring (Capacitor)
// The ONLY place the web app talks to window.Native (see native/bridge.js).
// Everything here is a no-op on the web build: window.Native is undefined.
//
// Batch 0 scope (foundation):
//   • Android hardware/predictive back → sensible SPA behaviour
//   • app going to background → stop speech
// The screen-stack batch of the redesign replaces the back policy below.
// ============================================

import { showScreen, currentScreen } from '../core/core.js?v=20260906a';
import { stopSpeech } from '../audio/audio.js?v=20260906a';

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
  const N = window.Native;
  const cur = currentScreen();
  if (!cur || ROOT_SCREENS.has(cur)) { N.app.exit(); return; }
  if (GAME_SCREENS.has(cur)) return;
  const exitId = EXIT_BUTTON[cur];
  const btn = exitId && document.getElementById(exitId);
  if (btn) { btn.click(); return; }
  showScreen('screen-dashboard');
}

function wire() {
  const N = window.Native;
  if (!N || !N.isNative) return;
  document.documentElement.classList.add('is-native', `is-${N.platform}`);
  N.app.onBack(handleBack);
  N.app.onState(({ isActive }) => { if (!isActive) stopSpeech(); });
}

export function initNativeShell() {
  if (window.Native) wire();
  else document.addEventListener('native-ready', wire, { once: true });
}
