// ============================================
// Tomodachi — friends data (batch 6)
//
//   loadFriends()                 → [{ uid, username, displayName, avatarEmoji }]
//   watchPresence(uids, onChange) → unsubscribe; onChange(uid, presence) per doc
//
// Wraps today's single-friend prototype (every other user is "the friend")
// behind the shape the Friends tab will need (batch 11), and scopes the
// presence listener to the friends' documents instead of the whole
// collection — reads stay proportional to the friend list.
// ============================================

import { db, collection, getDocs, query, where, documentId, onSnapshot } from './firebase.js?v=20260906g';
import { state } from '../core/core.js?v=20260906g';

const IN_LIMIT = 30;   // Firestore 'in' clause cap

/** Everyone but me, as friends (prototype). */
export async function loadFriends() {
  if (!state.user) return [];
  const snap = await getDocs(collection(db, 'users'));
  const out = [];
  snap.forEach((u) => {
    if (u.id === state.user.uid) return;
    const d = u.data() || {};
    out.push({ uid: u.id, username: d.username || '', displayName: d.displayName || d.username || '', avatarEmoji: d.avatarEmoji || '🌸' });
  });
  return out;
}

/**
 * Presence for a bounded set of users (documentId() in [...]). Chunks of 30.
 * @returns {() => void} unsubscribe for every chunk
 */
export function watchPresence(uids, onChange, onError = null) {
  const ids = [...new Set((uids || []).filter(Boolean))];
  if (!ids.length) return () => {};
  const unsubs = [];
  for (let i = 0; i < ids.length; i += IN_LIMIT) {
    const chunk = ids.slice(i, i + IN_LIMIT);
    const q = query(collection(db, 'presence'), where(documentId(), 'in', chunk));
    unsubs.push(onSnapshot(q, (snap) => {
      snap.docChanges().forEach((ch) => {
        if (ch.type === 'removed') onChange(ch.doc.id, null);
        else onChange(ch.doc.id, ch.doc.data());
      });
    }, (err) => { if (onError) onError(err); else console.error('Presence listener failed:', err); }));
  }
  return () => { for (const u of unsubs) { try { u(); } catch (_e) { /* ignore */ } } };
}
