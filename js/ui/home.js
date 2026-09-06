// ============================================
// Tomodachi — Home (pick 4: 1 hero + 4 tiles; pick 7: rings + heatmap)
//
//   initHome()          v2 only: stamps <template id="tpl-v2-home"> into
//                       #screen-dashboard, moves the lesson/review CTAs into
//                       the hero, the stats/leaderboard/history cards to Me,
//                       keeps the modes card reachable (batch 9 moves it).
//   renderHome()        refreshes tile numbers, the friends strip, the rings
//                       and the heatmap from state (cheap; no network).
//
// Ids the rest of the app queries (lesson-cta*, review-cta*, stat-*, lb-preview,
// history-list, friend-*) survive the move — the id-contract test keeps it so.
// Numbers are ink: one hero number per tile, rose only for overdue reviews.
// ============================================

import { $, state } from '../core/core.js?v=20260906g';
import { t, onLocaleChange } from '../i18n/index.js?v=20260906g';
import { setTab } from '../core/nav.js?v=20260906g';
import { fmtCount, fmtNumber } from '../core/format.js?v=20260906g';
import { dueSummary, startReview } from './review.js?v=20260906g';
import { courseProgress, trackProgress, openLessonBrowser } from './lesson.js?v=20260906g';
import { openSheet, closeSheet } from './sheet.js?v=20260906g';

const v2 = () => document.documentElement.dataset.shell === 'v2';
const RING_R = 20;
const RING_C = 2 * Math.PI * RING_R;
const HEATMAP_WEEKS = 12;

const TILES = [
  { key: 'reviews',  icon: 'ic-reviews',  onTap: () => { if (dueSummary().due > 0) startReview(); else setTab('practice'); } },
  { key: 'course',   icon: 'ic-course',   onTap: () => setTab('course') },
  { key: 'practice', icon: 'ic-practice', onTap: () => setTab('practice') },
  { key: 'friends',  icon: 'ic-friends',  onTap: () => { setTab('friends'); const s = $('friends-strip'); if (s) s.scrollIntoView({ block: 'center', behavior: 'smooth' }); } },
];

let built = false;
let view = 'today';

// ----- build -----
export function initHome() {
  if (built || !v2()) return;
  const container = $('screen-dashboard')?.querySelector('.container');
  const tpl = $('tpl-v2-home');
  if (!container || !tpl) return;
  const frag = tpl.content.cloneNode(true);

  // the hero adopts the two CTA cards (ids intact)
  const hero = frag.querySelector('#home-hero');
  for (const id of ['lesson-cta', 'review-cta']) { const n = $(id); if (n) hero.appendChild(n); }
  // the modes card stays on Home (below the strip) until batch 9
  const today = frag.querySelector('#home-today');
  const modes = container.querySelector('.modes-card');
  if (modes) today.appendChild(modes);
  // stats, leaderboard preview and history live under Me from now on
  const me = document.querySelector('#screen-settings .container');
  const logout = $('btn-logout');
  for (const sel of ['.profile-card', '.lb-card', '.history-card']) {
    const n = container.querySelector(sel);
    if (!n || !me) continue;
    if (logout && logout.parentElement === me) me.insertBefore(n, logout); else me.appendChild(n);
  }
  const grid = container.querySelector('.dashboard-grid');
  if (grid && !grid.children.length) grid.remove();

  const title = container.querySelector('.topbar-title');
  if (title) title.after(frag); else container.appendChild(frag);

  // Today | Course
  $('home-switch')?.querySelectorAll('.seg-btn').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  buildTiles();
  built = true;
  onLocaleChange(() => renderHome());
  document.addEventListener('nav:change', (e) => { if (e.detail && e.detail.screen === 'screen-dashboard') renderHome(); });
  renderHome();
}

