// ============================================
// Tomodachi — Duel Mode (Phase 3)
// Real-time head-to-head over Firestore.
//
// Sync model: HOST-AUTHORITY.
//  • The host generates the question list and is the only client that
//    advances rounds (resolve → reveal → next). Guard checks + local
//    scheduling flags make every host action idempotent.
//  • Each client writes ONLY its own answer for the current round.
//  • Both clients render purely from document snapshots.
//  • Disconnects are caught by presence (opponent offline → forfeit) and
//    by a stall watchdog, so a dead host never freezes the guest.
// ============================================

import {
  state, $, showScreen, toast, shuffle, clamp
} from '../core/core.js?v=20260906a';
import {
  db, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, onSnapshot, serverTimestamp
} from '../data/firebase.js?v=20260906a';
import { playSound, unlockAudio } from '../audio/audio.js?v=20260906a';
import { acceptCoop, isInCoop } from './coop.js?v=20260906a';
import { t } from '../i18n/index.js?v=20260906a';

// ----- Tuning -----
const COUNTDOWN_MS = 3500;
const REVEAL_MS = 2600;
const ROUND_MS = { multiple: 7000, typing: 11000 };
const WIN_ROUNDS = 10;       // first_to_10
const TOTAL_ROUNDS = 20;     // rounds_20
const MAX_ROUNDS = 30;       // hard cap for first_to_10
const QUESTION_COUNT = 30;
const STALL_MS = 26000;      // no snapshot for this long → opponent likely gone
const INVITE_FRESH_MS = 180000;

const ROMAJI_ALT = {
  shi: ['si'], si: ['shi'], chi: ['ti'], ti: ['chi'],
  tsu: ['tu'], tu: ['tsu'], fu: ['hu'], hu: ['fu'], wo: ['o'], n: ['nn']
};

// ----- Module state -----
let d = null;                 // active duel runtime (null when not in a duel)
let inviteUnsub = null;       // dashboard invite listener
let pendingInvite = null;     // { id, data } currently shown in the modal

const me = () => state.user?.uid;

function freshDuel(ref, sessionId, isHost) {
  return {
    ref,
    sessionId,
    isHost,
    data: null,
    unsub: null,
    myAnsweredRound: -1,
    renderedKey: '',
    tick: null,
    stallTimer: null,
    statsWritten: false,
    resultsShown: false,
    finished: false,
    ended: false,
    _entered: false,
    // host scheduling guards
    hostCountdownDone: false,
    hostRoundTimer: null,
    hostRoundTimerFor: -1,
    hostAdvanceTimer: null,
    hostAdvanceFor: -1,
    resolvingRound: -1
  };
}

// ============================================
// INVITE LISTENER (runs on the dashboard)
// ============================================

export function initDuelInvites() {
  stopDuelInvites();
  if (!state.user) return;
  // Single equality filter keeps this index-free; the rest is filtered here.
  const q = query(collection(db, 'game_sessions'), where('guestId', '==', me()));
  inviteUnsub = onSnapshot(q, (snap) => {
    let invite = null;
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if ((data.gameType !== 'duel' && data.gameType !== 'coop') || data.status !== 'waiting') return;
      const age = Date.now() - (data.createdAtMs || 0);
      if (age > INVITE_FRESH_MS) return;
      invite = { id: docSnap.id, data };
    });
    if (invite && !isInDuel() && !isInCoop()) {
      showInvite(invite);
    } else if (!invite) {
      hideInvite();
    }
  }, (err) => console.error('Invite listener failed:', err));
}

export function stopDuelInvites() {
  if (inviteUnsub) { inviteUnsub(); inviteUnsub = null; }
  hideInvite();
}

