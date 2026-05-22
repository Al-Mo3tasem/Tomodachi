// ============================================
// HiraQuest — Game Engine (Phase 2.1)
// One engine, two modes:
//  • Zen Mode      — relaxed timed practice. Practice type Read or Listen.
//  • Survival Rush — competitive: 3 lives, ramping per-question timer.
//
// Audio is role-based, never a leak:
//  • Read   — glyph is the prompt; audio is hidden until the answer reveal.
//  • Listen — audio IS the prompt; the player picks the matching glyph.
//
// Every game has a timer (Zen: a session countdown, Survival: per-question)
// and both pause cleanly when the tab is hidden or Settings is opened.
// ============================================

import {
  state, $, showScreen, toast, shuffle, clamp, formatTime
} from './core.js?v=20260523';
import {
  db, doc, getDoc, setDoc, addDoc, collection, serverTimestamp
} from './firebase.js?v=20260523';
import { speak, stopSpeech, playSound, unlockAudio } from './audio.js?v=20260523';
import { submitSurvivalScore, bracketFor } from './leaderboard.js?v=20260523';

// ----- Tuning constants -----
const SURVIVAL_LIVES = 3;
const TIME_START = 5000;   // ms for the first Survival question
const TIME_STEP = 500;     // ms removed per speed-up
const TIME_MIN = 1500;     // ms floor
const RAMP_EVERY = 5;      // correct answers per speed-up
const MIN_RESPONSE = 0.3;  // seconds — anti-cheat floor for speed bonus
const FEEDBACK_OK = 480;   // ms pause after a correct answer
const FEEDBACK_BAD = 1150; // ms pause after a wrong answer

// Romaji that have accepted spelling variants.
const ROMAJI_ALT = {
  shi: ['si'], si: ['shi'],
  chi: ['ti'], ti: ['chi'],
  tsu: ['tu'], tu: ['tsu'],
  fu: ['hu'], hu: ['fu'],
  wo: ['o'],
  n: ['nn']
};

// Active game session (null when not playing).
let g = null;
let lastType = 'zen';
let keyHandler = null;
let visHandler = null;

// ============================================
// PUBLIC API
// ============================================

/** Start a game of the given type using state.selectedChars. */
export function startGame(type) {
  if (type !== 'zen' && type !== 'survival') {
    const soon = { duel: 'Duel Mode arrives in Phase 3', coop: 'Sync Match arrives in Phase 4' };
    toast(soon[type] || 'This mode is coming soon!', 'info', 4000);
    return false;
  }

  const chars = buildCharPool();
  if (chars.length === 0) {
    toast('Select at least one character first.', 'warning');
    return false;
  }

  unlockAudio();
  lastType = type;

  const practice = type === 'survival' ? 'read' : state.practiceType;
  const inputMethod = practice === 'listen'
    ? 'multiple'
    : (type === 'survival' ? 'typing' : state.inputMethod);

  g = {
    type,
    mode: type,
    practice,
    inputMethod,
    chars,
    allRomaji: collectRomaji(),
    allChars: collectChars(),
    queue: [],
    current: null,
    lastChar: null,
    revealed: false,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    lives: SURVIVAL_LIVES,
    times: [],
    perChar: {},
    questionStart: 0,
    // Survival per-question timer
    qStartedAt: 0,
    qLimit: TIME_START,
    qElapsed: 0,
    expiry: null,
    danger: null,
    // Zen session timer
    sessionDuration: (state.zenDuration || 60) * 1000,
    sessionDeadline: 0,
    sessionRemaining: 0,
    sessionTick: null,
    // feedback advance
    advanceTimer: null,
    advancePending: false,
    locked: false,
    active: true,
    paused: false,
    startedAt: Date.now()
  };

  buildScreen();
  showScreen('screen-game');
  hidePauseOverlay();
  setPresence('in_game');
  playSound('start');

  if (g.mode === 'zen') startSessionTimer();
  nextQuestion();
  return true;
}

/** Restart the most recent game with the same settings. */
export function playAgain() {
  hideResults();
  startGame(lastType);
}

