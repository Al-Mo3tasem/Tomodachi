// ============================================
// Tomodachi — number / time / date formatting (numbers are ink)
// One formatter so the digits setting is honoured everywhere and a screen
// never mixes Arabic-Indic and Latin digits.
//   digits pref: 'latn' (default, also for Arabic UI) | 'arab' (١٢٣)
//   locale: read from <html lang> (kept in sync by the i18n layer) — no
//   import of the i18n module, so this file is unit-testable in Node.
// ============================================

import { getPref } from './prefs.js?v=20260906g';

function lang() {
  try { return (document.documentElement.getAttribute('lang') || 'en').split('-')[0]; } catch (_e) { return 'en'; }
}
function numberingSystem() {
  return getPref('digits') === 'arab' ? 'arab' : 'latn';
}
function numberLocale() {
  // Grouping/decimal follow the UI language; digits follow the setting.
  const base = lang() === 'ar' ? 'ar-EG' : 'en-US';
  return `${base}-u-nu-${numberingSystem()}`;
}

const nfCache = new Map();
function nf(opts) {
  const key = numberLocale() + JSON.stringify(opts || {});
  let f = nfCache.get(key);
  if (!f) { f = new Intl.NumberFormat(numberLocale(), opts); nfCache.set(key, f); }
  return f;
}

/** 1240 → "1,240" (or "١٬٢٤٠" under digits=arab). */
export function fmtNumber(n, opts) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  return nf(opts).format(v);
}

/** Integer counts (no fractions). */
export function fmtCount(n) {
  return fmtNumber(Math.round(Number(n) || 0), { maximumFractionDigits: 0 });
}

/** Whole percent: 0.734 → "73%". */
export function fmtPercent(ratio) {
  return nf({ style: 'percent', maximumFractionDigits: 0 }).format(Number(ratio) || 0);
}

/** ms → "m:ss" with the digits setting applied to both parts. */
export function fmtTime(ms) {
  const total = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const two = nf({ minimumIntegerDigits: 2, useGrouping: false });
  const one = nf({ useGrouping: false });
  return `${one.format(m)}:${two.format(s)}`;
}

/** Short date for history rows etc. */
export function fmtDate(date, opts = { year: 'numeric', month: 'short', day: 'numeric' }) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(numberLocale(), opts).format(d);
}

/**
 * Japanese text is always an LTR island inside Arabic layouts. Returns a
 * <bdi lang="ja"> element (or fills the one passed) so bidi never reorders
 * kana, punctuation or romaji within a run.
 */
export function jaNode(text, el) {
  const node = el || document.createElement('bdi');
  node.setAttribute('lang', 'ja');
  node.setAttribute('dir', 'ltr');
  node.textContent = text == null ? '' : String(text);
  return node;
}

/** Set an element's content to a Japanese run (clears previous children). */
export function setJa(el, text) {
  if (!el) return;
  el.replaceChildren(jaNode(text));
}

/**
 * Static text carries digits too ("First to 10", "1m", a version string).
 * Under digits=arab every Latin digit outside an HTML tag becomes its
 * Arabic-Indic twin, so a screen never mixes systems; otherwise a no-op.
 * The i18n layer runs this over every translated string.
 */
const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
export function localizeDigits(str) {
  if (str == null) return '';
  const s = String(str);
  if (numberingSystem() !== 'arab' || !/[0-9]/.test(s)) return s;
  // digits inside <tags> stay (h1..h6, attributes); text between tags converts
  return s.replace(/(<[^>]*>)|[0-9]/g, (m, tag) => (tag ? tag : ARABIC_INDIC[m.charCodeAt(0) - 48]));
}
