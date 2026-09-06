// ============================================
// Tomodachi — user document writes (batch 6)
//
//   writeActivity(kind)  → increments users/{uid}.activity['YYYY-MM-DD']
//
// Feeds the Home heatmap. One counter per local calendar day; the kind
// ('lesson' | 'review' | 'game') is kept in activityKinds for later tiles.
// Own-document updates are already allowed by the rules
// (docs/Firestore_Rules.md · users). Never throws into UI code; gated by the
// nativeShell feature so v1/prod stays write-identical until the flip.
// ============================================

import { db, doc, updateDoc, increment } from './firebase.js?v=20260906g';
import { state } from '../core/core.js?v=20260906g';
import { isEnabled } from '../config/features.js?v=20260906g';

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** @param {'lesson'|'review'|'game'} kind */
export async function writeActivity(kind) {
  // Home's 60 s cache must refetch after anything that changes progress, on every shell.
  try { document.dispatchEvent(new CustomEvent('tomo:activity', { detail: { kind } })); } catch (_e) { /* no DOM */ }
  if (!state.user || !isEnabled('nativeShell')) return false;
  const day = todayKey();
  // optimistic local copy so the heatmap moves before the round-trip
  const activity = { ...((state.userData && state.userData.activity) || {}) };
  activity[day] = (Number(activity[day]) || 0) + 1;
  state.userData = { ...(state.userData || {}), activity };
  try {
    await updateDoc(doc(db, 'users', state.user.uid), {
      [`activity.${day}`]: increment(1),
      [`activityKinds.${day}.${kind}`]: increment(1),
    });
    return true;
  } catch (err) {
    console.warn('[users] activity write failed:', err && err.message);
    return false;
  }
}
