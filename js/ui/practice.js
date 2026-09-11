// ============================================
// Tomodachi — Practice tab (pick 21: due count + 7-day forecast + session
// cap + last run + Zen / Survival tiles) and the game-setup dock shelf
//
//   initPractice()      v2 only: wires #screen-practice; while #screen-select
//                       is on top, its Start CTA (and the selection meta)
//                       live in the dock shelf and move back when it leaves
//   renderPractice()    refresh from state — no network except the last run,
//                       served from js/data/history.js's 60 s cache
//
// Numbers are ink: one hero number (rose only when reviews are overdue); the
// forecast bars are tonal with today in tan. The hero counts what is reviewable
// NOW; the first forecast bar counts everything scheduled for today, so it can
// stand above a hero reading zero when items come back later in the day. The Zen / Survival tiles hand
// the mode to app.js through the 'tomo:play' event (same path as the Home
// friend sheet) so the setup logic stays in one place.
// ============================================

import { $ } from '../core/core.js?v=20260911c';
import { t, getLocale, onLocaleChange } from '../i18n/index.js?v=20260911c';
import { currentScreenId } from '../core/nav.js?v=20260911c';
import { fmtCount, fmtNumber, fmtPercent, fmtRelativeDays } from '../core/format.js?v=20260911c';
import { dueSummary, computeForecast, startReview, SESSION_CAP } from './review.js?v=20260911c';
import { loadRecentGames, lastSoloSession } from '../data/history.js?v=20260911c';
import { openLeaderboard } from '../data/leaderboards.js?v=20260911c';
import { setShelf } from './dock.js?v=20260911c';

const v2 = () => document.documentElement.dataset.shell === 'v2';
const DAY = 86400000;
const FORECAST_DAYS = 7;
const LOOKAHEAD_DAYS = 91;   // one day past the longest SRS stage, so "nothing ahead" really means an empty queue
const MODES = [
  { key: 'zen', icon: 'ic-zen' },
  { key: 'survival', icon: 'ic-survival' },
];

let built = false;
let shelf = null;   // { footer, meta } while the Start CTA sits in the dock shelf

const isVisible = () => currentScreenId() === 'screen-practice';

// ----- wiring -----
export function initPractice() {
  if (built || !v2() || !$('screen-practice')) return;
  built = true;
  buildTiles();
  $('practice-review-btn')?.addEventListener('click', () => { if (dueSummary().due > 0) startReview(); });
  $('practice-leaderboard')?.addEventListener('click', () => openLeaderboard());
  document.addEventListener('nav:change', (e) => {
    const id = e.detail && e.detail.screen;
    syncShelf(id);
    if (id === 'screen-practice') renderPractice();
  });
  document.addEventListener('tomo:activity', () => { if (isVisible()) renderPractice(); });
  onLocaleChange(() => { if (isVisible()) renderPractice(); });
}

function buildTiles() {
  const host = $('practice-tiles');
  const tpl = $('tpl-mode-tile');
  if (!host || !tpl) return;
  host.innerHTML = '';
  for (const m of MODES) {
    const tile = tpl.content.firstElementChild.cloneNode(true);
    tile.dataset.mode = m.key;
    tile.querySelector('use').setAttribute('href', `#${m.icon}`);
    tile.addEventListener('click', () => document.dispatchEvent(new CustomEvent('tomo:play', { detail: { mode: m.key } })));
    host.appendChild(tile);
  }
}

// ----- dock shelf for #screen-select (the one glass surface stays the dock) -----
function syncShelf(screenId) {
  if (screenId === 'screen-select') mountShelf();
  else if (shelf) unmountShelf();
}

function mountShelf() {
  if (shelf) return;
  const screen = $('screen-select');
  const footer = screen && screen.querySelector('.select-footer');
  const btn = $('btn-start');
  // Never detach the CTA before we know it has somewhere to land: with no dock
  // (or no shelf row) the button would leave the DOM while CSS hides the footer.
  if (!screen || !footer || !btn || !$('dock-shelf')) return;
  const meta = footer.querySelector('.selection-meta');
  const wrap = document.createElement('div');
  wrap.className = 'shelf-start';
  if (meta) wrap.appendChild(meta);
  wrap.appendChild(btn);            // same node, same id, same listener
  setShelf(wrap);
  // one flag for every surface that has to clear the taller dock: the setup
  // screen's own padding and the toast rail (css --dock-shelf-h)
  document.documentElement.dataset.shelf = '1';
  shelf = { footer, meta };
}