function setView(next) {
  view = next === 'course' ? 'course' : 'today';
  $('home-today').hidden = view !== 'today';
  $('home-course').hidden = view !== 'course';
  $('home-switch')?.querySelectorAll('.seg-btn').forEach((b) => {
    const on = b.dataset.view === view;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  if (view === 'course') { renderTrackRings(); renderHeatmap(); }
}

function buildTiles() {
  const host = $('home-tiles');
  const tpl = $('tpl-stat-tile');
  if (!host || !tpl) return;
  host.innerHTML = '';
  for (const def of TILES) {
    const tile = tpl.content.firstElementChild.cloneNode(true);
    tile.dataset.tile = def.key;
    tile.querySelector('use').setAttribute('href', `#${def.icon}`);
    tile.addEventListener('click', def.onTap);
    host.appendChild(tile);
  }
}

// ----- render -----
export function renderHome() {
  if (!built) return;
  const { due, overdue } = dueSummary();
  const cp = courseProgress();
  const best = (state.stats && state.stats.highestSoloScore) || 0;
  const online = friendsOnline().length;

  setTile('reviews', fmtCount(due), due ? t('home.tile.reviews') : t('home.tile.reviews_clear'), overdue > 0);
  setTile('course', fmtCount(cp.done), t('home.tile.course', { total: cp.total }));
  setTile('practice', fmtNumber(best), t('home.tile.practice'));
  setTile('friends', fmtCount(online), t('home.tile.friends'));
  renderFriendsStrip();
  if (view === 'course') { renderTrackRings(); renderHeatmap(); }
}

function setTile(key, value, caption, attention = false) {
  const tile = $('home-tiles')?.querySelector(`[data-tile="${key}"]`);
  if (!tile) return;
  tile.querySelector('.num-hero').textContent = value;
  tile.querySelector('.num-caption').textContent = caption;
  tile.classList.toggle('is-attention', !!attention);
  tile.setAttribute('aria-label', `${value} ${caption}`);
}

// ----- friends strip (single-friend prototype until batch 11's friends model) -----
function friendsOnline() {
  const p = state.friendPresence;
  if (!p || !(p.status === 'online' || p.status === 'in_game')) return [];
  return [{ uid: p.userId || null, name: p.displayName || p.username || 'Friend', avatar: p.avatarEmoji || (state.friend && state.friend.avatarEmoji) || '🎮', status: p.status }];
}

function renderFriendsStrip() {
  const strip = $('friends-strip');
  const tpl = $('tpl-friend-card');
  if (!strip || !tpl) return;
  strip.innerHTML = '';
  for (const f of friendsOnline()) {
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.querySelector('.friend-emoji').textContent = f.avatar;
    card.querySelector('.presence-dot').classList.toggle('is-in-game', f.status === 'in_game');
    card.querySelector('.friend-name').textContent = f.name;
    card.setAttribute('aria-label', `${f.name} · ${t(f.status === 'in_game' ? 'dashboard.friend.status_in_game' : 'dashboard.friend.status_online')}`);
    card.addEventListener('click', () => openFriendSheet(f));
    strip.appendChild(card);
  }
  const ghost = tpl.content.firstElementChild.cloneNode(true);
  ghost.classList.add('is-ghost');
  ghost.querySelector('.friend-emoji').textContent = '+';
  ghost.querySelector('.presence-dot').remove();
  ghost.querySelector('.friend-name').textContent = t('home.all_friends');
  ghost.addEventListener('click', () => setTab('friends'));
  strip.appendChild(ghost);
}

function openFriendSheet(f) {
  openSheet({
    title: f.name,
    content: (body) => {
      const status = document.createElement('p');
      status.className = 'friend-sheet-status';
      status.textContent = t(f.status === 'in_game' ? 'dashboard.friend.status_in_game' : 'dashboard.friend.status_online');
      const actions = document.createElement('div');
      actions.className = 'sheet-actions';
      for (const mode of ['duel', 'coop']) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = mode === 'duel' ? 'btn btn-primary' : 'btn btn-secondary';
        btn.textContent = t(`modes.${mode}.name`);
        btn.disabled = f.status === 'in_game';
        btn.addEventListener('click', () => {
          closeSheet({ reason: 'program' });
          document.dispatchEvent(new CustomEvent('home:play', { detail: { mode, uid: f.uid } }));
        });
        actions.appendChild(btn);
      }
      body.append(status, actions);
    },
  });
}

// ----- course view -----
export function renderTrackRings() {
  const host = $('track-rings');
  const tpl = $('tpl-track-ring');
  if (!host || !tpl) return;
  host.innerHTML = '';
  for (const tr of trackProgress()) {
    const ring = tpl.content.firstElementChild.cloneNode(true);
    ring.dataset.track = tr.key;
    ring.classList.toggle('is-complete', tr.total > 0 && tr.done >= tr.total);
    ring.style.setProperty('--ring-c', String(RING_C));
    ring.style.setProperty('--ring-off', String(RING_C * (1 - (tr.pct / 100))));
    ring.querySelector('.num-hero').textContent = `${fmtCount(tr.pct)}%`;
    ring.querySelector('.track-label').textContent = t(`progress.${tr.key}`);
    ring.setAttribute('aria-label', `${t(`progress.${tr.key}`)} ${fmtCount(tr.pct)}%`);
    ring.addEventListener('click', () => openLessonBrowser(tr.key === 'course' ? {} : { track: tr.key, types: tr.types }));
    host.appendChild(ring);
  }
}

/** users/{uid}.activity = { 'YYYY-MM-DD': count } (written by js/data/users.js). */
export function renderHeatmap() {
  const host = $('home-heatmap');
  if (!host) return;
  const activity = (state.userData && state.userData.activity) || {};
  host.innerHTML = '';
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (HEATMAP_WEEKS * 7 - 1) - today.getDay());
  let total = 0;
  for (let i = 0; i < HEATMAP_WEEKS * 7 + today.getDay() + 1; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d > today) break;
    const key = isoDay(d);
    const n = Number(activity[key]) || 0;
    total += n;
    const cell = document.createElement('span');
    cell.className = 'heat-cell';
    cell.dataset.level = String(n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4);
    cell.dataset.day = key;
    cell.title = `${key} · ${fmtCount(n)}`;
    host.appendChild(cell);
  }
  const cap = $('home-heatmap-caption');
  if (cap) cap.textContent = t('home.activity_caption', { count: total });
}

function isoDay(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
