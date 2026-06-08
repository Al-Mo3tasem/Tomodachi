# Codex spec — L2.07d N5 misc vocab (89 entries, vocab cards)

> **Date:** 2026-06-06
> **Phase:** L2.07d — fourth vocab batch (parallel with other wave-2 sessions)
> **Visibility:** TRACKED
> **Target output:** `scripts/output/codex-l2-07d-misc.json`

---

## Note for the project lead

- Give Codex read access to this file
- Codex writes the result directly to `scripts/output/codex-l2-07d-misc.json`
- Independent of other wave-2 sessions
- CLI after review:
  ```
  node scripts/author_content.js --env=dev \
    --manifest=scripts/manifests/n5_vocab_misc.json \
    --prefill=scripts/output/codex-l2-07d-misc.json
  ```

---

## Codex — read everything below

You are drafting the **N5 miscellaneous vocab batch** for **Tomodachi** — a bilingual EN + AR Japanese-learning app for the MENA region. **89 items** spanning:

- **Adverbs (14)** — degree, frequency, manner: とても, たくさん, よく, あまり, etc.
- **Expressions / demonstratives / interrogatives (40)** — これ/それ/あれ/どれ, ここ/そこ/あそこ/どこ, 何/誰/いつ/どうして, greetings (こんにちは, ありがとう, すみません), conjunctions (それから, でも), affirmative/negative (はい, いいえ)
- **Counters (10)** — 個 / 人 / 本 / 枚 / 匹 / 台 / 階 / 回 / 歳 / 冊
- **Time / numbers (18)** — numbers 0-10000 (ゼロ through 万), 時 (o'clock), 分 (minutes), 半 (half-past), 時間 (hour as duration)
- **Days of the week (7)** — Monday through Sunday

This batch has **the most category diversity** of any in wave 2 — Codex needs to handle each category appropriately.

### Why this matters (the AR moat)

This is where **app voice** is most visible. Greetings, demonstratives, common expressions — these are the words a learner will see on the home screen, in the first lesson, in onboarding. If «ありがとう» is translated as «شكرًا لك» (literal) instead of just «شكرًا» (what people actually say), the moat shows its seams. Same for «すみません» — could be «معذرة» (formal) or «آسف» (everyday); pick what a modern Arabic app would say.

### Category-specific guidance

#### Adverbs

- AR translations should be the conversational equivalent, not the literary one.
- «とても» = «جدًا» (universal modifier suffix, comes AFTER the adjective in Arabic just like very-after-X works).
- «少し» / «ちょっと» = «قليلًا» (formal) or «شوية» (avoid — colloquial dialect). Use «قليلًا» — modern MSA conversational.
- «たくさん» = «الكثير» / «كثيرًا»
- «あまり» — must be paired with negative in Japanese. Note this in `notes`: "Used with negative — あまり〜ない = not much".
- «よく» — has two meanings: "often" (frequency) and "well" (manner). Note this.
- «いつも» = «دائمًا»
- «一緒に» = «معًا» — note that it pairs with the partner via と (e.g., 友達と一緒に).

#### Demonstratives — こ/そ/あ/ど series

This is **conceptually critical** for Japanese learners. Note in the EN/AR `notes` that:

- こ = near speaker, そ = near listener, あ = far from both, ど = question
- pronoun form (これ/それ/あれ/どれ — stands alone)
- adjectival form (この/その/あの/どの — used before a noun)
- Locative form (ここ/そこ/あそこ/どこ — for locations)

For each item in this batch, the `notes` field must clearly state which row (こ/そ/あ/ど) and which form (pronoun / adjectival / locative) the word belongs to. This is non-obvious and important.

AR equivalents:
- これ = «هذا» (m.) / «هذه» (f.) — note: Arabic distinguishes gender, Japanese doesn't. In example sentences, agree with the noun.
- それ = «ذلك» (m.) / «تلك» (f.) — for near-listener distance
- あれ = «ذلك» (m.) — far from both
- ここ = «هنا», そこ = «هناك», あそこ = «هناك بعيدًا» or «هناك» depending on context

#### Interrogatives

- «何» (nani/nan) — note the reading variation: なに alone, なん when followed by certain sounds (counter, です). Critical for learners.
- «どうして» / «なぜ» — both mean "why" but どうして is more conversational. Note this.
- «いくら» — specifically for money. «いくつ» — for counting items or age.
- «どちら» — between two options. «どれ» — among three or more.

#### Greetings and expressions

**Pick the conversational Arabic for each:**

- «こんにちは» — modern Arabic greeting in any time-bound app: «مرحبًا» works universally. «أهلًا» also fine. Avoid the time-bound «صباح الخير» which doesn't match the Japanese-anytime greeting.
- «おはよう» = «صباح الخير»
- «こんばんは» = «مساء الخير»
- «おやすみ» = «تصبح على خير» (m.) / «تصبحين على خير» (f.) — note the gender agreement in conversational AR
- «さようなら» = «وداعًا» (formal) or «إلى اللقاء» (slightly less formal) — pick the most universal
- «ありがとう» = «شكرًا» (drop the «لك» suffix — modern apps say just «شكرًا»)
- «すみません» — has DUAL meaning: "excuse me" (calling attention) AND "I'm sorry" (apologizing). Note this in `notes`. AR: «عذرًا» for excuse me, «آسف» for sorry. Pick the most common single rendering and note the dual use.
- «お願いします» — please/request. AR: «من فضلك» (conversational) or «أرجوك» (more emphatic). Note the Japanese cultural usage.
- «はじめまして» — first meeting. AR: «تشرّفت بمعرفتك» (formal) or «سعيد بلقائك» (conversational).
- «いただきます» / «ごちそうさま» — pre/post meal expressions. AR has no exact equivalents — these are Japanese-cultural. Note this clearly in `notes`: "Japanese cultural expression; no direct Arabic equivalent. Literal: لقد تناولت بشكر / كان وليمة. In Arabic culture, similar moments use «بسم الله» before and «الحمد لله» after."
- «ただいま» / «お帰りなさい» — same: Japanese-cultural expressions. Note this.
- «はい» / «いいえ» — «نعم» / «لا». Universal.

#### Counters

- For counters, the `en.primary` should be the COUNTER name + usage (e.g., "counter for people"), not the kanji's meaning.
- The `notes` field MUST explain WHEN to use it (which kinds of objects).
- The `notes` field should also mention the **pronunciation irregularities** for counters with non-trivial sound changes — e.g., 本 (hon) → いっぽん (ippon), さんぼん (sanbon); 匹 (hiki) → いっぴき (ippiki).
- AR translations of counters are typically descriptive ("counter for people" → «وحدة عدّ الأشخاص» — but a simpler «أداة عدّ تُستخدم للأشخاص» might be clearer in `notes`).

#### Numbers

- For numbers 1-10, `en.primary` is the English number ("one", "two", "three"...). `en.notes` should mention if there are alternate readings (e.g., 4 = よん OR し; 7 = なな OR しち; 9 = きゅう OR く). State which is more common in everyday use.
- For 100, 1000, 10000, note that 万 (man) is used differently from English — 10,000 is "one man" in Japanese, 20,000 is "two man" (二万). This is non-obvious and important.
- AR numbers: use Western digits and the Arabic word for the number («واحد», «اثنان», «ثلاثة»...) — most modern Arabic UIs use Western digits visually but the words in prose.

#### Days of the week

- Each is a compound: kanji + 曜日 (youbi = day-of-the-week). The kanji corresponds to the celestial body / element (月=moon, 火=fire, 水=water, 木=wood, 金=gold, 土=earth, 日=sun).
- The `notes` field should mention this — it's a fun pedagogical anchor and helps memorization.
- AR translations: «الإثنين», «الثلاثاء», «الأربعاء», «الخميس», «الجمعة», «السبت», «الأحد».

### Web research — use it

- **Jisho.org** — for any item where you're unsure of the canonical Japanese form
- **Tofugu** — for usage notes and cultural context
- **Arabic-Japanese resources** for greeting conventions, counter idioms
- **Modern Arabic UI copy** — observe how Talabat, Anghami, Careem handle these same kinds of strings

**Cite real URLs.**

### Per-field rules (same baseline as L2.07a-c)

- Manifest seeds: `jlpt, category, japanese, reading, romaji, audio_key, example_audio_key, difficulty`
- You author: `en.{primary, notes}, ar.{primary, notes}, example_ja, example_en, example_ar, related`
- `related` is empty array `[]` everywhere
- `notes` field is **highly encouraged** for this batch — almost every item has something non-obvious that a learner needs to know (which row of demonstrative, how to use the counter, dual meaning of すみません, Japanese-cultural expression with no Arabic equivalent, etc.)

### Style requirements (same as prior batches)

EN avoid-list: `easy, simple, just, click, awesome, amazing, leverage, elevate, unlock your potential, unleash, empower`. Em dash, Oxford commas.

AR forbidden markers: `دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`. Modern conversational MSA. Arabic punctuation. Western digits.

### Output

Write to `scripts/output/codex-l2-07d-misc.json` with schema (per-item shape):

```json
{
  "type": "vocab",
  "source": "codex-l2-07d-misc-2026-06-06",
  "_meta": {
    "authored_by": "codex",
    "spec": "docs/codex-spec-l2-07d-misc-2026-06-06.md",
    "sources_consulted": ["..."]
  },
  "items": {
    "n5_v_001_very": {
      "en": { "primary": "very", "notes": "Degree adverb. Used before adjectives: とても大きい = very big." },
      "ar": { "primary": "جدًا", "notes": "ظرف تأكيد. يأتي بعد الصفة في العربية، وعكس الياباني التي تأتي قبلها." },
      "example_ja": "この本はとても面白いです。",
      "example_en": "This book is very interesting.",
      "example_ar": "هذا الكتاب مثير للاهتمام جدًا.",
      "related": []
    }
  }
}
```

**Important:**

- Per-item ONLY: `en.{primary, notes}, ar.{primary, notes}, example_ja, example_en, example_ar, related`
- Do NOT include seeded fields
- All 89 keys MUST be present
- Pure JSON, no trailing commas, no code fences

### Acceptance criteria

- [ ] All 89 keys present, manifest order
- [ ] Every item has en.primary, ar.primary, example_ja, example_en, example_ar
- [ ] `notes` is populated wherever non-obvious info exists (which is most of this batch)
- [ ] No forbidden AR markers
- [ ] Arabic punctuation, Western digits, em dash
- [ ] AR examples have correct gender/number agreement where applicable
- [ ] Demonstrative notes specify the こ/そ/あ/ど row and form (pronoun/adj/locative)
- [ ] Counter notes specify what kinds of objects each counts
- [ ] Number notes mention alternate readings (4 = よん/し etc.) where applicable
- [ ] Day-of-week notes mention the kanji-to-element mapping (memorization anchor)
- [ ] Cultural-expression notes (いただきます etc.) explain the no-Arabic-equivalent status
- [ ] `_meta.sources_consulted` cites real URLs
- [ ] JSON validates

### Self-review checklist

1. **Read all 16 greetings/expressions aloud in Arabic.** Each should be what a real Arabic app would say. «شكرًا» not «شكرًا لك» for ありがとう. «مرحبًا» not «صباح الخير» for こんにちは.
2. **Demonstrative notes** — for all 12 こ/そ/あ/ど series items, confirm `notes` specifies the row + form.
3. **Counter notes** — for all 10 counters, confirm `notes` explains the typical objects + any pronunciation irregularities.
4. **Number notes** — confirm alternate readings noted where applicable (4, 7, 9 especially).
5. **すみません dual meaning** — confirm `notes` covers both "excuse me" and "sorry".
6. **Cultural expressions** — いただきます, ごちそうさま, ただいま, お帰りなさい — confirm `notes` flags these as Japanese-cultural with no direct Arabic equivalent.
7. **JSON validates.** 89 keys present.

This is the highest-pedagogical-density vocab batch. **Get the notes right.**

---

## Claude's post-Codex review

1. File parses, all 89 keys
2. Validate via `validateContentItem('vocab', item)` after seed merge
3. Sample greetings (16 items) for register naturalness
4. Sample demonstratives (12 items) for row+form clarity in notes
5. Sample counters (10 items) for usage clarity + pronunciation notes
6. Verify cultural expressions are flagged appropriately
7. Spot-check 5 random examples for AR agreement
8. Report summary
