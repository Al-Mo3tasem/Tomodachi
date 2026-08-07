// ============================================
// Tomodachi — Sync Match / Co-op (Phase 4)
// Real-time cooperative play over Firestore.
//
// Both players see the SAME card and must each answer it correctly
// (retries allowed) before a shared time budget runs out. The team
// shares one score. Architecture mirrors duel.js: host-authority —
// the host generates the questions, advances rounds once both players
// have cleared, and ends the match; clients write only their own
// progress and render purely from snapshots.
// ============================================

import {
  state, $, showScreen, toast, shuffle, clamp, formatTime
} from '../core/core.js?v=20260807a';
import {
  db, doc, getDoc, setDoc, updateDoc, addDoc,
  collection, onSnapshot, serverTimestamp
} from '../data/firebase.js?v=20260807a';
import { playSound, unlockAudio } from '../audio/audio.js?v=20260807a';
import { submitCoopScore } from '../data/leaderboards.js?v=20260807a';
import { t } from '../i18n/index.js?v=20260807a';

// ----- Tuning -----
const COUNTDOWN_MS = 3500;
const SEC_PER_CHAR = 5000;   // shared time budget = 5s per character
const STALL_MS = 40000;      // co-op rounds can be slow; stall = likely disconnect

const ROMAJI_ALT = {
  shi: ['si'], si: ['shi'], chi: ['ti'], ti: ['chi'],
  tsu: ['tu'], tu: ['tsu'], fu: ['hu'], hu: ['fu'], wo: ['o'], n: ['nn']
};

let c = null;
const me = () => state.user?.uid;

function freshCoop(ref, sessionId, isHost) {
  return {
    ref, sessionId, isHost,
    data: null,
    unsub: null,
    myClearedRound: -1,
    myMissedRound: -1,
    renderedKey: '',
    tick: null,
    stallTimer: null,
    statsWritten: false,
    resultsShown: false,
    finished: false,
    ended: false,
    _entered: false,
    hostCountdownDone: false,
    hostDeadlineSet: false,
    hostAdvancingRound: -1,
    hostCompleting: false
  };
}

// ============================================
// PUBLIC API
// ============================================

export function isInCoop() {
  return !!c && !c.finished;
}

export async function sendCoopChallenge() {
  if (!state.user) return;
  if (c) teardown();

  const friend = state.friend;
  if (!friend || !friend.uid) {
    toast(t('coop.toast.no_friend'), 'warning');
    return;
  }
  const fp = state.friendPresence;
  if (!fp || fp.status === 'offline') {
    toast(t('coop.toast.friend_offline'), 'warning');
    return;
  }

  const chars = buildCharPool();
  if (chars.length < 4) {
    toast(t('coop.toast.min_chars'), 'warning');
    return;
  }

  unlockAudio();
  const inputMethod = state.coopInput || 'multiple';
  const questions = buildQuestions(chars, inputMethod);
  const hostInfo = playerInfo();

  const session = {
    gameType: 'coop',
    status: 'waiting',
    hostId: me(),
    guestId: friend.uid,
    playerIds: [me()],
    players: { [me()]: hostInfo },
    settings: { inputMethod, characterCount: chars.length },
    questions,
    currentRound: 0,
    progress: {},
    countdownStart: 0,
    deadline: 0,
    startedAtMs: 0,
    correctRounds: 0,
    perfectRounds: 0,
    finalScore: 0,
    endReason: null,
    createdAtMs: Date.now(),
    createdAt: serverTimestamp()
  };

  try {
    showLobby(t('coop.lobby_sending'), '');
    const ref = await addDoc(collection(db, 'game_sessions'), session);
    c = freshCoop(ref, ref.id, true);
    subscribe();
    showLobby(t('coop.lobby_waiting', { name: friend.displayName || t('duel.your_friend') }),
              t('coop.lobby_waiting_hint'));
  } catch (err) {
    console.error('sendCoopChallenge failed:', err);
    toast(t('coop.send_failed', { message: err.message }), 'error');
    goDashboard();
  }
}

