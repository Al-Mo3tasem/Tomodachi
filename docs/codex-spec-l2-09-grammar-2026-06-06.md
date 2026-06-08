# Codex spec — L2.09 N5 grammar (54 patterns, full structure)

> **Date:** 2026-06-06
> **Phase:** L2.09 — grammar content batch (wave 2; parallel with L2.07 vocab batches)
> **Visibility:** TRACKED (Codex's output is gitignored T4)
> **Target output:** `scripts/output/codex-l2-09-grammar.json`

---

## Note for the project lead

- Give Codex read access to this file (no copy-paste needed)
- Codex writes the result directly to `scripts/output/codex-l2-09-grammar.json`
- Independent of all other wave-2 sessions — run in parallel with vocab batches
- After Codex finishes, ping Claude for the post-Codex review
- CLI command after review:
  ```
  node scripts/author_content.js --env=dev \
    --manifest=scripts/manifests/n5_grammar.json \
    --prefill=scripts/output/codex-l2-09-grammar.json
  ```

---

## Codex — this spec is for you. Read everything below.

You are drafting the **complete N5 grammar lesson set** for **Tomodachi** — a bilingual EN + AR Japanese language-learning app targeting the MENA region.

Grammar is the **pedagogical backbone** — vocab gets learners to recognize words, but grammar lets them **build sentences**. Each grammar card carries: bilingual title, bilingual body (1-2 paragraph explanation), 2-4 example sentences with breakdowns, difficulty, estimated minutes.

### Why this matters (the AR moat — same as kana/kanji)

Tomodachi's primary moat is **Arabic-first pedagogy**. Most Japanese-learning apps machine-translate grammar explanations to Arabic, and the result is exactly the kind of clunky textbook prose Arabic readers reject. Five Arabic-speaking friends flagged our L1 content for this last week.

For grammar especially, this matters because **explanations are the densest text** the learner sees. A clunky body_ar = the moat collapses.

Your job: produce **grammar explanations that read as if a native Arabic-speaking Japanese instructor wrote them from scratch**, using Arabic linguistic intuition to bridge to Japanese grammar.

### The hardest field: body_ar

The `body_ar` field is a 1-3 paragraph markdown explanation. It's the place where translationese most damages the moat. Key principles:

- **Don't translate the EN explanation.** Write the AR explanation thinking in Arabic, using Arabic-grammar-aware framing where it helps. Example: when explaining the topic particle は, an EN explanation might say "marks the topic — what the sentence is about." An AR explanation could draw on the learner's intuition about Arabic-language topicality ("الموضوع المقدَّم") and grammatical particles in Arabic (حروف).
- **Use modern conversational MSA**, not strict فصحى. Same as kana/kanji — Careem/Anghami register. The grammar body can be slightly more formal than mnemonic micro-copy (it IS an explanation), but it should still read like a modern Arabic-language educational article, not a 1990s textbook.
- **Brevity > completeness.** Per CONTENT_GUIDELINES §1.2: "A 3-sentence explanation that lands beats a 10-sentence one that drifts."

### Brand context (same as prior batches)

- **Audience:** MENA-first, adult learners, mobile-first
- **Brand name:** `Tomodachi` in EN, «تومودَاتشي» in AR
- **Voice (EN):** Calm, capable, culturally respectful. Like a knowledgeable friend at a café.
- **Voice (AR):** Modern conversational MSA — Careem/Anghami register for explanations, declarative for examples and breakdowns.

### Parallel authoring (CRITICAL)

Per CONTENT_GUIDELINES §2.1, the EN and AR `body` fields are **independently authored**, not translations of each other. They may differ in length, framing, or even examples cited inline. Per §2.4, this is correct and expected.

The example sentences and breakdowns may share structure (because the Japanese sentence is the same), but the surrounding EN and AR prose is parallel-authored.

### Web research — use it

Spend 10-15 minutes browsing established sources:

- **Tofugu's grammar guides** — <https://www.tofugu.com/japanese-grammar/> — depth for each pattern
- **Tae Kim's Guide to Japanese Grammar** — <https://www.guidetojapanese.org/learn/grammar> — concise, learner-friendly
- **Jisho.org** — for sentence examples with kanji breakdowns
- **JLPT Sensei N5 grammar list** — <https://jlptsensei.com/jlpt-n5-grammar-list/>
- **Bunpro N5 grammar** — <https://bunpro.jp/grammar_points?level=N5>
- **Arabic-language Japanese grammar resources** — search YouTube (عرب نيهون, دروس اليابانية) and Arabic blogs for grammar explanations in Arabic; observe how they frame particles vs verb forms
- **Arabic linguistics references for particle vs preposition vs case** — useful for explaining Japanese particles to an Arabic learner

**Use your search tool. Cite the URLs you actually browsed in `_meta.sources_consulted`.**

### Per-field authoring rules

**`title_en`** — short, clear, in English. Example: "は — the topic particle". 4-8 words.

**`title_ar`** — short, clear, in Arabic. Example: "حرف «は» — جسيم الموضوع". 4-8 words. NOT a translation of title_en — author independently.

**`body_en`** — markdown, 1-3 paragraphs. Explain:
- What the pattern does
- When to use it
- Key contrast points (e.g., は vs が, です vs だ)
- Common learner mistakes to watch for

Use bullets or short paragraphs. No emoji. Tone: knowledgeable friend, not textbook.

**`body_ar`** — markdown, 1-3 paragraphs. **Parallel-authored, not translated.** Same coverage (what / when / contrast / mistakes), but framed for an Arabic-thinking learner. Where Arabic linguistic concepts help, lean on them (e.g., explain the topic particle by referencing Arabic topic-comment structure: "الموضوع → التعليق"). Where Japanese has no Arabic analogue, explain directly.

The body is the **single most important field for the AR moat**. Spend time on it.

**`examples`** — array of 2-4 example objects. Each example has 5 fields:

- `ja` — Japanese sentence (with kanji)
- `romaji` — Hepburn romanization
- `en` — English translation
- `ar` — Arabic translation (natural, conversational MSA; NOT a literal word-for-word)
- `breakdown` — single line decomposing the sentence (e.g., "私 (I) + は (topic) + 学生 (student) + です (be-polite)"). EN-language breakdown is fine across both locales — this is parsing scaffold, not editorial copy.

Pick examples that **use only kana, kanji, and vocab the learner has likely seen**. N5 vocab + the 103 N5 kanji is your safe zone. Don't introduce N4+ vocab in N5 example sentences.

**`difficulty`** — integer 1-5, your judgment.

**`estimated_minutes`** — integer 1-30, realistic time for one studying pass.

**`related_grammar`** — array of grammar keys that closely relate (e.g., は relates to が; ~たい relates to ~ます). Use the keys from the manifest. Optional; empty array OK if no clear relation.

**`introduces_vocab`** — array of vocab keys this lesson explicitly teaches. Since vocab content is also being authored in wave 2, leave this as `[]` for now. We'll backfill at L2.13.

### Style requirements (contractual)

**EN — words to AVOID:** `easy`, `simple`, `just`, `click` (use `tap`), `awesome`, `amazing` (as filler), `leverage`, `elevate`, `unlock your potential`, `unleash`, `empower`. Em dash (—) not double-hyphen. Oxford commas. Sentence case for body, title case for titles only when natural.

**AR — strictly FORBIDDEN markers:** `دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`. Otherwise: modern conversational MSA. Arabic punctuation (، ؟). Western digits (1, 2, 3).

**Tashkeel:** sparing — only for pronunciation disambiguation where the romaji/reading is ambiguous.

### The 54 grammar patterns to author

Use these exact keys (they match `scripts/manifests/n5_grammar.json`):

Particles (15): `wa_topic, ga_subject, wo_object, ni_target, de_location, he_direction, to_with_and, no_possessive, kara_from, made_until, mo_also, ya_and_etc, ka_question, ne_confirm, yo_assert`

Copula (4): `desu_copula, da_copula, deshita_past, ja_nai_neg`

Verb forms (11): `masu_polite, masen_neg, mashita_past, masendeshita, mashou, te_kudasai, te_form, te_iru, te_mo_ii, te_wa_ikenai, tai_want`

Plain forms (2): `nai_neg, ta_past`

Adjectives (6): `i_adj, na_adj, i_adj_neg, i_adj_past, na_adj_neg, na_adj_past`

Existence (2): `arimasu_inanimate, imasu_animate`

Comparison (3): `yori_than, ichiban_most, dochira_which`

Connectors (5): `demo_but, sorekara_then, dakara_so, kara_because, kedo_but`

Time/sequence (4): `toki_when, mae_ni_before, ato_de_after, nagara_while`

Modal/ability (2): `koto_ga_dekiru, deshou_probably`

(Full keys with the `g_n5_NNN_` prefix are in the manifest.)

### Output

Write a single JSON file at:

```
scripts/output/codex-l2-09-grammar.json
```

Schema (per-item shape):

```json
{
  "type": "grammar",
  "source": "codex-l2-09-grammar-2026-06-06",
  "_meta": {
    "authored_by": "codex",
    "spec": "docs/codex-spec-l2-09-grammar-2026-06-06.md",
    "sources_consulted": [
      "https://www.tofugu.com/japanese-grammar/",
      "https://jlptsensei.com/jlpt-n5-grammar-list/",
      "..."
    ]
  },
  "items": {
    "g_n5_001_wa_topic": {
      "title_en": "は — the topic particle",
      "title_ar": "حرف «は» — جسيم الموضوع",
      "body_en": "Japanese marks the **topic** of a sentence with は (pronounced *wa* when used as a particle). The topic is what the sentence is about — not necessarily its grammatical subject...",
      "body_ar": "تستخدم اليابانية الجسيم «は» لتحديد **موضوع** الجملة (ينطق *wa* عند استخدامه كجسيم). الموضوع هو ما تدور حوله الجملة، وليس بالضرورة الفاعل النحوي...",
      "examples": [
        { "ja": "私は学生です。", "romaji": "Watashi wa gakusei desu.", "en": "I am a student.", "ar": "أنا طالب.", "breakdown": "私 (I) + は (topic) + 学生 (student) + です (be-polite)" },
        { "ja": "...", "romaji": "...", "en": "...", "ar": "...", "breakdown": "..." }
      ],
      "difficulty": 2,
      "estimated_minutes": 5,
      "related_grammar": ["g_n5_002_ga_subject", "g_n5_011_mo_also"],
      "introduces_vocab": []
    }
  }
}
```

**Important:**

- Each item: full structure (title_en, title_ar, body_en, body_ar, examples array of 2-4, difficulty, estimated_minutes, related_grammar, introduces_vocab)
- The CLI fills in `key`, `jlpt`, `ordinal` from the manifest seed — do NOT include those in the per-item object
- All 54 keys MUST be present
- Pure JSON. No trailing commas. No code fences around the file.
- Write to file path directly; do not paste back in chat

### Acceptance criteria

- [ ] All 54 keys present in the order listed in the manifest
- [ ] Each item has all required fields (title_en/ar, body_en/ar non-empty, examples array with 2-4 entries each fully populated, difficulty int 1-5, estimated_minutes int 1-30, related_grammar array, introduces_vocab empty array)
- [ ] No AR forbidden marker anywhere
- [ ] AR uses Arabic punctuation (، ؟) and Western digits
- [ ] EN avoids the filler-word list
- [ ] No emoji in any body or example
- [ ] No double-hyphen — em dash (—) only
- [ ] Each example uses only N5-or-lower vocab/kanji where possible
- [ ] `_meta.sources_consulted` cites real URLs
- [ ] JSON validates

### Self-review checklist (slow down on body_ar — this is the moat)

1. **Read 10 random `body_ar` paragraphs aloud.** Each should feel like a modern Arabic-language educational article — not a textbook, not a translation. If it reads "translated from EN," **rewrite**.
2. **Check that AR examples (the `ar` field in each example) feel natural in Arabic.** Don't translate the EN example word-for-word — if the EN says "I eat breakfast at 7", the AR could say "آكُل الفطور الساعة 7" or even just "أتناول الفطور في السابعة" depending on what reads most natural.
3. **Particle explanations** — when explaining a Japanese particle, lean on the learner's Arabic-grammar intuition where it helps (topic/comment, prepositions, case). Don't force every comparison, but use it when it lands.
4. **Verb-form explanations** — for ~ます, ~て, ~た etc., be concrete about WHEN to use it. "Polite form for non-past actions" beats "polite form."
5. **Check that examples are pedagogically valuable** — each example should illustrate THE point of the lesson, not a generic sentence that happens to contain the pattern.
6. **AR voice register** — modern educational MSA, not textbook formality. Read it aloud. If it sounds like a teacher, fine. If it sounds like an Arabic-grammar exam, tighten it.
7. **JSON validates.** Count braces. No trailing commas.
8. **Count: 54 keys present.**

Grammar is the pedagogical backbone of N5. **Quality matters more than speed.**

---

## Claude's post-Codex review (NOT for Codex to act on)

After Codex finishes:

1. Confirm file exists + parses
2. All 54 keys present in manifest order
3. Validate every item against `validateContentItem('grammar', item)` after seed merge
4. Sample-read 15 `body_ar` paragraphs for register and translationese
5. Sample-read 15 `body_en` for filler/corporate voice
6. Spot-check 5 random patterns to ensure examples illustrate the pattern (not just contain it)
7. Verify each particle explanation leans on Arabic intuition where it helps
8. Verify `examples` arrays each have 2-4 entries with all 5 required fields
9. Verify no AR example contains forbidden dialect markers
10. Report summary to project lead

If >5 patterns need re-draft: partial failure, ask Codex to redo those keys.
