// ============================================
// Tomodachi — i18n Configuration
// Supported locales, default locale, and the RTL list.
// Read by js/i18n/index.js (init) and js/i18n/rtl.js (L1.02 — direction).
// Per docs/PROJECT_RULES.md §5.2.
// ============================================

export const I18N_CONFIG = {
  supportedLocales: ['en', 'ar'],
  defaultLocale: 'en',
  // Locales that render right-to-left. L1.02 wires <html dir> off this list.
  rtlLocales: ['ar'],
  // localStorage key for the user's last picked locale.
  storageKey: 'tomodachi-lang',
  // URL query param the language detector honors first.
  queryParam: 'lang'
};
