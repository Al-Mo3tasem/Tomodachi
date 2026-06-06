# Codex spec — L2.08 N5 kanji (103 entries, full structure)

> **Date:** 2026-06-06
> **Phase:** L2.08 — kanji content batch (parallel with L2.05 hiragana, L2.06 katakana)
> **Visibility:** TRACKED (Codex's output is gitignored T4)
> **Target output:** `scripts/output/codex-l2-08-kanji.json`

---

## Note for the project lead

- Give Codex read access to this file
- Codex writes the result directly to `scripts/output/codex-l2-08-kanji.json`
- Independent of the hiragana and katakana sessions — run in parallel
- After Codex finishes, ping Claude for the post-Codex review
- CLI command after review:
  ```
  node scripts/author_content.js --env=dev \
    --manifest=scripts/manifests/n5_kanji.json \
    --prefill=scripts/output/codex-l2-08-kanji.json
  ```

---

## Codex — this spec is for you. Read everything below.

You are drafting the **complete N5 kanji content set** for **Tomodachi** — a bilingual EN + AR Japanese language-learning app targeting the MENA region.

Kanji is the **deepest content type** in the curriculum. Each kanji card carries: readings (onyomi + kunyomi), meanings (EN + AR), **TWO separate stories per locale** (meaning_story + reading_story, WaniKani-style), radicals, stroke count, example vocab. This spec walks you through every field.

This is parallel with the hiragana (L2.05) and katakana (L2.06) Codex runs. The three together establish the AR brand voice for the entire app.

### Why this matters (the AR moat)

Tomodachi's primary moat is **Arabic-first pedagogy**. Most Japanese apps machine-translate to Arabic and the result is "auto-translated" prose that native speakers immediately reject. Five Arabic-speaking friends flagged our L1 content for this last week.

Your job: produce **kanji mnemonics that read as if a native Arabic-speaking instructor wrote them from scratch**, especially the reading stories — those use phonetic hooks, and Arabic phonetic hooks are NOT translations of English ones.

### Brand context

- **Audience:** MENA-first, adult learners, mobile-first
- **Brand name:** `Tomodachi` in EN, «تومودَاتشي» in AR
- **Voice (EN):** Calm, capable, culturally respectful. Like a knowledgeable friend at a café.
- **Voice (AR):** Natural conversational Modern Standard Arabic — Careem/Anghami register, NOT encyclopedic فصحى.

### The two-mnemonic structure (CRITICAL — WaniKani-inspired)

Each kanji gets **TWO separate stories per locale**:

1. **Meaning story** — anchors the kanji's visible shape (or its radical components) to its meaning. Imagery only, no sound. "Two legs walking forward = a person."
2. **Reading story** — anchors the meaning to the kanji's primary sound (typically the most-useful on'yomi or kun'yomi). Uses a phonetic hook from the target language. "When a PERSON walks past, a JIN-gle bell rings."

So each kanji entry has **4 stories total**: `mnemonic.en.meaning_story`, `mnemonic.en.reading_story`, `mnemonic.ar.meaning_story`, `mnemonic.ar.reading_story`.

**The AR reading story is NOT a translation of the EN reading story.** It uses an Arabic-language phonetic hook. Example for 人 (person, on'yomi ジン /jin/):

- EN reading story: *"Whenever the person walks past, a JIN-gle bell rings on their bag."*
- AR reading story: *"كُلَّما يَمُرّ شخصٌ، يَظهرُ جِنِّيٌّ بجواره يَحرسه."* (Whenever a person passes, a *jinn* appears beside them to guard them.)

The AR uses «جِنّ» — an Arabic word containing the /jin/ sound and tied to deep Arabic-cultural imagery. The English "jingle bell" hook doesn't help an Arabic-thinking learner; the jinn does.

### Why two stories, not one

The learner has to remember **two unrelated things** about each kanji — what it *means* and how it's *pronounced*. The shape→meaning hook and the meaning→sound hook are different cognitive associations. One merged story can't anchor both well. WaniKani's research-backed structure splits them deliberately, and we follow the same.

**Each story is one short scene — 1-2 sentences max.** Not a paragraph. One vivid picture.

### Web research — use it

Spend 10-15 minutes browsing established sources. Kanji needs more research than kana because readings and meanings must be accurate:

- **Jisho.org** — <https://jisho.org> — authoritative kanji dictionary (readings, meanings, JLPT classification, stroke count, radicals)
- **WaniKani's kanji pages** — gold standard for two-story mnemonics in English
- **Tofugu's "Learn Kanji" articles** — for meaning-story imagery
- **Tanos.co.uk N5 kanji list** — to confirm membership
- **Arabic-language kanji resources** — search YouTube and Arabic blogs for kanji explanation videos (عرب نيهون, دروس اليابانية). They signal what imagery Arabic learners already have.
- **Arabic-language phonetic dictionaries** — to find Arabic words containing target sounds (for AR reading stories)

**Use your search tool. Cite URLs in `_meta.sources_consulted`.**

### Authoring rules per field

**`kanji`** — the kanji glyph itself. Already in the manifest seed. Codex may verify/correct.

**`onyomi`** — array of katakana strings, **primary first**. Sino-Japanese readings. Example for 人: `["ジン", "ニン"]`. Some kanji have only kunyomi → empty array `[]`.

**`kunyomi`** — array of hiragana strings, **primary first**. Native Japanese readings. Example for 人: `["ひと"]`. Some kanji have only onyomi → empty array. **At least one of onyomi/kunyomi must be non-empty.**

**`en_meanings`** — array of EN concept strings, **most-primary first**, 1-3 entries. Example for 人: `["person", "people"]`. Plain English, no parentheticals.

**`ar_meanings`** — array of AR concept strings, **most-primary first**, 1-3 entries. Example for 人: `["شخص", "إنسان"]`. Pan-Arabic, no dialect.

**`mnemonic.en.meaning_story`** — 1-2 sentence vivid scene anchoring the kanji's **visible shape** to its meaning. Use radical components where possible (the kanji "bright" 明 = sun 日 + moon 月; the meaning story can reference both).

**`mnemonic.en.reading_story`** — 1-2 sentence scene anchoring the meaning to the **primary reading** (typically the primary onyomi; sometimes the primary kunyomi if it's the more useful learner-facing reading). Use an English phonetic hook (jin-gle, jin-x, ninja, etc. for /jin/).

**`mnemonic.ar.meaning_story`** — 1-2 sentence Arabic-native scene anchoring shape to meaning. **NOT a translation of the EN.** Uses Arabic-portable imagery (Arabic letters, MENA cultural references, classical Arabic literature when it fits naturally).

**`mnemonic.ar.reading_story`** — 1-2 sentence Arabic-native scene anchoring meaning to sound. **NOT a translation of the EN.** Uses an Arabic-language phonetic hook (e.g., «جِنّ» for /jin/, «شَفّاف» for /sha/, «كَنز» for /kan/). If no good Arabic phonetic hook exists for a given reading, the AR mnemonic can use the same English-rooted hook (e.g., "ninja" is recognizable in Arabic too) — but that's the author's judgment per kanji, not a fallback rule.

**`radicals`** — array of radical keys. The manifest seed leaves this empty; **you should populate it** with the standard radical decomposition (Codex will know what radicals make up each kanji from Jisho or similar). Keys follow the format `k_rad_{en_concept}` (e.g., `k_rad_person`, `k_rad_sun`, `k_rad_water`). Use lowercase ASCII slugs. If you're unsure, write the most common decomposition. We'll author the actual radical content at L2.B+.

**`stroke_count`** — integer (1-30). Authoritative from Jisho.

**`example_vocab_keys`** — array of vocab keys that use this kanji. The vocab collection is empty at L2.08 time (L2.07 hasn't happened yet), so **leave this as an empty array `[]`** for every kanji. We'll backfill at L2.13.

### Cultural fit (AR side)

- AVOID: pork, alcohol, casinos, gambling, dating apps, religious controversy, real political figures, anything country-specific
- WELCOME: tea/coffee scenes, MENA city imagery (Cairo, Riyadh, Beirut, Marrakesh), traditional Arabic literature (شهرزاد, ألف ليلة وليلة, جحا), common foods (kanafeh, hummus, mansaf), classical poetry imagery
- **Pan-Arabic.** Imagery should land for an Egyptian, Saudi, Lebanese, and Moroccan reader equally.

### Style requirements (contractual)

**EN — words to AVOID:** `easy`, `simple`, `just`, `click` (use `tap`), `awesome`, `amazing` (as filler), `leverage`, `elevate`, `unlock your potential`, `unleash`, `empower`. Em dash (—) not double-hyphen. Oxford commas. Sentence case. No emoji in story bodies.

**AR — strictly FORBIDDEN markers:** `دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`. Otherwise: conversational MSA (Careem/Anghami register). Arabic punctuation (، ؟). Western digits (1, 2, 3).

**Tashkeel:** sparing — only for pronunciation disambiguation.

### The 103 N5 kanji to author

The keys follow the format `k_n5_NNN_{en_concept}` and are pre-set in `scripts/manifests/n5_kanji.json`. The manifest seeds `kanji` (glyph), `jlpt` (n5), and `ordinal` for each item. You fill in everything else.

If you believe an item in the manifest is misclassified (e.g., should be N4, not N5), **still write the content** — flag the disagreement in `_meta.notes` as an array of strings. Don't drop items.

### Output

Write a single JSON file at:

```
scripts/output/codex-l2-08-kanji.json
```

Schema (per-item shape shown for `k_n5_001_one`):

```json
{
  "type": "kanji",
  "source": "codex-l2-08-kanji-2026-06-06",
  "_meta": {
    "authored_by": "codex",
    "spec": "docs/codex-spec-l2-08-kanji-2026-06-06.md",
    "sources_consulted": [
      "https://jisho.org",
      "..."
    ],
    "notes": []
  },
  "items": {
    "k_n5_001_one": {
      "onyomi": ["イチ", "イツ"],
      "kunyomi": ["ひと"],
      "en_meanings": ["one"],
      "ar_meanings": ["واحد"],
      "mnemonic": {
        "en": {
          "meaning_story": "A single horizontal stroke — the simplest possible number, one.",
          "reading_story": "When you ITCH for ONE more thing, you scratch with one finger."
        },
        "ar": {
          "meaning_story": "خطّ أفقي واحد — أبسط رقم في العالم: الواحد.",
          "reading_story": "تخيَّل طفلًا يرسم خطًّا أفقيًّا ويقول «إِيتْشِي!» (إيش، ماذا) متعجِّبًا — صوت /ichi/ كصوت /إيش/."
        }
      },
      "radicals": ["k_rad_one"],
      "stroke_count": 1,
      "example_vocab_keys": []
    },
    "k_n5_002_two": { "..." : "..." }
  }
}
```

**Important:**

- Each item: full structure as above (onyomi, kunyomi, en_meanings, ar_meanings, mnemonic.en.meaning_story, mnemonic.en.reading_story, mnemonic.ar.meaning_story, mnemonic.ar.reading_story, radicals, stroke_count, example_vocab_keys)
- The CLI fills in `key`, `kanji`, `jlpt`, `ordinal` from the manifest seed — you do NOT include these in the per-item object
- All 103 keys MUST be present
- Pure JSON, no trailing commas, no code fences
- Write to file path directly; do not paste back in chat

### Acceptance criteria (self-check)

- [ ] All 103 keys present in the order listed in the manifest
- [ ] Each item has all required fields (onyomi/kunyomi arrays, en/ar_meanings arrays with ≥1 entry, mnemonic.{en,ar}.{meaning_story, reading_story} all non-empty strings, radicals array with ≥1 entry, stroke_count integer ≥1, example_vocab_keys empty array)
- [ ] **At least one of onyomi/kunyomi is non-empty** for every kanji
- [ ] No AR forbidden marker in any meaning_story, reading_story, or ar_meanings entry
- [ ] AR uses Arabic punctuation (، ؟)
- [ ] EN avoids the filler list
- [ ] No emoji in story bodies
- [ ] Em dash (—) not double-hyphen
- [ ] All readings are correct per Jisho or equivalent authoritative source
- [ ] All stroke counts are correct per Jisho
- [ ] `_meta.sources_consulted` cites real URLs you browsed
- [ ] JSON validates

### Self-review checklist (slow down — kanji is the highest-value content)

1. **Read 20 random AR meaning_stories aloud.** Do they sound native? If translated, rewrite with Arabic-native imagery.
2. **Read 20 random AR reading_stories aloud.** These are the hardest — phonetic hooks in Arabic. Are they actually Arabic words containing the target sound, or are you reaching? If reaching, find a better hook or note that the EN-rooted hook is intentional.
3. **5 random AR mnemonics for cultural fit.** Pan-Arabic, not Egyptian-only or Gulf-only.
4. **EN voice check.** Calm, capable, no corporate filler. "tap" not "click".
5. **JSON validates.** Count braces. No trailing commas.
6. **Verify readings against Jisho** for 10 random kanji — readings drift in AI generation; double-check.
7. **Verify stroke counts** for 10 random kanji.
8. **Cross-locale consistency check:** the EN and AR meaning_stories for the same kanji should describe the **same kanji shape**, but with **different imagery**. They shouldn't describe contradictory shapes. (The reading stories can diverge freely.)
9. **Count: 103 entries.** Mental `Object.keys(items).length === 103`.
10. **Radicals coherence:** if 明 (bright) is in the list, its `radicals` should include the sun and moon radicals. Spot-check 5.

Kanji is the moat-defining content type. **Quality matters more than speed.**

---

## Claude's post-Codex review (NOT for Codex to act on)

After Codex finishes, Claude runs:

1. Confirm file exists + parses
2. All 103 keys present in manifest order
3. Validate every item against `validateContentItem('kanji', item)` after seed merge — flag structural errors
4. Sample-read 20 AR meaning_stories for translationese
5. Sample-read 20 AR reading_stories for phonetic-hook quality (the hardest field)
6. Sample-read 10 EN of each story type for filler/corporate voice
7. Spot-check 10 random kanji readings against Jisho
8. Spot-check 10 random stroke counts against Jisho
9. Cross-check the EN vs AR meaning_stories describe the same kanji shape (not the same imagery — that would be translationese — but the same underlying glyph)
10. Verify all kanji have at least one of onyomi/kunyomi populated
11. Report summary to project lead

If >10 items need re-draft: partial failure, ask Codex to redo those keys.
