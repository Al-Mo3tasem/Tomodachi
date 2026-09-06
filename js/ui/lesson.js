// ============================================
// Tomodachi — Lesson Screen (L2.13, v1)
// The linear course player: dashboard "Continue Lesson N" CTA → intro card →
// teach items → quick quiz → completion + unlock of the next lesson.
//
// Data: content_sets/lessons/items (the woven course, globalOrder 1..N —
// 151 lessons across hiragana/katakana/vocab/grammar/kanji as of 2026-08),
// items resolved per contentType from content_sets/{type}/items/{key}.
// Progress: users/{uid}.completedLessons (arrayUnion) — works under the
// deployed dev rules (owner may update own user doc); moves to the
// users/{uid}/progress subcollection when the §4.16 ruleset lands in full.
// Flag-gated with the content-v2 bridge: dev (localhost) only for now.
// ============================================

import { state, $, toast, shuffle } from '../core/core.js?v=20260906g';
import { navigate, back as navBack, currentScreenId } from '../core/nav.js?v=20260906g';
import { haptic } from '../core/haptics.js?v=20260906g';
import { setJa, fmtCount } from '../core/format.js?v=20260906g';
import { renderChoiceTiles, lockTiles, showFeedbackSheet } from '../ui/quiz-tiles.js?v=20260906g';
import { statusChip } from '../ui/status.js?v=20260906g';
import { writeActivity } from '../data/users.js?v=20260906g';
import { db, doc, updateDoc, arrayUnion, collection, getDocs, getDoc } from '../data/firebase.js?v=20260906g';
import { cacheGet, cachePut } from '../data/content.js?v=20260906g';
import { speak, unlockAudio } from '../audio/audio.js?v=20260906g';
import { t, getLocale } from '../i18n/index.js?v=20260906g';
import { scheduleLessonSrs } from './review.js?v=20260906g';

// Locale pick: lesson content is bilingual by design; UI follows app locale.
const pick = (en, ar) => (getLocale() === 'ar' && ar ? ar : en);

let lessons = null;        // sorted lesson containers (cache per session)
let L = null;              // active lesson runtime

// ----- data -----

export async function loadLessons() {
  if (lessons) return lessons;
  const cached = cacheGet('lessons-catalog');
  if (cached && cached.length) { lessons = cached; return cached; }
  const snap = await getDocs(collection(db, 'content_sets', 'lessons', 'items'));
  const list = [];
  snap.forEach(d => list.push(d.data()));
  list.sort((a, b) => a.globalOrder - b.globalOrder);
  // Never cache an empty catalog (unseeded env) — retry next call instead of
  // wrongly celebrating "course complete" forever.
  if (list.length) { lessons = list; cachePut('lessons-catalog', list); }
  return list;
}

function completedSet() {
  return new Set(state.userData?.completedLessons || []);
}

export function nextLesson() {
  if (!lessons) return null;
  const done = completedSet();
  return lessons.find(l => !done.has(l.lessonKey)) || null;
}

async function fetchItems(lesson) {
  // Parallel fetch; preserve the lesson's authored item order.
  const snaps = await Promise.all(lesson.itemKeys.map(key =>
    getDoc(doc(db, 'content_sets', lesson.contentType, 'items', key))
  ));
  const out = snaps.filter(s => s.exists()).map(s => s.data());
  if (out.length !== lesson.itemKeys.length) {
    console.warn(`[lesson] ${lesson.lessonKey}: ${lesson.itemKeys.length - out.length} item(s) missing on server`);
  }
  return out;
}

// ----- dashboard CTA -----