/** HUD exit (✕) handler. */
export function requestExit() {
  if (!g || !g.active) {
    goHome();
    return;
  }
  if (g.mode === 'zen') {
    endGame('done');
    return;
  }
  // Survival
  if (g.correct === 0 && g.wrong === 0) {
    if (confirm('Leave Survival Rush?')) {
      cleanup();
      goHome();
    }
    return;
  }
  if (confirm('Quit this run? Your current score will be saved.')) {
    endGame('quit');
  }
}

/** Pause without showing the overlay (used when navigating to Settings). */
export function pauseGame() {
  if (!g || !g.active || g.paused) return;
  g.paused = true;
  stopSpeech();
  if (g.advanceTimer) {
    clearTimeout(g.advanceTimer);
    g.advanceTimer = null;
    g.advancePending = true;
  }
  if (g.mode === 'survival') pauseQuestionTimer();
  else pauseSessionTimer();
}

/** Resume a paused game. */
export function resumeGame() {
  if (!g || !g.active || !g.paused) return;
  g.paused = false;

  // Resume the mode's clock. The Zen session timer always restarts; the
  // Survival per-question timer only restarts if a question is still live
  // (a pending advance will start the next question's timer fresh).
  if (g.mode === 'zen') {
    resumeSessionTimer();
  } else if (!g.advancePending) {
    resumeQuestionTimer();
  }

  // A pause that interrupted answer feedback finishes the advance now.
  if (g.advancePending) {
    g.advancePending = false;
    doAdvance();
    return;
  }

  if (g.inputMethod === 'typing' && !g.locked) $('answer-input')?.focus();
}

/** Resume from the tab-hidden pause overlay. */
export function resumeFromPause() {
  hidePauseOverlay();
  resumeGame();
}

export function isActive() {
  return !!(g && g.active);
}

/** Stop all timers/speech — call before navigating away. */
export function cleanup() {
  if (g) {
    g.active = false;
    stopQuestionTimer();
    stopSessionTimer();
    if (g.advanceTimer) { clearTimeout(g.advanceTimer); g.advanceTimer = null; }
  }
  detachHandlers();
  stopSpeech();
  hideResults();
  hidePauseOverlay();
  setPresence('online');
}

/** Manual pronounce button. */
export function speakCurrent() {
  if (g && g.current) {
    unlockAudio();
    speak(g.current.char);
  }
}

// ============================================
// SETUP
// ============================================

function buildCharPool() {
  const all = [];
  state.contentSets.forEach(set => {
    (set.characters || []).forEach(c => {
      if (state.selectedChars.has(c.char) && !all.find(x => x.char === c.char)) {
        all.push({ char: c.char, romaji: (c.romaji || '').toLowerCase() });
      }
    });
  });
  return all;
}

function collectRomaji() {
  const set = new Set();
  state.contentSets.forEach(s => (s.characters || []).forEach(c => {
    if (c.romaji) set.add(c.romaji.toLowerCase());
  }));
  return [...set];
}

function collectChars() {
  const all = [];
  state.contentSets.forEach(s => (s.characters || []).forEach(c => {
    if (!all.find(x => x.char === c.char)) {
      all.push({ char: c.char, romaji: (c.romaji || '').toLowerCase() });
    }
  }));
  return all;
}

function buildScreen() {
  const label = $('game-mode-label');
  if (label) {
    if (g.mode === 'zen') {
      label.textContent = g.practice === 'listen' ? '🧘 Zen · Listening' : '🧘 Zen · Reading';
    } else {
      label.textContent = '🔥 Survival Rush';
    }
  }

  const shell = $('game-shell');
  if (shell) shell.dataset.mode = g.mode;

  const timer = $('game-timer');
  if (timer) timer.style.display = g.mode === 'survival' ? 'block' : 'none';

  buildInputArea();
  renderHud();
  attachHandlers();
}