export async function cancelCoopChallenge() {
  if (c && c.isHost && c.data && c.data.status === 'waiting') {
    try {
      await updateDoc(c.ref, { status: 'cancelled', endReason: 'cancelled' });
    } catch (err) { console.error('cancelCoopChallenge failed:', err); }
  }
  teardown();
  goDashboard();
}

export async function acceptCoop(invite) {
  if (!invite) return;
  unlockAudio();
  if (c) teardown();

  const ref = doc(db, 'game_sessions', invite.id);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().status !== 'waiting') {
      toast(t('coop.toast.invite_gone'), 'warning');
      return;
    }
    c = freshCoop(ref, invite.id, false);
    await updateDoc(ref, {
      playerIds: [invite.data.hostId, me()],
      [`players.${me()}`]: playerInfo(),
      status: 'countdown',
      countdownStart: Date.now(),
      updatedAt: serverTimestamp()
    });
    subscribe();
    enterCoopScreen();
  } catch (err) {
    console.error('acceptCoop failed:', err);
    toast(t('coop.toast.join_failed', { message: err.message }), 'error');
    c = null;
  }
}

export async function exitCoop() {
  if (!c) { goDashboard(); return; }
  const data = c.data;

  if (data && data.status === 'waiting') {
    await cancelCoopChallenge();
    return;
  }
  if (!data || data.status === 'completed' || data.status === 'cancelled') {
    teardown();
    goDashboard();
    return;
  }
  if (!confirm(t('coop.confirm_leave'))) return;
  try {
    await updateDoc(c.ref, {
      status: 'completed',
      endReason: 'abandoned',
      finalScore: computeScore(data, data.correctRounds || 0, data.perfectRounds || 0),
      updatedAt: serverTimestamp()
    });
  } catch (err) { console.error('exitCoop failed:', err); }
  teardown();
  goDashboard();
}

export function playAgainCoop() {
  teardown();
  document.dispatchEvent(new CustomEvent('hq:coop-rematch'));
}

export function onFriendPresence(presence) {
  if (!c || !c.data) return;
  const status = c.data.status;
  if (status !== 'countdown' && status !== 'active') return;
  if (presence && presence.status === 'offline') {
    updateDoc(c.ref, {
      status: 'completed',
      endReason: 'abandoned',
      finalScore: computeScore(c.data, c.data.correctRounds || 0, c.data.perfectRounds || 0),
      updatedAt: serverTimestamp()
    }).catch(err => console.error('coop presence end failed:', err));
  }
}

export async function resolveCoopStall() {
  setOverlay('coop-stall', false);
  if (c && c.data && c.ref) {
    const data = c.data;
    if (data.status === 'active' || data.status === 'countdown') {
      try {
        await updateDoc(c.ref, {
          status: 'completed',
          endReason: 'abandoned',
          finalScore: computeScore(data, data.correctRounds || 0, data.perfectRounds || 0),
          updatedAt: serverTimestamp()
        });
      } catch (err) { console.error('resolveCoopStall failed:', err); }
    }
  }
  teardown();
  goDashboard();
}

export function cleanupCoop() {
  teardown();
}

// ============================================
// SUBSCRIPTION & SNAPSHOTS
// ============================================

function subscribe() {
  if (!c) return;
  c.unsub = onSnapshot(c.ref, (snap) => {
    if (!snap.exists()) { handleEnded('cancelled'); return; }
    handleSnapshot(snap.data());
  }, (err) => {
    console.error('Co-op listener failed:', err);
    toast(t('coop.toast.connection_lost'), 'error');
  });
}

function handleSnapshot(data) {
  if (!c || c.ended) return;
  c.data = data;
  armStallWatchdog();

  switch (data.status) {
    case 'waiting':
      showLobby(t('coop.lobby_waiting', { name: opponentName() }),
                t('coop.lobby_waiting_hint'));
      break;
    case 'countdown':
    case 'active':
      enterCoopScreen();
      renderCoop(data);
      break;
    case 'completed':
      renderCoop(data);
      showCoopResults(data);
      break;
    case 'cancelled':
      handleEnded('cancelled');
      return;
    default:
      break;
  }

  if (c.isHost) coopSync(data);
}