export async function renderLessonCta() {
  const cta = $('lesson-cta');
  if (!cta) return;
  let catalog;
  try {
    catalog = await loadLessons();
  } catch (err) {
    console.error('[lesson] load failed:', err);
    cta.hidden = true;
    return;
  }
  if (!catalog.length) { cta.hidden = true; return; }   // unseeded env
  const nxt = nextLesson();
  const done = completedSet().size;
  if (!nxt) {   // whole path complete
    $('lesson-cta-title').textContent = t('lesson.cta_all_done');
    $('lesson-cta-sub').textContent = t('lesson.cta_all_done_sub', { count: lessons.length });
    $('lesson-cta-btn').hidden = true;
    cta.hidden = false;
    return;
  }
  $('lesson-cta-title').textContent = t('lesson.cta_title', { n: nxt.globalOrder, name: pick(nxt.displayName_en, nxt.displayName_ar) });
  $('lesson-cta-sub').textContent = t('lesson.cta_sub', { done, total: lessons.length, minutes: t('lesson.minutes', { count: nxt.estimated_minutes }) });
  const btn = $('lesson-cta-btn');
  btn.hidden = false;
  btn.textContent = done === 0 ? t('lesson.cta_start') : t('lesson.cta_continue');
  cta.hidden = false;
  renderCourseProgress();   // D4-A per-track rows share every refresh path
}

// ----- lesson runtime -----

export async function openNextLesson() {
  const nxt = nextLesson();
  if (!nxt) return;
  // Meta screens (orientation / reading rules / checkpoints) interleave by
  // position; show the first unseen one due at this point, then the lesson.
  const meta = pendingMeta(nxt.globalOrder);
  if (meta) {
    pendingLessonAfterMeta = nxt;
    renderMetaScreen(meta);
    $('meta-continue').dataset.metaId = meta.id;
    return;
  }
  await openLesson(nxt);
}

// Open a specific lesson (the next one, or a completed one for review).
export async function openLesson(lesson) {
  unlockAudio();
  try {
    const items = await fetchItems(lesson);
    if (!items.length) { toast(t('lesson.load_failed'), 'error'); return; }
    L = { lesson, items, phase: 'intro', i: 0, quiz: [], qi: 0, correct: 0, locked: false };
    // A meta screen (orientation/checkpoint) is REPLACED by its lesson so back never revisits it
    navigate('screen-lesson', { replace: currentScreenId() === 'screen-meta' });
    render();
  } catch (err) {
    console.error('[lesson] open failed:', err);
    toast(t('lesson.load_failed'), 'error');
  }
}

// Mid-lesson locale switch: re-render the active phase so dynamic content
// (titles, copy, buttons) follows the new locale instead of half-translating.
export function onLessonLocaleChange() {
  applyLessonA11y();
  if (L) render();
}

/** Drop the active lesson runtime (router onLeave hook; idempotent). */
export function abandonLesson() { L = null; }

export function exitLesson() {
  abandonLesson();
  if (!navBack()) navigate('screen-dashboard');
  renderLessonCta();
}

// Build the quiz once teaching ends. Question shape: {prompt, say, choices[], answer}
function buildQuiz() {
  const { lesson, items } = L;
  const qs = [];
  if (lesson.contentType === 'grammar') {
    // one grammar point: each example asks for its translation
    const ex = items[0].examples || [];
    const pool = ex.map(e => pick(e.en, e.ar));
    ex.forEach(e => {
      qs.push({ prompt: e.ja, sub: e.romaji, say: e.ja, choices: shuffle(pool.slice(0, 4)), answer: pick(e.en, e.ar) });
    });
  } else if (lesson.contentType === 'vocab') {
    // reading shown+spoken → pick the meaning. Distractor pool is DEDUPED so
    // two items sharing a meaning string never yield twin choice buttons.
    const pool = [...new Set(items.map(it => pick(it.en?.primary, it.ar?.primary)))];
    items.forEach(it => {
      const answer = pick(it.en?.primary, it.ar?.primary);
      const distractors = shuffle(pool.filter(m => m !== answer)).slice(0, 3);
      qs.push({ prompt: it.reading, say: it.reading, choices: shuffle([answer, ...distractors]), answer });
    });
  } else if (lesson.contentType === 'kanji') {
    // kanji has no single romaji — it is a MEANING quiz (lead decision):
    // show the character, pick its meaning; audio = a kana reading.
    const meaningOf = (it) => pick(it.en_meanings?.[0], it.ar_meanings?.[0]);
    const pool = [...new Set(items.map(meaningOf))];
    items.forEach(it => {
      const answer = meaningOf(it);
      const distractors = shuffle(pool.filter(m => m !== answer)).slice(0, 3);
      qs.push({ prompt: it.kanji, say: (it.kunyomi?.[0] || it.onyomi?.[0] || null), choices: shuffle([answer, ...distractors]), answer });
    });
  } else {
    // kana: glyph → pick the romaji
    const pool = items.map(it => it.romaji);
    items.forEach(it => {
      const distractors = shuffle(pool.filter(r => r !== it.romaji)).slice(0, 3);
      qs.push({ prompt: it.glyph, say: it.glyph, choices: shuffle([it.romaji, ...distractors]), answer: it.romaji });
    });
  }
  L.quiz = shuffle(qs);
}

