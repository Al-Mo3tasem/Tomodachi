// ============================================
// HiraQuest — Game Engine (Phase 2)
// Drives Zen Mode (relaxed practice) and Survival Rush (timed,
// 3 lives, ramping speed). One engine, mode-parameterised.
// ============================================

import { state, $, showScreen, toast, shuffle, clamp } from './core.js?v=20260522';
import {
  db, doc, getDoc, setDoc, addDoc, collection, serverTimestamp
} from './firebase.js?v=20260522';
import { speak, playSound, unlockAudio, isSpeechSupported } from './audio.js?v=20260522';
import { submitSurvivalScore, bracketFor } from './leaderboard.js?v=20260522';

// ----- Tuning constants -----
const SURVIVAL_LIVES = 3;
const TIME_START = 5000;   // ms for first question
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

  g = {
    type,
    mode: type,
    chars,
    allRomaji: collectRomaji(),
    inputMethod: type === 'survival' ? 'typing' : state.inputMethod,
    queue: [],
    current: null,
    lastChar: null,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    lives: SURVIVAL_LIVES,
    timeLimit: TIME_START,
    times: [],
    perChar: {},
    questionStart: 0,
    locked: false,
    active: true,
    expiry: null,
    danger: null,
    startedAt: Date.now()
  };

  buildScreen();
  showScreen('screen-game');
  setPresence('in_game');
  playSound('start');
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