function showInvite(invite) {
  pendingInvite = invite;
  const overlay = $('invite-overlay');
  if (!overlay) return;
  const data = invite.data;
  const host = data.players?.[data.hostId] || {};
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const s = data.settings || {};
  const inp = s.inputMethod === 'typing' ? t('invite.input_typing') : t('invite.input_multiple');

  set('invite-avatar', host.avatarEmoji || '🎮');
  set('invite-from', host.displayName || host.username || t('invite.from_fallback'));

  if (data.gameType === 'coop') {
    set('invite-emoji', '🤝');
    set('invite-title', t('invite.coop_title'));
    set('invite-text-action', t('invite.coop_action'));
    set('invite-details', t('invite.details_coop', { count: s.characterCount || '?', input: inp }));
  } else {
    const wc = s.winCondition === 'rounds_20' ? t('invite.wincon_rounds20') : t('invite.wincon_first10');
    set('invite-emoji', '⚔️');
    set('invite-title', t('invite.duel_title'));
    set('invite-text-action', t('invite.duel_action'));
    set('invite-details', t('invite.details_duel', { count: s.characterCount || '?', wincon: wc, input: inp }));
  }
  overlay.classList.add('active');
  playSound('start');
}

function hideInvite() {
  pendingInvite = null;
  const overlay = $('invite-overlay');
  if (overlay) overlay.classList.remove('active');
}

// ============================================
// HOST: SEND / CANCEL CHALLENGE
// ============================================

export async function sendChallenge() {
  if (!state.user) return;
  if (d) teardown();
  const friend = state.friend;
  if (!friend || !friend.uid) {
    toast(t('duel.toast.no_friend'), 'warning');
    return;
  }
  const fp = state.friendPresence;
  if (!fp || fp.status === 'offline') {
    toast(t('duel.toast.friend_offline'), 'warning');
    return;
  }

  const chars = buildCharPool();
  if (chars.length < 4) {
    toast(t('duel.toast.min_chars'), 'warning');
    return;
  }

  unlockAudio();
  const inputMethod = state.duelInput || 'multiple';
  const winCondition = state.winCondition || 'first_to_10';
  const questions = buildQuestions(chars, inputMethod);

  const hostInfo = {
    displayName: state.userData?.displayName || 'Player',
    username: state.userData?.username || 'player',
    avatarEmoji: state.userData?.avatarEmoji || '🌸'
  };

  const session = {
    gameType: 'duel',
    status: 'waiting',
    hostId: me(),
    guestId: friend.uid,
    playerIds: [me()],
    players: { [me()]: hostInfo },
    settings: { winCondition, inputMethod, characterCount: chars.length },
    questions,
    currentRound: 0,
    roundState: 'answering',
    roundDeadline: 0,
    countdownStart: 0,
    answers: {},
    results: {},
    scores: { [me()]: 0 },
    roundsWon: { [me()]: 0 },
    winnerId: null,
    isDraw: false,
    endReason: null,
    createdAtMs: Date.now(),
    createdAt: serverTimestamp()
  };

  try {
    showLobby(t('duel.lobby_sending'), '');
    const ref = await addDoc(collection(db, 'game_sessions'), session);
    d = freshDuel(ref, ref.id, true);
    subscribe();
    showLobby(t('duel.lobby_waiting', { name: friend.displayName || t('duel.your_friend') }),
              t('duel.lobby_waiting_hint'));
  } catch (err) {
    console.error('sendChallenge failed:', err);
    toast(t('duel.send_failed', { message: err.message }), 'error');
    goDashboard();
  }
}

export async function cancelChallenge() {
  if (d && d.isHost && d.data && d.data.status === 'waiting') {
    try {
      await updateDoc(d.ref, { status: 'cancelled', endReason: 'cancelled' });
    } catch (err) { console.error('cancelChallenge failed:', err); }
  }
  teardown();
  goDashboard();
}

// ============================================
// GUEST: ACCEPT / DECLINE
// ============================================

export async function acceptInvite() {
  if (!pendingInvite) return;
  const invite = pendingInvite;
  hideInvite();
  // Co-op invites are handed off to the co-op module.
  if (invite.data.gameType === 'coop') { acceptCoop(invite); return; }
  unlockAudio();
  if (d) teardown();

  const ref = doc(db, 'game_sessions', invite.id);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().status !== 'waiting') {
      toast(t('duel.toast.invite_gone'), 'warning');
      return;
    }
    const guestInfo = {
      displayName: state.userData?.displayName || 'Player',
      username: state.userData?.username || 'player',
      avatarEmoji: state.userData?.avatarEmoji || '🌸'
    };
    d = freshDuel(ref, invite.id, false);
    await updateDoc(ref, {
      playerIds: [invite.data.hostId, me()],
      [`players.${me()}`]: guestInfo,
      [`scores.${me()}`]: 0,
      [`roundsWon.${me()}`]: 0,
      status: 'countdown',
      countdownStart: Date.now(),
      updatedAt: serverTimestamp()
    });
    subscribe();
    enterDuelScreen();
  } catch (err) {
    console.error('acceptInvite failed:', err);
    toast(t('duel.toast.join_failed', { message: err.message }), 'error');
    d = null;
  }
}