// ============================================
// HOST ENGINE
// ============================================

function coopSync(data) {
  if (data.status === 'countdown') {
    if (!c.hostCountdownDone) {
      c.hostCountdownDone = true;
      const wait = Math.max(0, (data.countdownStart || Date.now()) + COUNTDOWN_MS - Date.now());
      setTimeout(() => goActive(), wait);
    }
    return;
  }
  if (data.status !== 'active') return;

  if (!c.hostDeadlineSet && data.deadline) {
    c.hostDeadlineSet = true;
    setTimeout(() => completeMatch('timeup'), Math.max(0, data.deadline - Date.now()));
  }
  if (data.deadline && Date.now() > data.deadline) {
    completeMatch('timeup');
    return;
  }

  const N = data.currentRound;
  const prog = (data.progress || {})[`r${N}`] || {};
  if (data.playerIds.every(id => prog[id] && prog[id].cleared)) {
    advanceRound(N);
  }
}

async function goActive() {
  if (!c || c.ended) return;
  const data = c.data;
  if (!data || data.status === 'completed' || data.status === 'cancelled') return;
  const budget = (data.settings.characterCount || 1) * SEC_PER_CHAR;
  try {
    await updateDoc(c.ref, {
      status: 'active',
      currentRound: 0,
      startedAtMs: Date.now(),
      deadline: Date.now() + budget,
      updatedAt: serverTimestamp()
    });
  } catch (err) { console.error('goActive failed:', err); }
}

async function advanceRound(N) {
  if (!c || c.ended) return;
  if (c.hostAdvancingRound === N) return;
  const data = c.data;
  if (!data || data.status !== 'active' || data.currentRound !== N) return;
  const prog = (data.progress || {})[`r${N}`] || {};
  if (!data.playerIds.every(id => prog[id] && prog[id].cleared)) return;
  c.hostAdvancingRound = N;

  const perfect = data.playerIds.every(id => !(prog[id] && prog[id].missed));
  const correctRounds = (data.correctRounds || 0) + 1;
  const perfectRounds = (data.perfectRounds || 0) + (perfect ? 1 : 0);
  const total = data.questions.length;

  if (N + 1 >= total) {
    await completeMatch('cleared', { correctRounds, perfectRounds });
  } else {
    try {
      await updateDoc(c.ref, {
        currentRound: N + 1, correctRounds, perfectRounds, updatedAt: serverTimestamp()
      });
    } catch (err) { console.error('advanceRound failed:', err); }
  }
}

async function completeMatch(reason, override) {
  if (!c || c.ended || c.hostCompleting) return;
  const data = c.data;
  if (!data || data.status === 'completed' || data.status === 'cancelled') return;
  c.hostCompleting = true;

  const correctRounds = override?.correctRounds ?? data.correctRounds ?? 0;
  const perfectRounds = override?.perfectRounds ?? data.perfectRounds ?? 0;
  try {
    await updateDoc(c.ref, {
      status: 'completed',
      endReason: reason,
      correctRounds,
      perfectRounds,
      finalScore: computeScore(data, correctRounds, perfectRounds),
      updatedAt: serverTimestamp()
    });
  } catch (err) { console.error('completeMatch failed:', err); }
}

function computeScore(data, correctRounds, perfectRounds) {
  const charCount = data.settings?.characterCount || 1;
  const budget = charCount * SEC_PER_CHAR;
  const elapsed = Date.now() - (data.startedAtMs || Date.now());
  const timeUsed = clamp(elapsed, 0, budget);
  const base = correctRounds * 200;
  const perfectBonus = perfectRounds * 100;
  const timeBonus = Math.max(0, budget - timeUsed) / 1000 / 10;
  const diffMult = charCount / 5;
  return Math.round((base + perfectBonus + timeBonus) * diffMult);
}

