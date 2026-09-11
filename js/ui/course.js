// ============================================
// Tomodachi — Course tab (pick 7: rings per track + study heatmap + the
// filtered lesson browser + a Continue hero)
//
//   initCourse()                       v2 only: wires #screen-course and takes
//                                      over "browse lessons" from lesson.js
//   openCourse({ track, types })       show the tab, optionally filtered to a track
//   renderTrackRings(host, onTap)      shared with Home's Course view
//   renderHeatmap(host, captionEl)     shared with Home's Course view
//
// Layout: Continue hero (the next lesson) → rings → activity → the lesson
// rows from <template id="tpl-lesson-row"> (done ✓ / current ▶ / locked 🔒,
// locked rows aria-disabled) behind an optional track filter pill.
// Renders on every entry — cheap once the catalog is cached — and whenever
// progress changes ('tomo:activity') or the locale switches.
// ============================================

import { $, state } from '../core/core.js?v=20260911c';
import { t, getLocale, onLocaleChange } from '../i18n/index.js?v=20260911c';
import { navigate, currentScreenId } from '../core/nav.js?v=20260911c';
import { fmtCount, localizeDigits } from '../core/format.js?v=20260911c';
import { statusChip } from './status.js?v=20260911c';
import { mountSkeleton } from './skeleton.js?v=20260911c';
import {
  loadLessons, lessonCatalog, nextLesson, openLesson, openNextLesson, trackProgress, setLessonBrowserHandler,
} from './lesson.js?v=20260911c';

const v2 = () => document.documentElement.dataset.shell === 'v2';
const pick = (en, ar) => (getLocale() === 'ar' && ar ? ar : en);
const RING_R = 20;
const RING_C = 2 * Math.PI * RING_R;
const HEATMAP_WEEKS = 12;
const TYPE_GLYPH = { hiragana: 'あ', katakana: 'ア', vocab: '💬', grammar: '文', kanji: '漢' };
const STATE_ICON = { done: 'ic-check', current: 'ic-play', locked: 'ic-lock' };

let built = false;
let filter = null;        // { track, types } | null
let filterIncoming = false;   // openCourse() set a filter for the entry that is about to happen
let renderSeq = 0;

const isVisible = () => currentScreenId() === 'screen-course';
/** Set text AND the key, so a locale change re-translates through apply.js. */
const setI18n = (el, key) => { if (el) { el.setAttribute('data-i18n', key); el.textContent = t(key); } };
const completedSet = () => new Set((state.userData && state.userData.completedLessons) || []);

// ----- wiring -----
export function initCourse() {
  if (built || !v2() || !$('screen-course')) return;
  built = true;
  setLessonBrowserHandler((f) => openCourse(f));
  $('course-continue')?.addEventListener('click', () => openNextLesson());
  $('course-filter-clear')?.addEventListener('click', () => setFilter(null));
  document.addEventListener('nav:change', (e) => {
    if (!e.detail || e.detail.screen !== 'screen-course') return;
    // A dock tap is a fresh visit: drop a track filter left from a previous one.
    // A ring tap arrives the same way (kind 'tab') but brought its own filter,
    // and popping back from a lesson keeps whatever was showing.
    if (e.detail.kind === 'tab' && !filterIncoming) filter = null;
    filterIncoming = false;
    render();
  });
  document.addEventListener('tomo:activity', () => { if (isVisible()) render(); });
  onLocaleChange(() => { if (isVisible()) render(); });
}

/** @param {{ track?: string, types?: string[] }|null} [f]  a track from a ring; null = the whole path */
export function openCourse(f = null) {
  filter = f && f.types && f.types.length ? { track: f.track, types: f.types } : null;
  if (isVisible()) { render(); return; }
  filterIncoming = true;               // survive the entry handler's fresh-visit reset
  navigate('screen-course');           // root of the Course tab; nav:change renders
  filterIncoming = false;
}

function setFilter(f) {
  filter = f && f.types && f.types.length ? { track: f.track, types: f.types } : null;
  renderRows(lessonCatalog());
}