function buildInputArea() {
  const host = $('game-input-area');
  if (!host) return;
  host.innerHTML = '';

  if (g.practice === 'read' && g.inputMethod === 'typing') {
    const form = document.createElement('form');
    form.className = 'answer-form';
    form.id = 'answer-form';
    form.innerHTML = `
      <input type="text" class="answer-input" id="answer-input"
             autocomplete="off" autocapitalize="none" autocorrect="off"
             spellcheck="false" placeholder="type the rōmaji…">
      <button type="submit" class="btn btn-primary answer-submit">Enter</button>
    `;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('answer-input');
      if (input && input.value.trim()) onAnswer(input.value);
    });
    host.appendChild(form);
  } else {
    const grid = document.createElement('div');
    grid.className = 'choice-grid';
    grid.id = 'choice-grid';
    host.appendChild(grid);
  }
}

function attachHandlers() {
  detachHandlers();

  keyHandler = (e) => {
    if (!g || !g.active || g.locked || g.paused) return;
    if (g.inputMethod === 'multiple' && e.key >= '1' && e.key <= '4') {
      const btn = document.querySelectorAll('.choice-btn')[Number(e.key) - 1];
      if (btn) onAnswer(btn.dataset.value, btn);
    }
  };
  document.addEventListener('keydown', keyHandler);

  visHandler = () => {
    if (document.hidden && g && g.active && !g.paused) {
      pauseGame();
      showPauseOverlay();
    }
  };
  document.addEventListener('visibilitychange', visHandler);
}

function detachHandlers() {
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }
  if (visHandler) {
    document.removeEventListener('visibilitychange', visHandler);
    visHandler = null;
  }
}

// ============================================
// QUESTION FLOW
// ============================================

function nextQuestion() {
  if (!g || !g.active) return;
  g.locked = false;
  g.revealed = false;

  if (g.queue.length === 0) {
    let pool = shuffle(g.chars);
    if (pool.length > 1 && pool[0].char === g.lastChar) {
      pool.push(pool.shift());
    }
    g.queue = pool;
  }
  g.current = g.queue.shift();
  g.lastChar = g.current.char;

  renderCard();
  clearFeedback();
  renderInput();
  renderHud();
  updateSpeakButton();

  g.questionStart = performance.now();
  if (g.mode === 'survival') startQuestionTimer();
  if (g.practice === 'listen') speak(g.current.char);
}

function renderCard() {
  const card = $('game-card');
  const charEl = $('game-card-char');
  if (charEl) {
    if (g.practice === 'listen' && !g.revealed) {
      charEl.textContent = '🔊';
      charEl.classList.add('listen-prompt');
    } else {
      charEl.textContent = g.current.char;
      charEl.classList.remove('listen-prompt');
    }
  }
  if (card) {
    card.classList.remove('flip-in', 'correct', 'wrong');
    void card.offsetWidth; // restart animation
    card.classList.add('flip-in');
  }
}

function revealCard() {
  const charEl = $('game-card-char');
  if (charEl) {
    charEl.textContent = g.current.char;
    charEl.classList.remove('listen-prompt');
  }
}

