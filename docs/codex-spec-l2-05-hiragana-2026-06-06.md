# Codex spec — L2.05 hiragana mnemonics (104 entries, EN + AR)

> **Date:** 2026-06-06
> **Phase:** L2.05 — first content batch
> **Target file:** `scripts/output/codex-l2-05-hiragana.json` (gitignored T4)
> **Visibility:** TRACKED (the spec is committed; Codex's output is not)
> **Owner of this spec:** Claude
> **Owner of the Codex run:** project lead

This file is the prompt the project lead pastes into Codex to draft the complete N5 hiragana mnemonic set. Codex writes the output directly to `scripts/output/codex-l2-05-hiragana.json`; the CLI then walks it via `--prefill` for per-item review and Firestore commit.

---

## How to run

1. The project lead opens this spec in a Codex session.
2. Paste **everything below the line marked `=== PROMPT BEGINS ===`** as the Codex turn input.
3. Codex web-searches the named sources, drafts all 104 EN + AR mnemonics, writes the JSON file at the named path.
4. Claude reviews the output for translationese, dialect violations, cultural fit, and brand voice **before** the CLI walk.
5. Project lead runs `node scripts/author_content.js --env=dev --manifest=scripts/manifests/n5_hiragana.json --prefill=scripts/output/codex-l2-05-hiragana.json`.

---

=== PROMPT BEGINS ===

You are drafting the COMPLETE N5 hiragana mnemonic set for Tomodachi — a bilingual EN + AR Japanese language-learning app targeting MENA. This is the FIRST real content batch of the app's curriculum, and it sets the brand voice that 1000+ learners will see.

## Why this matters (read this before you start)

Tomodachi's primary moat is **Arabic-first pedagogy**. Most Japanese-learning apps are English-first and translate to Arabic as an afterthought — the result is stiff, "auto-translated" Arabic that native speakers immediately spot. When a native Arabic speaker reads a clunky AR mnemonic, the whole product feels cheap and the moat collapses.

Your job: produce **mnemonics that read as if a native Arabic-speaking instructor wrote them from scratch, in Arabic, for Arabic-thinking learners** — not translations of English mnemonics.

Five Arabic-speaking friends already reviewed our L1 landing-page content and flagged AR strings as "auto-translated" earlier this week. We rewrote them. **Do not give us the same problem here.**

## Brand context

- **Audience:** MENA-first (Egypt, Gulf, Levant), adult learners, mobile-first
- **Brand name:** `Tomodachi` in EN, «تومودَاتشي» in AR
- **Voice (EN):** Calm, capable, culturally respectful. Like a knowledgeable friend at a café. NOT a corporate brochure. NOT an over-friendly mascot.
- **Voice (AR):** Natural conversational Modern Standard Arabic — the register used by **Careem, Anghami, modern Arabic web/app UI** — NOT strict encyclopedic فصحى. The Arabic that a smart 25-year-old MENA professional speaks; not the Arabic of a newspaper editorial.
- **Pace:** Adults learning slowly with care, not Duolingo-hard-push.

## The two-mnemonic principle (CRITICAL — do not skip)

Each hiragana entry gets **TWO mnemonics**: one in EN, one in AR. They are **NOT translations of each other**. They are independently authored, each using imagery and phonetic hooks native to its own language.

**Example — あ (a):**

- ✅ Good EN: *"あ looks like an artistic letter 'A' with a swooping ribbon tail. It IS the sound 'a'."*
- ✅ Good AR: *"يشبه «أ» الفصحى مرسومًا بطريقة فنية مع ذيل منحنٍ. ولأنه «أ» في الشكل، فهو يُلفظ «a» في الصوت."*
- ❌ Bad AR (translationese): *"يبدو مثل حرف A الفني مع ذيل يتدلى."* — this is just the English translated word-for-word; an Arabic-thinking learner wouldn't reach for "A الفني" as a mental hook.

**Example — の (no):**

- ✅ Good EN: *"の looks like a NO-entry sign with a slash through it."*
- ✅ Good AR: *"يشبه «の» علامة «نون» التي ترسمها بحركة دائرية. تذكَّر صوت «نـ» في كلمة «نُونُو»، طفل صغير يقول «نو نو» عندما يرفض شيئًا — فهو يُلفظ «no»."*
- ❌ Bad AR: *"يشبه إشارة منع المرور."* — this is the EN imagery translated. The AR version should use Arabic-portable imagery (the «ن» letter shape, an Arabic word containing the /no/ sound).

## Web research — use it

Spend the first 5 minutes browsing established sources to ground your mnemonics. **Cite or paraphrase, do not invent shape claims out of thin air.** Recommended:

- **Tofugu's hiragana mnemonic chart** — <https://www.tofugu.com/japanese/learn-hiragana/> — gold standard for EN shape mnemonics
- **WaniKani-style scene mnemonics** — search for kana mnemonic examples on WaniKani's blog
- **JapanesePod101 hiragana lessons** — for pronunciation anchors
- **RealKana** — <https://realkana.com/> — for visual cross-reference
- **Arabic-language Japanese-learning resources** — search for Arabic-language explanations of hiragana on YouTube channels and Arabic blogs (e.g., عرب نيهون, دروس اليابانية, etc.). Even if their mnemonics are weak, they signal what imagery Arabic-speaking learners already have in their head.
- **Arabic-language phonetic dictionaries** — to find Arabic words containing target sounds (for AR phonetic hooks)

**Use the search tool. Cite the sources you used in a `_meta.sources_consulted` field in the output (see schema below).**

## Mnemonic authoring rules (both languages)

### Shape anchors

- Anchor each mnemonic to the **visible shape** of the kana — something the reader will see when they look at the glyph
- Specific concrete imagery beats abstract concepts: "two legs walking forward" beats "two strokes"
- Familiar shapes from the language's own writing system are great hooks
  - EN: Latin letters, numerals, common objects (key, ant, snake)
  - AR: Arabic letters (ن, ل, ع, etc.), Arabic numerals, common Arabic-cultural objects (a Bedouin tent, a coffee finjan, a falcon — when they fit)

### Phonetic hooks (the hard part)

For kana whose romaji isn't already obvious from the shape, add a phonetic hook:

- EN: find an English word containing the kana's sound (e.g., か = "car", き = "key", ふ = "foot")
- AR: find an Arabic word containing the sound (e.g., か = «قَلَم» with the /ka/ sound; し = «شَجَرة» with the /shi/ sound; ぬ = «نُور» with the /nu/ sound)
- **Do not force a rhyme.** A clean image with a clear sound hook beats a clever pun that takes 3 reads to parse.

### Cultural fit

- AR mnemonics should NOT reference: pork, alcohol, casinos, gambling, dating apps, religious controversy, real political figures
- AR mnemonics CAN reference: tea/coffee, family scenes, traditional and modern MENA life (Cairo street, Riyadh skyline, a Beirut café), Arabic literature/poetry imagery, common foods (kanafeh, hummus, mansaf), Arabic names from mythology/history (e.g., شهرزاد, جحا) when they fit
- The mnemonic should feel **portable across MENA** — not specifically Egyptian, not specifically Gulf, not specifically Levantine. Pan-Arabic imagery wins.

### Length

- **One sentence each. Maximum two short sentences.** Not a paragraph. Not a chain of events.
- If your AR mnemonic needs to be 2 sentences while EN needs only 1 (or vice versa), that's correct and expected per CONTENT_GUIDELINES §2.4. The two versions do NOT have to match in length.

## Style requirements (contractual)

### EN voice — words to AVOID

`easy`, `simple`, `just`, `click` (use `tap`), `awesome`, `amazing` (as filler), `leverage`, `elevate`, `unlock your potential`, `unleash`, `empower`, double-hyphen (use em dash —).

Use Oxford commas. Sentence case for body. No emoji in mnemonic body content.

### AR voice — strictly FORBIDDEN markers

Words flagged by our validators as Egyptian / colloquial that break the "MENA-portable" rule:

`دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`

Avoid the above. **Otherwise, write conversational MSA the way it's actually written on Arabic UIs and apps** — not the Arabic of a literature exam.

Use Arabic punctuation: comma «،», question mark «؟».

Use Western digits (1, 2, 3) for both languages.

### Tashkeel (diacritics)

Use tashkeel **sparingly** for pronunciation clarity where ambiguity would harm the learner. The brand name renders as «تومودَاتشي» (one fatha for the long /a/). Do not over-vocalize the rest — that's encyclopedic register.

## The 104 hiragana to author

Use these keys (these match the manifest at `scripts/manifests/n5_hiragana.json`):

**Base (46):**
a, i, u, e, o,
ka, ki, ku, ke, ko,
sa, shi, su, se, so,
ta, chi, tsu, te, to,
na, ni, nu, ne, no,
ha, hi, fu, he, ho,
ma, mi, mu, me, mo,
ya, yu, yo,
ra, ri, ru, re, ro,
wa, wo,
n

**Dakuten (20):**
ga, gi, gu, ge, go,
za, ji, zu, ze, zo,
da, di, du, de, do,
ba, bi, bu, be, bo

For dakuten characters, the mnemonic should **leverage the base character's mnemonic** and add an explanation of the dakuten (the two small dots, often called "tenten" — frame it as a voiced version of the base sound). Example: が should reference か's mnemonic + "with two dots that voice it from /ka/ to /ga/."

**Handakuten (5):**
pa, pi, pu, pe, po

Similarly, handakuten (the small circle, "maru") makes ha-row characters into the /p/ row.

**Yoon (33):**
kya, kyu, kyo,
sha, shu, sho,
cha, chu, cho,
nya, nyu, nyo,
hya, hyu, hyo,
mya, myu, myo,
rya, ryu, ryo,
gya, gyu, gyo,
ja, ju, jo,
bya, byu, byo,
pya, pyu, pyo

For yoon, the mnemonic should **reference the parent characters** (e.g., きゃ = き combined with a small や → glide the き sound into ya). Don't write 33 standalone mnemonics from scratch — the strength of yoon is the combination logic.

## Output

Write a single JSON file at this exact path:

```
scripts/output/codex-l2-05-hiragana.json
```

Schema:

```json
{
  "type": "hiragana",
  "source": "codex-l2-05-hiragana-2026-06-06",
  "_meta": {
    "authored_by": "codex",
    "spec": "docs/codex-spec-l2-05-hiragana-2026-06-06.md",
    "sources_consulted": [
      "https://www.tofugu.com/japanese/learn-hiragana/",
      "..."
    ]
  },
  "items": {
    "a": {
      "mnemonic_en": "...",
      "mnemonic_ar": "..."
    },
    "i": {
      "mnemonic_en": "...",
      "mnemonic_ar": "..."
    }
    // ... all 104 keys above
  }
}
```

**Important:**

- Each item has ONLY `mnemonic_en` and `mnemonic_ar` — the CLI fills in `glyph, romaji, row, jlpt, difficulty, audio_key` from the manifest seed
- All 104 keys MUST be present (validate before you finish)
- Pure JSON — no trailing commas, no comments, no code fences around it
- Write the file directly; do not paste the JSON back in chat

## Acceptance criteria (self-check before returning)

Run through this list. Do not return until every box checks.

- [ ] All 104 keys present in `items`, in the order listed above
- [ ] Every entry has BOTH `mnemonic_en` (non-empty) AND `mnemonic_ar` (non-empty)
- [ ] No AR mnemonic contains any forbidden marker: دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي
- [ ] Every AR mnemonic uses Arabic punctuation (، ؟)
- [ ] No EN mnemonic uses the avoid-list filler words
- [ ] No emoji in any mnemonic body
- [ ] No double-hyphen (use em dash —)
- [ ] Dakuten entries reference their base character's mnemonic (e.g., が references か)
- [ ] Handakuten entries reference their base character's mnemonic (e.g., ぱ references は)
- [ ] Yoon entries reference both parent characters (e.g., きゃ references き and や)
- [ ] The JSON is parseable by `JSON.parse` — verify by mentally walking the braces
- [ ] `_meta.sources_consulted` lists the URLs you actually browsed during research

## Self-review checklist (the harder one)

Before submitting, **slow down and do this**:

1. **Read 10 random AR mnemonics aloud.** Do they sound like sentences a native Arabic speaker would write? Or do they read like translations? If they sound translated, REWRITE them using Arabic-native imagery.

2. **Check 5 random AR mnemonics for cultural fit.** Pan-Arabic, not country-specific. If you wrote «منشف» (Egyptian for "towel") instead of «مِنشَفة», fix it. If you referenced a specifically-Saudi cultural artifact, broaden it.

3. **Check the EN voice.** Did you slip into corporate filler ("simply remember", "just imagine")? Did you use "click" instead of "tap"? Did you use double-hyphen? Fix.

4. **Verify the JSON validates.** Paste it mentally into `JSON.parse` — count braces, count commas, no trailing commas.

5. **Check dakuten/handakuten/yoon coherence.** Does が's mnemonic actually reference か? Does きゃ actually combine き and や? If not, REWRITE.

6. **Count: 104 entries.** If you have fewer, you're missing some.

If any check fails, fix it before returning the file. Quality matters more than speed — this content sets the AR moat for the entire project.

=== PROMPT ENDS ===

---

## Post-Codex review checklist (Claude does this before the CLI walk)

1. Confirm `scripts/output/codex-l2-05-hiragana.json` exists and parses
2. Confirm all 104 keys are present
3. Sample-read 20 AR mnemonics for translationese (the failure mode our friends already flagged in L1)
4. Sample-read 10 EN mnemonics for filler / corporate voice
5. Validate every item against `validateContentItem('hiragana', item)` after merging with manifest seed — flag any structural errors
6. Spot-check 5 random dakuten + 5 random yoon for the combination-coherence rule
7. Report findings to the project lead in a summary table: pass count, flagged items list, any items needing re-draft

If more than ~10 items need re-drafting, treat the run as a partial failure and ask Codex to re-do those specific items (referencing the same spec).

If 0-5 items need flagging, those go into the CLI walk with a note for the project lead.