export async function declineInvite() {
  if (!pendingInvite) return;
  const id = pendingInvite.id;
  hideInvite();
  try {
    await updateDoc(doc(db, 'game_sessions', id), {
      status: 'cancelled', endReason: 'declined'
    });
  } catch (err) { console.error('declineInvite failed:', err); }
}

// ============================================
// SUBSCRIPTION & SNAPSHOT HANDLING
// ============================================

function subscribe() {
  if (!d) return;
  d.unsub = onSnapshot(d.ref, (snap) => {
    if (!snap.exists()) { handleEnded('cancelled'); return; }
    handleSnapshot(snap.data());
  }, (err) => {
    console.error('Duel listener failed:', err);
    toast(t('duel.toast.connection_lost'), 'error');
  });
}

function handleSnapshot(data) {
  if (!d || d.ended) return;
  d.data = data;
  armStallWatchdog();

  switch (data.status) {
    case 'waiting':
      showLobby(t('duel.lobby_waiting', { name: opponentName() }),
                t('duel.lobby_waiting_hint'));
      break;
    case 'countdown':
    case 'active':
      enterDuelScreen();
      renderDuel(data);
      break;
    case 'completed':
      renderDuel(data);
      showResults(data);
      break;
    case 'cancelled':
      handleEnded('cancelled');
      return;
    default:
      break;
  }

  if (d.isHost) hostSync(data);
}

// ============================================
// HOST ENGINE
// ============================================

function hostSync(data) {
  if (data.status === 'countdown') {
    if (!d.hostCountdownDone) {
      d.hostCountdownDone = true;
      const wait = Math.max(0, (data.countdownStart || Date.now()) + COUNTDOWN_MS - Date.now());
      setTimeout(() => startRound(0), wait);
    }
    return;
  }
  if (data.status !== 'active') return;
  const N = data.currentRound;

  if (data.roundState === 'answering') {
    if (d.hostRoundTimerFor !== N) {
      d.hostRoundTimerFor = N;
      clearTimeout(d.hostRoundTimer);
      const wait = Math.max(0, (data.roundDeadline || Date.now()) - Date.now());
      d.hostRoundTimer = setTimeout(() => resolveRound(N), wait);
    }
    const ans = (data.answers || {})[`r${N}`] || {};
    if (ans[data.hostId] && ans[data.guestId]) {
      clearTimeout(d.hostRoundTimer);
      resolveRound(N);
    }
  } else if (data.roundState === 'revealed') {
    if (d.hostAdvanceFor !== N) {
      d.hostAdvanceFor = N;
      clearTimeout(d.hostAdvanceTimer);
      d.hostAdvanceTimer = setTimeout(() => advanceFrom(N), REVEAL_MS);
    }
  }
}

async function startRound(N) {
  if (!d || d.ended) return;
  const data = d.data;
  if (!data || data.status === 'completed' || data.status === 'cancelled') return;
  if (data.status === 'active' && data.currentRound > N) return;
  try {
    await updateDoc(d.ref, {
      status: 'active',
      currentRound: N,
      roundState: 'answering',
      roundDeadline: Date.now() + (ROUND_MS[data.settings.inputMethod] || 8000),
      updatedAt: serverTimestamp()
    });
  } catch (err) { console.error('startRound failed:', err); }
}