function renderInput() {
  if (g.practice === 'read' && g.inputMethod === 'typing') {
    const input = $('answer-input');
    const submit = document.querySelector('.answer-submit');
    if (input) {
      input.value = '';
      input.disabled = false;
      input.classList.remove('shake');
      input.focus();
    }
    if (submit) submit.disabled = false;
    return;
  }

  const grid = $('choice-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const isListen = g.practice === 'listen';
  const choices = makeChoices();

  choices.forEach((value, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn' + (isListen ? ' choice-jp' : '');
    btn.dataset.value = value;
    btn.innerHTML = `<span class="choice-key">${i + 1}</span><span class="choice-text">${value}</span>`;
    btn.addEventListener('click', () => onAnswer(value, btn));
    grid.appendChild(btn);
  });
}

function makeChoices() {
  if (g.practice === 'listen') {
    const pool = g.allChars.filter(c => c.char !== g.current.char).map(c => c.char);
    const picks = shuffle(pool).slice(0, 3);
    return shuffle([g.current.char, ...picks]);
  }
  const pool = g.allRomaji.filter(r => r !== g.current.romaji);
  const picks = shuffle(pool).slice(0, 3);
  return shuffle([g.current.romaji, ...picks]);
}

function updateSpeakButton() {
  const btn = $('game-speak');
  if (!btn) return;
  // Listen practice: the speaker is the prompt — always available as a replay.
  // Read practice: hidden until the answer is revealed (no audio leak).
  const visible = g.practice === 'listen' || g.revealed;
  btn.style.display = visible ? '' : 'none';
}

// ============================================
// ANSWER HANDLING
// ============================================

function answerMatches(input, romaji) {
  const a = String(input).trim().toLowerCase().replace(/\s+/g, '');
  const r = String(romaji).trim().toLowerCase();
  if (a === r) return true;
  return (ROMAJI_ALT[r] || []).includes(a);
}

function checkAnswer(value) {
  if (g.practice === 'listen') return value === g.current.char;
  return answerMatches(value, g.current.romaji);
}

function onAnswer(value, btnEl) {
  if (!g || !g.active || g.locked || g.paused) return;
  g.locked = true;
  if (g.mode === 'survival') stopQuestionTimer();

  const elapsed = (performance.now() - g.questionStart) / 1000;
  const isCorrect = checkAnswer(value);
  recordChar(g.current.char, isCorrect);

  if (isCorrect) {
    g.correct++;
    g.streak++;
    g.bestStreak = Math.max(g.bestStreak, g.streak);
    g.times.push(Math.max(MIN_RESPONSE, elapsed));
    playSound('correct');
  } else {
    g.wrong++;
    g.streak = 0;
    playSound('wrong');
    if (g.mode === 'survival') loseLife();
  }

  showFeedback(isCorrect, btnEl, false);
  renderHud();
  scheduleAdvance(isCorrect ? FEEDBACK_OK : FEEDBACK_BAD);
}

function onTimeout() {
  if (!g || !g.active || g.locked || g.paused) return;
  g.locked = true;
  g.wrong++;
  g.streak = 0;
  recordChar(g.current.char, false);
  playSound('wrong');
  loseLife();
  showFeedback(false, null, true);
  renderHud();
  scheduleAdvance(FEEDBACK_BAD);
}

function scheduleAdvance(delay) {
  g.advanceTimer = setTimeout(() => {
    g.advanceTimer = null;
    doAdvance();
  }, delay);
}

function doAdvance() {
  if (!g || !g.active) return;
  if (g.mode === 'survival' && g.lives <= 0) endGame('over');
  else nextQuestion();
}

function loseLife() {
  g.lives = Math.max(0, g.lives - 1);
  const shell = $('game-shell');
  if (shell) {
    shell.classList.remove('hit');
    void shell.offsetWidth;
    shell.classList.add('hit');
  }
}

function recordChar(char, correct) {
  if (!g.perChar[char]) g.perChar[char] = { correct: 0, wrong: 0 };
  g.perChar[char][correct ? 'correct' : 'wrong']++;
}

// ============================================
// FEEDBACK & HUD
// ============================================

function clearFeedback() {
  const fb = $('game-feedback');
  if (fb) {
    fb.className = 'game-feedback';
    fb.innerHTML = '';
  }
}

function showFeedback(isCorrect, btnEl, timedOut) {
  g.revealed = true;
  if (g.practice === 'listen') revealCard();

  const card = $('game-card');
  if (card) card.classList.add(isCorrect ? 'correct' : 'wrong');

  const fb = $('game-feedback');
  if (fb) {
    fb.className = `game-feedback show ${isCorrect ? 'good' : 'bad'}`;
    const answer = `${g.current.char} = ${g.current.romaji}`;
    if (isCorrect) {
      fb.innerHTML = `<span class="fb-mark">✓</span><span class="fb-text">${answer}</span>`;
    } else {
      const lead = timedOut ? "Time's up — " : '';
      fb.innerHTML = `<span class="fb-mark">✗</span><span class="fb-text">${lead}<strong>${answer}</strong></span>`;
    }
  }

  // Reinforcement audio on reveal (everything except Survival, which stays lean).
  if (g.mode !== 'survival') speak(g.current.char);
  updateSpeakButton();

  if (g.practice === 'read' && g.inputMethod === 'typing') {
    const input = $('answer-input');
    const submit = document.querySelector('.answer-submit');
    if (input) {
      input.disabled = true;
      if (!isCorrect) input.classList.add('shake');
    }
    if (submit) submit.disabled = true;
  } else {
    document.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.value === String(g.practice === 'listen' ? g.current.char : g.current.romaji)) {
        b.classList.add('choice-correct');
      } else if (b === btnEl) {
        b.classList.add('choice-wrong');
      }
    });
  }
}

