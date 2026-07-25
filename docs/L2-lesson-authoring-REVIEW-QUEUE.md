# L2 Lesson Authoring — Review Queue (your control panel)

> ## ⚡ STATUS UPDATE 2026-07-24 (evening) — decisions taken, reviews applied
>
> **Decisions locked (lead, 2026-07-24):** D-E ✅ pipeline + copy promoted to committed
> `scripts/lessons/` (see its README). D-A ✅ tone kept + new rules: ≤2 sentences,
> spend copy budget on Arabic-speaker-specific hooks. D-B ✅ AI pass done + applied;
> native reviewer gets the **sampling pack** `docs/review-brief-ARABIC-native-sample.md`
> (40 shuffled unlabeled cards; answer key `scripts/lessons/native-sample-map.json`).
> D-C ✅ meta-screens = app UI, with the caveat that the L2.13 sequence layer must
> position them + track "seen". D-D ✅ approved; review findings applied anyway since
> the sitting already happened.
>
> **Both review packs returned + validated + applied:**
> - **Arabic review:** all 22 rewrites + systemic sweeps applied (terminology
>   مقطع→حرف كانا / ساكن→صامت / الغاف→g; Arabic-comma romaji lists; the التشاء
>   non-word removed; the hiragana:14 factual error fixed). Grammar `body_ar`
>   grepped for the same failure-modes → clean.
> - **Curriculum review:** 1 false positive refuted with data (greetings:1 IS
>   dakuten-free — the split was already applied); the real findings fixed:
>   **stamp rewritten as an explicit 133-lesson sequence** (the old formula had
>   diverged from the designed verbs→ます→food→を adjacencies), て-form now precedes
>   てください, どちら→より→一番, だ opens the plain block, ね/よ after existence,
>   places before に/で, numbers after yōon III, colors/adjectives-3 beside adjective
>   grammar, path ends on でしょう. The stamp now **refuses to write** unless
>   set-equality + glyph-dependency + prerequisite assertions all pass (they do: 0/0/0).
>
> **Still open for you:** (1) send the native-sample pack when convenient;
> (2) NEW product question — lesson copy currently addresses the learner as masculine
> singular (أتقِن، تعلّمتَ); fine for MSA convention, but a MENA-wide consumer app may
> want neutral phrasing — your call, cheap to change; (3) content backlog from review:
> a "dictionary form" grammar lesson doesn't exist in the 54 authored points (real gap,
> needs authoring), and merging the duplicate な-adjective conjugation lessons is a
> suggested simplification — both parked as content-ops tasks; (4) kanji still blocked
> (radical order + radical docs); (5) **L2.13 lesson screen = the next big build.**



**Status:** 133 lesson containers authored + validated + written to **tomodachi-dev**
(`content_sets/lessons/items/*`). All reversible (dev only; regenerate by editing the
copy files + re-running the generators). Nothing here is on prod.
**Built:** 2026-07-24, autonomously, for your later review.

---

## 1. What exists now (on dev)

| Track | Lessons | Coverage | Order basis |
|---|---|---|---|
| Hiragana | 16 | 104/104 kana | row order; 12-item cap split dakuten→2, yōon→3 |
| Katakana | 16 | 104/104 kana | same; copy adds シ/ツ, ソ/ン traps + loanword framing |
| Vocab (clusters) | 42 | 345 words | 20 thematic clusters (v2 spec), ≤10/lesson |
| Vocab (katakana-anchor) | 5 | 7 loanwords | コーヒー/パン/バス… scheduled at the katakana lesson that makes them readable |
| Grammar | 54 | 54/54 points | **A-hybrid function-first** (です→は→か→の→が→も→ます→を→に→で→…) |
| **Total** | **133** | | woven into one linear path, globalOrder 1–133 |

Every container passed the **real `validateLesson`** schema, and every Arabic string
passed the built-in **dialect detector**. Item coverage is complete (vocab 352/353 =
all but the retired 時間 duplicate; grammar 54/54).

**Kanji: 0 lessons — BLOCKED** (see §4).

---

## 2. DECISIONS I need from you (batched)

| #        | Decision                                                                                                                                                            | My default (already applied)                                   | Reverse cost                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| D-A      | **Lesson voice/format** — warm, 1–2 sentences, EN final. OK to keep?                                                                                                | Kept as the pattern across all 133                             | Edit copy files, re-run — cheap                                 |
| D-B      | **Arabic moat pass** — how to quality-check the AR?                                                                                                                 | I wrote careful MSA drafts, flagged for review                 | (a) you review, (b) your Codex AR pipeline, (c) native reviewer |
| D-C      | **Meta-lessons** (orientation, reading-rules ー/っ, checkpoints) — no items, so they can't be `content_sets` lessons                                                  | Treated as **app/UI screens, not content docs** (none created) | Add item-less lesson variant if you disagree                    |
| D-D      | **Provisional interleave order** (globalOrder weave) — see §3. Approve or adjust?                                                                                   | v2 weave stamped; reshuffle-safe                               | Change slot rules, re-run stamp — cheap                         |
| D-E      | **Pipeline version control** — the generators + authored copy live in `scripts/tmp/` (gitignored). Promote to committed `scripts/` so the lessons are reproducible? | Left in tmp for now                                            | Move + commit — recommended                                     |
| D4/D5/D6 | mastery metric / push 328 tail + QA fixes / prod promotion                                                                                                          | Parked (your call earlier)                                     | —                                                               |

