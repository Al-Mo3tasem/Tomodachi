// ============================================
// HiraQuest — Leaderboards
// Denormalized strategy: one document per (gameType + bracket) holding
// the top-10 entries, so reads are a single O(1) document fetch that
// never slows down as game history grows. Full game_sessions remain
// the audit source of truth (written separately by game.js).
// ============================================

import { state, $, showScreen, toast } from './core.js?v=20260522';
import { db, doc, getDoc, setDoc } from './firebase.js?v=20260522';

// Character-count brackets (from the Master Plan scoring spec).
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

/**
 * Submit a Survival Rush score. Reads the bracket document, inserts the
 * new entry, keeps the top 10, and writes it back.
 * @returns {Promise<number|null>} the player's rank, or null on failure.
 */
export async function submitSurvivalScore({ score, characterCount }) {
  if (!state.user) return null;
  const bracket = bracketFor(characterCount);
  const ref = doc(db, 'leaderboards', `survival_${bracket}`);

  let entries = [];
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) entries = snap.data().entries || [];
  } catch (err) {
    console.error('Leaderboard read failed:', err);
  }

  const mine = {
    userId: state.user.uid,
    username: state.userData?.username || 'player',
    displayName: state.userData?.displayName || 'Player',
    avatarEmoji: state.userData?.avatarEmoji || '🌸',
    score: Math.round(score),
    characterCount,
    at: Date.now()
  };

  entries.push(mine);
  entries.sort((a, b) => b.score - a.score);
  const rank = entries.indexOf(mine) + 1;
  entries = entries.slice(0, MAX_ENTRIES);

  try {
    await setDoc(ref, { gameType: 'survival', bracket, entries }, { merge: true });
  } catch (err) {
    console.error('Leaderboard write failed:', err);
    return null;
  }

  localStorage.setItem('hiraquest-last-bracket', String(bracket));
  return rank;
}

/** Fetch the entries array for a given bracket. */
export async function fetchLeaderboard(bracket) {
  const ref = doc(db, 'leaderboards', `survival_${bracket}`);
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().entries || [] : [];
  } catch (err) {
    console.error('Leaderboard fetch failed:', err);
    return [];
  }
}

const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

/** Render the compact top-3 preview on the dashboard. */
export async function renderLeaderboardPreview() {
  const host = $('lb-preview');
  if (!host) return;
  const bracket = Number(localStorage.getItem('hiraquest-last-bracket')) || 10;
  const entries = await fetchLeaderboard(bracket);

  if (!entries.length) {
    host.innerHTML = '<p class="empty-state">Play Survival Rush to climb the ranks!</p>';
    return;
  }

  host.innerHTML = `<div class="lb-preview-tag">${bracketLabel(bracket)}</div>`;
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

/** Open and populate the full leaderboard screen. */
export async function openLeaderboard() {
  showScreen('screen-leaderboard');
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
  const startBracket = Number(localStorage.getItem('hiraquest-last-bracket')) || 10;
  selectBracket(startBracket);
}

async function selectBracket(bracket) {
  document.querySelectorAll('.lb-tab').forEach(t => {
    t.classList.toggle('active', Number(t.dataset.bracket) === bracket);
  });
  const list = $('lb-list');
  if (!list) return;
  list.innerHTML = '<p class="empty-state">Loading rankings…</p>';

  const entries = await fetchLeaderboard(bracket);
  if (!entries.length) {
    list.innerHTML = '<p class="empty-state">No scores in this bracket yet. Be the first!</p>';
    return;
  }

  list.innerHTML = '';
  entries.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row';
    if (e.userId === state.user?.uid) row.classList.add('lb-row-me');
    const date = e.at ? new Date(e.at).toLocaleDateString() : '';
    row.innerHTML = `
      <span class="lb-rank lb-rank-${i + 1}">${medal(i + 1)}</span>
      <span class="lb-avatar">${e.avatarEmoji || '🌸'}</span>
      <div class="lb-name-block">
        <span class="lb-name">${escapeHtml(e.displayName || e.username)}</span>
        <span class="lb-date">${date}</span>
      </div>
      <span class="lb-score">${e.score.toLocaleString()}</span>
    `;
    list.appendChild(row);
  });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