function unmountShelf() {
  if (!shelf) return;
  const { footer, meta } = shelf;
  const btn = $('btn-start');
  if (meta) footer.appendChild(meta);
  if (btn) footer.appendChild(btn);
  setShelf(null);
  delete document.documentElement.dataset.shelf;
  shelf = null;
}

// ----- render -----
export function renderPractice() {
  if (!built) return;
  const { due, overdue } = dueSummary();
  const count = $('practice-due-count');
  count.textContent = fmtCount(due);
  count.classList.toggle('is-attention', overdue > 0);
  $('practice-due-caption').textContent = t(due ? 'home.tile.reviews' : 'home.tile.reviews_clear');
  $('practice-review-btn').hidden = due === 0;
  renderForecast(computeForecast(FORECAST_DAYS), overdue > 0);
  renderCapLine(due);
  renderTiles();
  renderLastRun();
}

function renderForecast(days, overdue) {
  const host = $('practice-forecast');
  if (!host) return;
  host.innerHTML = '';
  const max = Math.max(1, ...days);
  const today = new Date();
  const narrow = new Intl.DateTimeFormat(getLocale(), { weekday: 'narrow' });
  const long = new Intl.DateTimeFormat(getLocale(), { weekday: 'long' });
  const spoken = [];
  days.forEach((n, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const day = document.createElement('span');
    day.className = 'forecast-day' + (i === 0 ? ' is-today' : '') + (n > 0 ? ' has-due' : '') + (i === 0 && overdue ? ' is-attention' : '');
    const c = document.createElement('span');
    c.className = 'forecast-count';
    c.textContent = fmtCount(n);
    const bar = document.createElement('span');
    bar.className = 'forecast-bar';
    bar.style.setProperty('--h', String(n / max));
    const label = document.createElement('span');
    label.className = 'forecast-label';
    label.textContent = narrow.format(d);
    day.append(c, bar, label);
    host.appendChild(day);
    spoken.push(`${long.format(d)} ${fmtCount(n)}`);
  });
  host.setAttribute('aria-label', `${t('practice.forecast_title')}: ${spoken.join(', ')}`);
}

function renderCapLine(due) {
  const el = $('practice-cap');
  if (!el) return;
  if (due > SESSION_CAP) { el.textContent = `${t('practice.cap', { cap: SESSION_CAP })} · ${t('practice.cap_more', { count: due - SESSION_CAP })}`; return; }
  if (due > 0) { el.textContent = t('practice.cap', { cap: SESSION_CAP }); return; }
  // Nothing to review right now: say when the next batch lands. Day 0 counts the
  // items coming back LATER today (a wrong answer returns in an hour), which is
  // why the forecast's first bar can stand above a hero reading zero.
  const ahead = computeForecast(LOOKAHEAD_DAYS);
  const idx = ahead.findIndex((n) => n > 0);
  el.textContent = idx >= 0 ? t('practice.next_due', { count: ahead[idx], when: fmtRelativeDays(idx) }) : t('practice.nothing_scheduled');
}

function renderTiles() {
  for (const m of MODES) {
    const tile = $('practice-tiles')?.querySelector(`[data-mode="${m.key}"]`);
    if (!tile) continue;
    tile.querySelector('.mode-tile-name').textContent = t(`modes.${m.key}.name`);
    tile.querySelector('.mode-tile-desc').textContent = t(`modes.${m.key}.desc`);
    tile.setAttribute('aria-label', `${t(`modes.${m.key}.name`)} · ${t(`modes.${m.key}.desc`)}`);
  }
}

function renderLastRun() {
  const card = $('practice-last');
  if (!card) return;
  const paint = () => {
    const s = lastSoloSession();
    if (!s) { card.hidden = true; return; }
    card.hidden = false;
    $('practice-last-mode').textContent = t(`modes.${s.gameType}.name`);
    $('practice-last-when').textContent = fmtRelativeDays(-daysSince(s.at));
    $('practice-last-score').textContent = fmtNumber(s.score || 0);
    $('practice-last-acc').textContent = fmtPercent(s.accuracy || 0);
  };
  paint();
  loadRecentGames().then(() => { if (isVisible()) paint(); }).catch(() => {});
}

function daysSince(ms) {
  if (!ms) return 0;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(ms); b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((a.getTime() - b.getTime()) / DAY));
}