/** Stop all timers/speech — call before navigating away. */
export function cleanup() {
  if (g) {
    g.active = false;
    stopTimer();
  }
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  hideResults();
  setPresence('online');
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

function buildScreen() {
  const label = $('game-mode-label');
  if (label) label.textContent = g.mode === 'zen' ? '🧘 Zen Mode' : '🔥 Survival Rush';

  const shell = $('game-shell');
  if (shell) shell.dataset.mode = g.mode;

  const timer = $('game-timer');
  if (timer) timer.style.display = g.mode === 'survival' ? 'block' : 'none';

  const speakBtn = $('game-speak');
  if (speakBtn) speakBtn.disabled = !isSpeechSupported();

  buildInputArea();
  renderHud();
  installKeyHandler();
}

function buildInputArea() {
  const host = $('game-input-area');
  if (!host) return;
  host.innerHTML = '';

  if (g.inputMethod === 'typing') {
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

function installKeyHandler() {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = (e) => {
    if (!g || !g.active || g.locked) return;
    if (g.inputMethod === 'multiple' && e.key >= '1' && e.key <= '4') {
      const btns = document.querySelectorAll('.choice-btn');
      const btn = btns[Number(e.key) - 1];
      if (btn) onAnswer(btn.dataset.value, btn);
    }
  };
  document.addEventListener('keydown', keyHandler);
}

// ============================================
// QUESTION FLOW
// ============================================

function nextQuestion() {
  if (!g || !g.active) return;
  g.locked = false;

  if (g.queue.length === 0) {
    let pool = state.shuffleEnabled ? shuffle(g.chars) : g.chars.slice();
    // Avoid repeating the same character back-to-back.
    if (pool.length > 1 && pool[0].char === g.lastChar) {
      pool.push(pool.shift());
    }
    g.queue = pool;
  }
  g.current = g.queue.shift();
  g.lastChar = g.current.char;

  if (g.mode === 'survival') {
    g.timeLimit = clamp(TIME_START - TIME_STEP * Math.floor(g.correct / RAMP_EVERY), TIME_MIN, TIME_START);
  }

  renderCard();
  clearFeedback();
  renderInput();
  renderHud();

  g.questionStart = performance.now();
  if (g.mode === 'survival') startTimer();
  if (g.mode === 'zen') speak(g.current.char);
}

function renderCard() {
  const card = $('game-card');
  const charEl = $('game-card-char');
  if (charEl) charEl.textContent = g.current.char;
  if (card) {
    card.classList.remove('flip-in');
    void card.offsetWidth; // restart animation
    card.classList.add('flip-in');
  }
}

function renderInput() {
  if (g.inputMethod === 'typing') {
    const input = $('answer-input');
    const submit = document.querySelector('.answer-submit');
    if (input) {
      input.value = '';
      input.disabled = false;
      input.classList.remove('shake');
      input.focus();
    }
    if (submit) submit.disabled = false;
  } else {
    const grid = $('choice-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const choices = makeChoices(g.current.romaji);
    choices.forEach((romaji, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.dataset.value = romaji;
      btn.innerHTML = `<span class="choice-key">${i + 1}</span><span class="choice-text">${romaji}</span>`;
      btn.addEventListener('click', () => onAnswer(romaji, btn));
      grid.appendChild(btn);
    });
  }
}

function makeChoices(answer) {
  const pool = g.allRomaji.filter(r => r !== answer);
  const picks = shuffle(pool).slice(0, 3);
  return shuffle([answer, ...picks]);
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

function onAnswer(value, btnEl) {
  if (!g || !g.active || g.locked) return;
  g.locked = true;
  stopTimer();

  const elapsed = (performance.now() - g.questionStart) / 1000;
  const isCorrect = answerMatches(value, g.current.romaji);
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

  showFeedback(isCorrect, value, btnEl);
  renderHud();

  const delay = isCorrect ? FEEDBACK_OK : FEEDBACK_BAD;
  setTimeout(() => {
    if (!g || !g.active) return;
    if (g.mode === 'survival' && g.lives <= 0) {
      endGame('over');
    } else {
      nextQuestion();
    }
  }, delay);
}

function onTimeout() {
  if (!g || !g.active || g.locked) return;
  g.locked = true;
  g.wrong++;
  g.streak = 0;
  recordChar(g.current.char, false);
  playSound('wrong');
  loseLife();
  showFeedback(false, null, null, true);
  renderHud();

  setTimeout(() => {
    if (!g || !g.active) return;
    if (g.lives <= 0) endGame('over');
    else nextQuestion();
  }, FEEDBACK_BAD);
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
  const card = $('game-card');
  if (card) card.classList.remove('correct', 'wrong');
}

function showFeedback(isCorrect, value, btnEl, timedOut = false) {
  const fb = $('game-feedback');
  const card = $('game-card');
  if (card) card.classList.add(isCorrect ? 'correct' : 'wrong');

  if (fb) {
    fb.className = `game-feedback show ${isCorrect ? 'good' : 'bad'}`;
    if (isCorrect) {
      fb.innerHTML = `<span class="fb-mark">✓</span><span class="fb-text">${g.current.romaji}</span>`;
    } else {
      const lead = timedOut ? "Time's up!" : 'Answer:';
      fb.innerHTML = `<span class="fb-mark">✗</span><span class="fb-text">${lead} <strong>${g.current.romaji}</strong></span>`;
    }
  }

  if (g.inputMethod === 'typing') {
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
      if (b.dataset.value === g.current.romaji) b.classList.add('choice-correct');
      else if (b === btnEl) b.classList.add('choice-wrong');
    });
  }
}

function renderHud() {
  const hud = $('game-hud-stats');
  if (!hud) return;

  if (g.mode === 'survival') {
    const hearts =
      '❤️'.repeat(g.lives) + '🤍'.repeat(Math.max(0, SURVIVAL_LIVES - g.lives));
    const round = Math.floor(g.correct / RAMP_EVERY) + 1;
    hud.innerHTML = `
      <span class="hud-lives">${hearts}</span>
      <span class="hud-chip">Round ${round}</span>
      <span class="hud-chip hud-score">${liveScore().toLocaleString()}</span>
    `;
  } else {
    const total = g.correct + g.wrong;
    const acc = total ? Math.round((g.correct / total) * 100) : 100;
    hud.innerHTML = `
      <span class="hud-chip hud-good">✓ ${g.correct}</span>
      <span class="hud-chip hud-bad">✗ ${g.wrong}</span>
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
// TIMER (Survival)
// ============================================

function startTimer() {
  const fill = $('game-timer-fill');
  if (!fill) return;
  fill.style.transition = 'none';
  fill.style.width = '100%';
  fill.classList.remove('danger');
  void fill.offsetWidth;
  requestAnimationFrame(() => {
    fill.style.transition = `width ${g.timeLimit}ms linear`;
    fill.style.width = '0%';
  });
  g.expiry = setTimeout(onTimeout, g.timeLimit);
  g.danger = setTimeout(() => fill.classList.add('danger'), Math.max(0, g.timeLimit - 1200));
}

function stopTimer() {
  if (!g) return;
  clearTimeout(g.expiry);
  clearTimeout(g.danger);
  const fill = $('game-timer-fill');
  if (fill) {
    const current = getComputedStyle(fill).width;
    fill.style.transition = 'none';
    fill.style.width = current;
  }
}

// ============================================
// SCORING
// ============================================

function avgTime() {
  if (!g.times.length) return 3;
  return g.times.reduce((a, b) => a + b, 0) / g.times.length;
}

/** Live (in-progress) survival score estimate for the HUD. */
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
  stopTimer();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }
  setPresence('online');

  const total = g.correct + g.wrong;
  const summary = {
    mode: g.mode,
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
    if (title) title.textContent = 'Practice Complete';
    if (emoji) emoji.textContent = accPct >= 90 ? '🌸' : accPct >= 60 ? '🧘' : '📚';
    if (scoreLabel) scoreLabel.textContent = 'Accuracy';
    if (scoreEl) countUp(scoreEl, accPct, '%');
  }

  if (statsHost) {
    const cells = [
      { label: 'Correct', value: s.correct },
      { label: 'Missed', value: s.wrong },
      { label: 'Best Streak', value: s.bestStreak }
    ];
    if (s.mode === 'survival') {
      cells.push({ label: 'Round', value: s.round });
    } else {
      cells.push({ label: 'Accuracy', value: `${accPct}%` });
    }
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
    if (rank) parts.push(`Ranked <strong>#${rank}</strong> · ${bracketFor(s.characterCount) === 46 ? 'Full 46' : bracketFor(s.characterCount) + '-char'} board`);
    noteEl.innerHTML = parts.length
      ? parts.map(p => `<div>${p}</div>`).join('')
      : '<span class="muted">Score saved.</span>';
  }

  const celebrate =
    (s.mode === 'survival' && newBest) ||
    (s.mode === 'zen' && s.accuracy >= 0.9 && s.correct + s.wrong >= 5);
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

// Expose the manual pronounce button target.
export function speakCurrent() {
  if (g && g.current) {
    unlockAudio();
    speak(g.current.char);
  }
}
