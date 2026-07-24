# L2 Linear Lesson Path — proposed `globalOrder` (draft for review)

**Status:** DRAFT for lead approval. Makes concrete the interleaving that
`LEARNING_EXPERIENCE.md §2.7` explicitly left unfinalized ("locks in L2.05+").
Approving/adjusting this unblocks authoring the `content_sets/lessons/{lessonKey}`
containers, which the dashboard "Continue Lesson N", unlock logic, daily quests,
and the lesson screen (L2.13) all depend on.
**Date:** 2026-07-24. Grounded in the authored dev corpus (verified counts) + §2.

---

## 1. Track inventory (lessons per track, from real authored content)

| Track | Authored items (dev) | Lessons | Basis for order |
|---|---|---|---|
| Hiragana | 104 glyphs | **14** | row order §2.1 (10 gojūon + 2 dakuten + handakuten + yōon) |
| Katakana | 104 glyphs | **14** | same row order §2.2; track *starts after first vocab cluster* |
| Vocab | 353 (of 681 target; 328 tail unpushed) | ~**35–40** | thematic clusters §2.3 — **NOT yet tagged in data** (see §4) |
| Kanji | 103 | ~**18** (5–7 each) | visual-radical families §2.4 — data has `ordinal`, but ordinal ≠ radical-family (see §4) |
| Grammar | 54 | **54** (1 each) | dependency order §2.5 — data has `ordinal` (usable as-is, pending review) |
| Listening | 0 authored | — | separate game mode, **not in the linear path** §2.6 |

**Full-corpus estimate: ~130–140 lessons** once vocab reaches the ~800-item N5
target. With today's 353 vocab the path is fully walkable through roughly the
first ~90 lessons.

## 2. Interleaving principles (locked by §2)

1. Never more than **2 lessons of one content type back-to-back** (§2.3).
2. **Hiragana 1–10 first** — the learner must be able to *read* before vocab (§2.3 cluster 1 sits after hiragana 10).
3. **Katakana starts after the first vocab cluster** — vocab gives katakana something to anchor to (§2.2).
4. **Kanji enters after vocab cluster 5** (§2.4).
5. **Grammar enters from vocab cluster 3**, in dependency order (§2.5), though です is foundational and can appear as soon as self-introduction vocab lands.
6. `lessonKey` is stable; `globalOrder` is a reshufflable integer — so this order can be revised across releases **without breaking user progress** (progress keys off `lessonKey`).

## 3. Proposed sequence — concrete opening (globalOrder 1–40)

This is the reviewable core; the pattern then repeats to completion (§3b).

| # | lessonKey | Content | Why here |
|---|---|---|---|
| 1–10 | `hiragana:01`…`hiragana:10` | あ→わをん (the 10 gojūon rows) | read-first foundation |
| 11 | `vocab:greetings:1` | こんにちは, ありがとう… | now readable in hiragana |
| 12 | `vocab:greetings:2` | greetings cont. | (≤2 vocab back-to-back) |
| 13 | `hiragana:11` | dakuten が・ざ 行 | resume kana |
| 14 | `grammar:01` | です (copula) | self-intro needs it; foundational |
| 15 | `vocab:numbers:1` | いち, に, さん… | high-frequency |
| 16 | `hiragana:12` | dakuten だ・ば 行 | |
| 17 | `vocab:numbers:2` | numbers cont. | |
| 18 | `hiragana:13` | handakuten ぱ 行 | |
| 19 | `grammar:02` | は (topic marker) | self-introduction |
| 20 | `hiragana:14` | yōon きゃ… | **hiragana complete (104)** |
| 21 | `vocab:verbs1:1` | します, たべます… | |
| 22 | `katakana:01` | ア row | **katakana starts** — vocab anchors it |
| 23 | `vocab:verbs1:2` | daily verbs cont. | |
| 24 | `grammar:03` | これ／それ／あれ + か | noun-pointing |
| 25 | `katakana:02` | カ row | |
| 26 | `vocab:time:1` | きょう, あした… | |
| 27 | `katakana:03` | サ row | |
| 28 | `grammar:04` | ます-form (polite present) | gates verb grammar |
| 29 | `vocab:time:2` | days / months | |
| 30 | `katakana:04` | タ row | |
| 31 | `vocab:family:1` | かぞく, ちち, はは… | |
| 32 | `katakana:05` | ナ row | |
| 33 | `grammar:05` | を (object marker) | gates transitive verbs |
| 34 | `vocab:family:2` | people cont. | |
| 35 | `katakana:06` | ハ row | ← **vocab cluster 5 reached → kanji may enter next** |
| 36 | `kanji:01` | 一二三四五 + radical 木 | visual-radical lesson 1 (§2.4) |
| 37 | `vocab:food:1` | ごはん, みず, おちゃ… | |
| 38 | `katakana:07` | マ row | |
| 39 | `grammar:06` | に (direction marker) | gates motion verbs |
| 40 | `kanji:02` | next radical family | |