async function resolveRound(N) {
  if (!d || d.ended) return;
  // Synchronous guard: a snapshot can fire a second resolveRound for the
  // same round before the first one's updateDoc lands. Resolve N only once.
  if (d.resolvingRound === N) return;
  const data = d.data;
  if (!data || data.status !== 'active' || data.roundState !== 'answering' || data.currentRound !== N) return;
  d.resolvingRound = N;

  const ids = data.playerIds;
  const ans = (data.answers || {})[`r${N}`] || {};
  const corrects = ids
    .filter(id => ans[id] && ans[id].correct)
    .sort((a, b) => (ans[a].at || 0) - (ans[b].at || 0));

  const outcome = {};
  const delta = {};
  ids.forEach(id => {
    if (!ans[id]) { outcome[id] = 'none'; delta[id] = 0; }
    else if (!ans[id].correct) { outcome[id] = 'wrong'; delta[id] = -50; }
  });
  let firstId = null;
  if (corrects.length) {
    firstId = corrects[0];
    outcome[firstId] = 'first'; delta[firstId] = 100;
    if (corrects[1]) { outcome[corrects[1]] = 'second'; delta[corrects[1]] = 50; }
  }

  const scores = { ...(data.scores || {}) };
  const roundsWon = { ...(data.roundsWon || {}) };
  ids.forEach(id => { scores[id] = (scores[id] || 0) + (delta[id] || 0); });
  if (firstId) roundsWon[firstId] = (roundsWon[firstId] || 0) + 1;

  try {
    await updateDoc(d.ref, {
      roundState: 'revealed',
      scores,
      roundsWon,
      [`results.r${N}`]: { firstId, outcome },
      updatedAt: serverTimestamp()
    });
  } catch (err) { console.error('resolveRound failed:', err); }
}

async function advanceFrom(N) {
  if (!d || d.ended) return;
  const data = d.data;
  if (!data || data.status !== 'active' || data.roundState !== 'revealed' || data.currentRound !== N) return;

  const ids = data.playerIds;
  const won = data.roundsWon || {};
  const scores = data.scores || {};
  const cond = data.settings.winCondition;

  let over = false;
  if (cond === 'first_to_10') {
    over = ids.some(id => (won[id] || 0) >= WIN_ROUNDS) || (N + 1) >= MAX_ROUNDS;
  } else {
    over = (N + 1) >= TOTAL_ROUNDS;
  }

  if (!over) { startRound(N + 1); return; }

  const [a, b] = ids;
  const metric = cond === 'first_to_10'
    ? id => (won[id] || 0)
    : id => (scores[id] || 0);
  let winnerId = null, isDraw = false;
  if (metric(a) > metric(b)) winnerId = a;
  else if (metric(b) > metric(a)) winnerId = b;
  else if ((scores[a] || 0) > (scores[b] || 0)) winnerId = a;
  else if ((scores[b] || 0) > (scores[a] || 0)) winnerId = b;
  else isDraw = true;

  try {
    await updateDoc(d.ref, {
      status: 'completed', winnerId, isDraw, endReason: 'win', updatedAt: serverTimestamp()
    });
  } catch (err) { console.error('advanceFrom complete failed:', err); }
}

// ============================================
// ANSWERING
// ============================================

async function submitAnswer(value) {
  if (!d || !d.data) return;
  const data = d.data;
  if (data.status !== 'active' || data.roundState !== 'answering') return;
  const N = data.currentRound;
  if (d.myAnsweredRound === N) return;
  d.myAnsweredRound = N;

  const q = data.questions[N];
  const correct = romajiMatches(value, q.romaji);
  lockInput(value, correct, q, true);
  playSound(correct ? 'correct' : 'wrong');

  try {
    await updateDoc(d.ref, {
      [`answers.r${N}.${me()}`]: { value: String(value), correct, at: Date.now() },
      updatedAt: serverTimestamp()
    });
  } catch (err) { console.error('submitAnswer failed:', err); }
}

// ============================================
// RENDERING
// ============================================

function enterDuelScreen() {
  if (d && d._entered) return;
  if (d) d._entered = true;
  showScreen('screen-duel');
  startTick();
}

function renderDuel(data) {
  updatePanels(data);

  if (data.status === 'countdown') {
    setOverlay('duel-countdown', true);
    return;
  }
  setOverlay('duel-countdown', false);

  if (data.status === 'active') {
    const key = `${data.currentRound}:${data.roundState}`;
    if (key !== d.renderedKey) {
      d.renderedKey = key;
      if (data.roundState === 'answering') renderQuestion(data);
      else renderReveal(data);
    }
  }
}

