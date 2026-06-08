# Codex spec — L2.07c N5 core adjectives (59 entries, vocab cards)

> **Date:** 2026-06-06
> **Phase:** L2.07c — third vocab batch (parallel with all other wave-2 sessions)
> **Visibility:** TRACKED
> **Target output:** `scripts/output/codex-l2-07c-adjectives.json`

---

## Note for the project lead

- Give Codex read access to this file
- Codex writes the result directly to `scripts/output/codex-l2-07c-adjectives.json`
- Independent of other wave-2 sessions
- CLI after review:
  ```
  node scripts/author_content.js --env=dev \
    --manifest=scripts/manifests/n5_vocab_adjectives.json \
    --prefill=scripts/output/codex-l2-07c-adjectives.json
  ```

---

## Codex — read everything below

You are drafting **N5 core adjectives** for **Tomodachi** — a bilingual EN + AR Japanese-learning app for the MENA region. **59 adjectives total**: 43 i-adjectives + 16 na-adjectives.

### The critical distinction (read first)

Japanese has two adjective classes with different conjugation behavior:

- **i-adjectives**: end in い in dictionary form, conjugate by replacing い (e.g., 大きい → 大きくない negative, 大きかった past). They behave like verbs.
- **na-adjectives**: require な to modify a noun (e.g., 元気な人), use です/だ as predicate copula. They behave more like nouns.

The manifest's `adj_type_hint` field tells you which is which for each item. **This must be reflected in `notes`** for every adjective so the learner knows how to conjugate it.

A few tricky cases in this set:
- 綺麗 (kirei) — ends in い in romaji but is a **na-adjective** (the い is part of the kanji reading, not a true い-ending). Mark this clearly.
- いい / 良い (ii / yoi) — i-adjective but with **irregular conjugation**: past is よかった, negative is よくない. Mark this clearly.
- 大丈夫 (daijoubu) — usually used in conversational contexts like "It's OK / Don't worry". Note this register.

### Why this matters (the AR moat)

Adjectives describe everyday experience — the difference between "good food" and "good person" matters in Arabic. The risk here is **wrong Arabic register**:

- 楽しい (tanoshii, fun) is NOT «بهيج» (textbook word, no one uses) — it's «ممتع» (modern conversational)
- 面白い (omoshiroi, interesting) is NOT «طريف» (slightly old-fashioned) — it's «مثير للاهتمام» or simply «ممتع» in conversational register
- 簡単 (kantan, simple/easy in the difficulty sense) is NOT «بسيط» (which can mean naive/simple-minded) — it's «سهل»

Pick the AR adjective a modern MENA professional would actually use.

### Brand context (same as prior batches)

- **Voice (EN):** Calm, capable, culturally respectful
- **Voice (AR):** Modern conversational MSA — Careem/Anghami register

### Web research — use it

- **Jisho.org** — canonical meanings + adjective class
- **Tofugu's adjective guides** — for usage notes
- **JLPT Sensei N5 vocab**
- **Arabic-Japanese resources** for translation conventions
- **Modern Arabic UI copy** — how Talabat describes restaurant traits ("delicious", "fast"), how Careem describes ride conditions ("comfortable", "convenient")

**Cite real URLs.**

### Per-field authoring rules

The manifest seeds: `jlpt, category, japanese, reading, romaji, audio_key, example_audio_key, difficulty`. **You author:** `en.{primary, notes}, ar.{primary, notes}, example_ja, example_en, example_ar, related`.

**`en.primary`** — primary English meaning. Convention: include "to be" prefix only if it adds clarity ("tall" not "to be tall"; "alright" can work alone). For colors, just use the color name ("red", "blue"). For ones with multiple meanings, pick the most-taught one and note the alternate in `notes`.

**`en.notes`** — **MANDATORY**: always include conjugation class. Examples:
- "i-adjective. Negative: 大きくない. Past: 大きかった."
- "na-adjective. Uses な before nouns (元気な人 = energetic person). Past: 元気でした."
- "i-adjective with **irregular** conjugation: negative よくない, past よかった (NOT よいかった)."
- "Despite ending in い, this is a **na-adjective** because い is part of the kanji reading. Conjugates with な, です, でした."

Additional info if non-obvious (e.g., 早い vs 速い homophones, 暑い vs 熱い distinction, 易しい vs 優しい homophone).

**`ar.primary`** — primary Arabic adjective. **Modern conversational MSA.** Use the form a MENA app would use, not the literary one. Specific notes:

- For physical attributes (big/small/tall/short): use the standard MSA («كبير», «صغير», «طويل», «قصير»). These are stable.
- For emotional/experiential states (fun/boring/interesting/difficult): pick the conversational word. «ممتع» for fun, «ممل» for boring, «مثير للاهتمام» or simpler «شيّق» for interesting, «صعب» for difficult.
- For value words (good/bad/important): use modern forms. «جيّد» or «حسن» for good. «سيّء» for bad. «مهم» for important.
- For colors: standard («أحمر», «أزرق», «أبيض», «أسود», «أصفر»).
- For na-adjectives like 元気 — translate to a state «بصحة جيّدة / نشيط». For 好き — translate to a verbal expression «يحب» (since "like" is verbal in Arabic).
- 大丈夫 → «لا بأس» or «الأمور بخير» — conversational, not literal.

