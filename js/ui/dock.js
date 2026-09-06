// ============================================
// Tomodachi — floating glass dock (v2 shell only)
// Five tabs — Home · Course · Practice · Friends · Me — rendered from
// <template id="tpl-dock"> into #app. ONE element carries the glass; the
// optional shelf row lives inside it (a second blur is never mounted).
//
// Behaviour:
//   • tap → nav.setTab(); tapping the active tab pops to its root / scrolls up
//   • active state follows the 'nav:change' event (dock never guesses)
//   • hidden on immersive screens (body[data-immersive]) and while the
//     keyboard is up (body[data-kb]) — CSS, so no per-frame JS
//   • chrome-shrink: scrolling down compacts the dock (labels fade), scrolling
//     up restores it; the blurred element itself never animates height
//   • Friends has no root screen yet: it opens Home and scrolls to the friend bar
// ============================================

import { $ } from '../core/core.js?v=20260906g';
import { haptic } from '../core/haptics.js?v=20260906g';
import { setTab, currentTab, navigate, TABS } from '../core/nav.js?v=20260906g';
import { applyTranslations } from '../i18n/apply.js?v=20260906g';
import { getI18n, onLocaleChange } from '../i18n/index.js?v=20260906g';

let dock = null;
let indicator = null;
let lastY = 0;

const FRIENDS_FALLBACK = 'screen-dashboard';

function mount() {
  const tpl = $('tpl-dock');
  const app = $('app');
  if (!tpl || !app || $('dock')) return null;
  const frag = tpl.content.cloneNode(true);
  app.appendChild(frag);
  dock = $('dock');
  indicator = dock.querySelector('.dock-indicator');
  const i18n = getI18n();
  if (i18n) applyTranslations(i18n, dock);
  return dock;
}

function tabButtons() { return dock ? [...dock.querySelectorAll('.dock-tab')] : []; }

function setActive(tab) {
  const btns = tabButtons();
  let activeBtn = null;
  for (const b of btns) {
    const on = b.dataset.tab === tab;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
    if (on) activeBtn = b;
  }
  moveIndicator(activeBtn);
}

// The pill slides under the active tab. Measured, never index × width, so it
// is correct in RTL (DOM order unchanged, flex direction mirrored by dir).
function moveIndicator(btn) {
  if (!indicator || !btn || !dock) return;
  const d = dock.querySelector('.dock-tabs').getBoundingClientRect();
  const r = btn.getBoundingClientRect();
  indicator.style.setProperty('--x', `${r.left - d.left + (r.width - indicator.offsetWidth) / 2}px`);
  indicator.classList.add('is-ready');
}

function onTap(tab) {
  haptic('tick');
  if (tab === 'friends') {
    // temporary: Friends lives on Home until the tab screen exists (batch 11)
    if (currentTab() !== 'home') navigate(FRIENDS_FALLBACK); else setTab('home');
    const bar = $('friends-strip') || $('friend-bar');
    if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  setTab(tab);
}

// Direct (no rAF): the work is two attribute toggles, and rAF-batched handlers
// lag badly in throttled/background tabs.
function onScroll() {
  const y = window.scrollY || 0;
  const dy = y - lastY;
  const root = document.documentElement;
  if (y < 24) root.removeAttribute('data-chrome');
  else if (dy > 6) root.dataset.chrome = 'compact';
  else if (dy < -6) root.removeAttribute('data-chrome');
  lastY = y;
}

/** Optional shelf row ABOVE the tabs (reviews due, live duel score). Pass null to clear. */
export function setShelf(node) {
  const shelf = dock && dock.querySelector('#dock-shelf');
  if (!shelf) return;
  shelf.replaceChildren();
  if (node) shelf.appendChild(typeof node === 'string' ? Object.assign(document.createElement('span'), { textContent: node }) : node);
  shelf.hidden = !node;
}

export function initDock() {
  if (document.documentElement.dataset.shell !== 'v2') return;   // v1: no dock
  if (!mount()) return;
  for (const b of tabButtons()) b.addEventListener('click', () => onTap(b.dataset.tab));
  document.addEventListener('nav:change', (e) => {
    setActive(e.detail.tab);
    document.documentElement.removeAttribute('data-chrome');
    lastY = 0;
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => setActive(currentTab()));
  onLocaleChange(() => { const i18n = getI18n(); if (i18n) applyTranslations(i18n, dock); setActive(currentTab()); });
  setActive(TABS.includes(currentTab()) ? currentTab() : 'home');
}