// ============================================
// ANSWERING
// ============================================

function submitAnswer(value, btnEl) {
  if (!c || !c.data || c.data.status !== 'active') return;
  const N = c.data.currentRound;
  if (c.myClearedRound === N) return;

  const q = c.data.questions[N];
  const correct = romajiMatches(value, q.romaji);

  if (correct) {
    c.myClearedRound = N;
    playSound('correct');
    lockAll(q);
    const oppCleared = ((c.data.progress || {})[`r${N}`] || {})[otherId(c.data)]?.cleared;
    setFeedback('good', oppCleared ? t('coop.feedback.synced') : t('coop.feedback.got_it', { name: opponentName() }));
    writeMyProgress();
  } else {
    playSound('wrong');
    if (c.myMissedRound !== N) { c.myMissedRound = N; writeMyProgress(); }
    setFeedback('bad', t('coop.feedback.not_quite'));
    if (c.data.settings.inputMethod === 'typing') {
      const inp = $('coop-answer-input');
      if (inp) {
        inp.classList.remove('shake');
        void inp.offsetWidth;
        inp.classList.add('shake');
        inp.value = '';
        inp.focus();
      }
    } else if (btnEl) {
      btnEl.disabled = true;
      btnEl.classList.add('choice-wrong');
    }
  }
}

function writeMyProgress() {
  const N = c.data.currentRound;
  updateDoc(c.ref, {
    [`progress.r${N}.${me()}`]: {
      cleared: c.myClearedRound === N,
      missed: c.myMissedRound === N
    },
    updatedAt: serverTimestamp()
  }).catch(err => console.error('coop progress write failed:', err));
}

// ============================================
// RENDERING
// ============================================

function enterCoopScreen() {
  if (c && c._entered) return;
  if (c) c._entered = true;
  showScreen('screen-coop');
  startTick();
}

function renderCoop(data) {
  updateHud(data);
  updateTeamPips(data);

  if (data.status === 'countdown') {
    setOverlay('coop-countdown', true);
    return;
  }
  setOverlay('coop-countdown', false);

  if (data.status === 'active') {
    const key = String(data.currentRound);
    if (key !== c.renderedKey) {
      c.renderedKey = key;
      renderRound(data);
    }
  }
}

function updateHud(data) {
  const N = data.questions?.length || 0;
  const round = data.currentRound || 0;
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('coop-hud-rounds', t('coop.hud_round', { current: Math.min(round + 1, N), total: N }));
  set('coop-hud-cleared', `✓ ${data.correctRounds || 0}`);
  updateClock(data);
}

function updateClock(data) {
  const budget = (data.settings?.characterCount || 1) * SEC_PER_CHAR;
  let remain = budget;
  if (data.status === 'active' && data.deadline) {
    remain = Math.max(0, data.deadline - Date.now());
  } else if (data.status === 'completed') {
    remain = Math.max(0, budget - (data.timeUsedMs || budget));
  }
  const t = $('coop-hud-time');
  if (t) {
    t.textContent = '⏱ ' + formatTime(remain);
    t.classList.toggle('danger', data.status === 'active' && remain < budget * 0.2);
  }
  const fill = $('coop-timer-fill');
  if (fill) {
    fill.style.width = clamp((remain / budget) * 100, 0, 100) + '%';
    fill.classList.toggle('danger', data.status === 'active' && remain < budget * 0.2);
  }
}

function updateTeamPips(data) {
  const N = data.currentRound;
  const prog = (data.progress || {})[`r${N}`] || {};
  setPip('coop-pip-self', data.players?.[me()], prog[me()]);
  setPip('coop-pip-opp', data.players?.[otherId(data)], prog[otherId(data)]);
}

