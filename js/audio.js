// ============================================
// HiraQuest — Audio Engine
// Two distinct roles:
//  • speak()      — Japanese pronunciation. FUNCTIONAL, not a preference.
//                   Driven by game design (the prompt in Listening practice,
//                   reinforcement on reveal in Reading practice).
//  • playSound()  — game sound EFFECTS. Cosmetic; respects the audio toggle.
// ============================================

import { state } from './core.js?v=20260523';

// ----- Speech (TTS) -----
let jaVoice = null;
const speechSupported = 'speechSynthesis' in window;

function pickVoice() {
  if (!speechSupported) return;
  const voices = window.speechSynthesis.getVoices();
  jaVoice =
    voices.find(v => v.lang === 'ja-JP') ||
    voices.find(v => v.lang && v.lang.toLowerCase().startsWith('ja')) ||
    null;
}

if (speechSupported) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function isSpeechSupported() {
  return speechSupported;
}

/**
 * Speak a Japanese character/word aloud. This is functional audio — it is
 * NOT gated by the cosmetic sound-effects toggle, because Listening practice
 * depends on it. Falls back silently if speech is unavailable.
 */
export function speak(text) {
  if (!speechSupported || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ja-JP';
    if (jaVoice) utter.voice = jaVoice;
    utter.rate = 0.8;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  } catch {
    /* speech failures are non-critical */
  }
}

export function stopSpeech() {
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
