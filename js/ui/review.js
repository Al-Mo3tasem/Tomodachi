// ============================================
// Tomodachi — SRS Review Queue (v1)
// Items from COMPLETED lessons come back for spaced review: stages
// 1d → 3d → 7d → 14d → 30d → 90d. Correct promotes a stage; wrong resets
// to stage 0 (due again in an hour). Session = up to 20 due items.
//
// Storage: users/{uid}.srs = { "<type>:<itemKey>": { s: stage, d: dueMs } }.
// ~1,000 items ≈ a few tens of KB — comfortably inside the 1MB doc limit.
// Grammar points are NOT scheduled (their quiz needs example context; they
// re-surface via lesson review instead).
// One-time backfill: a user with completed lessons but no srs map gets all
// their learned items scheduled due-now.
// ============================================

import { state, $, shuffle } from '../core/core.js?v=20260906g';
import { navigate, back as navBack } from '../core/nav.js?v=20260906g';
import { haptic } from '../core/haptics.js?v=20260906g';
import { setJa } from '../core/format.js?v=20260906g';
import { renderChoiceTiles, lockTiles, showFeedbackSheet } from '../ui/quiz-tiles.js?v=20260906g';
import { writeActivity } from '../data/users.js?v=20260906g';
import { db, doc, updateDoc, getDoc } from '../data/firebase.js?v=20260906g';
import { cacheGet } from '../data/content.js?v=20260906g';
import { loadLessons } from './lesson.js?v=20260906g';
import { speak, unlockAudio } from '../audio/audio.js?v=20260906g';
import { t, getLocale } from '../i18n/index.js?v=20260906g';

const pick = (en, ar) => (getLocale() === 'ar' && ar ? ar : en);
const DAY = 86400000;
const STAGE_MS = [1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY, 90 * DAY];
const SESSION_CAP = 20;
const SCHEDULABLE = new Set(['hiragana', 'katakana', 'vocab', 'kanji']);

let R = null;   // active review session

function srsMap() { return state.userData?.srs || null; }

// ----- scheduling -----

// Called by lesson.js when a lesson is completed the FIRST time.
export async function scheduleLessonSrs(lesson, items) {
  if (!SCHEDULABLE.has(lesson.contentType) || !state.user) return;
  const now = Date.now();
  const updates = {};
  const local = { ...(state.userData?.srs || {}) };
  for (const it of items) {
    const key = `${lesson.contentType}:${it.key}`;
    if (local[key]) continue;               // replays never reset progress
    const entry = { s: 0, d: now + STAGE_MS[0] };
    updates[`srs.${key}`] = entry;
    local[key] = entry;
  }
  if (!Object.keys(updates).length) return;
  state.userData = { ...state.userData, srs: local };
  try { await updateDoc(doc(db, 'users', state.user.uid), updates); }
  catch (err) { console.error('[srs] schedule failed:', err); }
}

// One-time backfill for users who completed lessons before SRS existed.
async function backfillIfNeeded() {
  if (!state.user || state.userData?.srs !== undefined) return;
  const lessons = await loadLessons();
  const done = new Set(state.userData?.completedLessons || []);
  const now = Date.now();
  const map = {};
  for (const l of lessons) {
    if (!done.has(l.lessonKey) || !SCHEDULABLE.has(l.contentType)) continue;
    for (const k of l.itemKeys) map[`${l.contentType}:${k}`] = { s: 0, d: now };
  }
  state.userData = { ...state.userData, srs: map };
  try { await updateDoc(doc(db, 'users', state.user.uid), { srs: map }); }
  catch (err) { console.error('[srs] backfill failed:', err); }
}

function dueEntries() {
  const map = srsMap();
  if (!map) return [];
  const now = Date.now();
  return Object.entries(map).filter(([, v]) => v && v.d <= now);
}

/** Home tile: how many items are due, and how many of those are more than a day late. */
export function dueSummary() {
  const now = Date.now();
  const due = dueEntries();
  return { due: due.length, overdue: due.filter(([, v]) => now - v.d > 86400000).length };
}

// ----- dashboard card -----

export async function renderReviewCta() {
  const cta = $('review-cta');
  if (!cta) return;
  try { await backfillIfNeeded(); } catch (_e) { /* non-fatal */ }
  const due = dueEntries();
  if (!due.length) { cta.hidden = true; return; }
  $('review-cta-sub').textContent = t('review.due', { count: Math.min(due.length, 99) });
  cta.hidden = false;
}

// ----- session -----

export async function startReview() {
  const due = shuffle(dueEntries()).slice(0, SESSION_CAP);
  if (!due.length) return;
  unlockAudio();
  // fetch the item docs in parallel
  const fetched = await Promise.all(due.map(async ([key]) => {
    const [type, ...rest] = key.split(':');
    const itemKey = rest.join(':');
    try {
      const snap = await getDoc(doc(db, 'content_sets', type, 'items', itemKey));
      return snap.exists() ? { key, type, item: snap.data() } : null;
    } catch (_e) { return null; }
  }));
  const rows = fetched.filter(Boolean);
  if (!rows.length) return;

  R = { rows: shuffle(rows), i: 0, correct: 0, results: {}, locked: false };
  navigate('screen-review');
  renderQuestion();
}

