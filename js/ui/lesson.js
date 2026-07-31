// ============================================
// Tomodachi — Lesson Screen (L2.13, v1)
// The linear course player: dashboard "Continue Lesson N" CTA → intro card →
// teach items → quick quiz → completion + unlock of the next lesson.
//
// Data: content_sets/lessons/items (133 woven containers, globalOrder 1..N),
// items resolved per contentType from content_sets/{type}/items/{key}.
// Progress: users/{uid}.completedLessons (arrayUnion) — works under the
// deployed dev rules (owner may update own user doc); moves to the
// users/{uid}/progress subcollection when the §4.16 ruleset lands in full.
// Flag-gated with the content-v2 bridge: dev (localhost) only for now.
// ============================================

import { state, $, showScreen, toast, shuffle } from '../core/core.js?v=20260726c';
import { db, doc, updateDoc, arrayUnion, collection, getDocs, getDoc } from '../data/firebase.js?v=20260726c';
import { speak, unlockAudio } from '../audio/audio.js?v=20260726c';
import { t, getLocale } from '../i18n/index.js?v=20260726c';

// Locale pick: lesson content is bilingual by design; UI follows app locale.
const pick = (en, ar) => (getLocale() === 'ar' && ar ? ar : en);

let lessons = null;        // sorted lesson containers (cache per session)
let L = null;              // active lesson runtime

// ----- data -----

export async function loadLessons() {
  if (lessons) return lessons;
  const snap = await getDocs(collection(db, 'content_sets', 'lessons', 'items'));
  lessons = [];
  snap.forEach(d => lessons.push(d.data()));
  lessons.sort((a, b) => a.globalOrder - b.globalOrder);
  return lessons;
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
  const out = [];
  for (const key of lesson.itemKeys) {
    const snap = await getDoc(doc(db, 'content_sets', lesson.contentType, 'items', key));
    if (snap.exists()) out.push(snap.data());
  }
  return out;
}

// ----- dashboard CTA -----

export async function renderLessonCta() {
  const cta = $('lesson-cta');
  if (!cta) return;
  try {
    await loadLessons();
  } catch (err) {
    console.error('[lesson] load failed:', err);
    cta.hidden = true;
    return;
  }
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
  $('lesson-cta-sub').textContent = t('lesson.cta_sub', { done, total: lessons.length, min: nxt.estimated_minutes });
  const btn = $('lesson-cta-btn');
  btn.hidden = false;
  btn.textContent = done === 0 ? t('lesson.cta_start') : t('lesson.cta_continue');
  cta.hidden = false;
}

// ----- lesson runtime -----

export async function openNextLesson() {
  const nxt = nextLesson();
  if (!nxt) return;
  unlockAudio();
  try {
    const items = await fetchItems(nxt);
    if (!items.length) { toast(t('lesson.load_failed'), 'error'); return; }
    L = { lesson: nxt, items, phase: 'intro', i: 0, quiz: [], qi: 0, correct: 0, locked: false };
    showScreen('screen-lesson');
    render();
  } catch (err) {
    console.error('[lesson] open failed:', err);
    toast(t('lesson.load_failed'), 'error');
  }
}