// ----- rendering -----

function setPhase(phase) {
  L.phase = phase;
  render();
}

function render() {
  if (!L) return;
  const { lesson, items } = L;
  $('lesson-title').textContent = pick(lesson.displayName_en, lesson.displayName_ar);
  ['intro', 'teach', 'quiz', 'done'].forEach(p => { const el = $(`lesson-${p}`); if (el) el.hidden = (L.phase !== p); });

  // progress bar: intro=0, teach spans 0..60%, quiz 60..100%
  let pct = 0;
  if (L.phase === 'teach') pct = Math.round(((L.i + 1) / items.length) * 60);
  else if (L.phase === 'quiz') pct = 60 + Math.round(((L.qi) / Math.max(1, L.quiz.length)) * 40);
  else if (L.phase === 'done') pct = 100;
  const fill = $('lesson-progress-fill');
  if (fill) fill.style.width = pct + '%';

  if (L.phase === 'intro') {
    $('lesson-intro-copy').textContent = pick(lesson.introCopy_en, lesson.introCopy_ar);
    $('lesson-intro-meta').textContent = t('lesson.intro_meta', { count: items.length, minutes: t('lesson.minutes', { count: lesson.estimated_minutes }) });
  } else if (L.phase === 'teach') {
    renderTeach();
  } else if (L.phase === 'quiz') {
    renderQuiz();
  } else if (L.phase === 'done') {
    $('lesson-score').textContent = t('lesson.score', { correct: L.correct, total: L.quiz.length });
    $('lesson-done-title').textContent = t('lesson.done_title');
    const nextBtn = $('lesson-btn-done-next');
    if (nextBtn) nextBtn.hidden = !nextLesson();   // final lesson: no dead button
  }
}