// Distractor pool per type: prefer the full cached type items, fall back to
// the session's own rows of that type.
function typePool(type, field) {
  const cached = cacheGet(`items-${type}`);
  const source = (cached && cached.length ? cached : R.rows.filter(r => r.type === type).map(r => r.item));
  return [...new Set(source.map(field).filter(Boolean))];
}

function questionFor(row) {
  const it = row.item;
  if (row.type === 'vocab') {
    const answer = pick(it.en?.primary, it.ar?.primary);
    const pool = typePool('vocab', x => pick(x.en?.primary, x.ar?.primary)).filter(m => m !== answer);
    return { prompt: it.reading, say: it.reading, answer, choices: shuffle([answer, ...shuffle(pool).slice(0, 3)]) };
  }
  if (row.type === 'kanji') {
    const answer = pick(it.en_meanings?.[0], it.ar_meanings?.[0]);
    const pool = typePool('kanji', x => pick(x.en_meanings?.[0], x.ar_meanings?.[0])).filter(m => m !== answer);
    return { prompt: it.kanji, say: it.kunyomi?.[0] || it.onyomi?.[0] || null, answer, choices: shuffle([answer, ...shuffle(pool).slice(0, 3)]) };
  }
  // kana
  const pool = typePool(row.type, x => x.romaji).filter(r => r !== it.romaji);
  return { prompt: it.glyph, say: it.glyph, answer: it.romaji, choices: shuffle([it.romaji, ...shuffle(pool).slice(0, 3)]) };
}

function renderQuestion() {
  const row = R.rows[R.i];
  const q = questionFor(row);
  R.q = q;
  R.locked = false;
  $('review-count').textContent = `${R.i + 1} / ${R.rows.length}`;
  const promptEl = $('review-prompt');
  setJa(promptEl, q.prompt);
  promptEl.classList.toggle('is-word', String(q.prompt).length > 2);
  const grid = $('review-choices');
  renderChoiceTiles(grid, q.choices, { onPick: (c, tile) => answer(tile, c === String(q.answer)), tileClass: 'lesson-choice' });
  ['review-quiz', 'review-done'].forEach(id => { $(id).hidden = (id !== 'review-quiz'); });
  if (q.say) speak(q.say);
}

function answer(btn, ok) {
  if (!R || R.locked) return;
  const run = R;
  R.locked = true;
  haptic(ok ? 'ok' : 'no');
  btn.classList.add(ok ? 'correct' : 'wrong');
  lockTiles($('review-choices'));
  if (!ok) [...$('review-choices').children].forEach(b => { if (b.dataset.value === String(R.q.answer)) b.classList.add('correct'); });
  else R.correct++;
  R.results[R.rows[R.i].key] = ok;
  const advance = () => {
    if (R !== run) return;
    R.i++;
    if (R.i >= R.rows.length) finishSession(); else renderQuestion();
  };
  if (!showFeedbackSheet({ ok, answer: R.q.answer, onContinue: advance })) setTimeout(advance, ok ? 550 : 1400);
}

async function finishSession() {
  ['review-quiz', 'review-done'].forEach(id => { $(id).hidden = (id !== 'review-done'); });
  $('review-score').textContent = t('lesson.score', { correct: R.correct, total: R.rows.length });

  // reschedule: correct promotes a stage, wrong resets (due again in 1h)
  const now = Date.now();
  const updates = {};
  const local = { ...(state.userData?.srs || {}) };
  for (const [key, ok] of Object.entries(R.results)) {
    const cur = local[key] || { s: 0, d: now };
    const s = ok ? Math.min(cur.s + 1, STAGE_MS.length - 1) : 0;
    const entry = { s, d: ok ? now + STAGE_MS[s] : now + 3600000 };
    updates[`srs.${key}`] = entry;
    local[key] = entry;
  }
  state.userData = { ...state.userData, srs: local };
  writeActivity('review');   // Home heatmap
  if (state.user && Object.keys(updates).length) {
    try { await updateDoc(doc(db, 'users', state.user.uid), updates); }
    catch (err) { console.error('[srs] reschedule failed:', err); }
  }
}

/** Drop the active review session (router onLeave hook; idempotent). */
export function abandonReview() { R = null; }

export function exitReview() {
  abandonReview();
  if (!navBack()) navigate('screen-dashboard');
  renderReviewCta();
}

export function initReviewUi() {
  $('review-cta-btn')?.addEventListener('click', startReview);
  $('review-btn-exit')?.addEventListener('click', exitReview);
  $('review-btn-done')?.addEventListener('click', exitReview);
}
