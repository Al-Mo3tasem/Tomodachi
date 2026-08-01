# Lesson-authoring pipeline (L2)

Source of truth for the 151 lesson containers on `content_sets/lessons/items/*`.
Committed here (not `scripts/tmp/`) because the authored copy — especially the
Arabic — is product content, not scratch. Requires `scripts/secrets/service-account.dev.json`.

## Files

| File | Role |
|---|---|
| `hiragana-lessons-copy.json` / `katakana-lessons-copy.json` | Authored bilingual copy, 16 lessons per track. AR revised per the 2026-07-24 native-style review. |
| `vocab-cluster-intros.json` | 20 cluster names + intros (bilingual). |
| `vocab-clusters-v2.json` | Cluster→item assignment spec (lead rulings applied; collision groups; katakana-anchor deferrals). |
| `validators.mjs` | Copy of `js/validators/content.js` so Node generators run the real schema. Re-copy if the source changes. |
| `gen-kana-containers.mjs <track>` | Hiragana/katakana containers. |
| `gen-vocab-containers.mjs` | 42 cluster lessons (≤10 items each; anchors excluded). |
| `gen-anchor-lessons.mjs` | 5 katakana-loanword mini-lessons. |
| `gen-grammar-containers.mjs` | 55 grammar lessons, A-hybrid v2 + dictionary form (ORDER array = the sub-sequence). |
| `gen-kanji-containers.mjs` | 17 kanji lessons from kanji-lessons-design.json (radical families; coverage-gated). |
| `stamp-globalorder.mjs` | THE woven 151-lesson path (explicit SEQ + kanji splice). Verifies set-equality, itemKey existence, kana-glyph dependencies, and grammar prerequisites before writing; refuses on any failure. |
| `gen-review-briefs.mjs` | Regenerates `docs/review-brief-ARABIC-copy.md` + `docs/review-brief-CURRICULUM-order.md`. |
| `gen-native-sample.mjs` | D-B sampling pack for a native Arabic reviewer (+ `native-sample-map.json` answer key). |

## Workflow (edit → regenerate → stamp)

```
node scripts/lessons/gen-kana-containers.mjs hiragana --write
node scripts/lessons/gen-kana-containers.mjs katakana --write
node scripts/lessons/gen-vocab-containers.mjs --write
node scripts/lessons/gen-anchor-lessons.mjs --write
node scripts/lessons/gen-grammar-containers.mjs --write
node scripts/lessons/stamp-globalorder.mjs --write   # refuses to stamp if any check fails
```

All generators are idempotent (doc-id = lessonKey), PRESERVE the woven globalOrder on re-runs (only the stamp reorders), and dry-run without `--write`. Vocab chunking is balanced (never a 1-item lesson); vocab/anchor/kanji writes are gated on itemKey existence + coverage.

## Standing rules

- Copy style: ≤2 sentences; spend the budget on Arabic-speaker-specific observations
  (e.g. the p-sound note), not generic encouragement. Terminology: حرف كانا (not مقطع
  for a character), صامت for consonant (ساكن only where the vowel-less sense is meant),
  Latin `g`/`p` for sounds Arabic letters can't name. Romaji lists use Arabic commas:
  `a، i، u`. Per native review v3 (2026-07-26): no absolute claims (كل شيء / أبدًا),
  direct explanation over metaphor, spelled-out numbers (الستة والأربعين), describe
  diacritic marks in words (علامتان تشبهان علامتي الاقتباس) — never bare `"` symbols.
- **Gender address (lead ruling 2026-07-26): masculine singular SHIPS.** Every copy
  entry carries `introCopy_ar_f` / `intro_ar_f` — the feminine variant — which is
  deliberately EMPTY and flows through the generators into the lesson docs. Do NOT
  neutralize the imperatives (they carry the warmth) and do NOT build a gender toggle
  yet; the field exists so filling it later costs nothing structurally. Fill it only
  after real feedback from women in the target market says the masculine default
  registers as excluding.
- Meta-screens (orientation, reading rules ー/っ, checkpoints) are app UI, NOT lesson
  docs (lead decision D-C); the stamp exempts ー/っ/small-vowel glyphs accordingly,
  and the L2.13 sequence layer must slot these screens by position with a "seen" flag.
- `globalOrder` is reshuffle-safe; `lessonKey` is the stable identity.
