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

import { initI18n, setLocale, getLocale } from './i18n/index.js?v=20260610a';

// Policy pages hardcode data-theme="light" in their markup; without this
// sync, a user who chose dark in the app landed on a flash-bang light page.
// Same storage key as core.js setTheme(); no Firebase needed here.
const storedTheme = localStorage.getItem('tomodachi-theme');
if (storedTheme === 'dark' || storedTheme === 'light') {
  document.documentElement.setAttribute('data-theme', storedTheme);
}

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

// Render <time datetime="…"> in the active locale. Per CONTENT_GUIDELINES
// §13.1/§13.2: AR dates use Arabic month names with Western numerals
// («31 مايو 2026»), so ar-EG with latin digits is the right formatter.
function localizeDates() {
  const locale = getLocale() === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
  document.querySelectorAll('time[datetime]').forEach((el) => {
    const d = new Date(el.getAttribute('datetime'));
    if (!isNaN(d)) {
      el.textContent = d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    }
  });
}

(async () => {
  try {
    await initI18n();
    bindLocaleToggles();
    localizeDates();
    document.querySelectorAll('.locale-toggle').forEach((btn) =>
      btn.addEventListener('click', () => setTimeout(localizeDates, 0))
    );
  } catch (err) {
    // Fail-open: if i18n can't load (CDN blocked, network issue), the
    // page still renders in EN because every [data-i18n] node carries
    // an inline EN fallback. Logging only — no user-visible toast on
    // a legal page.
    console.warn('[policy-init] i18n init failed:', err);
  }
})();