function updatePanels(data) {
  const myId = me();
  const oppId = otherId(data);
  const players = data.players || {};
  const scores = data.scores || {};
  const won = data.roundsWon || {};

  const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  setText('duel-self-avatar', players[myId]?.avatarEmoji || '🌸');
  setText('duel-self-name', players[myId]?.displayName || t('duel.you'));
  setText('duel-self-score', scores[myId] || 0);
  setText('duel-self-won', `🏆 ${won[myId] || 0}`);
  setText('duel-opp-avatar', players[oppId]?.avatarEmoji || '🎮');
  setText('duel-opp-name', players[oppId]?.displayName || t('duel.opponent'));
  setText('duel-opp-score', scores[oppId] || 0);
  setText('duel-opp-won', `🏆 ${won[oppId] || 0}`);

  // Round label
  const total = data.settings?.winCondition === 'rounds_20' ? ` / ${TOTAL_ROUNDS}` : '';
  setText('duel-round-label', t('duel.round_n', { n: (data.currentRound || 0) + 1 }) + total);

  // Opponent answered indicator
  const oppAns = (data.answers || {})[`r${data.currentRound}`]?.[oppId];
  const oppPanel = $('duel-opp');
  if (oppPanel) {
    oppPanel.classList.toggle('answered',
      !!oppAns && data.status === 'active' && data.roundState === 'answering');
  }
}

function renderQuestion(data) {
  const N = data.currentRound;
  const q = data.questions[N];

  const card = $('duel-card');
  const charEl = $('duel-card-char');
  if (charEl) charEl.textContent = q.char;
  if (card) {
    card.classList.remove('flip-in', 'correct', 'wrong');
    void card.offsetWidth;
    card.classList.add('flip-in');
  }
  const fb = $('duel-feedback');
  if (fb) { fb.className = 'game-feedback'; fb.innerHTML = ''; }

  buildInput(data, q);
}

function buildInput(data, q) {
  const host = $('duel-input-area');
  if (!host) return;
  host.innerHTML = '';
  const method = data.settings.inputMethod;

  if (method === 'typing') {
    const form = document.createElement('form');
    form.className = 'answer-form';
    form.innerHTML = `
      <input type="text" class="answer-input" id="duel-answer-input"
             autocomplete="off" autocapitalize="none" autocorrect="off"
             spellcheck="false" placeholder="${t('game.typing_placeholder')}"
             data-i18n-placeholder="game.typing_placeholder">
      <button type="submit" class="btn btn-primary answer-submit" data-i18n="common.enter">${t('common.enter')}</button>`;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('duel-answer-input');
      if (inp && inp.value.trim()) submitAnswer(inp.value);
    });
    host.appendChild(form);
    setTimeout(() => $('duel-answer-input')?.focus(), 30);
  } else {
    const grid = document.createElement('div');
    grid.className = 'choice-grid';
    (q.choices || []).forEach((romaji, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.dataset.value = romaji;
      btn.innerHTML = `<span class="choice-key">${i + 1}</span><span class="choice-text">${romaji}</span>`;
      btn.addEventListener('click', () => submitAnswer(romaji));
      grid.appendChild(btn);
    });
    host.appendChild(grid);
  }
}

function lockInput(value, correct, q, mine) {
  const method = d.data.settings.inputMethod;
  if (method === 'typing') {
    const inp = $('duel-answer-input');
    const submit = document.querySelector('#duel-input-area .answer-submit');
    if (inp) { inp.disabled = true; if (mine && !correct) inp.classList.add('shake'); }
    if (submit) submit.disabled = true;
  } else {
    document.querySelectorAll('#duel-input-area .choice-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.value === q.romaji) b.classList.add('choice-correct');
      else if (mine && b.dataset.value === String(value)) b.classList.add('choice-wrong');
    });
  }
  if (mine) {
    const fb = $('duel-feedback');
    if (fb && d.data.roundState === 'answering') {
      fb.className = 'game-feedback show';
      fb.innerHTML = `<span class="fb-text">${t('duel.feedback.locked_in', { name: opponentName() })}</span>`;
    }
  }
}

