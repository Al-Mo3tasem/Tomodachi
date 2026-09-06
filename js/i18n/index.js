// ============================================
// Tomodachi — i18n Initialization
// Wraps i18next + i18next-browser-languagedetector, loads en/ar JSON
// from sibling locales/ folder, exposes t() / setLocale() / getLocale().
//
// Pinned versions per docs/PROJECT_RULES.md §20:
//   i18next@26.3.0
//   i18next-browser-languagedetector@8.2.1
// Verified current stable on npmjs.com / npm registry on 2026-05-28.
//
// Buildless ES module imports via jsdelivr `/+esm`, matching the Firebase
// SDK CDN pattern in js/data/firebase.js. No bundler, no node_modules.
// ============================================

import i18next from 'https://cdn.jsdelivr.net/npm/i18next@26.3.0/+esm';
import LanguageDetector from 'https://cdn.jsdelivr.net/npm/i18next-browser-languagedetector@8.2.1/+esm';
import { I18N_CONFIG } from '../config/i18n.js?v=20260906f';
import { applyTranslations } from './apply.js?v=20260906f';
import { applyDirection } from './rtl.js?v=20260906f';
import { getPref, setPref } from '../core/prefs.js?v=20260906f';
import { fmtNumber, localizeDigits } from '../core/format.js?v=20260906f';

// Fetch a locale JSON next to this module so the path works regardless of
// where the page is mounted (root, sub-path, file:// during dev).
async function loadLocale(lang) {
  const url = new URL(`./locales/${lang}.json?v=20260906f`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load locale "${lang}": ${res.status}`);
  return res.json();
}

// One-shot init. Wire DOM substitution + a 'languageChanged' listener so
// switching locale re-walks the DOM and re-flips <html lang>.
export async function initI18n() {
  const [en, ar] = await Promise.all([loadLocale('en'), loadLocale('ar')]);

  // The saved locale lives in the prefs facade (one storage owner, mirrored
  // to native storage), so the detector reads and caches through it.
  const detector = new LanguageDetector();
  detector.addDetector({
    name: 'prefs',
    lookup: () => getPref('lang') || undefined,
    cacheUserLanguage: (lng) => setPref('lang', lng),
  });

  // Numbers are ink: every interpolated number runs through the one
  // formatter, so the digits setting holds inside translated strings too.
  // i18next 26 always installs a formatter module and points
  // interpolation.format at it, so the rule lives in a module of our own
  // (alwaysFormat below makes it run for every {{value}}). A caller that
  // needs a bare number (a year) passes a string.
  const numberFormatter = {
    type: 'formatter',
    init() {},
    add() {},
    addCached() {},
    format: (value) => (typeof value === 'number' ? fmtNumber(value) : value),
  };

  await i18next
    .use(detector)
    .use(numberFormatter)
    .init({
      supportedLngs: I18N_CONFIG.supportedLocales,
      fallbackLng: I18N_CONFIG.defaultLocale,
      load: 'languageOnly',
      resources: {
        en: { translation: en },
        ar: { translation: ar }
      },
      detection: {
        // Order matches the language-detector defaults but reorders to put
        // ?lang=ar first (URL is the most explicit signal a user can give).
        order: ['querystring', 'prefs', 'navigator', 'htmlTag'],
        lookupQuerystring: I18N_CONFIG.queryParam,
        caches: ['prefs']
      },
      interpolation: {
        // Disable HTML escaping — every consumer writes via textContent or
        // attribute setters, not innerHTML. Keeps {{name}} substitutions
        // clean in AR (otherwise Arabic chars get HTML-entity escaped).
        escapeValue: false,
        alwaysFormat: true   // → numberFormatter above, for every {{value}}
      },
      returnEmptyString: false
    });

  // Initial pass: walk the DOM and substitute every data-i18n* node;
  // sync <html lang> and <html dir>.
  applyTranslations(i18next);
  syncHtmlLang(i18next.language);
  applyDirection(i18next.language);

  // Subsequent passes on every changeLanguage().
  i18next.on('languageChanged', (lng) => {
    applyTranslations(i18next);
    syncHtmlLang(lng);
    applyDirection(lng);
  });
}

/**
 * Subscribe to locale changes. The handler runs after applyTranslations
 * has re-walked the DOM, so by the time it fires, every [data-i18n] node
 * is already in the new locale. App-level code uses this hook to re-run
 * parametric t() calls (e.g., `Welcome back, {{name}}`) that apply.js
 * can't update on its own because the var values live in JS state, not
 * in the markup.
 * @param {(lng: string) => void} handler
 */
export function onLocaleChange(handler) {
  i18next.on('languageChanged', handler);
}

// Mirror the active locale onto <html lang="..."> so screen readers + the
// browser know the page language. <html dir> is L1.02's job.
function syncHtmlLang(lng) {
  if (!lng) return;
  // Use only the language portion (e.g., "en-US" → "en").
  document.documentElement.setAttribute('lang', lng.split('-')[0]);
}

// Lookup a key. Optional interpolation values second. Digits in the result
// (literal ones like "First to 10", or values a caller pre-formatted) follow
// the digits setting; numbers passed as values were formatted by the
// formatter module above.
export function t(key, vars) {
  return localizeDigits(i18next.t(key, vars));
}

// Programmatic locale switch. Triggers the 'languageChanged' listener
// which re-walks the DOM. Persistence happens automatically via the
// 'prefs' detector cache (detection.caches above).
export async function setLocale(lang) {
  if (!I18N_CONFIG.supportedLocales.includes(lang)) return;
  await i18next.changeLanguage(lang);
}

/** The i18next instance — for modules that stamp <template>s and must translate them (dock, sheets). */
export function getI18n() {
  return i18next;
}

export function getLocale() {
  return (i18next.language || I18N_CONFIG.defaultLocale).split('-')[0];
}

export function isRTL(lang = getLocale()) {
  return I18N_CONFIG.rtlLocales.includes(lang);
}
