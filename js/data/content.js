// ============================================
// Tomodachi — v2.0 content loader (feature-flagged bridge)
// Reads authored per-item docs from content_sets/{type}/items/{key} and adapts
// them (via the pure transform) to the legacy set shape the engine consumes.
// This is the content→game bridge for the L2 reachability gap; see
// docs/L2-content-reachability-PROPOSAL.md.
//
// FLAG: ON everywhere since GO-LIVE 2026-08-02 (lead's call). Prerequisites
// that were met before flipping: §4.16 read rules published on dev AND prod;
// prod seeded with the verified 1,302-doc corpus; distractor kind-scoping,
// survival kana-guard, and the D4-A progress display all shipped.
// KILL-SWITCH: return getEnv() === 'dev' and redeploy with a cache bump —
// prod falls back to the legacy loader instantly.
//
// REQUIRES the §4.16 Firestore rule (authenticated read of
// content_sets/{type}/items). If the rule is ever missing, getDocs throws
// permission-denied; loadV2ContentSets swallows it and returns [] so the
// caller falls back to the legacy loader — it must NEVER throw.
// ============================================

import { getEnv } from '../config/firebase.js?v=20260802b';
import { getLocale } from '../i18n/index.js?v=20260802b';
import { db, collection, getDocs } from './firebase.js?v=20260802b';
import { KANA_TYPES, groupKanaItems, groupVocabItems } from './content-transform.js?v=20260802b';

// GO-LIVE 2026-08-02: v2 content + the 151-lesson course, all environments.
export function contentV2Enabled() {
  return true;
}

// ----- Session cache -----
// A cold v2 load reads ~560 item docs (kana 208 + vocab 352); the lesson
// catalog adds 151 more. Cache the RAW doc arrays per asset-version + env in
// sessionStorage (per-tab, survives reloads, dies with the tab) with a 1h TTL
// so repeated reloads don't re-bill Firestore. Raw items — not transformed
// sets — so locale-dependent shaping still happens per load.
const CACHE_VERSION = new URL(import.meta.url).searchParams.get('v') || 'dev';
const CACHE_TTL_MS = 60 * 60 * 1000;

export function cacheGet(name) {
  try {
    const raw = sessionStorage.getItem(`tomodachi-v2-${name}-${getEnv()}-${CACHE_VERSION}`);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    if (Date.now() - at > CACHE_TTL_MS) return null;
    return data;
  } catch (_e) { return null; }
}

export function cachePut(name, data) {
  try {
    sessionStorage.setItem(`tomodachi-v2-${name}-${getEnv()}-${CACHE_VERSION}`,
      JSON.stringify({ at: Date.now(), data }));
  } catch (_e) { /* quota — cache is best-effort */ }
}

// Read + adapt the kana content sets. Resolves to [] on any read failure
// (permission-denied when rules aren't live, offline, etc.) so the caller
// can fall back to the legacy read. Never throws.
async function fetchTypeItems(type) {
  const cached = cacheGet(`items-${type}`);
  if (cached) return cached;
  const snap = await getDocs(collection(db, 'content_sets', type, 'items'));
  const items = [];
  snap.forEach(d => items.push(d.data()));
  cachePut(`items-${type}`, items);
  return items;
}

export async function loadV2ContentSets() {
  const out = [];
  for (const type of KANA_TYPES) {
    let items;
    try {
      items = await fetchTypeItems(type);
    } catch (err) {
      console.error(`[content-v2] read failed for ${type} (rules not deployed?):`, err);
      return []; // hard fail → let the caller use the legacy loader
    }
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
    const items = await fetchTypeItems('vocab');
    const vocabSets = groupVocabItems(items, getLocale() === 'ar');
    if (vocabSets.length) out.push(...vocabSets);
    else console.warn('[content-v2] vocab produced no sets; continuing kana-only');
  } catch (err) {
    console.error('[content-v2] vocab read failed; continuing kana-only:', err);
  }

  out.sort((a, b) => a.order - b.order);
  return out;
}
