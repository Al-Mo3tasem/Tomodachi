// ============================================
// Tomodachi — i18n DOM Substitution
// Walks a root for [data-i18n], [data-i18n-attr], and
// [data-i18n-placeholder] attributes and writes the translated value
// looked up via the passed-in i18next instance.
//
// Patterns supported:
//   <h1 data-i18n="auth.brand.title">Tomodachi</h1>
//     → element.textContent = t('auth.brand.title')
//
//   <button data-i18n-attr="title:nav.settings_title">⚙️</button>
//     → element.title = t('nav.settings_title')
//
//   Multiple attrs (comma-separated, each `attr:key`):
//   <button data-i18n-attr="title:x,aria-label:y">⚙️</button>
//
//   <input data-i18n-placeholder="auth.login.email_placeholder">
//     → element.placeholder = t('auth.login.email_placeholder')
//
// The EN text stays in the markup as a fallback so the page renders
// sensibly even if i18next fails to load. On init and every
// languageChanged event, index.js re-runs this against `document`.
// ============================================

import { localizeDigits } from '../core/format.js?v=20260906g';

export function applyTranslations(i18n, root = document) {
  applyTextContent(i18n, root);
  applyPlaceholders(i18n, root);
  applyArbitraryAttrs(i18n, root);
}

function applyTextContent(i18n, root) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    // textContent — avoids HTML injection from translation values.
    el.textContent = localizeDigits(i18n.t(key));
  });
}

function applyPlaceholders(i18n, root) {
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key) return;
    el.setAttribute('placeholder', localizeDigits(i18n.t(key)));
  });
}

// data-i18n-attr="attrName:key,attrName2:key2"
function applyArbitraryAttrs(i18n, root) {
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const spec = el.getAttribute('data-i18n-attr');
    if (!spec) return;
    spec.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (!attr || !key) return;
      el.setAttribute(attr, localizeDigits(i18n.t(key)));
    });
  });
}
