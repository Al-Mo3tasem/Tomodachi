// ============================================
// Tomodachi — Leaderboards
// Denormalized strategy: one document per (gameType + bracket) holding
// the top-10 entries — reads are a single O(1) fetch that never slows
// as history grows. Covers Survival Rush (solo) and Sync Match (co-op).
// ============================================

import { state, $, showScreen } from '../core/core.js?v=20260723b';
import { db, doc, getDoc, setDoc } from './firebase.js?v=20260723b';
import { t } from '../i18n/index.js?v=20260723b';

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
  return bracket === 46 ? t('leaderboard.bracket_full') : t('leaderboard.bracket_chars', { count: bracket });
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
  localStorage.setItem('tomodachi-last-bracket', String(bracket));
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
  const bracket = Number(localStorage.getItem('tomodachi-last-bracket')) || 10;
  const entries = await fetchLeaderboard('survival', bracket);

  if (!entries.length) {
    host.innerHTML = `<p class="empty-state" data-i18n="leaderboard.preview_cta">${t('leaderboard.preview_cta')}</p>`;
    return;
  }

  host.innerHTML = `<div class="lb-preview-tag">${t('leaderboard.preview_tag', { bracket: bracketLabel(bracket) })}</div>`;
  entries.slice(0, 3).forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row lb-row-compact';
    if (e.userId === state.user?.uid) row.classList.add('lb-row-me');
    row.innerHTML = `
      <span class="lb-rank">${medal(i + 1)}</span>
      <span class="lb-avatar">${escapeHtml(e.avatarEmoji || '🌸')}</span>
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

  // Rebuilt on every open (not cached) so a locale switch between visits
  // re-renders tab labels in the new language. The data-i18n attribute on
  // mode tabs additionally covers mid-screen locale switches via apply.js.
  const modes = $('lb-modes');
  if (modes) {
    modes.innerHTML = '';
    [
      { id: 'survival', key: 'leaderboard.mode_survival' },
      { id: 'coop', key: 'leaderboard.mode_coop' }
    ].forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'lb-mode-tab';
      btn.dataset.mode = m.id;
      btn.setAttribute('data-i18n', m.key);
      btn.textContent = t(m.key);
      btn.addEventListener('click', () => selectMode(m.id));
      modes.appendChild(btn);
    });
  }

  const tabs = $('lb-brackets');
  if (tabs) {
    tabs.innerHTML = '';
    BRACKETS.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'lb-tab';
      btn.dataset.bracket = String(b);
      btn.textContent = bracketLabel(b);
      btn.addEventListener('click', () => selectBracket(b));
      tabs.appendChild(btn);
    });
  }

  lbBracket = Number(localStorage.getItem('tomodachi-last-bracket')) || 10;
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
  list.innerHTML = `<p class="empty-state">${t('leaderboard.loading')}</p>`;

  const entries = await fetchLeaderboard(lbMode, lbBracket);
  if (!entries.length) {
    list.innerHTML = `<p class="empty-state">${t('leaderboard.empty_bracket')}</p>`;
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
      const avatars = players.map(p => `<span class="lb-avatar">${escapeHtml(p.avatarEmoji || '🌸')}</span>`).join('');
      const names = players.map(p => escapeHtml(p.displayName || t('nav.user_default_name'))).join(' & ') || t('leaderboard.team_fallback');
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
        <span class="lb-avatar">${escapeHtml(e.avatarEmoji || '🌸')}</span>
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