## 3. REVIEW TASKS (concrete, do when you have time)

**R1 — Arabic copy (the moat, highest priority).** All authored AR lives in 3 files:
- `scripts/tmp/hiragana-lessons-copy.json` (16), `scripts/tmp/katakana-lessons-copy.json` (16)
- `scripts/tmp/vocab-cluster-intros.json` (20 cluster intros)
- Grammar AR = trimmed from the **already-authored** `body_ar` (reviewed content, lower risk).
Look for translationese / unnatural phrasing. Edit in place → I re-run the generator to overwrite dev.

**R2 — A-hybrid grammar order.** The 54-point sequence (function-first, supersedes the
stored particles-first order per the 4 reviews). Full order in `scripts/tmp/grammar-containers.json`.
Sanity-check the dependency chain — especially where です/ます/を land vs. the particle block.

**R3 — The interleave weave.** First 46 of the linear path (globalOrder → lesson):

```
 1-10  hiragana 1-10 (あ→わをん)
 11    vocab: Greetings 1
 12    hiragana 11 (dakuten G/Z)
 13    grammar: です (Polite Be)      ← copula leads, as reviewers demanded
 14    hiragana 12 (dakuten D/B)
 15    grammar: は (Topic)
 16    vocab: More Greetings
 17    grammar: か (Question)
 18    hiragana 13 (handakuten P)
 19    grammar: の (Possession)
 20    hiragana 14 (yōon I)
 21    grammar: が (Subject)
 22    hiragana 15 (yōon II)
 23    vocab: Numbers 1
 24    grammar: も (Also)
 25    vocab: Numbers 2
 26    grammar: ます (Polite Verb)
 27    hiragana 16 (yōon III)  → hiragana COMPLETE
 28    grammar: を (Object)
 29-30 vocab: Demonstratives 1-2
 31    grammar: に (Target)
 32    katakana 1              ← katakana starts, after vocab as designed
 33    grammar: で (Location)
 34-36 vocab: Adjectives 1-3
 37    katakana 2
 38-39 grammar: へ, と
 40    katakana 3
 41-42 vocab: Food & Drink 1-2   ← objects land before/around を
 43-44 grammar: から, まで
 45    katakana 4
 46    grammar: や
```
Note: kanji would slot in from ~#40 once authored (§4). A couple of spots run 3
same-type lessons (e.g. Adjectives 1-3 at 34-36) — allowed under the rolling-window
rule, but flag any you dislike.

**R4 — Vocab cluster assignments.** 20 clusters with 20 flagged judgment calls +
6 machine-readable collision groups (人/にん, 本, 月, いる…). Full detail:
`scripts/tmp/vocab-clusters-v2.json` + the earlier `scripts/tmp/vocab-cluster-draft.md`.

**R5 — Two key-oddity renames** (content-ops, cheap, cosmetic): `n5_v_079_watch_over`
is 見せる "to show"; `n5_v_022_kind_or_easy` is 易しい "easy". Keys mislead; content is fine.

## 4. BLOCKERS (can't proceed without input/content)

1. **Kanji lessons (0 authored).** Two hard blocks: (a) the design wants
   *visual-radical-family* order, but the stored kanji `ordinal` isn't that — needs a
   re-ordering pass; (b) the radical docs (`content_sets/radicals/items/k_rad_*`) that
   kanji lessons reference **do not exist on dev** (0 authored). Both are content tasks.
2. **The lesson SCREEN (L2.13) is not built.** These 133 containers are the *data
   foundation* — the dashboard's "Continue Lesson N", unlock gating, and daily quests
   can read them now — but a learner cannot *play a lesson* in a lesson UI until that
   screen exists. (The practice game — kana + vocab drills — is already playable today.)
   Deciding whether I build L2.13 next is the biggest open question.

## 5. Assumptions I made (so nothing is silent)

- **itemKeys are `contentType`-scoped.** A hiragana lesson and a katakana lesson both
  list `a` — the screen resolves each against `content_sets/{contentType}/items/`.
  The L2.13 builder must honor this.
- Lesson boundaries respect the 12-item cap → hiragana/katakana are 16 lessons each
  (design doc said 14; it under-counted yōon at 33 glyphs).
- Grammar `displayName` reuses the authored `title_en/ar`; `introCopy` is a trimmed
  teaser of the authored `body_en/ar` — no new grammar copy invented.
- globalOrder is provisional and reshuffle-safe (progress keys off `lessonKey`).

## 6. How to inspect

- **Firebase console** → tomodachi-dev → Firestore → `content_sets` → `lessons` → `items`.
- **In the app** (localhost, logged in as `claude_qa` / `TomoQa-Dev-2026!`): the practice
  game shows the kana + vocab sets; lessons need the L2.13 screen to be visible.
- **Regenerate anything:** edit the copy file, `node scripts/tmp/gen-*.mjs --write`,
  then `node scripts/tmp/stamp-globalorder.mjs --write`.