function renderTeach() {
  const it = L.items[L.i];
  const type = L.lesson.contentType;
  const big = $('lesson-card-big'), read = $('lesson-card-reading'), body = $('lesson-card-body');
  const exWrap = $('lesson-card-examples');
  exWrap.innerHTML = '';

  if (type === 'grammar') {
    big.textContent = '';
    big.hidden = true;
    read.textContent = '';
    body.textContent = pick(it.body_en, it.body_ar);
    (it.examples || []).forEach(e => {
      const div = document.createElement('div');
      div.className = 'lesson-example';
      const ja = document.createElement('div'); ja.className = 'lesson-example-ja'; setJa(ja, e.ja);
      const ro = document.createElement('div'); ro.className = 'lesson-example-ro'; ro.textContent = e.romaji;
      const tr = document.createElement('div'); tr.className = 'lesson-example-tr'; tr.textContent = pick(e.en, e.ar);
      div.append(ja, ro, tr);
      div.addEventListener('click', () => speak(e.ja));
      exWrap.appendChild(div);
    });
  } else if (type === 'kanji') {
    big.hidden = false;
    setJa(big, it.kanji);
    big.classList.remove('is-word');
    read.textContent = pick(it.en_meanings, it.ar_meanings)?.join(getLocale() === 'ar' ? '، ' : ', ') || '';
    const mn = pick(it.mnemonic?.en, it.mnemonic?.ar);
    body.textContent = mn ? `${mn.meaning_story}\n\n${mn.reading_story}` : '';
    // readings card (informational, tap to hear)
    const div = document.createElement('div');
    div.className = 'lesson-example';
    const on = document.createElement('div'); on.className = 'lesson-example-ja';
    on.textContent = `音 ${(it.onyomi || []).join('・') || '—'}　訓 ${(it.kunyomi || []).join('・') || '—'}`;
    div.appendChild(on);
    const say = it.kunyomi?.[0] || it.onyomi?.[0];
    if (say) div.addEventListener('click', () => speak(say));
    exWrap.appendChild(div);
    if (say) speak(say);
  } else if (type === 'vocab') {
    big.hidden = false;
    setJa(big, it.reading);
    big.classList.toggle('is-word', String(it.reading).length > 1);
    read.textContent = `${it.romaji} — ${pick(it.en?.primary, it.ar?.primary)}`;
    body.textContent = pick(it.en?.notes, it.ar?.notes) || '';
    if (it.example_ja) {
      const div = document.createElement('div');
      div.className = 'lesson-example';
      const ja = document.createElement('div'); ja.className = 'lesson-example-ja'; ja.textContent = it.example_ja;
      const tr = document.createElement('div'); tr.className = 'lesson-example-tr'; tr.textContent = pick(it.example_en, it.example_ar);
      div.append(ja, tr);
      div.addEventListener('click', () => speak(it.example_ja));
      exWrap.appendChild(div);
    }
    speak(it.reading);
  } else {
    big.hidden = false;
    setJa(big, it.glyph);
    big.classList.remove('is-word');
    read.textContent = it.romaji;
    body.textContent = pick(it.mnemonic_en, it.mnemonic_ar) || '';
    speak(it.glyph);
  }

  $('lesson-teach-count').textContent = t('lesson.progress_count', { i: L.i + 1, n: L.items.length });
  $('lesson-btn-prev').disabled = (L.i === 0);
  $('lesson-btn-next').textContent = (L.i === L.items.length - 1) ? t('lesson.to_quiz') : t('lesson.next');
}

function renderQuiz() {
  const q = L.quiz[L.qi];
  L.locked = false;
  $('lesson-quiz-count').textContent = t('lesson.progress_count', { i: L.qi + 1, n: L.quiz.length });
  const promptEl = $('lesson-quiz-prompt');
  setJa(promptEl, q.prompt);
  promptEl.classList.toggle('is-word', String(q.prompt).length > 2);
  if (q.sub) { $('lesson-quiz-sub').textContent = q.sub; } else { $('lesson-quiz-sub').textContent = ''; }
  const grid = $('lesson-quiz-choices');
  renderChoiceTiles(grid, q.choices, { onPick: (c, tile) => answer(tile, c === String(q.answer), q), tileClass: 'lesson-choice' });
  if (q.say) speak(q.say);
}

function answer(btn, ok, q) {
  if (!L || L.locked) return;
  const run = L;   // identity guard: a stale timer must not touch a reopened lesson
  L.locked = true;
  haptic(ok ? 'ok' : 'no');
  btn.classList.add(ok ? 'correct' : 'wrong');
  lockTiles($('lesson-quiz-choices'));
  if (!ok) {
    // reveal the right one
    [...$('lesson-quiz-choices').children].forEach(b => { if (b.dataset.value === String(q.answer)) b.classList.add('correct'); });
  } else {
    L.correct++;
  }
  const advance = () => {
    if (L !== run) return;   // exited (or reopened) during the feedback pause
    L.qi++;
    if (L.qi >= L.quiz.length) { completeLesson(); } else { render(); }
  };
  // v2: the verdict sheet holds the question until Continue; v1: timed auto-advance
  if (!showFeedbackSheet({ ok, answer: q.answer, onContinue: advance })) setTimeout(advance, ok ? 550 : 1400);
}