function renderHud() {
  const hud = $('game-hud-stats');
  if (!hud) return;

  if (g.mode === 'survival') {
    const hearts = '❤️'.repeat(g.lives) + '🤍'.repeat(Math.max(0, SURVIVAL_LIVES - g.lives));
    const round = Math.floor(g.correct / RAMP_EVERY) + 1;
    hud.innerHTML = `
      <span class="hud-lives">${hearts}</span>
      <span class="hud-chip">Round ${round}</span>
      <span class="hud-chip hud-score">${liveScore().toLocaleString()}</span>
    `;
  } else {
    const remaining = g.paused
      ? g.sessionRemaining
      : Math.max(0, (g.sessionDeadline || Date.now()) - Date.now());
    const low = remaining <= 10000;
    const total = g.correct + g.wrong;
    const acc = total ? Math.round((g.correct / total) * 100) : 100;
    hud.innerHTML = `
      <span class="hud-chip hud-time ${low ? 'danger' : ''}">⏱ ${formatTime(remaining)}</span>
      <span class="hud-chip hud-good">✓ ${g.correct}</span>
      <span class="hud-chip">${acc}%</span>
    `;
  }

  const streak = $('game-streak');
  if (streak) {
    if (g.streak >= 3) {
      streak.textContent = `🔥 ${g.streak} streak`;
      streak.classList.add('show');
    } else {
      streak.classList.remove('show');
    }
  }
}

// ============================================
// SURVIVAL TIMER (per-question, pausable)
// ============================================

function startQuestionTimer() {
  const fill = $('game-timer-fill');
  g.qLimit = clamp(TIME_START - TIME_STEP * Math.floor(g.correct / RAMP_EVERY), TIME_MIN, TIME_START);
  g.qElapsed = 0;
  if (fill) {
    fill.classList.remove('danger');
    fill.style.transition = 'none';
    fill.style.width = '100%';
    void fill.offsetWidth;
  }
  runQuestionTimer(g.qLimit);
}

function runQuestionTimer(remaining) {
  const fill = $('game-timer-fill');
  g.qStartedAt = performance.now();
  if (fill) {
    requestAnimationFrame(() => {
      fill.style.transition = `width ${remaining}ms linear`;
      fill.style.width = '0%';
    });
  }
  g.expiry = setTimeout(onTimeout, remaining);
  if (remaining > 1200) {
    g.danger = setTimeout(() => { if (fill) fill.classList.add('danger'); }, remaining - 1200);
  } else if (fill) {
    fill.classList.add('danger');
  }
}

function pauseQuestionTimer() {
  if (!g.expiry) return;
  g.qElapsed += performance.now() - g.qStartedAt;
  clearTimeout(g.expiry);
  clearTimeout(g.danger);
  g.expiry = null;
  g.danger = null;
  freezeFill();
}

function resumeQuestionTimer() {
  if (g.locked) return;
  runQuestionTimer(Math.max(200, g.qLimit - g.qElapsed));
}

function stopQuestionTimer() {
  clearTimeout(g.expiry);
  clearTimeout(g.danger);
  g.expiry = null;
  g.danger = null;
  freezeFill();
}

function freezeFill() {
  const fill = $('game-timer-fill');
  if (fill) {
    const current = getComputedStyle(fill).width;
    fill.style.transition = 'none';
    fill.style.width = current;
  }
}

// ============================================
// ZEN SESSION TIMER (countdown, pausable)
// ============================================

function startSessionTimer() {
  g.sessionDeadline = Date.now() + g.sessionDuration;
  g.sessionTick = setInterval(tickSession, 200);
  tickSession();
}

function tickSession() {
  if (!g || !g.active) return;
  const remaining = Math.max(0, g.sessionDeadline - Date.now());
  renderHud();
  if (remaining <= 0) {
    clearInterval(g.sessionTick);
    g.sessionTick = null;
    endGame('time');
  }
}

