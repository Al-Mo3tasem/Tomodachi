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

import { initI18n, setLocale, getLocale } from './i18n/index.js?v=20260906a';

// Theme on policy pages: the <head> pre-paint script already resolved
// stored-choice-else-system before first paint. Here we only wire the nav
// quick-toggle. Same storage key as core.js setTheme(); no Firebase needed.
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('tomodachi-theme', theme);
  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#161311' : '#F6F3EB');
}

document.querySelectorAll('.theme-toggle').forEach((btn) => {
  btn.setAttribute('aria-pressed', String(document.documentElement.getAttribute('data-theme') === 'dark'));
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
});

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
