// ============================================
// Tomodachi — platform attributes
// Stamps <html> with the facts CSS needs to pick the right token values:
//   data-platform = ios | android | web      (glass blur/fill, tap sizes)
//   data-glass    = full | reduced            (the "Reduce glass" ladder)
//   data-text-size / data-digits              (batch 4 — from prefs)
// Never touches the native global directly (lint gate): uses the shell adapters.
// ============================================

import { isNative, nativePlatform } from '../native/shell.js?v=20260906g';
import { getPref, setPref } from './prefs.js?v=20260906g';

const readPref = () => getPref('glass');   // 'full' | 'reduced' (Me › Appearance, batch 10)

// Text size setting → root scale (Me › Text size, batch 10)
const TEXT_SCALE = { s: 0.9, m: 1, l: 1.15, xl: 1.3 };

export function detectPlatform() {
  if (isNative()) return nativePlatform();
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'web';
}

/**
 * Reduce-glass decision (synchronous part):
 *   explicit pref → OS reduced-transparency (Chromium ≥118; never reported by
 *   WKWebView, hence the in-app setting) → low memory (≤4 GB) → full.
 * The async frame benchmark below can downgrade full → reduced after boot.
 */
export function decideGlass() {
  const pref = readPref();
  if (pref === 'reduced' || pref === 'full') return pref;
  try { if (matchMedia('(prefers-reduced-transparency: reduce)').matches) return 'reduced'; } catch (_e) { /* ignore */ }
  if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4) return 'reduced';
  return 'full';
}

// A 500ms frame sample taken 2.5s after boot (past the Firestore/first-render
// burst, which dips every device below 50 fps); < 40 fps → reduce glass. Only
// runs when no explicit preference exists and the document is visible.
function benchmarkGlass(root) {
  if (readPref()) return;
  // Only a visible, settled document gives a meaningful frame rate: background
  // tabs are throttled to ~1 fps and would always look slow.
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  let frames = 0;
  let start = 0;
  const tick = (now) => {
    if (!start) { start = now + 150; }            // 150ms warm-up after first paint
    if (now < start) { requestAnimationFrame(tick); return; }
    frames++;
    if (now - start < 500) { requestAnimationFrame(tick); return; }
    if (document.visibilityState !== 'visible') return;   // tab hidden mid-sample: discard
    const fps = frames / ((now - start) / 1000);
    if (fps < 40 && root.dataset.glass !== 'reduced') root.dataset.glass = 'reduced';
  };
  setTimeout(() => requestAnimationFrame(tick), 2500);
}

export function applyPlatformAttrs() {
  const root = document.documentElement;
  root.dataset.platform = detectPlatform();
  root.dataset.glass = decideGlass();
  if (root.dataset.glass === 'full') benchmarkGlass(root);
  applyTextAttrs(root);
}

/** html[data-text-size] + --text-scale and html[data-digits] from prefs. */
export function applyTextAttrs(root = document.documentElement) {
  const size = getPref('textSize');
  const key = TEXT_SCALE[size] ? size : 'm';
  root.dataset.textSize = key;
  root.style.setProperty('--text-scale', String(TEXT_SCALE[key]));
  root.dataset.digits = getPref('digits') === 'arab' ? 'arab' : 'latn';
}

export function setTextSize(size) {
  setPref('textSize', TEXT_SCALE[size] ? size : 'm');
  applyTextAttrs();
}

export function setDigits(system) {
  setPref('digits', system === 'arab' ? 'arab' : 'latn');
  applyTextAttrs();
}

/** Runtime switch used by the Reduce-glass setting (batch 10). */
export function setGlass(mode) {
  const v = mode === 'reduced' ? 'reduced' : 'full';
  setPref('glass', v);
  document.documentElement.dataset.glass = v;
}
