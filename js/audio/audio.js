// ============================================
// Tomodachi — Audio Engine
// Two distinct roles:
//  • speak()      — Japanese pronunciation. FUNCTIONAL, not a preference.
//                   Driven by game design (the prompt in Listening practice,
//                   reinforcement on reveal in Reading practice).
//  • playSound()  — game sound EFFECTS. Cosmetic; respects the audio toggle.
//
// To minimize TTS lag, this module:
//  1. Pre-builds a reusable SpeechSynthesisUtterance per character at game
//     start (preloadSpeech).
//  2. Warms the browser's speech engine with a silent utterance so the
//     first real playback has no cold-start delay (warmUpSpeech).
//  3. Pulses resume() during a game to stop Chrome's engine sleeping after
//     ~15s of idle time (primeSpeech / unprimeSpeech).
// ============================================

import { state } from '../core/core.js?v=20260906c';
import { nativeTts, onNativeEvent } from '../native/shell.js?v=20260906c';

// App shell going to the background: never keep talking over another app.
onNativeEvent('appState', ({ isActive }) => { if (!isActive) stopSpeech(); });

// ----- Speech (TTS) -----
let jaVoice = null;
const speechSupported = 'speechSynthesis' in window;
const utterCache = new Map();   // text → reusable SpeechSynthesisUtterance
let keepAliveTimer = null;

function pickVoice() {
  if (!speechSupported) return;
  const voices = window.speechSynthesis.getVoices();
  jaVoice =
    voices.find(v => v.lang === 'ja-JP') ||
    voices.find(v => v.lang && v.lang.toLowerCase().startsWith('ja')) ||
    null;
  // Apply the freshly-discovered voice to anything cached before voices loaded.
  if (jaVoice) {
    utterCache.forEach(u => { if (u.voice !== jaVoice) u.voice = jaVoice; });
  }
}

if (speechSupported) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function isSpeechSupported() {
  return speechSupported;
}

function makeUtterance(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  if (jaVoice) u.voice = jaVoice;
  u.rate = 0.85;
  u.pitch = 1;
  return u;
}

/**
 * Build (and cache) a reusable utterance for each character. Subsequent
 * speak() calls reuse them, so there's no per-call object setup cost.
 */
export function preloadSpeech(texts) {
  if (!speechSupported || !texts) return;
  texts.forEach(t => {
    if (t && !utterCache.has(t)) utterCache.set(t, makeUtterance(t));
  });
}

/**
 * Wake the TTS engine so the first real call has no cold-start lag.
 * Speaks a silent utterance (volume 0) at a fast rate.
 */
export function warmUpSpeech(text) {
  if (!speechSupported) return;
  try {
    const u = new SpeechSynthesisUtterance(text || 'あ');
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.volume = 0;
    u.rate = 2.5;
    window.speechSynthesis.speak(u);
  } catch {
    /* warm-up failures are non-critical */
  }
}

/**
 * Pre-build utterances, warm the engine, and keep it awake while a game runs.
 * Call at game start.
 */
export function primeSpeech(texts) {
  if (!speechSupported) return;
  preloadSpeech(texts);
  warmUpSpeech(texts && texts[0]);
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  // Chrome's speech engine sleeps after ~15s idle and the next call lags or
  // silently drops. resume() is a no-op when nothing's paused, so it's safe.
  keepAliveTimer = setInterval(() => {
    try {
      if (!window.speechSynthesis.speaking) window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
  }, 8000);
}

/** Stop the keep-alive pulse — call when a game ends. */
export function unprimeSpeech() {
  if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null; }
}

/**
 * Speak a Japanese character aloud. Functional audio — NOT gated by the
 * cosmetic sound-effects toggle, because Listening practice depends on it.
 * Reuses a cached utterance object when available and only cancels the
 * synth when something is actually playing, both of which trim the
 * click-to-sound latency.
 */
export function speak(text) {
  if (!text) return;
  // Native shell: use the platform TTS (AVSpeechSynthesizer / Android TTS)
  // through the adapter — Web Speech is unreliable inside WKWebView (empty
  // voice lists, ja-JP regressions). Web build: adapter returns null.
  const tts = nativeTts();
  if (tts) { tts.speak(text); return; }
  if (!speechSupported) return;
  try {
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();
    let u = utterCache.get(text);
    if (!u) {
      u = makeUtterance(text);
      utterCache.set(text, u);
    } else if (jaVoice && u.voice !== jaVoice) {
      u.voice = jaVoice;
    }
    synth.speak(u);
  } catch {
    /* speech failures are non-critical */
  }
}

export function stopSpeech() {
  const tts = nativeTts();
  if (tts) { tts.stop(); return; }
  if (speechSupported) {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }
}

// ----- Sound Effects (WebAudio) -----
let audioCtx = null;

function ctx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioCtx = null;
    }
  }
  return audioCtx;
}

/** Resume the audio context after the first user gesture (autoplay policy). */
export function unlockAudio() {
  const c = ctx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function tone(freq, duration, type = 'sine', volume = 0.07) {
  const c = ctx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(c.destination);

  const t = c.currentTime;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.start(t);
  osc.stop(t + duration);
}

/** Play a short game sound effect. Silent if sound effects are disabled. */
export function playSound(kind) {
  if (!state.audioEnabled) return;
  switch (kind) {
    case 'correct':
      tone(660, 0.11, 'sine');
      setTimeout(() => tone(990, 0.13, 'sine'), 85);
      break;
    case 'wrong':
      tone(160, 0.26, 'sawtooth', 0.05);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine'), i * 110));
      break;
    case 'lose':
      [440, 349, 262].forEach((f, i) => setTimeout(() => tone(f, 0.26, 'sine'), i * 160));
      break;
    case 'tick':
      tone(520, 0.05, 'square', 0.035);
      break;
    case 'start':
      tone(523, 0.12, 'sine');
      setTimeout(() => tone(784, 0.16, 'sine'), 110);
      break;
    default:
      break;
  }
}