function setPip(id, player, p) {
  const el = $(id);
  if (!el) return;
  const av = el.querySelector('.coop-pip-avatar');
  const nm = el.querySelector('.coop-pip-name');
  const st = el.querySelector('.coop-pip-state');
  if (av) av.textContent = player?.avatarEmoji || '🎮';
  if (nm) nm.textContent = player?.displayName || '…';
  el.classList.remove('cleared', 'missed');
  if (p && p.cleared) {
    if (st) st.textContent = '✓';
    el.classList.add('cleared');
  } else {
    if (st) st.textContent = '⏳';
    if (p && p.missed) el.classList.add('missed');
  }
}

function renderRound(data) {
  const N = data.currentRound;
  const q = data.questions[N];

  const card = $('coop-card');
  const charEl = $('coop-card-char');
  if (charEl) charEl.textContent = q.char;
  if (card) {
    card.classList.remove('flip-in', 'correct', 'wrong');
    void card.offsetWidth;
    card.classList.add('flip-in');
  }
  const fb = $('coop-feedback');
  if (fb) { fb.className = 'game-feedback'; fb.innerHTML = ''; }

  buildInput(data, q);

  if (c.myClearedRound === N) lockAll(q);
}

function buildInput(data, q) {
  const host = $('coop-input-area');
  if (!host) return;
  host.innerHTML = '';

  if (data.settings.inputMethod === 'typing') {
    const form = document.createElement('form');
    form.className = 'answer-form';
    form.innerHTML = `
      <input type="text" class="answer-input" id="coop-answer-input"
             autocomplete="off" autocapitalize="none" autocorrect="off"
             spellcheck="false" placeholder="${t('game.typing_placeholder')}"
             data-i18n-placeholder="game.typing_placeholder">
      <button type="submit" class="btn btn-primary answer-submit" data-i18n="common.enter">${t('common.enter')}</button>`;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('coop-answer-input');
      if (inp && inp.value.trim()) submitAnswer(inp.value);
    });
    host.appendChild(form);
    setTimeout(() => $('coop-answer-input')?.focus(), 30);
  } else {
    const grid = document.createElement('div');
    grid.className = 'choice-grid';
    (q.choices || []).forEach((romaji, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.dataset.value = romaji;
      btn.innerHTML = `<span class="choice-key">${i + 1}</span><span class="choice-text">${romaji}</span>`;
      btn.addEventListener('click', () => submitAnswer(romaji, btn));
      grid.appendChild(btn);
    });
    host.appendChild(grid);
  }
}

function lockAll(q) {
  if (c.data.settings.inputMethod === 'typing') {
    const inp = $('coop-answer-input');
    const submit = document.querySelector('#coop-input-area .answer-submit');
    if (inp) inp.disabled = true;
    if (submit) submit.disabled = true;
  } else {
    document.querySelectorAll('#coop-input-area .choice-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.value === q.romaji) b.classList.add('choice-correct');
    });
  }
}

function setFeedback(kind, text) {
  const fb = $('coop-feedback');
  if (fb) {
    fb.className = `game-feedback show ${kind}`;
    fb.innerHTML = `<span class="fb-text">${text}</span>`;
  }
}

// ----- Countdown / clock tick -----

function startTick() {
  stopTick();
  c.tick = setInterval(() => {
    if (!c || !c.data) return;
    const data = c.data;
    if (data.status === 'countdown') {
      const remain = (data.countdownStart || Date.now()) + COUNTDOWN_MS - Date.now();
      const el = $('coop-countdown-num');
      if (el) {
        const n = Math.ceil(remain / 1000);
        el.textContent = remain <= 350 ? 'GO!' : (n > 0 ? String(n) : 'GO!');
      }
    } else if (data.status === 'active') {
      updateClock(data);
    }
  }, 100);
}

function stopTick() {
  if (c && c.tick) { clearInterval(c.tick); c.tick = null; }
}

// ============================================
// RESULTS
// ============================================