### 3b. Pattern for the remainder (globalOrder 41 → end)
Continue the same weave: **katakana 08–14** finish interleaved with **vocab
clusters 6–10 (places, body/feelings, weather/nature, adjectives, …)**, **kanji
03–18** in radical-family order, and **grammar 07–54** in dependency order — each
inserted so no type runs more than twice consecutively. Katakana completes around
#55; kanji and grammar run longest and carry the back half of the course.

## 4. What's data-grounded vs. needs a content pass (honesty)

- ✅ **Kana (28 lessons):** fully grounded — glyphs + rows exist; lesson grouping is
  deterministic. *(Note: the shipped practice-game groups dakuten as one set; the
  lesson path splits it into 2 per §2.1 — same glyphs, different lesson bucketing.)*
- 🟡 **Grammar (54):** each item has an `ordinal` — usable as the lesson order as-is,
  pending a quick check that ordinal matches the §2.5 dependency chain (です → は → …).
- 🟡 **Kanji (103):** items have an `ordinal`, but §2.4 wants **visual-radical-family**
  order, which ordinal likely is NOT. Needs a re-order pass (L2.08 scope) + the
  radical docs (`k_rad_*`) which are **not yet authored** (0 radicals on dev).
- 🔴 **Vocab (353):** the biggest gap. Data is tagged by **category** (verbs/nouns/
  adjectives/misc), **not** by the thematic clusters (greetings/numbers/family/…)
  the path needs. Assigning the 353 words to clusters is a content task + your
  review. Also only 353 of 681 are on dev (the 328 tail is staged).

## 5. Dependencies this unblocks / needs (before authoring containers)

1. **Fix `scripts/lib/admin.js:97`** — `pathFor('lesson')` returns a 3-segment
   (invalid document) path; `.set()` would throw. Reconcile the lessons path
   (`content_sets/lessons/items/{lessonKey}`) + the §4.16 rule to match.
2. **Vocab → thematic clusters** assignment (353 words) + your review.
3. **Kanji radical-family re-order** + author the `k_rad_*` radical docs.
4. **Grammar ordinal ↔ dependency-chain** sanity check.
5. Author `content_sets/lessons/{lessonKey}` containers ({ itemKeys[], globalOrder,
   displayName_en/ar, introCopy_en/ar, … } per validator `validateLesson`).
6. (Optional) push the 328 vocab tail so later clusters aren't thin.

## 6. Reconciliation with the shipped practice game

These are **two surfaces over one corpus**, intentionally:
- **Practice game** (shipped `77e8a90`): browse & drill *sets* — kana by row,
  vocab by category. Free-form, no unlock.
- **Lesson path** (this doc): a *linear course* — thematic clusters, interleaved,
  unlock-gated. Uses the same item docs, grouped by the clusters above.

No conflict: the same 353 vocab items appear grouped by category in the practice
picker and by theme in the lesson path.

---

