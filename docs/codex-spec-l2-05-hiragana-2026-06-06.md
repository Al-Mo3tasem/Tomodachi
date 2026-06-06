# Codex spec — L2.05 hiragana mnemonics (104 entries, EN + AR)

> **Date:** 2026-06-06
> **Phase:** L2.05 — first content batch (sets the AR brand voice)
> **Visibility:** TRACKED (Codex's output is gitignored T4)
> **Target output:** `scripts/output/codex-l2-05-hiragana.json`

---

## Note for the project lead

- Give Codex read access to this file (no copy-paste needed)
- Codex writes the result directly to `scripts/output/codex-l2-05-hiragana.json`
- After Codex finishes, ping Claude — Claude runs the post-Codex review (last section) before you walk the CLI
- Service account at `scripts/secrets/service-account.dev.json` is already in place
- CLI to run after review:
  ```
  node scripts/author_content.js --env=dev \
    --manifest=scripts/manifests/n5_hiragana.json \
    --prefill=scripts/output/codex-l2-05-hiragana.json
  ```

---

## Codex — this spec is for you. Read everything below.

You are drafting the **complete N5 hiragana mnemonic set** for **Tomodachi** — a bilingual EN + AR Japanese language-learning app targeting the MENA region. This is the **first real content batch** of the app's curriculum, and it sets the brand voice that 1000+ learners will see.

### Why this matters (read before you start)

Tomodachi's primary moat is **Arabic-first pedagogy**. Most Japanese-learning apps are English-first and machine-translate to Arabic as an afterthought — the result is stiff, "auto-translated" Arabic that native speakers immediately recognize as not-from-here. When a native Arabic reader hits a clunky AR mnemonic, the whole product feels cheap and the moat collapses.

Your job: produce **mnemonics that read as if a native Arabic-speaking instructor wrote them from scratch, in Arabic, for Arabic-thinking learners** — not translations of English mnemonics.

Five Arabic-speaking friends already reviewed our landing-page content earlier this week and flagged AR strings as "auto-translated". We rewrote them. **Do not give us the same problem here.**

### Brand context

- **Audience:** MENA-first (Egypt, Gulf, Levant), adult learners, mobile-first
- **Brand name:** `Tomodachi` in EN, «تومودَاتشي» in AR
- **Voice (EN):** Calm, capable, culturally respectful. Like a knowledgeable friend at a café. NOT a corporate brochure. NOT an over-friendly mascot.
- **Voice (AR):** Natural conversational Modern Standard Arabic — the register used by **Careem, Anghami, modern Arabic web/app UI** — NOT strict encyclopedic فصحى. The Arabic a smart 25-year-old MENA professional speaks; not the Arabic of a newspaper editorial.
- **Pace:** Adults learning slowly with care, not Duolingo-hard-push.

### The two-mnemonic principle (CRITICAL — do not skip)

Each hiragana entry gets **TWO mnemonics**: one in EN, one in AR. They are **NOT translations of each other**. They are independently authored, each using imagery and phonetic hooks native to its own language.

**Example — あ (a):**

- ✅ Good EN: *"あ looks like an artistic letter 'A' with a swooping ribbon tail. It IS the sound 'a'."*
- ✅ Good AR: *"يشبه «أ» الفصحى مرسومًا بطريقة فنية مع ذيل منحنٍ. ولأنه «أ» في الشكل، فهو يُلفظ «a» في الصوت."*
- ❌ Bad AR (translationese): *"يبدو مثل حرف A الفني مع ذيل يتدلى."* — this is the English mnemonic translated word-for-word; an Arabic-thinking learner wouldn't reach for "A الفني" as a mental hook.

**Example — の (no):**

- ✅ Good EN: *"の looks like a NO-entry sign with a slash through it."*
- ✅ Good AR: *"يشبه «の» علامة «نون» التي ترسمها بحركة دائرية. تذكَّر صوت «نـ» في كلمة «نُونُو»، طفل صغير يقول «نو نو» عندما يرفض شيئًا — فهو يُلفظ «no»."*
- ❌ Bad AR: *"يشبه إشارة منع المرور."* — this is the EN imagery translated. The AR version should use Arabic-portable imagery (the «ن» letter shape, an Arabic word containing the /no/ sound).

### Web research — use it

Spend the first 5-10 minutes browsing established sources. **Cite or paraphrase, do not invent shape claims out of thin air.** Recommended:

- **Tofugu's hiragana mnemonic chart** — <https://www.tofugu.com/japanese/learn-hiragana/> — gold standard for EN shape mnemonics
- **WaniKani-style scene mnemonics** — search WaniKani's blog for kana mnemonic examples
- **JapanesePod101 hiragana lessons** — for pronunciation anchors
- **RealKana** — <https://realkana.com/> — visual cross-reference
- **Arabic-language Japanese-learning sources** — search YouTube and Arabic blogs (e.g., عرب نيهون, دروس اليابانية, موقع اليابانية بالعربي). Even if their specific mnemonics are weak, they signal what imagery Arabic-speaking learners already have in their head.
- **Arabic-language phonetic dictionaries / corpora** — to find Arabic words containing target sounds (for AR phonetic hooks)

**Use your search tool. Cite the sources you actually browsed in a `_meta.sources_consulted` field in the output (see schema below).**

### Mnemonic authoring rules (both languages)

**Shape anchors**

- Anchor each mnemonic to the **visible shape** of the kana — something the reader will see when looking at the glyph
- Specific concrete imagery beats abstract concepts: "two legs walking forward" beats "two strokes"
- Familiar shapes from the language's own writing system are strong hooks
  - EN: Latin letters, numerals, common objects (key, ant, snake)
  - AR: Arabic letters (ن, ل, ع, etc.), Arabic numerals, common MENA-cultural objects (a finjan, a falcon, a Bedouin tent — when they fit naturally)

**Phonetic hooks (the hard part)**

For kana whose romaji isn't obvious from the shape, add a phonetic hook:

- EN: find an English word containing the kana's sound (e.g., か = "car", き = "key", ふ = "foot")
- AR: find an Arabic word containing the sound (e.g., か = «قَلَم» with the /ka/ sound; し = «شَجَرة» with the /shi/ sound; ぬ = «نُور» with the /nu/ sound)
- **Do not force a rhyme.** A clean image with a clear sound hook beats a clever pun that takes 3 reads to parse.

**Cultural fit**

- AR mnemonics should NOT reference: pork, alcohol, casinos, gambling, dating apps, religious controversy, real political figures
- AR mnemonics CAN reference: tea/coffee, family scenes, traditional and modern MENA life (a Cairo street, a Riyadh skyline, a Beirut café), Arabic literature/poetry imagery, common foods (kanafeh, hummus, mansaf), Arabic names from mythology/history (e.g., شهرزاد, جحا) when they fit
- The mnemonic should feel **portable across MENA** — not specifically Egyptian, not specifically Gulf, not specifically Levantine. Pan-Arabic imagery wins.

**Length**

- **One sentence each. Maximum two short sentences.** Not a paragraph. Not a chain of events.
- If your AR mnemonic needs to be 2 sentences while EN needs only 1 (or vice versa), that's correct and expected. The two versions do NOT have to match in length.

### Style requirements (contractual)

**EN — words to AVOID:**
`easy`, `simple`, `just`, `click` (use `tap`), `awesome`, `amazing` (as filler), `leverage`, `elevate`, `unlock your potential`, `unleash`, `empower`. Double-hyphen → use em dash (—). Oxford commas. Sentence case for body. No emoji in mnemonic body.

**AR — strictly FORBIDDEN markers** (flagged by our validators as breaking the pan-Arabic register):
`دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`

Avoid those. **Otherwise, write conversational MSA the way it's actually written on Arabic apps and UIs** — not the Arabic of a literature exam.

Arabic punctuation: comma «،», question mark «؟». Western digits (1, 2, 3) for both languages.

**Tashkeel (diacritics):** Use sparingly for pronunciation clarity where ambiguity would harm the learner. The brand name renders as «تومودَاتشي» (one fatha for the long /a/). Do not over-vocalize the rest — that's encyclopedic register.

### The 104 hiragana to author

Use these exact keys (they match the manifest at `scripts/manifests/n5_hiragana.json`):

**Base (46):**
`a, i, u, e, o, ka, ki, ku, ke, ko, sa, shi, su, se, so, ta, chi, tsu, te, to, na, ni, nu, ne, no, ha, hi, fu, he, ho, ma, mi, mu, me, mo, ya, yu, yo, ra, ri, ru, re, ro, wa, wo, n`

**Dakuten (20):**
`ga, gi, gu, ge, go, za, ji, zu, ze, zo, da, di, du, de, do, ba, bi, bu, be, bo`

For dakuten characters, the mnemonic should **leverage the base character's mnemonic** and add the dakuten explanation (the two small dots, often called "tenten" — frame it as a voiced version of the base sound). Example: が should reference か's mnemonic + "with two dots that voice the /ka/ into /ga/."

**Handakuten (5):**
`pa, pi, pu, pe, po`

Similarly, handakuten (the small circle, "maru") turns the ha-row into the p-row. ぱ should reference は + the circle.

**Yoon (33):**
`kya, kyu, kyo, sha, shu, sho, cha, chu, cho, nya, nyu, nyo, hya, hyu, hyo, mya, myu, myo, rya, ryu, ryo, gya, gyu, gyo, ja, ju, jo, bya, byu, byo, pya, pyu, pyo`

For yoon, the mnemonic should **reference the parent characters** (e.g., きゃ = き combined with a small や → glide the き sound into ya). Don't write 33 standalone mnemonics from scratch — the strength of yoon is the combination logic.

### Output

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
  }
}
```

**Important:**

- Each item has ONLY `mnemonic_en` and `mnemonic_ar` — the CLI fills in `glyph, romaji, row, jlpt, difficulty, audio_key` from the manifest seed
- All 104 keys MUST be present (validate before you finish)
- Pure JSON — no trailing commas, no comments, no code fences around the file
- **Write the file directly** to the target path; do not paste the JSON back as a chat message

### Acceptance criteria (self-check before finishing)

Walk through every box. Do not stop until every check passes.

- [ ] All 104 keys present in `items`, in the order listed in the four groups above
- [ ] Every entry has BOTH `mnemonic_en` (non-empty) AND `mnemonic_ar` (non-empty)
- [ ] No AR mnemonic contains any forbidden marker: `دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`
- [ ] Every AR mnemonic uses Arabic punctuation (، ؟) where appropriate
- [ ] No EN mnemonic uses the avoid-list filler words
- [ ] No emoji in any mnemonic body
- [ ] No double-hyphen — em dash (—) only
- [ ] Dakuten entries reference their base character's mnemonic (e.g., が references か)
- [ ] Handakuten entries reference their base character's mnemonic (e.g., ぱ references は)
- [ ] Yoon entries reference both parent characters (e.g., きゃ references き and や)
- [ ] The JSON parses as valid — count braces, count commas
- [ ] `_meta.sources_consulted` lists the URLs you actually browsed

### Self-review checklist (the harder one — do not skip)

Before finishing, **slow down and run through this**:

1. **Read 10 random AR mnemonics aloud.** Do they sound like sentences a native Arabic speaker would write? Or do they read like translations? If they sound translated, **rewrite them** using Arabic-native imagery.
2. **Check 5 random AR mnemonics for cultural fit.** Pan-Arabic, not country-specific. If you wrote «منشف» (Egyptian colloquial for "towel") instead of «مِنشَفة», fix it. If you referenced a specifically-Saudi cultural artifact, broaden it.
3. **Check the EN voice.** Did you slip into corporate filler ("simply remember", "just imagine")? Did you use "click" instead of "tap"? Did you use double-hyphen? Fix.
4. **Verify the JSON validates.** Open the file you wrote; the structure must parse with `JSON.parse`. Count braces, no trailing commas.
5. **Check dakuten/handakuten/yoon coherence.** Does が's mnemonic actually reference か? Does きゃ actually combine き and や? If not, **rewrite**.
6. **Count: 104 entries.** Run a quick `Object.keys(parsed.items).length === 104` mental check. If you have fewer, you're missing some.

If any check fails, fix it before declaring done. Quality matters more than speed — this content sets the AR moat for the entire project.

---

## Claude's post-Codex review (this section is NOT for Codex to act on)

After Codex finishes and the file lands at `scripts/output/codex-l2-05-hiragana.json`, Claude runs:

1. Confirm file exists and parses as JSON
2. Confirm all 104 keys are present and in the manifest's order
3. Sample-read 20 AR mnemonics for translationese (the failure mode our friends flagged in L1)
4. Sample-read 10 EN mnemonics for filler / corporate voice
5. Validate every item against `validateContentItem('hiragana', item)` after merging with manifest seed — flag any structural errors
6. Spot-check 5 random dakuten + 5 random yoon for the combination-coherence rule
7. Report to the project lead in a summary table: pass count, items needing tweaks, items needing re-draft

If more than ~10 items need re-drafting, treat the run as a partial failure and ask Codex to re-do those specific items (referencing this same spec).

If 0-10 items need flagging, those go into the CLI walk with a note for the lead.
