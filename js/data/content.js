// ============================================
// Tomodachi — v2.0 content loader (feature-flagged bridge)
// Reads authored per-item docs from content_sets/{type}/items/{key} and adapts
// them (via the pure transform) to the legacy set shape the engine consumes.
// This is the content→game bridge for the L2 reachability gap; see
// docs/L2-content-reachability-PROPOSAL.md.
//
// FLAG: enabled ONLY when getEnv() === 'dev' (i.e. localhost). The deployed
// site resolves to 'staging'/'prod' and keeps the legacy top-level read — one
// static bundle serves every environment, so the flag, not the deploy, gates
// behaviour. Turning it on for prod is a deliberate later change gated on the
// §4.16 rules being live in prod + a mastery/distractor follow-up.
//
// REQUIRES the §4.16 Firestore rule (authenticated read of
// content_sets/{type}/items). Until that rule is deployed, getDocs throws
// permission-denied; loadV2ContentSets swallows it and returns [] so the
// caller falls back to the legacy loader — it must NEVER throw.
// ============================================

import { getEnv } from '../config/firebase.js?v=20260726a';
import { db, collection, getDocs } from './firebase.js?v=20260726a';
import { KANA_TYPES, groupKanaItems, groupVocabItems } from './content-transform.js?v=20260726a';

// Per-environment flag. Default OFF everywhere except localhost dev.
export function contentV2Enabled() {
  return getEnv() === 'dev';
}

// Read + adapt the kana content sets. Resolves to [] on any read failure
// (permission-denied when rules aren't live, offline, etc.) so the caller
// can fall back to the legacy read. Never throws.
export async function loadV2ContentSets() {
  const out = [];
  for (const type of KANA_TYPES) {
    let snap;
    try {
      snap = await getDocs(collection(db, 'content_sets', type, 'items'));
    } catch (err) {
      console.error(`[content-v2] read failed for ${type} (rules not deployed?):`, err);
      return []; // hard fail → let the caller use the legacy loader
    }
    const items = [];
    snap.forEach(d => items.push(d.data()));
    const sets = groupKanaItems(type, items);
    if (!sets.length) {
      // A kana type resolved with ZERO sets (unauthored / mid phased-rollout).
      // Do NOT ship a partial catalog that silently drops a whole syllabary —
      // bail so app.js falls back to the legacy read (which has full coverage).
      console.warn(`[content-v2] "${type}" produced no sets; falling back to legacy to avoid a partial catalog`);
      return [];
    }
    out.push(...sets);
  }

  // Vocab: optional extra. Kana is the completeness bar (the legacy fallback
  // only has kana anyway) — an empty/failed vocab read logs and ships kana-only
  // rather than throwing away a perfectly good kana catalog.
  try {
    const snap = await getDocs(collection(db, 'content_sets', 'vocab', 'items'));
    const items = [];
    snap.forEach(d => items.push(d.data()));
    const vocabSets = groupVocabItems(items);
    if (vocabSets.length) out.push(...vocabSets);
    else console.warn('[content-v2] vocab produced no sets; continuing kana-only');
  } catch (err) {
    console.error('[content-v2] vocab read failed; continuing kana-only:', err);
  }

  out.sort((a, b) => a.order - b.order);
  return out;
}