**Important:** Japanese adjective is dictionary form (大きい). Arabic adjective should be the masculine singular form («كبير») as the citation form. Add a note if gender-agreement matters in usage.

**`ar.notes`** — **MANDATORY** for adjectives — must clarify Japanese conjugation behavior for an Arabic-thinking learner. Examples:
- «صفة من نوع i-adjective. النفي: 大きくない. الماضي: 大きかった.»
- «صفة من نوع na-adjective. تأخذ な قبل الاسم (元気な人). الماضي: 元気でした.»
- «على الرغم من انتهائها بـ い، فهي na-adjective لأن الـ い جزء من قراءة الكانجي.»

Additional info: pitfalls, common usage notes, when the Arabic translation isn't 1:1 (e.g., 好き being adjectival in Japanese but verbal in Arabic).

**`example_ja`** — single Japanese sentence using the adjective in a typical role (either modifying a noun or as predicate). Stay in N5 territory.

**`example_en`** — natural English translation. Avoid mirroring word-for-word.

**`example_ar`** — natural Arabic translation. **Parallel-authored**, not literal. Arabic adjectives agree with nouns in gender/number — make sure agreement is correct.

Example for 大きい (ookii):
- ja: 大きい犬がいます。
- en: There's a big dog.
- ar: يوجد كلب كبير. *(adjective agrees with masculine «كلب»)*

Example for 元気 (genki):
- ja: 元気な子供たちです。
- en: They are energetic kids.
- ar: هم أطفال نشيطون. *(plural adjective agrees with «أطفال»)*

**`related`** — empty array `[]` for all entries.

### Style requirements

EN avoid-list: `easy, simple, just, click, awesome, amazing, leverage, elevate, unlock your potential, unleash, empower`. Em dash, Oxford commas, sentence case.

(Note: "easy" is on the avoid list as **filler**. But when "easy" is the **literal translation of 易しい** in the `en.primary` field, that's allowed — it's the meaning of the word, not filler.)

AR forbidden markers: `دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`. Modern conversational MSA. Arabic punctuation. Western digits.

### Output

Write to `scripts/output/codex-l2-07c-adjectives.json` with schema:

```json
{
  "type": "vocab",
  "category": "adjectives",
  "source": "codex-l2-07c-adjectives-2026-06-06",
  "_meta": {
    "authored_by": "codex",
    "spec": "docs/codex-spec-l2-07c-adjectives-2026-06-06.md",
    "sources_consulted": ["..."]
  },
  "items": {
    "n5_v_001_big": {
      "en": { "primary": "big", "notes": "i-adjective. Negative: 大きくない. Past: 大きかった." },
      "ar": { "primary": "كبير", "notes": "صفة من نوع i-adjective. النفي: 大きくない. الماضي: 大きかった." },
      "example_ja": "大きい犬がいます。",
      "example_en": "There's a big dog.",
      "example_ar": "يوجد كلب كبير.",
      "related": []
    }
  }
}
```

**Important:**

- Per-item ONLY: `en.{primary, notes}, ar.{primary, notes}, example_ja, example_en, example_ar, related`
- Do NOT include the seeded fields
- All 59 keys MUST be present
- **`notes` is MANDATORY for adjectives** (unlike nouns/verbs where it's optional)
- Pure JSON

### Acceptance criteria

- [ ] All 59 keys present, manifest order
- [ ] Each item has en.primary, ar.primary, **en.notes AND ar.notes** (non-empty — mandatory for adjectives), example_ja, example_en, example_ar
- [ ] Every `notes` field contains the i-adj / na-adj distinction
- [ ] Irregular cases noted: いい (irregular conjugation), 綺麗 (na-adj despite い ending)
- [ ] No forbidden AR markers
- [ ] Arabic punctuation, Western digits, em dash
- [ ] AR examples have correct gender/number agreement
- [ ] Examples use N5-only kanji
- [ ] `_meta.sources_consulted` cites real URLs
- [ ] JSON validates

### Self-review checklist

1. **Verify every `notes` includes adjective class.** Pick 10 random items; check both `en.notes` and `ar.notes` say "i-adjective" or "na-adjective" (or AR equivalent).
2. **Read 15 random `ar.primary` aloud.** Pick the conversational-MSA word, not the literary one. «ممتع» beats «بهيج». «شيّق» beats «طريف».
3. **Check `example_ar` agreement.** Arabic adjective agrees with subject in gender/number/case. Verify 5 random examples.
4. **Verify irregular cases:** 良い (irregular), 綺麗 (na-adj despite い).
5. **No filler notes.** Every note must teach something — conjugation, contrast, or pitfall.
6. **JSON validates.** 59 keys present.

Adjectives compound across hundreds of sentences. **Get them right.**

---

## Claude's post-Codex review

1. File parses, all 59 keys
2. Validate via `validateContentItem('vocab', item)` after seed merge
3. Verify every item has non-empty notes containing adj-class info
4. Sample 20 ar.primary for register naturalness
5. Sample 15 example_ar for gender/number agreement
6. Spot-check irregular cases (いい, 綺麗)
7. Report summary