// ----- render -----
async function render() {
  const seq = ++renderSeq;
  let catalog = lessonCatalog();
  if (!catalog.length) {
    const clear = mountSkeleton($('course-rows'), 'row', 6);
    let failed = false;
    try { catalog = await loadLessons(); }
    catch (err) { console.error('[course] catalog load failed:', err); failed = true; catalog = []; }
    finally { clear(); }
    if (seq !== renderSeq || !isVisible()) return;
    if (failed) statusChip(t('lesson.load_failed'), { icon: 'warn' });   // an empty path must not read as "no lessons exist"
  }
  renderHero(catalog);
  renderTrackRings($('course-rings'), (tr) => setFilter(tr.key === 'course' ? null : { track: tr.key, types: tr.types }));
  renderHeatmap($('course-heatmap'), $('course-heatmap-caption'));
  renderRows(catalog);
}

function renderHero(catalog) {
  const hero = $('course-hero');
  if (!hero) return;
  const total = catalog.length;
  if (!total) { hero.hidden = true; return; }
  hero.hidden = false;
  const done = completedSet().size;
  const nxt = nextLesson();
  const eyebrow = $('course-hero-eyebrow');
  const title = $('course-hero-title');
  const sub = $('course-hero-sub');
  const btn = $('course-continue');
  if (!nxt) {
    eyebrow.textContent = t('course.eyebrow_done');
    title.textContent = t('lesson.cta_all_done');
    sub.textContent = t('lesson.cta_all_done_sub', { count: total });
    btn.hidden = true;
    return;
  }

  eyebrow.textContent = t('progress.lesson_n', { n: nxt.globalOrder, total });
  title.textContent = localizeDigits(pick(nxt.displayName_en, nxt.displayName_ar));
  sub.textContent = t('lesson.minutes', { count: nxt.estimated_minutes || 0 });
  btn.hidden = false;
  // carry the key, not just the text: apply.js re-walks every [data-i18n] on a
  // locale change and would otherwise put "Continue" back on a first lesson
  setI18n(btn, done === 0 ? 'lesson.cta_start' : 'lesson.cta_continue');
}

function renderRows(catalog) {
  const host = $('course-rows');
  const tpl = $('tpl-lesson-row');
  if (!host || !tpl) return;
  const pill = $('course-filter');
  if (pill) {
    pill.hidden = !filter;
    if (filter) $('course-filter-label').textContent = t(`progress.${filter.track}`);
  }
  const done = completedSet();
  const current = nextLesson();
  const rows = filter ? catalog.filter((l) => filter.types.includes(l.contentType)) : catalog;
  const frag = document.createDocumentFragment();
  for (const l of rows) {
    const st = done.has(l.lessonKey) ? 'done' : (current && current.lessonKey === l.lessonKey) ? 'current' : 'locked';
    const row = tpl.content.firstElementChild.cloneNode(true);
    row.classList.add(`is-${st}`);
    row.dataset.lesson = l.lessonKey;
    row.dataset.state = st;
    const num = fmtCount(l.globalOrder);
    const name = localizeDigits(pick(l.displayName_en, l.displayName_ar));   // lesson titles carry numerals too
    row.querySelector('.lesson-row-type').textContent = TYPE_GLYPH[l.contentType] || '·';
    row.querySelector('.lesson-row-num').textContent = num;
    row.querySelector('.lesson-row-name').textContent = name;
    row.querySelector('use').setAttribute('href', `#${STATE_ICON[st]}`);
    row.setAttribute('aria-label', `${num} · ${name} · ${t(`course.row_${st}`)}`);
    if (st === 'locked') row.setAttribute('aria-disabled', 'true');
    row.addEventListener('click', () => {
      if (st === 'locked') { statusChip(t('lesson.locked_toast')); return; }
      openLesson(l);
    });
    frag.appendChild(row);
  }
  host.replaceChildren(frag);
}

// ----- shared renderers (Home's Course view uses them too) -----

/**
 * One SVG ring per PROGRESS_TRACK into `host` (from <template id="tpl-track-ring">).
 * @param {HTMLElement} host
 * @param {(tr: { key: string, types: string[]|null }) => void} onTap
 */
export function renderTrackRings(host, onTap) {
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
    if (onTap) ring.addEventListener('click', () => onTap(tr));
    host.appendChild(ring);
  }
}

/** users/{uid}.activity = { 'YYYY-MM-DD': count } (written by js/data/users.js). */
export function renderHeatmap(host, captionEl = null) {
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
  if (captionEl) captionEl.textContent = t('home.activity_caption', { count: total });
}

function isoDay(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
