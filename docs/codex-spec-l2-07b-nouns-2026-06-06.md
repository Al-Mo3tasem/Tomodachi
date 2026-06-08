# Codex spec — L2.07b N5 core nouns (123 entries, vocab cards)

> **Date:** 2026-06-06
> **Phase:** L2.07b — second vocab batch (parallel with all other wave-2 sessions)
> **Visibility:** TRACKED
> **Target output:** `scripts/output/codex-l2-07b-nouns.json`

---

## Note for the project lead

- Give Codex read access to this file
- Codex writes the result directly to `scripts/output/codex-l2-07b-nouns.json`
- Independent of other wave-2 sessions
- CLI after review:
  ```
  node scripts/author_content.js --env=dev \
    --manifest=scripts/manifests/n5_vocab_nouns.json \
    --prefill=scripts/output/codex-l2-07b-nouns.json
  ```

---

## Codex — read everything below

You are drafting **N5 core nouns** for **Tomodachi** — a bilingual EN + AR Japanese-learning app for the MENA region. **123 nouns**, all the high-frequency stuff a learner sees first: people, family, places, food, objects, body parts, time words, weather, nature, language/study terms.

### Why this matters (the AR moat)

Tomodachi's primary moat is **Arabic-first pedagogy**. Vocab cards are the most-read content in any learning app. Five Arabic-speaking friends already flagged our L1 content for translationese — don't repeat that pattern.

For nouns specifically, the risk is **wrong register**. Japanese 友達 (tomodachi, friend) maps to AR «صديق» — but in modern Arabic, «صاحب» is equally common in conversational register, and «رفيق» is more formal. Pick the register that fits a modern app aimed at a smart 25-year-old MENA professional. Same for «شخص» vs «إنسان» for 人, «طعام» vs «أكل» for 食べ物, etc.

### Brand context (same as prior batches)

- **Audience:** MENA-first adult learners
- **Voice (EN):** Calm, capable, culturally respectful
- **Voice (AR):** Modern conversational MSA — Careem/Anghami register. Notes can be slightly more formal but never textbook.

### Web research — use it

- **Jisho.org** — for canonical Japanese meanings + readings
- **Tofugu** — for usage notes
- **JLPT Sensei N5 vocab** — for canonical N5 inclusion
- **Arabic-Japanese dictionaries** — Almaany, Reverso Arabic, MENA blogs
- **Modern Arabic app/web copy** — observe how Careem labels food categories, how Talabat names objects, how Anghami categorizes content

**Cite real URLs in `_meta.sources_consulted`.**

### Per-field authoring rules (same as L2.07a verbs spec)

The manifest seeds: `jlpt, category, japanese, reading, romaji, audio_key, example_audio_key, difficulty`. **You author:** `en.{primary, notes}, ar.{primary, notes}, example_ja, example_en, example_ar, related`.

**`en.primary`** — primary English noun. Short. Use the most common form ("friend" not "comrade", "house" not "dwelling"). For some nouns multiple translations are valid — pick the most-taught one.

**`en.notes`** — 1-2 sentences if non-obvious. Examples of useful notes:
- "Used for both rain (the precipitation) and rainfall (the event)."
- "More formal than お父さん (otousan). Use 父 (chichi) when talking ABOUT your own father to others."
- "Different from お茶 (ocha = tea) — 茶 alone is less common in modern usage."

Leave as empty string `""` if nothing useful to add.

**`ar.primary`** — primary Arabic noun. Modern conversational MSA. **Specific guidance for noun families:**

- **People + family terms:** prefer common modern words. «صديق» for friend (not «رفيق»). «طبيب» for doctor (not «حكيم»). For family, use the modern naming.
- **Places:** modern names. «مقهى» for café (not «حانة»). «مطعم» for restaurant.
- **Food/drink:** the most common Arabic name. «خبز» for bread. «شاي» for tea. «قهوة» for coffee. Note: many food/drink words are universal Arabic-tech-register loans (coffee → قهوة, chocolate → شوكولاتة) — use those.
- **Objects:** modern app-friendly words. «حقيبة» or «كيس» for bag depending on context. «مفتاح» for key.
- **Body parts:** standard MSA («رأس», «عين», «يد») — these are stable across dialects.
- **Time:** «اليوم», «غدًا», «أمس» (these are universal). «صباح», «ظهر», «مساء», «ليل».
- **Weather + nature:** standard MSA. «طقس», «مطر», «ثلج», «شمس», «قمر», «جبل», «نهر», «بحر», «شجرة», «زهرة».

When the noun is a loanword that's already naturalized in Arabic (computer → كمبيوتر, hotel → فندق, taxi → تاكسي), use the Arabized form. Tomodachi targets modern users, not classical-Arabic purists.

