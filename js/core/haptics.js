// ============================================
// Tomodachi — haptics facade
// One vocabulary, used beside every playSound() and on chrome presses:
//   tap   light impact      answer tile / dock tab / chip press
//   snap  medium impact     sheet detent, drag-drop
//   tick  selection change  segmented control, setup selectors
//   ok    success           correct answer, lesson done
//   no    error             wrong answer
//   warn  warning           last seconds of a timer
// Web: silent no-op. Native: routed through the shell adapter, honouring the
// 'haptics' preference (default on). Never throws into UI code.
// ============================================

import { getPref } from './prefs.js?v=20260906g';
import { nativeHaptics } from '../native/shell.js?v=20260906g';

const KINDS = new Set(['tap', 'snap', 'tick', 'ok', 'no', 'warn']);

export function hapticsEnabled() {
  return getPref('haptics') !== 'false';
}

export function haptic(kind) {
  if (!KINDS.has(kind)) return;
  if (!hapticsEnabled()) return;
  const h = nativeHaptics();
  if (!h) return;
  try { const fn = h[kind]; if (typeof fn === 'function') fn(); } catch (_e) { /* never surface */ }
}
