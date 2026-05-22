// ============================================
// HiraQuest — Leaderboards
// Denormalized strategy: one document per (gameType + bracket) holding
// the top-10 entries — reads are a single O(1) fetch that never slows
// as history grows. Covers Survival Rush (solo) and Sync Match (co-op).
// ============================================

import { state, $, showScreen } from './core.js?v=20260524';
import { db, doc, getDoc, setDoc } from './firebase.js?v=20260524';

export const BRACKETS = [5, 10, 15, 25, 46];
const MAX_ENTRIES = 10;

/** Map any character count to its leaderboard bracket. */
export function bracketFor(count) {
  for (const b of BRACKETS) {
    if (count <= b) return b;
  }
  return 46;
}

function bracketLabel(bracket) {
  return bracket === 46 ? 'Full 46' : `${bracket} chars`;
}

// ----- Generic write -----

async function submitEntry(gameType, bracket, entry) {
  const ref = doc(db, 'leaderboards', `${gameType}_${bracket}`);
  let entries = [];
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) entries = snap.data().entries || [];
  } catch (err) {
    console.error('Leaderboard read failed:', err);
  }

  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  const rank = entries.indexOf(entry) + 1;
  entries = entries.slice(0, MAX_ENTRIES);

  try {
    await setDoc(ref, { gameType, bracket, entries }, { merge: true });
  } catch (err) {
    console.error('Leaderboard write failed:', err);
    return null;
  }
  return rank;
}

/** Submit a Survival Rush score. Returns the player's rank, or null. */
export async function submitSurvivalScore({ score, characterCount }) {
  if (!state.user) return null;
  const bracket = bracketFor(characterCount);
  localStorage.setItem('hiraquest-last-bracket', String(bracket));
  return submitEntry('survival', bracket, {
    userId: state.user.uid,
    username: state.userData?.username || 'player',
    displayName: state.userData?.displayName || 'Player',
    avatarEmoji: state.userData?.avatarEmoji || '🌸',
    score: Math.round(score),
    characterCount,
    at: Date.now()
  });
}

/** Submit a Sync Match (co-op) team score. */
export async function submitCoopScore({ score, characterCount, playerIds, players }) {
  const bracket = bracketFor(characterCount);
  return submitEntry('coop', bracket, {
    playerIds: playerIds || [],
    players: (players || []).map(p => ({
      displayName: p.displayName || 'Player',
      avatarEmoji: p.avatarEmoji || '🌸'
    })),
    score: Math.round(score),
    characterCount,
    at: Date.now()
  });
}

/** Remove a user's entries from every bracket of both game types. */
export async function removeUserFromLeaderboards(uid) {
  for (const gameType of ['survival', 'coop']) {
    for (const b of BRACKETS) {
      const ref = doc(db, 'leaderboards', `${gameType}_${b}`);
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) continue;
        const entries = (snap.data().entries || []).filter(e => (
          gameType === 'coop'
            ? !(e.playerIds || []).includes(uid)
            : e.userId !== uid
        ));
        await setDoc(ref, { entries }, { merge: true });
      } catch (err) {
        console.error('Leaderboard cleanup failed:', gameType, b, err);
      }
    }
  }
}

async function fetchLeaderboard(gameType, bracket) {
  const ref = doc(db, 'leaderboards', `${gameType}_${bracket}`);
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().entries || [] : [];
  } catch (err) {
    console.error('Leaderboard fetch failed:', err);
    return [];
  }
}

const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

// ----- Dashboard preview (Survival) -----