async function showCoopResults(data) {
  if (c.resultsShown) return;
  c.resultsShown = true;
  c.finished = true;
  stopTick();
  clearStallWatchdog();

  const N = data.questions.length;
  const score = data.finalScore || 0;
  const reason = data.endReason;
  const cleared = data.correctRounds || 0;

  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('coop-result-emoji', reason === 'cleared' ? '🎉' : reason === 'abandoned' ? '🚪' : '⏱️');
  set('coop-result-title',
    reason === 'cleared' ? t('coop.result.title_cleared') :
    reason === 'abandoned' ? t('coop.result.title_ended') : t('coop.result.title_times_up'));
  set('coop-result-detail', t('coop.result.detail_cleared', { cleared, total: N }));
  countUp($('coop-result-score'), score);

  const statsHost = $('coop-result-stats');
  if (statsHost) {
    const acc = N ? Math.round((cleared / N) * 100) : 0;
    const cells = [
      { label: t('coop.stats.cleared'), value: `${cleared}/${N}` },
      { label: t('coop.stats.perfect'), value: data.perfectRounds || 0 },
      { label: t('coop.stats.completion'), value: `${acc}%` }
    ];
    statsHost.innerHTML = cells
      .map(x => `<div class="rstat"><div class="rstat-value">${x.value}</div><div class="rstat-label">${x.label}</div></div>`)
      .join('');
  }

  setOverlay('coop-results', true);
  showScreen('screen-coop');

  const real = reason === 'cleared' || reason === 'timeup';
  const great = reason === 'cleared' || (N && cleared >= N * 0.6);
  if (great) { confetti(); playSound('win'); }
  else playSound('lose');

  if (real) {
    await writeCoopStats(data);
    if (c.isHost) await submitToLeaderboard(data);
  }
}

