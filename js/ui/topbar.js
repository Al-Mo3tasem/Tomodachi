// ============================================
// Tomodachi — editorial top bar (v2 shell only)
// Every app screen gets: a sticky bar (back · compact title · actions) and a
// large in-flow title below it. When the large title scrolls under the bar
// (72px, released at 24px — hysteresis), the bar collapses: compact title
// fades in and the bar becomes the second (and last) glass surface.
// The legacy <nav class="nav"> and .page-header are hidden under v2; the
// account cluster (locale · theme · settings · logout) MOVES into the Home
// bar's actions — same nodes, same ids, same listeners.
// ============================================

import { $ } from '../core/core.js?v=20260906f';
import { back as navBack, navigate, canGoBack, currentScreenId } from '../core/nav.js?v=20260906f';
import { applyTranslations } from '../i18n/apply.js?v=20260906f';
import { getI18n, onLocaleChange } from '../i18n/index.js?v=20260906f';

// screen → i18n key of its title (immersive screens keep their own chrome)
const TITLES = {
  'screen-dashboard': 'dashboard.title',
  'screen-select': 'select.title',
  'screen-leaderboard': 'leaderboard.title',
  'screen-settings': 'settings.title',
  'screen-lessons-list': 'lesson.list_title',
};
const COLLAPSE_AT = 72;
const EXPAND_AT = 24;

const bars = new Map();   // screenId → { bar, title }

function build(screenId, titleKey) {
  const screen = $(screenId);
  const container = screen && screen.querySelector('.container');
  if (!container || bars.has(screenId)) return;

  const bar = document.createElement('header');
  bar.className = 'topbar';
  bar.dataset.for = screenId;
  bar.innerHTML =
    `<button type="button" class="topbar-back" data-i18n-attr="aria-label:common.back" aria-label="Back" hidden>` +
      `<svg aria-hidden="true"><use href="#ic-back"/></svg></button>` +
    `<h2 class="topbar-compact" data-i18n="${titleKey}"></h2>` +
    `<div class="topbar-actions"></div>`;
  const title = document.createElement('h1');
  title.className = 'topbar-title';
  title.dataset.i18n = titleKey;

  container.prepend(title);
  container.prepend(bar);
  bar.querySelector('.topbar-back').addEventListener('click', () => { if (!navBack()) navigate('screen-dashboard'); });
  bars.set(screenId, { bar, title });
}

// The account cluster leaves the hidden legacy nav for the Home bar.
function adoptAccountCluster() {
  const nav = document.querySelector('nav.nav');
  const home = bars.get('screen-dashboard');
  if (!nav || !home) return;
  const actions = home.bar.querySelector('.topbar-actions');
  for (const sel of ['.nav-locale-bar', '.theme-toggle', '#btn-settings']) {
    const node = nav.querySelector(sel);
    if (node) actions.appendChild(node);
  }
  // Logout belongs with the account (Me = settings until batch 10), not in the bar:
  // a text button there squeezes the compact title on 390px screens.
  const logout = nav.querySelector('#btn-logout');
  const settings = document.querySelector('#screen-settings .container');
  if (logout && settings) settings.appendChild(logout);
}

function translateAll() {
  const i18n = getI18n();
  if (!i18n) return;
  for (const { bar, title } of bars.values()) { applyTranslations(i18n, bar); applyTranslations(i18n, title); }
}

function setCollapsed(entry, collapsed) {
  entry.bar.classList.toggle('is-collapsed', collapsed);
  entry.bar.classList.toggle('glass', collapsed);
}

function onScroll() {
  const entry = bars.get(currentScreenId());
  if (!entry) return;
  const y = window.scrollY || 0;
  if (y > COLLAPSE_AT) setCollapsed(entry, true);
  else if (y < EXPAND_AT) setCollapsed(entry, false);
}

function onNavChange(e) {
  const entry = bars.get(e.detail.screen);
  if (!entry) return;
  setCollapsed(entry, false);
  entry.bar.querySelector('.topbar-back').hidden = !canGoBack();
}

export function initTopbars() {
  if (document.documentElement.dataset.shell !== 'v2') return;   // v1 keeps its headers
  for (const [id, key] of Object.entries(TITLES)) build(id, key);
  adoptAccountCluster();
  translateAll();
  document.addEventListener('nav:change', onNavChange);
  window.addEventListener('scroll', onScroll, { passive: true });
  onLocaleChange(translateAll);
}
