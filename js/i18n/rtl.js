// ============================================
// Tomodachi — RTL / LTR direction management
// Sets <html dir="rtl"> for AR (or any locale in I18N_CONFIG.rtlLocales);
// <html dir="ltr"> otherwise. Wired into i18n/index.js so it runs on
// init and on every languageChanged event.
//
// Per docs/PROJECT_RULES.md §12.1: direction is data, not magic. The
// active locale's RTL membership is the only signal that flips the
// page direction.
// ============================================

import { I18N_CONFIG } from '../config/i18n.js?v=20260801c';

/**
 * Set <html dir> based on whether `locale` is in I18N_CONFIG.rtlLocales.
 * Idempotent; safe to call repeatedly.
 * @param {string} locale - e.g., 'en', 'ar'
 */
export function applyDirection(locale) {
  if (!locale) return;
  const lang = locale.split('-')[0];
  const dir = I18N_CONFIG.rtlLocales.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
}