function pauseSessionTimer() {
  g.sessionRemaining = Math.max(0, g.sessionDeadline - Date.now());
  clearInterval(g.sessionTick);
  g.sessionTick = null;
}

function resumeSessionTimer() {
  g.sessionDeadline = Date.now() + (g.sessionRemaining || 0);
  g.sessionTick = setInterval(tickSession, 200);
}

function stopSessionTimer() {
  if (g && g.sessionTick) {
    clearInterval(g.sessionTick);
    g.sessionTick = null;
  }
}

// ============================================
// SCORING (Survival)
// ============================================

function avgTime() {
  if (!g.times.length) return 3;
  return g.times.reduce((a, b) => a + b, 0) / g.times.length;
}

function liveScore() {
  return Math.round(computeSurvivalScore());
}

function computeSurvivalScore() {
  const base = g.correct * 100;
  const difficulty = g.chars.length / 5;
  const speedBonus = clamp(2.0 - avgTime() / 3.0, 1.0, 2.0);
  const round = Math.floor(g.correct / RAMP_EVERY);
  return base * difficulty * speedBonus * (1 + round / 10);
}

// ============================================
// END GAME & RESULTS
// ============================================

function endGame(reason) {
  if (!g || !g.active) return;
  g.active = false;
  stopQuestionTimer();
  stopSessionTimer();
  if (g.advanceTimer) { clearTimeout(g.advanceTimer); g.advanceTimer = null; }
  detachHandlers();
  stopSpeech();
  hidePauseOverlay();
  setPresence('online');

  const total = g.correct + g.wrong;
  const summary = {
    mode: g.mode,
    practice: g.practice,
    correct: g.correct,
    wrong: g.wrong,
    accuracy: total ? g.correct / total : 0,
    bestStreak: g.bestStreak,
    round: Math.floor(g.correct / RAMP_EVERY) + 1,
    duration: Math.round((Date.now() - g.startedAt) / 1000),
    score: g.mode === 'survival' ? Math.round(computeSurvivalScore()) : 0,
    characterCount: g.chars.length,
    reason
  };

  showResults(summary);
}

function showResults(s) {
  const overlay = $('results-overlay');
  if (!overlay) return;

  const emoji = $('results-emoji');
  const title = $('results-title');
  const scoreEl = $('results-score');
  const scoreLabel = $('results-score-label');
  const note = $('results-note');
  const statsHost = $('results-stats');

  const accPct = Math.round(s.accuracy * 100);

  if (s.mode === 'survival') {
    if (title) title.textContent = s.reason === 'quit' ? 'Run Ended' : 'Game Over';
    if (emoji) emoji.textContent = accPct >= 80 ? '🏆' : accPct >= 50 ? '💪' : '🌱';
    if (scoreLabel) scoreLabel.textContent = 'Final Score';
    if (scoreEl) countUp(scoreEl, s.score);
  } else {
    if (title) title.textContent = s.practice === 'listen' ? 'Listening Session Done' : 'Reading Session Done';
    if (emoji) emoji.textContent = accPct >= 90 ? '🌸' : accPct >= 60 ? '🧘' : '📚';
    if (scoreLabel) scoreLabel.textContent = 'Characters Cleared';
    if (scoreEl) countUp(scoreEl, s.correct);
  }

  if (statsHost) {
    const cells = [
      { label: 'Correct', value: s.correct },
      { label: 'Missed', value: s.wrong },
      { label: 'Accuracy', value: `${accPct}%` },
      { label: 'Best Streak', value: s.bestStreak }
    ];
    if (s.mode === 'survival') cells[2] = { label: 'Round', value: s.round };
    statsHost.innerHTML = cells
      .map(c => `<div class="rstat"><div class="rstat-value">${c.value}</div><div class="rstat-label">${c.label}</div></div>`)
      .join('');
  }

  if (note) note.innerHTML = s.mode === 'survival' ? '<span class="muted">Saving…</span>' : '';

  overlay.classList.add('active');
  persistResults(s, note);
}