function renderReveal(data) {
  const N = data.currentRound;
  const q = data.questions[N];
  const result = (data.results || {})[`r${N}`] || { outcome: {} };
  const myId = me();
  const myOutcome = result.outcome[myId] || 'none';

  const card = $('duel-card');
  const charEl = $('duel-card-char');
  if (charEl) charEl.textContent = q.char;
  if (card) {
    card.classList.remove('correct', 'wrong');
    card.classList.add(myOutcome === 'first' || myOutcome === 'second' ? 'correct' : 'wrong');
  }

  // Reveal choice states / disable inputs (mine=true so my pick is marked).
  const myAns = (data.answers || {})[`r${N}`]?.[myId];
  lockInput(myAns?.value, myOutcome === 'first' || myOutcome === 'second', q, true);

  const fb = $('duel-feedback');
  if (fb) {
    const map = {
      first: { cls: 'good', txt: t('duel.feedback.fastest') },
      second: { cls: 'good', txt: t('duel.feedback.second') },
      wrong: { cls: 'bad', txt: t('duel.feedback.wrong', { char: q.char, romaji: q.romaji }) },
      none: { cls: 'bad', txt: t('duel.feedback.too_slow', { char: q.char, romaji: q.romaji }) }
    };
    const r = map[myOutcome] || map.none;
    fb.className = `game-feedback show ${r.cls}`;
    fb.innerHTML = `<span class="fb-text">${r.txt}</span>`;
  }

  playSound(myOutcome === 'first' || myOutcome === 'second' ? 'correct' : 'wrong');
}

// ----- Countdown / timer tick -----

function startTick() {
  stopTick();
  d.tick = setInterval(() => {
    if (!d || !d.data) return;
    const data = d.data;
    if (data.status === 'countdown') {
      const remain = (data.countdownStart || Date.now()) + COUNTDOWN_MS - Date.now();
      const n = Math.ceil(remain / 1000);
      const el = $('duel-countdown-num');
      if (el) el.textContent = remain <= 350 ? 'GO!' : (n > 0 ? String(n) : 'GO!');
    } else if (data.status === 'active' && data.roundState === 'answering') {
      const fill = $('duel-timer-fill');
      if (fill) {
        const total = ROUND_MS[data.settings.inputMethod] || 8000;
        const remain = Math.max(0, (data.roundDeadline || Date.now()) - Date.now());
        const pct = clamp((remain / total) * 100, 0, 100);
        fill.style.width = pct + '%';
        fill.classList.toggle('danger', remain < 2200);
      }
    }
  }, 100);
}

function stopTick() {
  if (d && d.tick) { clearInterval(d.tick); d.tick = null; }
}

// ============================================
// RESULTS
// ============================================

async function showResults(data) {
  if (d.resultsShown) return;
  d.resultsShown = true;
  d.finished = true;
  stopTick();
  clearStallWatchdog();

  const myId = me();
  const oppId = otherId(data);
  const iWon = data.winnerId === myId;
  const draw = data.isDraw;
  const forfeit = data.endReason === 'forfeit';

  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('duel-result-emoji', draw ? '🤝' : iWon ? '🏆' : '💪');
  set('duel-result-title', draw ? t('duel.result.draw') : iWon ? t('duel.result.victory') : t('duel.result.defeat'));
  if (forfeit) {
    set('duel-result-detail', iWon
      ? t('duel.result.opponent_left', { name: opponentName() })
      : t('duel.result.you_left'));
  } else {
    set('duel-result-detail', draw
      ? t('duel.result.detail_draw')
      : iWon ? t('duel.result.detail_won') : t('duel.result.detail_lost', { name: opponentName() }));
  }

  const scores = data.scores || {};
  const won = data.roundsWon || {};
  const scoreHost = $('duel-result-scores');
  if (scoreHost) {
    scoreHost.innerHTML = `
      <div class="dr-side ${iWon && !draw ? 'dr-win' : ''}">
        <div class="dr-name">${t('duel.you')}</div>
        <div class="dr-score">${scores[myId] || 0}</div>
        <div class="dr-sub">${t('duel.result.rounds_won', { count: won[myId] || 0 })}</div>
      </div>
      <div class="dr-vs">${t('duel.vs')}</div>
      <div class="dr-side ${!iWon && !draw ? 'dr-win' : ''}">
        <div class="dr-name">${opponentName()}</div>
        <div class="dr-score">${scores[oppId] || 0}</div>
        <div class="dr-sub">${t('duel.result.rounds_won', { count: won[oppId] || 0 })}</div>
      </div>`;
  }

  setOverlay('duel-results', true);
  showScreen('screen-duel');

  if (!draw && iWon) { confetti(); playSound('win'); }
  else if (!draw) playSound('lose');
  else playSound('tick');

  await writeDuelStats(data);
}