async function completeLesson() {
  setPhase('done');
  const key = L.lesson.lessonKey;
  const done = completedSet();
  if (!done.has(key) && state.user) {
    // Optimistic: local state first so "Next lesson" can never reopen the
    // just-completed lesson while the network write is in flight.
    state.userData = { ...state.userData, completedLessons: [...done, key] };
    scheduleLessonSrs(L.lesson, L.items);   // SRS: learned items enter the review queue
    writeActivity('lesson');                // Home heatmap
    try {
      await updateDoc(doc(db, 'users', state.user.uid), { completedLessons: arrayUnion(key) });
    } catch (err) {
      console.error('[lesson] progress write failed:', err);
      toast(t('lesson.progress_save_failed'), 'warning');
    }
  }
}

// ----- course progress (D4 Option A: per-track rows, lead-picked 2026-08-01) -----
// Item counts are COURSE-derived (items taught by completed lessons over items
// in all lessons) so the numbers are always coherent with the path itself.

export const PROGRESS_TRACKS = [
  { key: 'course' },
  { key: 'hiragana', types: ['hiragana'] },
  { key: 'katakana', types: ['katakana'] },
  { key: 'words', types: ['vocab'] },
  { key: 'kanji', types: ['kanji'] },
];

/** { done, total } lessons on the linear path (0/0 before the catalog loads). */
export function courseProgress() {
  if (!lessons || !lessons.length) return { done: 0, total: 0 };
  return { done: completedSet().size, total: lessons.length };
}

/** Per-track progress for the rings and the legacy rows: [{ key, types, done, total, pct }]. */
export function trackProgress() {
  if (!lessons || !lessons.length) return PROGRESS_TRACKS.map((tr) => ({ key: tr.key, types: tr.types || null, done: 0, total: 0, pct: 0 }));
  const done = completedSet();
  return PROGRESS_TRACKS.map((tr) => {
    let doneN = 0, totalN = 0;
    if (tr.key === 'course') { doneN = done.size; totalN = lessons.length; }
    else {
      for (const l of lessons) {
        if (!tr.types.includes(l.contentType)) continue;
        totalN += l.itemKeys.length;
        if (done.has(l.lessonKey)) doneN += l.itemKeys.length;
      }
    }
    return { key: tr.key, types: tr.types || null, done: doneN, total: totalN, pct: totalN ? Math.round((doneN / totalN) * 100) : 0 };
  });
}

export function renderCourseProgress() {
  const wrap = $('course-progress');
  if (!wrap || !lessons || !lessons.length) return;
  const done = completedSet();
  wrap.innerHTML = '';
  for (const { key, done: doneN, total: totalN, pct } of trackProgress()) {
    const tr = { key };
    const row = document.createElement('div');
    row.className = 'cp-row' + (doneN >= totalN && totalN ? ' is-complete' : '');
    const label = document.createElement('span');
    label.className = 'cp-label';
    label.textContent = t(`progress.${tr.key}`);
    const bar = document.createElement('span');
    bar.className = 'cp-bar';
    const fill = document.createElement('span');
    fill.className = 'cp-fill';
    fill.style.width = pct + '%';
    bar.appendChild(fill);
    const count = document.createElement('span');
    count.className = 'cp-count';
    count.textContent = (doneN >= totalN && totalN) ? `${fmtCount(doneN)}/${fmtCount(totalN)} ✓`
      : tr.key === 'course' ? t('progress.lesson_n', { n: done.size + 1, total: totalN })
      : `${fmtCount(doneN)}/${fmtCount(totalN)}`;
    row.append(label, bar, count);
    wrap.appendChild(row);
  }
  wrap.hidden = false;
  // v2 progress replaces the legacy single mastery bar
  const legacy = document.querySelector('.mastery-bar-wrap');
  if (legacy) legacy.hidden = true;
}

