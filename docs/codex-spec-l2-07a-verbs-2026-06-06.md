# Codex spec — L2.07a N5 core verbs (82 entries, vocab cards)

> **Date:** 2026-06-06
> **Phase:** L2.07a — first vocab batch (parallel with other wave-2 sessions)
> **Visibility:** TRACKED (Codex's output is gitignored T4)
> **Target output:** `scripts/output/codex-l2-07a-verbs.json`

---

## Note for the project lead

- Give Codex read access to this file
- Codex writes the result directly to `scripts/output/codex-l2-07a-verbs.json`
- Independent of all other wave-2 sessions — run in parallel
- After Codex finishes, ping Claude for the post-Codex review
- CLI command after review:
  ```
  node scripts/author_content.js --env=dev \
    --manifest=scripts/manifests/n5_vocab_verbs.json \
    --prefill=scripts/output/codex-l2-07a-verbs.json
  ```

---

## Codex — this spec is for you. Read everything below.

You are drafting the **core N5 verb vocabulary cards** for **Tomodachi** — a bilingual EN + AR Japanese language-learning app for the MENA region.

This is the **first vocab batch** of the curriculum. Verbs are pedagogically central — every Japanese sentence needs a verb, and the verb conjugation system is the backbone of N5 grammar. Quality here sets the tone for the whole vocab corpus (~800 items total across wave 2 + later batches).

### Why this matters (the AR moat)

Tomodachi's primary moat is **Arabic-first pedagogy**. Vocab card translations are the most-read content in any learning app — if the AR translations feel auto-translated, the moat collapses. The kana + kanji batches already shipped in modern Careem/Anghami register; vocab must match that voice.

Two specific risks for verb translations:

1. **Lazy literal translations** — Japanese 食べる ≠ just "to eat" in Arabic. A native AR speaker often expresses "to eat" as «يأكل» or «يتناول الطعام» depending on context. Picking the most natural Arabic verb form is critical.
2. **Wrong verb form in AR** — Japanese verb dictionary form maps to **present-tense/imperfect Arabic** («يأكل», not «أكل»). Don't translate to past tense by accident.

### Brand context

- **Audience:** MENA-first adult learners, mobile-first
- **Brand name:** `Tomodachi` in EN, «تومودَاتشي» in AR
- **Voice (EN):** Calm, capable, culturally respectful. Like a knowledgeable friend at a café.
- **Voice (AR):** Modern conversational MSA — Careem/Anghami register. Vocab `notes` field can be slightly more formal than mnemonic micro-copy, but still modern-app voice.

### Web research — use it

Spend 5-10 minutes browsing for verb meanings + usage notes:

- **Jisho.org** — <https://jisho.org> — primary authority for Japanese verb meanings + conjugation class (ichidan/godan/irregular)
- **Tofugu's verb guide** — for usage nuance
- **JLPT Sensei N5 vocab** — for canonical N5 verb selection
- **Tanos's N5 vocab list** — for confirming inclusion
- **Arabic-Japanese dictionaries** — search for Arabic translation conventions (Almaany, Reverso Arabic, MENA-language tutoring blogs)
- **Common Arabic learner-of-Japanese explanations** — YouTube channels like عرب نيهون for how native AR speakers describe Japanese verbs

**Use your search tool. Cite real URLs in `_meta.sources_consulted`.**

### Per-field authoring rules

The manifest seeds the following fields — **do not overwrite them**: `jlpt, category, japanese, reading, romaji, audio_key, example_audio_key, difficulty`. The CLI merges your output with these seeds.

**You author these fields:**

**`en.primary`** — the primary English translation. Short. Verb form: "to X" (e.g., "to eat", "to be able"). For verbs with multiple common meanings, pick the most-frequently-taught one.

**`en.notes`** — 1-2 sentences, **only if non-obvious**. Cover:
- Conjugation class if relevant ("Ichidan verb. Polite form: 食べます (tabemasu).")
- Common particle that pairs with it ("Takes を for the object eaten.")
- Common pitfall ("Different from 居る (iru = to need) — same kana, different kanji.")

If the meaning + class are obvious from the verb itself, **leave `notes` as an empty string `""`**. Don't write filler notes.

**`ar.primary`** — the primary Arabic translation. **Use the imperfect (present-tense) form** to match the Japanese dictionary form. Examples:
- 食べる → «يأكل» (NOT «أكل» which is past tense)
- 行く → «يذهب»
- 来る → «يأتي»
- 見る → «يرى» or «يشاهد» depending on context
- する → «يفعل» or «يقوم بـ» depending on context

Pick the most natural Arabic verb. Don't pick the textbook word if a more conversational native verb exists. Modern conversational MSA.

**`ar.notes`** — 1-2 sentences, parallel-authored (not translated from `en.notes`). Cover the same TYPES of information (class, common particle, pitfalls) but framed for an Arabic-thinking learner. If nothing useful to add in AR, leave empty `""`.

When mentioning the verb class, use Arabic-friendly phrasing:
- ichidan → «فعل من الفئة الأولى (ichidan)» or «فعل ichidan»
- godan → «فعل من الفئة الثانية (godan)»
- irregular → «فعل شاذ»

Modern apps don't always include linguistic-class info — only add it if learners need to know it for conjugation. For most verbs, the polite form is more useful info than the class label.

**`example_ja`** — Japanese example sentence (≤10 words, real-life context). Must contain the verb (in dictionary or polite form). Avoid kanji not in the N5 set. Per CONTENT_GUIDELINES §9.3.

**`example_en`** — Natural English translation. Conversational. Not literal word-for-word.

**`example_ar`** — Natural Arabic translation. **Parallel-authored**, not literal. Modern conversational MSA. Same scene as EN but the AR phrasing should feel native — don't mirror EN word order.

Example:
- `example_ja`: 朝ご飯を食べます。
- `example_en`: I eat breakfast.
- `example_ar`: آكُل الفطور في الصباح. *(NOT «أنا آكل الإفطار» which is too literal — drop pronouns where AR doesn't need them)*

**`related`** — optional array of up to 5 vocab keys for related words. Since most vocab keys don't exist yet (this is the first batch), **leave as empty array `[]`** for all entries. We'll backfill at L2.13.

### Style requirements (contractual)

**EN — words to AVOID:** `easy`, `simple`, `just`, `click` (use `tap`), `awesome`, `amazing` (as filler), `leverage`, `elevate`, `unlock your potential`, `unleash`, `empower`. Em dash (—) not double-hyphen. Oxford commas.

**AR — strictly FORBIDDEN markers:** `دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`. Otherwise: modern conversational MSA. Arabic punctuation (، ؟). Western digits (1, 2, 3).

**Tashkeel:** sparing — only where ambiguity would harm pronunciation.

### The 82 verbs to author

Use these exact keys (they match `scripts/manifests/n5_vocab_verbs.json`). The manifest includes hint fields per item: `japanese_hint`, `reading_hint`, `romaji_hint`, `class_hint` (ichidan/godan/irregular), `expected_meaning_en`. These guide your authoring but aren't written to Firestore.

You'll find these verbs in the manifest covering:

- Existence + ultra-core: いる, ある, する, 来る, 行く, 帰る
- Perception: 見る, 聞く, 読む, 書く
- Speech: 話す, 言う, 教える, 習う, 勉強する
- Consumption: 食べる, 飲む
- Daily life: 起きる, 寝る, 立つ, 座る, 歩く, 走る, 泳ぐ, 飛ぶ
- Activity: 働く, 休む, 遊ぶ, 練習する, 旅行する
- Transactions: 買う, 売る, 払う, 作る, 使う
- Possession + transfer: 持つ, 取る, あげる, もらう, 貸す, 借りる
- Open/close + on/off: 開ける, 閉める, つける, 消す, 入れる, 出す
- Enter/exit: 入る, 出る
- Beginning + ending: 始める, 終わる
- Social: 待つ, 会う, 呼ぶ, 答える
- Cognition: 思う, 知る, 分かる, 出来る, 覚える, 忘れる
- Wearing: 着る, 履く, 脱ぐ
- Household: 洗う, 掃除する, 洗濯する, 料理する
- Movement: 乗る, 降りる, 着く, 渡る, 曲がる
- Misc high-frequency: 撮る, 歌う, 踊る, 泣く, 笑う, 見せる
- Explain/ask: 説明する, 質問する
- State: 要る

### Output

Write a single JSON file at:

```
scripts/output/codex-l2-07a-verbs.json
```

Schema (per-item shape; CLI fills seeded fields):

```json
{
  "type": "vocab",
  "category": "verbs",
  "source": "codex-l2-07a-verbs-2026-06-06",
  "_meta": {
    "authored_by": "codex",
    "spec": "docs/codex-spec-l2-07a-verbs-2026-06-06.md",
    "sources_consulted": [
      "https://jisho.org",
      "..."
    ]
  },
  "items": {
    "n5_v_016_eat": {
      "en": { "primary": "to eat", "notes": "Ichidan verb. Polite: 食べます. Takes を for the object eaten." },
      "ar": { "primary": "يأكل", "notes": "فعل من الفئة الأولى (ichidan). صيغة المهذَّب: 食べます." },
      "example_ja": "朝ご飯を食べます。",
      "example_en": "I eat breakfast.",
      "example_ar": "آكُل الفطور في الصباح.",
      "related": []
    }
  }
}
```

**Important:**

- Per-item: ONLY `en.{primary,notes}`, `ar.{primary,notes}`, `example_ja`, `example_en`, `example_ar`, `related`
- Do NOT include `key`, `jlpt`, `category`, `japanese`, `reading`, `romaji`, `audio_key`, `example_audio_key`, `difficulty` — those come from the manifest seed
- All 82 keys MUST be present
- Pure JSON; no trailing commas, no code fences around the file
- Write to file path directly; do not paste in chat

### Acceptance criteria

- [ ] All 82 keys present, in manifest order
- [ ] Each item has en.primary, ar.primary, example_ja, example_en, example_ar populated; notes can be empty strings if nothing useful to add
- [ ] No AR forbidden markers anywhere
- [ ] AR uses Arabic punctuation
- [ ] EN avoids the filler-word list
- [ ] No emoji in any field
- [ ] No double-hyphen — em dash (—) only
- [ ] All AR primary translations use imperfect/present-tense form (e.g., «يأكل» not «أكل»)
- [ ] Example sentences use only N5-or-lower kanji/vocab where possible
- [ ] `_meta.sources_consulted` cites real URLs
- [ ] JSON validates

### Self-review checklist (slow down — vocab quality compounds across 800 items)

1. **Read 15 random `ar.primary` aloud.** Each should be the natural Arabic verb a native speaker would reach for. Reject literal translations.
2. **Read 15 random `example_ar` aloud.** Each should feel like a sentence a native Arabic speaker would write — not mirroring EN word order. Drop pronouns where AR doesn't need them.
3. **Check verb-form correctness:** every `ar.primary` should be in imperfect/present form. If you see «أكل» (past tense) for 食べる, fix to «يأكل».
4. **Check `notes` value:** is the note actually useful, or is it filler? If filler, leave as empty string. CONTENT_GUIDELINES §9.2: "Brief — 1-2 sentences max. Captures the ONE thing that would otherwise confuse the learner."
5. **Check example sentences:** each one should illustrate the verb in a realistic context. No "the cat sits on the moon" surrealism (§9.3).
6. **AR voice check:** modern conversational MSA. Not textbook formality. Read each example aloud.
7. **JSON validates.** Count braces.
8. **Count: 82 keys present.**

Verbs set the tone for vocab. **Quality matters more than speed.**

---

## Claude's post-Codex review (NOT for Codex to act on)

After Codex finishes:

1. Confirm file exists + parses
2. All 82 keys present in manifest order
3. Validate every item against `validateContentItem('vocab', item)` after seed merge
4. Sample-read 20 random `ar.primary` for natural Arabic verb selection
5. Sample-read 20 random `example_ar` for translationese
6. Verify ALL `ar.primary` entries are in imperfect/present tense
7. Spot-check `en.notes` and `ar.notes` for filler — flag any that feel like "this is a verb" stating-the-obvious
8. Verify no dialect markers, no Latin in AR
9. Verify example sentences use only N5 kanji
10. Report summary to project lead

If >10 items need re-draft: partial failure, ask Codex to redo those keys.