async function writeCoopStats(data) {
  if (c.statsWritten || !state.user) return;
  c.statsWritten = true;
  try {
    const ref = doc(db, 'stats', me());
    const snap = await getDoc(ref);
    const s = snap.exists() ? snap.data() : {};
    await setDoc(ref, {
      userId: me(),
      totalGames: (s.totalGames || 0) + 1,
      highestCoopScore: Math.max(s.highestCoopScore || 0, data.finalScore || 0),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('Co-op stats write failed:', err);
  }
}

async function submitToLeaderboard(data) {
  try {
    const players = (data.playerIds || []).map(id => data.players?.[id] || {});
    await submitCoopScore({
      score: data.finalScore || 0,
      characterCount: data.settings.characterCount,
      playerIds: data.playerIds || [],
      players
    });
  } catch (err) {
    console.error('Co-op leaderboard submit failed:', err);
  }
}

// ============================================
// STALL WATCHDOG
// ============================================

function armStallWatchdog() {
  clearStallWatchdog();
  // A fresh snapshot proves the connection is alive — clear any stall warning.
  setOverlay('coop-stall', false);
  if (!c) return;
  c.stallTimer = setTimeout(() => {
    if (c && c.data && (c.data.status === 'active' || c.data.status === 'countdown')) {
      setOverlay('coop-stall', true);
    }
  }, STALL_MS);
}

function clearStallWatchdog() {
  if (c && c.stallTimer) { clearTimeout(c.stallTimer); c.stallTimer = null; }
}

// ============================================
// LIFECYCLE
// ============================================

function handleEnded(reason) {
  if (!c || c.ended) return;
  if (reason === 'cancelled') toast(t('coop.toast.cancelled'), 'info', 4000);
  teardown();
  goDashboard();
}

function teardown() {
  if (!c) return;
  c.ended = true;
  if (c.unsub) c.unsub();
  stopTick();
  clearStallWatchdog();
  setOverlay('coop-countdown', false);
  setOverlay('coop-results', false);
  setOverlay('coop-stall', false);
  c = null;
}

function goDashboard() {
  document.dispatchEvent(new CustomEvent('hq:gohome'));
}

// ============================================
// HELPERS
// ============================================

function playerInfo() {
  return {
    displayName: state.userData?.displayName || 'Player',
    username: state.userData?.username || 'player',
    avatarEmoji: state.userData?.avatarEmoji || '🌸'
  };
}

// kana vs vocab (see engine.js setKind rationale): distractors must come from
// the question's own kind or they're trivially eliminable.
function setKind(set) {
  return set.type === 'vocab' ? 'vocab' : 'kana';
}

function buildCharPool() {
  const all = [];
  state.contentSets.forEach(set => {
    const kind = setKind(set);
    (set.characters || []).forEach(ch => {
      if (state.selectedChars.has(ch.char) && !all.find(x => x.char === ch.char)) {
        all.push({ char: ch.char, romaji: (ch.romaji || '').toLowerCase(), kind });
      }
    });
  });
  return all;
}

function allRomaji() {
  const pools = { kana: new Set(), vocab: new Set() };
  state.contentSets.forEach(set => {
    const kind = setKind(set);
    (set.characters || []).forEach(ch => {
      if (ch.romaji) pools[kind].add(ch.romaji.toLowerCase());
    });
  });
  return { kana: [...pools.kana], vocab: [...pools.vocab] };
}

function buildQuestions(chars, inputMethod) {
  const pool = allRomaji();
  return shuffle(chars).map(ch => {
    const q = { char: ch.char, romaji: ch.romaji, choices: null };
    if (inputMethod === 'multiple') {
      const kind = ch.kind || 'kana';
      const sameKind = (pool[kind] || []).filter(r => r !== ch.romaji);
      let distractors = shuffle(sameKind).slice(0, 3);
      if (distractors.length < 3) {
        const other = kind === 'kana' ? 'vocab' : 'kana';
        const rest = (pool[other] || []).filter(r => r !== ch.romaji && !distractors.includes(r));
        distractors = distractors.concat(shuffle(rest).slice(0, 3 - distractors.length));
      }
      q.choices = shuffle([ch.romaji, ...distractors]);
    }
    return q;
  });
}

function romajiMatches(input, romaji) {
  const a = String(input).trim().toLowerCase().replace(/\s+/g, '');
  // Target is space-stripped too — vocab romaji can contain spaces and the
  // input side already strips them (see engine.js answerMatches).
  const r = String(romaji).trim().toLowerCase().replace(/\s+/g, '');
  if (a === r) return true;
  if ((ROMAJI_ALT[r] || []).includes(a)) return true;
  return canonRomaji(a) === canonRomaji(r);
}

// Kunrei/variant → Hepburn canonicalization (mirrors engine.js canonRomaji).
function canonRomaji(s) {
  return String(s)
    .replace(/sya/g, 'sha').replace(/syu/g, 'shu').replace(/syo/g, 'sho')
    .replace(/tya/g, 'cha').replace(/tyu/g, 'chu').replace(/tyo/g, 'cho')
    .replace(/zya/g, 'ja').replace(/zyu/g, 'ju').replace(/zyo/g, 'jo')
    .replace(/jya/g, 'ja').replace(/jyu/g, 'ju').replace(/jyo/g, 'jo')
    .replace(/si/g, 'shi').replace(/ti/g, 'chi').replace(/tu/g, 'tsu')
    .replace(/hu/g, 'fu').replace(/zi/g, 'ji');
}

function otherId(data) {
  return (data.playerIds || []).find(id => id !== me()) || data.guestId || data.hostId;
}

function opponentName() {
  if (!c || !c.data) return t('duel.your_friend');
  return c.data.players?.[otherId(c.data)]?.displayName || t('duel.your_friend');
}

function showLobby(statusText, detailText) {
  showScreen('screen-lobby');
  const title = $('lobby-title');
  const s = $('lobby-status');
  const det = $('lobby-detail');
  if (title) title.textContent = t('coop.lobby_title');
  if (s) s.textContent = statusText;
  if (det) det.textContent = detailText || '';
}

function setOverlay(id, on) {
  const el = $(id);
  if (el) el.classList.toggle('active', on);
}

function countUp(el, target) {
  if (!el) return;
  const start = performance.now();
  const duration = 900;
  function step(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function confetti() {
  const colors = ['#0071E3', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FFD60A'];
  for (let i = 0; i < 44; i++) {
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
