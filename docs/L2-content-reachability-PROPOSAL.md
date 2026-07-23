# L2 Content Reachability — Migration Proposal (recon output)

**Status:** PROPOSAL. Recon complete and adversarially verified; **not** an enacted plan.
Requires a lead decision + approval per `PROJECT_RULES.md §2.6` before any build/migration.
**Date:** 2026-07-23. **Author:** Claude (multi-agent recon + adversarial verification).

---

## 1. The gap — CONFIRMED (from source, not assumption)

- **The game client reads** top-level docs of the `content_sets` collection via a single
  unfiltered `getDocs(collection(db,'content_sets'))` ([js/app.js:825](js/app.js#L825)), with
  **no** subcollection traversal and **no** query filter. It treats each doc as
  `{ id, name?, order?, characters: [{ char, romaji }] }`.
- **The authoring pipeline writes** per-item docs at the **subcollection** path
  `content_sets/{type}/items/{key}` ([scripts/lib/admin.js:99](scripts/lib/admin.js#L99)),
  with rich per-type schemas.
- A shallow top-level collection query **never returns subcollection docs**, so the authored
  corpus is *structurally invisible* to the client. The only client-reachable content today is
  the **10 hand-seeded legacy hiragana rows** (46 kana) from
  [scripts/tmp/seed-dev-game-sets.mjs](scripts/tmp/seed-dev-game-sets.mjs), whose own header
  documents this exact gap.
- **No bridge exists** — no Cloud Function aggregates per-item docs into set docs; the
  planned `scripts/migrate_v1_to_v2.js` does not exist.

> ⚠️ **Deployed state is an open question.** The above is proven from source. What is *actually
> live* in `tomodachi-dev` / `tomodachi-prod` (which docs exist, the live rules text) requires a
> live read — see Step 0. **prod** historically routed to the decommissioned `hiraquest0` project
> and may carry pre-existing content docs produced by no script in this repo.

## 2. Authored content inventory (real repo counts)

| Type | Count | Game-ready as `{char, romaji}`? |
|---|---|---|
| hiragana | 104 | ✅ `glyph`→char, `romaji`→romaji; groupable by `row` |
| katakana | 104 | ✅ same shape |
| vocab | 681 (353 category + 328 tail) | ✅ `japanese`→char, `romaji`→romaji |
| kanji | 103 | ⚠️ **No** romaji (readings stored as kana). NOT drop-in — needs a chosen reading + kana→romaji transliteration (no repo code does this) or becomes a meaning-quiz |
| grammar | 54 | ❌ not expressible as `{char, romaji}` |
| listening / radicals | 0 authored | — |

**Total authored ≈ 1046 items** (pre-tail 718, matching "718 on dev" in git history).
The 328 vocab tail + ~179 QA fixes are **staged locally; push-to-dev status UNVERIFIED.**

## 3. Client contract (what the game actually needs)

Gameplay (engine/duel/coop) consumes **only** `char` + `romaji` per character. `name`/`order`
are used by the selection UI only. **Audio, mnemonics, bilingual fields, isActive, category,
jlpt, difficulty are never read** — pronunciation is generated at runtime by browser
`SpeechSynthesis` from the glyph ([js/audio/audio.js:49](js/audio/audio.js#L49)), not from any
stored audio field.

## 4. What the adversarial verification changed (important)

The first-pass synthesis recommended a client-adapter ("Option B") justified as a "stepping
stone to v2.0." Four adversarial reviewers **confirmed the gap is real** but found the
recommendation's rationale overstated and surfaced **mandatory fixes the synthesis missed**:

1. **The read rule is already locked, not a new decision.** Master Plan **§4.16** (line 629)
   already specifies the canonical rule — see Appendix A. It is merely **undeployed**. No
   `collectionGroup` / composite index is needed (that risk was self-inflicted).
2. **Kanji is NOT game-ready.** No `romaji` exists in kanji data. So any `{char,romaji}` bridge
   realistically serves **kana + vocab only** — kanji's supposed availability was B's headline
   edge over the cheaper Option A, and it doesn't hold.
3. **Distractor-pool defect (engine change required).** Multiple-choice/Listen distractors are
   drawn from the **entire loaded content universe**, not the active selection. Loading
   kana+vocab into one `state.contentSets` makes a kana question pull distractors from ~900 mixed
   romaji → incoherent options. "Leave the engine untouched" is therefore **false** for any
   option that surfaces more than one type at once.
4. **Live-user mastery regression.** `totalCharCount()` counts unique chars across **all** loaded
   sets ([js/app.js:917](js/app.js#L917)). Surfacing katakana+vocab balloons the denominator
   ~46 → ~900, collapsing every existing user's mastery % toward 0 on prod. This is an
   **immediate visible regression**, not a bracket edge case.
5. **One bundle, all environments.** The static bundle ships to dev *and* prod on the same
   `main` merge; only a runtime env-selector differs. A feature flag must be **per-environment,
   default OFF**, and the prod read-rule must be published **before** the flag is ever on for
   prod — else the prod content picker goes silently blank (permission-denied → empty).
6. **The real linchpin is unauthored.** The intended v2.0 model is **lesson-container-driven**
   (`content_sets/lessons/{lessonKey}` with `itemKeys[]` + `globalOrder`; Master Plan §4.2,
   LEARNING_EXPERIENCE §2.1–2.7). Those containers **do not exist yet**. An interim loader that
   invents its own row/category grouping builds a **throwaway taxonomy** that L2.13 discards.

## 5. Mandatory same-release fixes (apply to ANY option that surfaces >hiragana)

- **Scope distractor pools** to the active selection / content-type (engine change).
- **Scope the mastery denominator** per active track/type (remove the `|| 46` fallback as a
  correctness fix, verify dashboard numbers in dev before prod).
- **Per-environment feature flag, default OFF**; publish the read-rule for an env before enabling
  the flag there.
- **Do NOT** design a new leaderboard bracket ladder — §4.14 supersedes brackets with XP boards
  (L2.18). Add only a defensive guard so counts >46 don't corrupt existing boards/mastery.

## 6. Options

| | Approach | Effort | Verdict |
|---|---|---|---|
| **A** | Build+seed derived legacy `content_sets/{setId}` docs from per-item data | Low (~days) | Fast but **entrenches the deprecated v1.0 flat model** (§4.14 slates it for deletion); duplicate-doc drift; realistically kana+vocab only; **danger:** a derived doc-id equal to a type name (e.g. `content_sets/vocab`) materializes a subcollection parent → malformed empty set in the client. Authored data itself stays safe (subcollections are independent of the parent doc). |
| **B** | In-client adapter reading the per-item subcollections directly | Medium (~1–2 wk) | Single source of truth, but the "stepping stone to v2.0 / reusable foundation" claim is **largely false** — its invented grouping is discarded at L2.13. Still entrenches v1.0 client-side read + grading + brackets. |
| **B′ (recommended)** | **Deploy §4.16 rules → author lesson containers → thin container-driven loader** | Medium+ | Nothing thrown away; groups game sets from the **authored lesson containers** (the real v2.0 artifact), not an invented taxonomy; unblocks kana+vocab now and feeds directly into L2.13. |
| **C** | Full v2.0 lesson program (L2.13–L2.15 + audio pipeline + user migration) | High (multi-wk) | Correct end-state; largest surface; lesson containers + `globalOrder` unauthored; higher risk against a live app. Propose as the follow-on program. |

## 7. Recommendation — **B′ (container-driven interim)**

The smallest path that unblocks katakana + vocab in-game **without creating throwaway work**:

1. **Deploy the canonical §4.16 read rules** (Appendix A) — no-regret; every v2.0 path needs them.
2. **Author the lesson-container docs** (`content_sets/lessons/{lessonKey}` with `itemKeys[]` +
   `globalOrder`) per the *already-locked* track structure (LEARNING_EXPERIENCE §2.1–2.7). This is
   a **content task**, far smaller than the full L2.13–15 build, and **100% reused** by v2.0.
3. **Thin loader** `js/data/content.js` that reads the authored containers and adapts
   kana+vocab to `{char,romaji}`, behind a **per-env, default-OFF** flag with fallback to the
   legacy loader.
4. **Exclude kanji + grammar** from the char/romaji game for now (semantic mismatch); surface
   them properly at L2.13–14.
5. Apply the §5 mandatory fixes in the same release.
6. **Fix the lessons-path bug** first (Appendix B) — it will throw the moment containers are authored.

If the priority is *fastest possible* katakana+vocab and throwaway is acceptable, a **scoped
Option B** (load one type at a time, per-type distractor pool + mastery) is the faster-but-discarded
alternative — an explicit speed-vs-alignment trade for the lead to make.

## 8. Sequenced steps (dev-first, reversible)

0. **LIVE dev read (read-only, no writes)** — resolve the open questions: which
   `content_sets/{type}/items/*` exist and their counts; whether legacy set docs exist; whether
   any materialized `content_sets/{type}` parent docs exist; whether the tail + QA fixes are
   pushed; the live deployed rules. *Requires `scripts/secrets/service-account.dev.json` (present,
   2379 bytes) — guarded to `project_id === tomodachi-dev` by [admin.js:81](scripts/lib/admin.js#L81).*
1. **Propose formally per §2.6** — lead confirms B′ vs A vs B vs C; update Phases_and_Tasks + Progress Log.
2. **Deploy §4.16 read rules** to dev (Appendix A); confirm an authenticated client can read the items path.
3. **Author lesson containers** with `globalOrder` (content task; per §2.1–2.7).
4. **Build the flagged container-driven loader** + the §5 engine/mastery fixes.
5. **Test locally against dev** with a real account; verify picker, gameplay, TTS, mastery math; screenshots.
6. **Deploy dark to prod** (per-env flag OFF); publish prod rules; verify picker unaffected with flag OFF.
7. **Enable prod flag** only after dev sign-off + separate lead approval; rollback = flag OFF (no DB change).
8. **Record** in Progress Log per §3.3; open Option C (L2.13–15) as the follow-on program.

## 9. Decisions & approvals needed from the lead

- **DECISION:** Option B′ (recommended) vs A vs scoped-B vs C.
- **APPROVAL (§2.6):** the connective work is un-started; must be proposed + reflected in the plan docs.
- **APPROVAL (§3.3):** read-path/schema change with data already written needs a documented, executed migration (before/after, counts, rollback).
- **DECISION:** kanji/grammar handling (exclude for now vs invest in a reading→romaji path).
- **DECISION + who applies it:** publishing the §4.16 rules (console-side, outside the harness).
- **CONFIRM:** is the 328-tail + ~179 QA fixes pushed to dev, or staged? (changes what the bridge surfaces.)
- **AUTHORIZE (optional, safe):** may I run the **read-only** dev inventory in Step 0 now? (key present; no writes.)

## 10. Risks

- Deployed state unknown → Step 0 must run before building.
- Without the §4.16 rule, the loader returns empty and the picker goes blank (the exact failure dev already hit).
- 46-glyph hardwiring corrupts leaderboards/mastery once selectable chars exceed 46 — guard required.
- TTS speaks the glyph string → multi-char vocab and (especially) kanji may pronounce poorly.
- One-bundle deploy → any loader/rules change reaches prod on merge; discipline (per-env flag + dev-first + rules-before-flag) is load-bearing.
- Content freshness: if tail/QA fixes aren't on dev, the bridge surfaces stale content; pushing them is itself lead/review-gated (§17.3, CONTENT_GUIDELINES §2.3).

---

## Appendix A — Canonical §4.16 read rules (already designed; undeployed)

```
match /content_sets/{contentType}/items/{itemKey} {
  allow read:  if request.auth != null;
  allow write: if false;   // Cloud Function service account bypasses rules
}
match /content_sets/lessons/{lessonKey} {
  allow read:  if request.auth != null;
  allow write: if false;
}
```

## Appendix B — Latent bug to fix before authoring lesson containers

[scripts/lib/admin.js:97](scripts/lib/admin.js#L97) `pathFor('lesson')` returns
`content_sets/lessons/${lessonKey}` — a **3-segment (odd) path**, which Firestore treats as a
**collection** reference, so `db.doc(path).set()` ([admin.js:113](scripts/lib/admin.js#L113))
would throw *"Document references must have an even number of segments."* Unexercised today
(0 lesson containers), but Option B′/C authoring hits it immediately. The §4.16 rule
`match /content_sets/lessons/{lessonKey}` has the same shape mismatch and must be reconciled
(e.g. `content_sets/lessons/items/{lessonKey}` or a dedicated top-level `lessons` collection).