**`ar.notes`** — 1-2 sentences, parallel-authored. Cover same TYPES of info as `en.notes` (formality, contrast, usage) but framed for an Arabic-thinking learner. Often the AR notes can address something the EN notes don't (e.g., AR notes for お父さん could explain that the polite form is used when ADDRESSING fathers, while 父 is used when talking ABOUT your own father — but the framing is for an Arabic reader who's intuiting Japanese honorifics for the first time).

Leave as empty string if nothing useful.

**`example_ja`** — Japanese sentence (≤10 words, real-life context). Must contain the noun. Stay in N5 kanji + kana.

**`example_en`** — Natural English translation. Conversational.

**`example_ar`** — Natural Arabic translation. **Parallel-authored**, not literal. Drop pronouns where AR doesn't need them. Use the same modern register.

Example for 友達 (tomodachi, friend):
- `example_ja`: 友達と映画を見ました。
- `example_en`: I watched a movie with my friend.
- `example_ar`: شاهدت فيلمًا مع صديقي. *(natural; don't say «أنا شاهدت» — drop the pronoun)*

**`related`** — empty array `[]` for all entries. We'll backfill at L2.13.

### Style requirements (same as prior batches)

EN avoid-list: `easy, simple, just, click, awesome, amazing, leverage, elevate, unlock your potential, unleash, empower`. Em dash, Oxford commas.

AR forbidden markers: `دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`. Modern conversational MSA otherwise. Arabic punctuation. Western digits.

### Important: ordinal numbering

This manifest has ordinals 1-123. The verbs batch (L2.07a) also uses ordinals 1-82. Two items with the same ordinal in different categories is **intentional** — ordinals are per-category, not global. Don't worry about it.

### Output

Write to `scripts/output/codex-l2-07b-nouns.json` with this schema:

```json
{
  "type": "vocab",
  "category": "nouns",
  "source": "codex-l2-07b-nouns-2026-06-06",
  "_meta": {
    "authored_by": "codex",
    "spec": "docs/codex-spec-l2-07b-nouns-2026-06-06.md",
    "sources_consulted": ["..."]
  },
  "items": {
    "n5_v_001_person": {
      "en": { "primary": "person", "notes": "" },
      "ar": { "primary": "شخص", "notes": "" },
      "example_ja": "あの人は先生です。",
      "example_en": "That person is a teacher.",
      "example_ar": "ذلك الشخص معلّم.",
      "related": []
    }
  }
}
```

**Important:**

- ONLY author the fields listed above (en, ar, example_ja, example_en, example_ar, related)
- Do NOT include `key, jlpt, category, japanese, reading, romaji, audio_key, example_audio_key, difficulty` — those come from manifest seed
- All 123 keys MUST be present
- Pure JSON, no trailing commas, no code fences

### Acceptance criteria

- [ ] All 123 keys present in manifest order
- [ ] Each item has en.primary, ar.primary, example_ja, example_en, example_ar populated
- [ ] notes can be empty strings — but if you write a note, it must be useful, not filler
- [ ] No forbidden AR markers
- [ ] AR uses Arabic punctuation
- [ ] EN avoids the filler list
- [ ] No emoji, no double-hyphen, em dash only
- [ ] Each AR example is parallel-authored (drop pronouns; don't mirror EN word order)
- [ ] Examples use N5-only kanji where possible
- [ ] `_meta.sources_consulted` cites real URLs
- [ ] JSON validates

### Self-review checklist

1. **Read 20 random `ar.primary` aloud.** Each should be the noun a native Arabic speaker reaches for first — not the dictionary word. If a more modern equivalent exists, use it.
2. **Read 15 random `example_ar` aloud.** Each should feel native. Drop pronouns where AR doesn't need them.
3. **Check loanwords:** for naturalized loanwords (coffee, hotel, taxi, computer, restaurant), use the Arabized form, not literal Arabic equivalents that no one says.
4. **Family terms** — distinguish the talk-about-own vs honorific-address conventions (父 vs お父さん etc.). Note this in `notes` where it's not obvious.
5. **Notes triage:** if a note feels like "this is a noun" — delete it. Empty string better than filler.
6. **JSON validates.** Count braces.
7. **Count: 123 keys present.**

Nouns set the texture of everyday vocab. **Quality matters more than speed.**

---

## Claude's post-Codex review

1. File parses, all 123 keys present
2. Validate every item via `validateContentItem('vocab', item)` after seed merge
3. Sample 25 ar.primary entries for natural-noun selection
4. Sample 20 example_ar for translationese / pronoun-mirroring
5. Spot-check 10 random `notes` fields — flag any filler
6. Verify no dialect markers, no Latin in AR fields
7. Report summary