async function writeDuelStats(data) {
  if (d.statsWritten || !state.user) return;
  d.statsWritten = true;
  const iWon = data.winnerId === me();
  const draw = data.isDraw;
  try {
    const ref = doc(db, 'stats', me());
    const snap = await getDoc(ref);
    const s = snap.exists() ? snap.data() : {};
    const update = {
      userId: me(),
      totalGames: (s.totalGames || 0) + 1,
      updatedAt: serverTimestamp()
    };
    if (!draw && iWon) update.duelsWon = (s.duelsWon || 0) + 1;
    if (!draw && !iWon) update.duelsLost = (s.duelsLost || 0) + 1;
    await setDoc(ref, update, { merge: true });
  } catch (err) {
    console.error('Duel stats write failed:', err);
  }
}

// ============================================
// EXIT / FORFEIT / END
// ============================================

export function isInDuel() {
  return !!d && !d.finished;
}

export async function exitDuel() {
  if (!d) { goDashboard(); return; }
  const data = d.data;

  // Waiting lobby (host) → just cancel.
  if (data && data.status === 'waiting') {
    await cancelChallenge();
    return;
  }
  // Completed → leave cleanly.
  if (!data || data.status === 'completed' || data.status === 'cancelled') {
    teardown();
    goDashboard();
    return;
  }
  // Live duel → confirm forfeit.
  if (!confirm(t('duel.confirm_forfeit'))) return;
  // Snapshot the final state BEFORE teardown so we can record the loss.
  // The forfeiting client leaves immediately (no showResults), so unlike a
  // normal finish it must write its own stats here — otherwise the game
  // lands in history as "Lost" while the W–L record never moves.
  const finalData = { ...data, status: 'completed', winnerId: otherId(data), isDraw: false, endReason: 'forfeit' };
  try {
    await updateDoc(d.ref, {
      status: 'completed',
      winnerId: otherId(data),
      isDraw: false,
      endReason: 'forfeit',
      updatedAt: serverTimestamp()
    });
  } catch (err) { console.error('forfeit failed:', err); }
  await writeDuelStats(finalData);
  teardown();
  goDashboard();
}

/** Called by app.js whenever the friend's presence changes. */
export function onFriendPresence(presence) {
  if (!d || !d.data) return;
  const status = d.data.status;
  if (status !== 'countdown' && status !== 'active') return;
  if (presence && presence.status === 'offline') {
    // Opponent disconnected — claim the win.
    updateDoc(d.ref, {
      status: 'completed',
      winnerId: me(),
      isDraw: false,
      endReason: 'forfeit',
      updatedAt: serverTimestamp()
    }).catch(err => console.error('presence forfeit failed:', err));
  }
}

function handleEnded(reason) {
  if (!d || d.ended) return;
  if (reason === 'cancelled') {
    toast(t('duel.toast.cancelled'), 'info', 4000);
  }
  teardown();
  goDashboard();
}

function teardown() {
  if (!d) return;
  d.ended = true;
  if (d.unsub) d.unsub();
  stopTick();
  clearStallWatchdog();
  clearTimeout(d.hostRoundTimer);
  clearTimeout(d.hostAdvanceTimer);
  setOverlay('duel-countdown', false);
  setOverlay('duel-results', false);
  setOverlay('duel-stall', false);
  d = null;
}

/** Public cleanup for logout / navigation. */
export function cleanupDuel() {
  teardown();
}

function goDashboard() {
  document.dispatchEvent(new CustomEvent('hq:gohome'));
}

