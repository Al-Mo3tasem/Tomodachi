// ============================================
// Tomodachi — recent game sessions (game_sessions)
//
//   loadRecentGames({ force })  → Promise<Session[]>  completed sessions, newest first
//   recentGames()               → Session[] | null     the cached list (null before the first load)
//   lastSoloSession()           → Session | null       newest completed Survival run
//
// One query shared by Me › Recent history (app.js) and the Practice tab's
// last-run card. Cached for 60 s like Home; 'tomo:activity' (anything that
// changes progress) invalidates it so a finished game shows up at once.
// Each session gets `at` (ms) from its server timestamp for sorting/dates.
// ============================================

import { state } from '../core/core.js?v=20260911c';
import { db, collection, query, where, limit, getDocs } from './firebase.js?v=20260911c';

const TTL_MS = 60000;
const QUERY_LIMIT = 20;

let cache = null;
let loadedAt = 0;
let inflight = null;
let cachedFor = null;   // uid the cache belongs to
let gen = 0;            // bumped by every invalidation, so a result that started
                        // before it is discarded instead of pinning stale rows

if (typeof document !== 'undefined') {
  document.addEventListener('tomo:activity', () => { loadedAt = 0; gen++; });
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return new Date(ts).getTime() || 0;
}

/** Completed sessions the signed-in user took part in, newest first. */
export async function loadRecentGames({ force = false } = {}) {
  const uid = state.user && state.user.uid;
  if (!uid) { cache = null; cachedFor = null; return []; }
  if (cachedFor !== uid) { cache = null; loadedAt = 0; cachedFor = uid; gen++; }
  if (!force && cache && Date.now() - loadedAt < TTL_MS) return cache;
  if (force) gen++;                       // a forced read must not adopt an in-flight stale one
  else if (inflight) return inflight;
  const myGen = gen;
  inflight = (async () => {
    const snap = await getDocs(query(
      collection(db, 'game_sessions'),
      where('playerIds', 'array-contains', uid),
      limit(QUERY_LIMIT),
    ));
    // Only genuinely finished games: abandoned or declined challenges carry no
    // result and would otherwise read as phantom losses.
    const games = [];
    snap.forEach((d) => {
      const s = d.data();
      if (s.status === 'completed') games.push({ id: d.id, ...s, at: toMillis(s.createdAt) });
    });
    games.sort((a, b) => b.at - a.at);
    // a newer invalidation landed while this was in flight: return the rows but
    // leave the cache cold so the next reader refetches
    if (myGen === gen && cachedFor === uid) { cache = games; loadedAt = Date.now(); }
    return games;
  })().finally(() => { inflight = null; });
  return inflight;
}

/** The signed-in user's cached list, or null (never another account's rows). */
export function recentGames() {
  const uid = state.user && state.user.uid;
  return uid && cachedFor === uid ? cache : null;
}

/**
 * Newest completed solo run. Only Survival writes a game_sessions document
 * today (js/games/engine.js saveSession), so a Zen-only player has no last run
 * and the card stays hidden rather than showing a stale Survival score.
 */
export function lastSoloSession() {
  return (recentGames() || []).find((s) => s.gameType === 'survival') || null;
}

/** Sign-out: drop the rows so the next account never sees them. */
export function resetHistory() { cache = null; loadedAt = 0; cachedFor = null; gen++; }