// ----- meta screens (D-C decision: UI constructs, NOT content docs) -----
// Positioned by "due before globalOrder N", tracked via users/{uid}.seenMeta.
// orientation → before lesson 1; reading rules → before the numbers cluster
// (きゅう/じゅう long vowels); checkpoints → every 10 lessons.

function metaScreens() {
  const out = [
    { id: 'orientation', before: 1, icon: '🧭', title: 'meta.orientation_title', bodies: ['meta.orientation_1', 'meta.orientation_2', 'meta.orientation_3', 'meta.orientation_4'] },
    { id: 'reading_rules', before: 26, icon: '🔎', title: 'meta.rules_title', bodies: ['meta.rules_1', 'meta.rules_2'] },
  ];
  const total = lessons ? lessons.length : 151;
  for (let n = 10; n < total; n += 10) out.push({ id: `checkpoint_${n}`, before: n + 1, icon: '🏁', checkpoint: n });
  return out;
}

function seenMetaSet() {
  return new Set(state.userData?.seenMeta || []);
}

// The first unseen meta screen due at or before the given lesson position.
function pendingMeta(beforeOrder) {
  const seen = seenMetaSet();
  return metaScreens()
    .filter(m => m.before <= beforeOrder && !seen.has(m.id))
    .sort((a, b) => a.before - b.before)[0] || null;
}

let pendingLessonAfterMeta = null;

function renderMetaScreen(m) {
  $('meta-icon').textContent = m.icon;
  const bodyWrap = $('meta-body');
  bodyWrap.innerHTML = '';
  if (m.checkpoint) {
    $('meta-title').textContent = t('meta.checkpoint_title');
    // dynamic stats from completed lessons
    const done = completedSet();
    let kana = 0, words = 0;
    (lessons || []).forEach(l => {
      if (!done.has(l.lessonKey)) return;
      if (l.contentType === 'hiragana' || l.contentType === 'katakana') kana += l.itemKeys.length;
      if (l.contentType === 'vocab') words += l.itemKeys.length;
    });
    const p = document.createElement('p');
    p.textContent = t('meta.checkpoint_body', { lessons: done.size, kana, words });
    bodyWrap.appendChild(p);
  } else {
    $('meta-title').textContent = t(m.title);
    for (const key of m.bodies) {
      const p = document.createElement('p');
      p.textContent = t(key);
      bodyWrap.appendChild(p);
    }
  }
  navigate('screen-meta');
}

async function markMetaSeen(id) {
  const seen = seenMetaSet();
  if (seen.has(id) || !state.user) return;
  state.userData = { ...state.userData, seenMeta: [...seen, id] };   // optimistic
  try {
    await updateDoc(doc(db, 'users', state.user.uid), { seenMeta: arrayUnion(id) });
  } catch (err) { console.error('[meta] seen write failed:', err); }
}

// ----- lesson browser (all lessons: done ✓ / current ▶ / locked) -----

const TYPE_ICON = { hiragana: 'あ', katakana: 'ア', vocab: '💬', grammar: '文', kanji: '漢' };

let browserFilter = null;   // { track, types } from a Home ring, or null for the whole path

/** @param {{ track?: string, types?: string[] }} [filter]  a track from the Home rings */
export async function openLessonBrowser(filter = null) {
  try { await loadLessons(); } catch (_e) { toast(t('lesson.load_failed'), 'error'); return; }
  if (!lessons || !lessons.length) return;
  browserFilter = filter && filter.types && filter.types.length ? { track: filter.track, types: filter.types } : null;
  renderLessonBrowser();
  navigate('screen-lessons-list');   // root of the Course tab
}

