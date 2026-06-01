// ============================================
// Tomodachi — Policy-page bootstrap
// Used by privacy.html, terms.html, cookies.html.
//
// Policy pages are static legal content — no Firebase, no analytics,
// no Sentry. The only runtime concerns are:
//   1. Loading i18n so [data-i18n] swaps the EN content to AR when
//      the visitor's locale resolves to 'ar'.
//   2. Wiring the EN | AR locale toggle in the policy nav.
//
// Mirrors bindLocaleToggles() in js/app.js so the visual behavior is
// identical to the landing-page toggle.
// ============================================

import { initI18n, setLocale, getLocale } from './i18n/index.js?v=20260601f';

function bindLocaleToggles() {
  const update = () => {
    const cur = getLocale();
    document.querySelectorAll('.locale-toggle').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.locale === cur);
    });
  };
  document.querySelectorAll('.locale-toggle').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await setLocale(btn.dataset.locale);
      update();
    });
  });
  update();
}

(async () => {
  try {
    await initI18n();
    bindLocaleToggles();
  } catch (err) {
    // Fail-open: if i18n can't load (CDN blocked, network issue), the
    // page still renders in EN because every [data-i18n] node carries
    // an inline EN fallback. Logging only — no user-visible toast on
    // a legal page.
    console.warn('[policy-init] i18n init failed:', err);
  }
})();
