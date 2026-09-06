// ============================================
// Tomodachi — number tickers (pick 9 / 10)
//   countUp(el, to, { duration, suffix, from })
// One ticker for results and celebrations; digits go through fmtNumber so
// the digits setting holds mid-animation. Instant under reduced motion.
// ============================================

import { fmtNumber } from '../core/format.js?v=20260906f';

const reducedMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_e) { return false; } };
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);

/**
 * @param {HTMLElement} el
 * @param {number} to
 * @param {{ duration?: number, suffix?: string, from?: number }} [opts]
 */
export function countUp(el, to, { duration = 900, suffix = '', from = 0 } = {}) {
  if (!el) return;
  const target = Number(to) || 0;
  if (reducedMotion() || duration <= 0 || typeof requestAnimationFrame !== 'function') {
    el.textContent = fmtNumber(Math.round(target)) + suffix;
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    el.textContent = fmtNumber(Math.round(from + (target - from) * easeOutCubic(p))) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