function renderLessonBrowser() {
  const wrap = $('lessons-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  const done = completedSet();
  const current = nextLesson();
  const filterEl = $('lessons-filter');
  if (filterEl) {
    filterEl.hidden = !browserFilter;
    if (browserFilter) $('lessons-filter-label').textContent = t(`progress.${browserFilter.track}`);
  }
  const rows = browserFilter ? lessons.filter((l) => browserFilter.types.includes(l.contentType)) : lessons;
  const frag = document.createDocumentFragment();
  for (const l of rows) {
    const isDone = done.has(l.lessonKey);
    const isCurrent = current && current.lessonKey === l.lessonKey;
    const row = document.createElement('button');
    row.className = 'lessons-row' + (isDone ? ' is-done' : isCurrent ? ' is-current' : ' is-locked');
    row.type = 'button';
    const icon = document.createElement('span');
    icon.className = 'lessons-row-type';
    icon.textContent = TYPE_ICON[l.contentType] || '·';
    const num = document.createElement('span');
    num.className = 'lessons-row-num';
    num.textContent = l.globalOrder;
    const name = document.createElement('span');
    name.className = 'lessons-row-name';
    name.textContent = pick(l.displayName_en, l.displayName_ar);
    const st = document.createElement('span');
    st.className = 'lessons-row-state';
    st.textContent = isDone ? '✓' : isCurrent ? '▶' : '🔒';
    row.append(icon, num, name, st);
    row.addEventListener('click', () => {
      if (isDone || isCurrent) openLesson(l);
      else statusChip(t('lesson.locked_toast'));
    });
    frag.appendChild(row);
  }
  wrap.appendChild(frag);
  $('lessons-list-progress').textContent = t('lesson.cta_sub', {
    done: done.size, total: lessons.length,
    minutes: t('lesson.minutes', { count: current ? current.estimated_minutes : 0 })
  });
}

// ----- wiring -----

export function applyLessonA11y() {
  $('lesson-btn-exit')?.setAttribute('aria-label', t('lesson.exit_aria'));
  $('lesson-card-big')?.setAttribute('title', t('lesson.audio_title'));
}

export function initLessonUi() {
  applyLessonA11y();
  $('lesson-cta-btn')?.addEventListener('click', openNextLesson);
  $('lesson-cta-browse')?.addEventListener('click', () => openLessonBrowser());
  $('lessons-filter-clear')?.addEventListener('click', () => { browserFilter = null; renderLessonBrowser(); });
  $('meta-continue')?.addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.metaId;
    if (id) await markMetaSeen(id);
    pendingLessonAfterMeta = null;
    // Re-enter the flow: more pending metas show in sequence; else the lesson.
    openNextLesson();
  });
  $('lessons-list-back')?.addEventListener('click', () => { if (!navBack()) navigate('screen-dashboard'); renderLessonCta(); });
  $('lesson-btn-exit')?.addEventListener('click', exitLesson);
  $('lesson-btn-begin')?.addEventListener('click', () => { if (L) setPhase('teach'); });
  $('lesson-btn-prev')?.addEventListener('click', () => { if (L && L.i > 0) { L.i--; render(); } });
  $('lesson-btn-next')?.addEventListener('click', () => {
    if (!L) return;
    if (L.i < L.items.length - 1) { L.i++; render(); }
    else { buildQuiz(); L.qi = 0; L.correct = 0; setPhase('quiz'); }
  });
  $('lesson-btn-done-home')?.addEventListener('click', exitLesson);
  $('lesson-btn-done-next')?.addEventListener('click', () => { openNextLesson(); });
  $('lesson-card-big')?.addEventListener('click', () => {
    if (!L) return;
    const it = L.items[L.i];
    speak(it.glyph || it.reading || it.kunyomi?.[0] || it.onyomi?.[0] || it.kanji);
  });
}