export async function renderLeaderboardPreview() {
  const host = $('lb-preview');
  if (!host) return;
  const bracket = Number(localStorage.getItem('hiraquest-last-bracket')) || 10;
  const entries = await fetchLeaderboard('survival', bracket);

  if (!entries.length) {
    host.innerHTML = '<p class="empty-state">Play Survival Rush to climb the ranks!</p>';
    return;
  }

  host.innerHTML = `<div class="lb-preview-tag">Survival · ${bracketLabel(bracket)}</div>`;
  entries.slice(0, 3).forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row lb-row-compact';
    if (e.userId === state.user?.uid) row.classList.add('lb-row-me');
    row.innerHTML = `
      <span class="lb-rank">${medal(i + 1)}</span>
      <span class="lb-avatar">${e.avatarEmoji || '🌸'}</span>
      <span class="lb-name">${escapeHtml(e.displayName || e.username)}</span>
      <span class="lb-score">${e.score.toLocaleString()}</span>
    `;
    host.appendChild(row);
  });
}

// ----- Full leaderboard screen -----

let lbMode = 'survival';
let lbBracket = 10;

export async function openLeaderboard() {
  showScreen('screen-leaderboard');

  const modes = $('lb-modes');
  if (modes && !modes.dataset.built) {
    modes.innerHTML = '';
    [
      { id: 'survival', label: '🔥 Survival' },
      { id: 'coop', label: '🤝 Co-op' }
    ].forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'lb-mode-tab';
      btn.dataset.mode = m.id;
      btn.textContent = m.label;
      btn.addEventListener('click', () => selectMode(m.id));
      modes.appendChild(btn);
    });
    modes.dataset.built = '1';
  }

  const tabs = $('lb-brackets');
  if (tabs && !tabs.dataset.built) {
    tabs.innerHTML = '';
    BRACKETS.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'lb-tab';
      btn.dataset.bracket = String(b);
      btn.textContent = bracketLabel(b);
      btn.addEventListener('click', () => selectBracket(b));
      tabs.appendChild(btn);
    });
    tabs.dataset.built = '1';
  }

  lbBracket = Number(localStorage.getItem('hiraquest-last-bracket')) || 10;
  selectMode('survival');
}

function selectMode(mode) {
  lbMode = mode;
  document.querySelectorAll('.lb-mode-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });
  renderBoard();
}

function selectBracket(bracket) {
  lbBracket = bracket;
  renderBoard();
}

async function renderBoard() {
  document.querySelectorAll('.lb-tab').forEach(t => {
    t.classList.toggle('active', Number(t.dataset.bracket) === lbBracket);
  });
  const list = $('lb-list');
  if (!list) return;
  list.innerHTML = '<p class="empty-state">Loading rankings…</p>';

  const entries = await fetchLeaderboard(lbMode, lbBracket);
  if (!entries.length) {
    list.innerHTML = '<p class="empty-state">No scores in this bracket yet. Be the first!</p>';
    return;
  }

  list.innerHTML = '';
  entries.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row';
    const date = e.at ? new Date(e.at).toLocaleDateString() : '';

    if (lbMode === 'coop') {
      if ((e.playerIds || []).includes(state.user?.uid)) row.classList.add('lb-row-me');
      const players = e.players || [];
      const avatars = players.map(p => `<span class="lb-avatar">${p.avatarEmoji || '🌸'}</span>`).join('');
      const names = players.map(p => escapeHtml(p.displayName || 'Player')).join(' & ') || 'Team';
      row.innerHTML = `
        <span class="lb-rank lb-rank-${i + 1}">${medal(i + 1)}</span>
        <span class="lb-avatars">${avatars}</span>
        <div class="lb-name-block">
          <span class="lb-name">${names}</span>
          <span class="lb-date">${date}</span>
        </div>
        <span class="lb-score">${e.score.toLocaleString()}</span>
      `;
    } else {
      if (e.userId === state.user?.uid) row.classList.add('lb-row-me');
      row.innerHTML = `
        <span class="lb-rank lb-rank-${i + 1}">${medal(i + 1)}</span>
        <span class="lb-avatar">${e.avatarEmoji || '🌸'}</span>
        <div class="lb-name-block">
          <span class="lb-name">${escapeHtml(e.displayName || e.username)}</span>
          <span class="lb-date">${date}</span>
        </div>
        <span class="lb-score">${e.score.toLocaleString()}</span>
      `;
    }
    list.appendChild(row);
  });
}