export function exitLesson() {
  L = null;
  showScreen('screen-dashboard');
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
    // reading shown+spoken → pick the meaning
    const pool = items.map(it => pick(it.en?.primary, it.ar?.primary));
    items.forEach(it => {
      const answer = pick(it.en?.primary, it.ar?.primary);
      const distractors = shuffle(pool.filter(m => m !== answer)).slice(0, 3);
      qs.push({ prompt: it.reading, say: it.reading, choices: shuffle([answer, ...distractors]), answer });
    });
  } else if (lesson.contentType === 'kanji') {
    // kanji has no single romaji — it is a MEANING quiz (lead decision):
    // show the character, pick its meaning; audio = a kana reading.
    const meaningOf = (it) => pick(it.en_meanings?.[0], it.ar_meanings?.[0]);
    const pool = items.map(meaningOf);
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
    $('lesson-intro-meta').textContent = t('lesson.intro_meta', { count: items.length, min: lesson.estimated_minutes });
  } else if (L.phase === 'teach') {
    renderTeach();
  } else if (L.phase === 'quiz') {
    renderQuiz();
  } else if (L.phase === 'done') {
    $('lesson-score').textContent = t('lesson.score', { correct: L.correct, total: L.quiz.length });
    $('lesson-done-title').textContent = t('lesson.done_title');
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
      const ja = document.createElement('div'); ja.className = 'lesson-example-ja'; ja.textContent = e.ja;
      const ro = document.createElement('div'); ro.className = 'lesson-example-ro'; ro.textContent = e.romaji;
      const tr = document.createElement('div'); tr.className = 'lesson-example-tr'; tr.textContent = pick(e.en, e.ar);
      div.append(ja, ro, tr);
      div.addEventListener('click', () => speak(e.ja));
      exWrap.appendChild(div);
    });
  } else if (type === 'kanji') {
    big.hidden = false;
    big.textContent = it.kanji;
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
    big.textContent = it.reading;
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
    big.textContent = it.glyph;
    big.classList.remove('is-word');
    read.textContent = it.romaji;
    body.textContent = pick(it.mnemonic_en, it.mnemonic_ar) || '';
    speak(it.glyph);
  }

  $('lesson-teach-count').textContent = `${L.i + 1} / ${L.items.length}`;
  $('lesson-btn-prev').disabled = (L.i === 0);
  $('lesson-btn-next').textContent = (L.i === L.items.length - 1) ? t('lesson.to_quiz') : t('lesson.next');
}

function renderQuiz() {
  const q = L.quiz[L.qi];
  L.locked = false;
  $('lesson-quiz-count').textContent = `${L.qi + 1} / ${L.quiz.length}`;
  const promptEl = $('lesson-quiz-prompt');
  promptEl.textContent = q.prompt;
  promptEl.classList.toggle('is-word', String(q.prompt).length > 2);
  if (q.sub) { $('lesson-quiz-sub').textContent = q.sub; } else { $('lesson-quiz-sub').textContent = ''; }
  const grid = $('lesson-quiz-choices');
  grid.innerHTML = '';
  q.choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn lesson-choice';
    btn.textContent = c;
    btn.addEventListener('click', () => answer(btn, c === q.answer, q));
    grid.appendChild(btn);
  });
  if (q.say) speak(q.say);
}

function answer(btn, ok, q) {
  if (L.locked) return;
  L.locked = true;
  btn.classList.add(ok ? 'correct' : 'wrong');
  if (!ok) {
    // reveal the right one
    [...$('lesson-quiz-choices').children].forEach(b => { if (b.textContent === q.answer) b.classList.add('correct'); });
  } else {
    L.correct++;
  }
  setTimeout(() => {
    L.qi++;
    if (L.qi >= L.quiz.length) { completeLesson(); } else { render(); }
  }, ok ? 550 : 1400);
}

async function completeLesson() {
  setPhase('done');
  const key = L.lesson.lessonKey;
  const done = completedSet();
  if (!done.has(key) && state.user) {
    try {
      await updateDoc(doc(db, 'users', state.user.uid), { completedLessons: arrayUnion(key) });
      state.userData = { ...state.userData, completedLessons: [...done, key] };
    } catch (err) {
      console.error('[lesson] progress write failed:', err);
      toast(t('lesson.progress_save_failed'), 'warning');
    }
  }
}

// ----- wiring -----

export function initLessonUi() {
  $('lesson-cta-btn')?.addEventListener('click', openNextLesson);
  $('lesson-btn-exit')?.addEventListener('click', exitLesson);
  $('lesson-btn-begin')?.addEventListener('click', () => { setPhase('teach'); });
  $('lesson-btn-prev')?.addEventListener('click', () => { if (L.i > 0) { L.i--; render(); } });
  $('lesson-btn-next')?.addEventListener('click', () => {
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