**Decision requested:** approve this interleaving (adjust freely), or tell me the
constraints you want changed (e.g. kanji earlier/later, grammar density, whether
です should lead). On approval I'll (a) do the vocab→cluster assignment for your
review, then (b) author the lesson containers.

---
---

# REVISION v2 — after 4 external expert reviews (2026-07-24)

Four independent reviews (GPT-5.6, Gemini, Claude, Claude Opus 4.8) were collected
against the review brief; all four returned **approve_with_changes**. This section
supersedes §3 where they conflict.

## v2.1 Validated findings adopted (unanimous or near-unanimous)

1. **Grammar order = A-hybrid (function-first), unanimously.** The stored
   particles-first order (Order B) was rejected 4/4: fifteen particles before any
   predicate means nothing usable can be said. Adopted spine:
   です → は → の → これ/それ/あれ+か → ます → を → に → で → あります/います+が
   → negation → past → て-form → adjective conjugation → remaining particles/
   discourse (も, ね, よ, や…) as a loose late block. Hybrid borrowings (reviewers
   3+4): **early の** (maps to Arabic iḍāfa — near-free), **が immediately after は**.
   *No data migration needed — lesson containers order grammar keys independently
   of the stored `ordinal`.*
2. **Dakuten blocker (4/4):** greetings vocabulary is dakuten-saturated
   (ありがとう→が, ございます→ご/ざ, こんばんは→ば) but dakuten was slotted after
   greetings. Fixed in v2 opening below: greetings 1 restricted to base-kana words
   (こんにちは, さようなら, すみません, おはよう, はい, いいえ), dakuten rows land
   before greetings 2. **Plus the engineering answer (reviewer 3): a glyph-dependency
   validator** — every lesson item must use only glyphs from strictly earlier
   lessons; runs at container-authoring time.
3. **Grammar was back-loaded (3/4, math-checked):** 6 points by lesson 40 forced
   48 into the back half. v2 paces grammar ~every 3 lessons from lesson 13, and
   merges contrast pairs (は/が, に/で, negation+past…) so 54 points ≈ 40 lessons.