export function playAgainDuel() {
  // Rematch: leave this duel and re-open the duel setup with the same chars.
  teardown();
  document.dispatchEvent(new CustomEvent('hq:duel-rematch'));
}

// ============================================
// STALL WATCHDOG
// ============================================

function armStallWatchdog() {
  clearStallWatchdog();
  // A fresh snapshot proves the connection is alive — clear any stall warning.
  setOverlay('duel-stall', false);
  if (!d) return;
  d.stallTimer = setTimeout(() => {
    if (d && d.data && (d.data.status === 'active' || d.data.status === 'countdown')) {
      setOverlay('duel-stall', true);
    }
  }, STALL_MS);
}

function clearStallWatchdog() {
  if (d && d.stallTimer) { clearTimeout(d.stallTimer); d.stallTimer = null; }
}

export async function resolveStall() {
  // User chose to leave a stalled duel — claim the win and go.
  setOverlay('duel-stall', false);
  if (d && d.data && d.ref) {
    // Same as the forfeit path: we leave without showResults, so record
    // the (winning) result here or it never reaches the W–L stat.
    const finalData = { ...d.data, status: 'completed', winnerId: me(), isDraw: false, endReason: 'forfeit' };
    try {
      await updateDoc(d.ref, {
        status: 'completed', winnerId: me(), isDraw: false,
        endReason: 'forfeit', updatedAt: serverTimestamp()
      });
    } catch (err) { console.error('resolveStall failed:', err); }
    await writeDuelStats(finalData);
  }
  teardown();
  goDashboard();
}

// ============================================
// HELPERS
// ============================================

// kana vs vocab (see engine.js setKind rationale): distractors must come from
// the question's own kind or they're trivially eliminable.
function setKind(set) {
  return set.type === 'vocab' ? 'vocab' : 'kana';
}

function buildCharPool() {
  const all = [];
  state.contentSets.forEach(set => {
    const kind = setKind(set);
    (set.characters || []).forEach(c => {
      if (state.selectedChars.has(c.char) && !all.find(x => x.char === c.char)) {
        all.push({ char: c.char, romaji: (c.romaji || '').toLowerCase(), kind });
      }
    });
  });
  return all;
}

function allRomaji() {
  const pools = { kana: new Set(), vocab: new Set() };
  state.contentSets.forEach(set => {
    const kind = setKind(set);
    (set.characters || []).forEach(c => {
      if (c.romaji) pools[kind].add(c.romaji.toLowerCase());
    });
  });
  return { kana: [...pools.kana], vocab: [...pools.vocab] };
}

function buildQuestions(chars, inputMethod) {
  const pool = allRomaji();
  const questions = [];
  let bag = [];
  for (let i = 0; i < QUESTION_COUNT; i++) {
    if (bag.length === 0) bag = shuffle(chars);
    const c = bag.shift();
    const q = { char: c.char, romaji: c.romaji, choices: null };
    if (inputMethod === 'multiple') {
      // Same-kind distractors first (kana readings for kana, words for words);
      // top up cross-kind only if the same-kind pool can't fill 3.
      const kind = c.kind || 'kana';
      const sameKind = (pool[kind] || []).filter(r => r !== c.romaji);
      let distractors = shuffle(sameKind).slice(0, 3);
      if (distractors.length < 3) {
        const other = kind === 'kana' ? 'vocab' : 'kana';
        const rest = (pool[other] || []).filter(r => r !== c.romaji && !distractors.includes(r));
        distractors = distractors.concat(shuffle(rest).slice(0, 3 - distractors.length));
      }
      q.choices = shuffle([c.romaji, ...distractors]);
    }
    questions.push(q);
  }
  return questions;
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
  if (!d || !d.data) return t('duel.your_friend');
  const oppId = otherId(d.data);
  return d.data.players?.[oppId]?.displayName || t('duel.your_friend');
}

function showLobby(statusText, detailText) {
  showScreen('screen-lobby');
  const title = $('lobby-title');
  const s = $('lobby-status');
  const det = $('lobby-detail');
  if (title) title.textContent = t('duel.lobby_title');
  if (s) s.textContent = statusText;
  if (det) det.textContent = detailText || '';
}

function setOverlay(id, on) {
  const el = $(id);
  if (el) el.classList.toggle('active', on);
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