async function persistResults(s, noteEl) {
  let newBest = false;
  let rank = null;
  try {
    newBest = await saveStats(s);
    if (s.mode === 'survival') {
      await saveSession(s);
      rank = await submitSurvivalScore({ score: s.score, characterCount: s.characterCount });
    }
  } catch (err) {
    console.error('Saving results failed:', err);
  }

  if (s.mode === 'survival' && noteEl) {
    const parts = [];
    if (newBest) parts.push('🏆 New personal best!');
    if (rank) {
      const b = bracketFor(s.characterCount);
      parts.push(`Ranked <strong>#${rank}</strong> · ${b === 46 ? 'Full 46' : b + '-char'} board`);
    }
    noteEl.innerHTML = parts.length
      ? parts.map(p => `<div>${p}</div>`).join('')
      : '<span class="muted">Score saved.</span>';
  }

  const celebrate =
    (s.mode === 'survival' && newBest) ||
    (s.mode === 'zen' && s.accuracy >= 0.9 && s.correct >= 8);
  if (celebrate) {
    confetti();
    playSound('win');
  } else if (s.mode === 'survival') {
    playSound(s.reason === 'quit' ? 'tick' : 'lose');
  }
}

async function saveStats(s) {
  if (!state.user) return false;
  const ref = doc(db, 'stats', state.user.uid);
  const snap = await getDoc(ref);
  const stats = snap.exists() ? snap.data() : {};

  const accuracy = { ...(stats.characterAccuracy || {}) };
  Object.entries(g.perChar).forEach(([char, c]) => {
    const prev = accuracy[char] || { correct: 0, wrong: 0 };
    const correct = prev.correct + c.correct;
    const wrong = prev.wrong + c.wrong;
    accuracy[char] = { correct, wrong, accuracy: correct / Math.max(1, correct + wrong) };
  });

  const mastered = Object.entries(accuracy)
    .filter(([, a]) => a.correct + a.wrong >= 8 && a.accuracy >= 0.85)
    .map(([char]) => char);

  const prevBest = stats.highestSoloScore || 0;
  const newBest = s.mode === 'survival' && s.score > prevBest;

  const update = {
    userId: state.user.uid,
    totalGames: (stats.totalGames || 0) + 1,
    characterAccuracy: accuracy,
    charactersMastered: mastered,
    updatedAt: serverTimestamp()
  };
  if (s.mode === 'survival') {
    update.highestSoloScore = Math.max(prevBest, s.score);
  }

  await setDoc(ref, update, { merge: true });
  return newBest;
}

async function saveSession(s) {
  if (!state.user) return;
  await addDoc(collection(db, 'game_sessions'), {
    gameType: 'survival',
    status: 'completed',
    playerIds: [state.user.uid],
    players: {
      [state.user.uid]: {
        displayName: state.userData?.displayName || 'Player',
        username: state.userData?.username || 'player',
        avatarEmoji: state.userData?.avatarEmoji || '🌸'
      }
    },
    score: s.score,
    correct: s.correct,
    wrong: s.wrong,
    accuracy: Number(s.accuracy.toFixed(3)),
    characterCount: s.characterCount,
    durationSeconds: s.duration,
    createdAt: serverTimestamp()
  });
}

function hideResults() {
  const overlay = $('results-overlay');
  if (overlay) overlay.classList.remove('active');
}

// ============================================
// PAUSE OVERLAY
// ============================================

function showPauseOverlay() {
  const o = $('pause-overlay');
  if (o) o.classList.add('active');
}

function hidePauseOverlay() {
  const o = $('pause-overlay');
  if (o) o.classList.remove('active');
}

// ============================================
// HELPERS
// ============================================

function countUp(el, target, suffix = '') {
  const start = performance.now();
  const duration = 900;
  function step(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function confetti() {
  const colors = ['#0071E3', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FFD60A'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.animationDuration = 2 + Math.random() * 1.5 + 's';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

async function setPresence(status) {
  if (!state.user) return;
  try {
    await setDoc(
      doc(db, 'presence', state.user.uid),
      { status, lastSeen: serverTimestamp() },
      { merge: true }
    );
  } catch {
    /* presence is best-effort */
  }
}

function goHome() {
  cleanup();
  document.dispatchEvent(new CustomEvent('hq:gohome'));
}