4. **Cluster reorders (3/4):** **food & drink before を** (canonical objects for
   たべます/のみます); **places before に/で**; **basic-adjective subset early**
   (~lesson 24, pairs with です; the 59-item tag was the corpus's most under-used);
   family/people demoted a slot; weather stays merged into nature.
5. **Kanji entry ~36-40 confirmed right (3/4)** — but kanji lesson 1 becomes
   **numbers-only** (一二三四五六 — "write the numbers you already know"; zero new
   words on the highest-anxiety lesson). 木 returns later as a radical component.
   Radical decomposition taught explicitly (no logographic L1). Optional: numeral-
   kanji *recognition preview* inside the numbers lessons (reviewer 1).
6. **2-in-a-row rule → rolling-window guideline:** ≤3 consecutive of a type per
   5-lesson window, with the hiragana foundation block as a *documented* exception
   (reviewers noted lessons 1–10 already break the "absolute" rule). Mitigation
   inside lessons 1–10: each kana row ends with 2–3 immediately-readable real words.
7. **Arabic-L1 specifics (reviewers 3+4, linguistically sound; now authoring
   requirements):** new **orientation lesson 0** (LTR direction, no word spaces,
   three scripts, mora concept); え/お‐い/う minimal-pair perception drills attached
   to hiragana 1–3 (MSA is a 3-vowel system); ぱ/ば minimal pairs at handakuten
   (/p/ absent in Arabic); **positive-transfer framing** for long vowels (madd) and
   っ (shadda); です explained as politeness/equational marker (Arabic nominal
   sentences have zero copula), は via mubtada'/khabar.
8. **New structural elements:** explicit **reading-rules lesson** (long vowels ー,
   sokuon っ) before the numbers cluster (きゅう/じゅう need it — currently taught
   nowhere); **checkpoint lessons** every ~10 lessons (no new items; can-do framed
   synthesis — SRS alone doesn't provide it); **counters cluster** gets a dedicated
   slot adjacent to a numbers review; katakana rows anchored to hiragana
   counterparts + two **loanword mini-lessons** (AR-glossed) around rows 4/7 + a
   late katakana-conventions lesson (ー, シ/ツ, ソ/ン); politeness-register note in
   the ます lesson.

## v2.2 Reviewer claims REJECTED (with reason)

- **"Delay kanji until after katakana (~55)" (Gemini):** rejected — contradicted
  by the other three reviewers; kanji/katakana visual interference is weak (kanji
  are complex, katakana angular-simple; the real confusions are within katakana).
- **"All 14 hiragana lessons before any vocab" (Gemini):** over-correction — the
  consensus fix (dakuten before dakuten-bearing vocab; yōon stays interleaved)
  solves the actual violation without 13 consecutive kana lessons killing
  motivation.

## v2.3 Revised opening (globalOrder 0–40)

| # | Lesson | Notes |
|---|---|---|
| 0 | **Orientation** | LTR, no spaces, 3 scripts, mora; AR-first framing |
| 1–10 | hiragana 1–10 | each row ends with 2–3 readable words; え/お drills in 1–3 |
| 11 | vocab: greetings 1 | **base-kana-only** (こんにちは, さようなら, すみません, おはよう, はい, いいえ) |
| 12 | hiragana 11 | dakuten が・ざ |
| 13 | grammar: です | equational/politeness framing vs zero-copula Arabic |
| 14 | hiragana 12 | dakuten だ・ば |
| 15 | vocab: greetings 2 | now decodable: ありがとうございます, こんばんは |
| 16 | hiragana 13 | handakuten ぱ + ぱ/ば minimal pairs |
| 17 | hiragana 14 | yōon |
| 18 | **reading rules** | long vowels (ー/おう) + っ; madd/shadda transfer |
| 19 | vocab: numbers 1 | きゅう/じゅう now readable; optional numeral-kanji preview |
| 20 | grammar: は | mubtada'/khabar analogy |
| 21 | vocab: numbers 2 | + **checkpoint A** appended (greet + count can-do) |
| 22 | grammar: の | iḍāfa mapping — near-free for AR speakers |
| 23 | katakana 1 | anchored ア↔あ |
| 24 | vocab: adjectives 1 | ~10 basic (おおきい, おいしい…) — pairs with です |
| 25 | katakana 2 | |
| 26 | grammar: これ/それ/あれ + か | |
| 27 | vocab: food & drink 1 | objects arrive BEFORE を |
| 28 | katakana 3 | |
| 29 | grammar: ます | politeness-register note; right before verbs |
| 30 | vocab: daily verbs 1 | |
| 31 | katakana 4 | |
| 32 | **katakana words 1** | コーヒー, テレビ, バス… AR glosses |
| 33 | grammar: を | built entirely from known food+verbs |
| 34 | vocab: daily verbs 2 | |
| 35 | katakana 5 | |
| 36 | vocab: places 1 | nouns arrive BEFORE に/で |
| 37 | grammar: に | direction + time |
| 38 | katakana 6 | |
| 39 | **kanji 1** | 一二三四五六 only — "write numbers you know"; radicals concept |
| 40 | vocab: family & people 1 | + **checkpoint B** near here |

Pattern onward: grammar every ~3 (で, あります/います+が, negation, past, て-form
all by ~65); katakana 7–14 + words-mini-2 + conventions lesson (complete ~55);
kanji 2–18 in radical families every 3–5; counters after a numbers review;
remaining vocab clusters per the 18-cluster draft; checkpoints every ~10.

## v2.4 Build prerequisites added by review

1. **Glyph-dependency validator** (blocker-class; mechanical) — item kana vs
   lessons-taught-so-far; runs before containers are written.
2. Example-sentence policy: early example sentences must use only taught
   grammar/kana or be explicitly marked as unanalyzed chunks.
3. XP normalization by estimated time-on-task (grammar lesson ≠ 10-item vocab
   lesson) — flag for the gamification pass, not a path blocker.

