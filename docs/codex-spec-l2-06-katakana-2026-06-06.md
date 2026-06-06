# Codex spec — L2.06 katakana mnemonics (104 entries, EN + AR)

> **Date:** 2026-06-06
> **Phase:** L2.06 — katakana content batch (parallel with L2.05 hiragana, L2.08 kanji)
> **Visibility:** TRACKED (Codex's output is gitignored T4)
> **Target output:** `scripts/output/codex-l2-06-katakana.json`

---

## Note for the project lead

- Give Codex read access to this file (no copy-paste needed)
- Codex writes the result directly to `scripts/output/codex-l2-06-katakana.json`
- This is **independent** of the hiragana and kanji Codex sessions — run them in parallel
- After Codex finishes, ping Claude for the post-Codex review before walking the CLI
- CLI command:
  ```
  node scripts/author_content.js --env=dev \
    --manifest=scripts/manifests/n5_katakana.json \
    --prefill=scripts/output/codex-l2-06-katakana.json
  ```

---

## Codex — this spec is for you. Read everything below.

You are drafting the **complete N5 katakana mnemonic set** for **Tomodachi** — a bilingual EN + AR Japanese language-learning app targeting the MENA region.

### Why katakana mnemonics differ from hiragana (read this)

Katakana shapes are **angular** where hiragana are curvy. Most importantly, **katakana is the script of loanwords and foreign names** — Japanese names for things like coffee (コーヒー), beer (ビール), table (テーブル), Egypt (エジプト), Saudi Arabia (サウジアラビア). The learner sees katakana when reading menus, brand names, technology terms.

This shifts the mnemonic strategy:

- **Shape mnemonics can lean harder on Latin letters** — many katakana resemble Latin letters by design (or coincidence). カ resembles "K" with a kick. ヒ resembles "L" with a hat. Lean into these.
- **Phonetic mnemonics can reference loanwords** — for AR readers, mention that Arabic also borrows from Japanese-loanword space (e.g., "the same /ka/ sound that opens «كَوفي» in Arabized coffee names")
- **Don't repeat the hiragana mnemonic verbatim.** A learner who already learned hiragana will see, e.g., the romaji "ka" and recognize it. The katakana mnemonic should anchor on the **angular** shape, not re-explain the sound.

### Why this matters (the AR moat — same as L2.05)

Tomodachi's primary moat is **Arabic-first pedagogy**. Most Japanese-learning apps machine-translate to Arabic and produce "auto-translated" prose that native speakers immediately reject. Your job: produce **mnemonics that read as if a native Arabic-speaking instructor wrote them from scratch, in Arabic, for Arabic-thinking learners** — not translations of English mnemonics.

Five Arabic-speaking friends already flagged our L1 content for translationese earlier this week. Do not give us the same problem here.

### Brand context

- **Audience:** MENA-first (Egypt, Gulf, Levant), adult learners, mobile-first
- **Brand name:** `Tomodachi` in EN, «تومودَاتشي» in AR
- **Voice (EN):** Calm, capable, culturally respectful. Like a knowledgeable friend at a café.
- **Voice (AR):** Natural conversational Modern Standard Arabic — the register of Careem, Anghami, modern Arabic web/app UI — NOT strict encyclopedic فصحى.
- **Pace:** Adults learning slowly with care.

### The two-mnemonic principle (CRITICAL)

Each katakana entry gets **TWO mnemonics**: one in EN, one in AR. They are **NOT translations of each other**. Each uses imagery native to its own language.

**Example — カ (ka):**

- ✅ Good EN: *"カ looks like the letter 'K' with the top stroke split off into a kick. K + sharp angle = ka."*
- ✅ Good AR: *"يشبه «カ» حرف «ك» الإنجليزي لكنه أكثر زاوية وحدة. صوت «ka» مثل «كَلب» في العربية."*
- ❌ Bad AR (translationese): *"يبدو مثل K مع ركلة في الأعلى."* — direct EN translation, no Arabic-native anchor.

**Example — ノ (no):**

- ✅ Good EN: *"ノ is a single diagonal slash — a NO mark scribbled across the page."*
- ✅ Good AR: *"خطّ مائل واحد، كأنه شرطة عابرة في كتابة عربية يدوية. الصوت «no» كصوت «نون» في «نُور» مع تشديد قصير."*
- ❌ Bad AR: *"خط مائل بسيط مثل علامة NO."* — EN imagery word-for-word.

### Web research — use it

Spend 5-10 minutes browsing established sources. Cite or paraphrase, **do not invent shape claims**.

- **Tofugu's katakana mnemonic chart** — <https://www.tofugu.com/japanese/learn-katakana/> — gold standard for EN shape mnemonics
- **WaniKani-style scene mnemonics**
- **JapanesePod101 katakana lessons**
- **RealKana** — <https://realkana.com/>
- **Arabic-language Japanese-learning resources** — YouTube and Arabic blogs (عرب نيهون, دروس اليابانية, etc.)
- **Common Japanese loanwords in Arabic / English** — helpful for phonetic hooks (sushi → スシ, coffee → コーヒー, etc.)

**Use your search tool. Cite the URLs you actually browsed in `_meta.sources_consulted`.**

### Mnemonic authoring rules

**Shape anchors**

- Anchor each mnemonic to the **angular visible shape** of the katakana
- Latin letters are particularly strong anchors for katakana (more than hiragana)
- AR Arabic letters (especially angular ones like ل, ك, د, ر) can anchor where shape matches
- Specific concrete imagery beats abstract: "a karate kick to the right" beats "two strokes"

**Phonetic hooks**

- EN: word containing the sound (e.g., カ = "car", キ = "key", ヒ = "he")
- AR: Arabic word containing the sound (e.g., カ = «كَلب», シ = «شَجَرة», ヌ = «نُور»)
- Don't force rhymes. Clean image + clear sound hook beats clever pun.

**Cultural fit (AR side)**

- AVOID: pork, alcohol, casinos, gambling, dating apps, religious controversy, real political figures
- WELCOME: tea/coffee, MENA city scenes (Cairo street, Riyadh skyline, Beirut café), traditional and modern Arabic life, common foods (kanafeh, hummus, mansaf), shared mythology (شهرزاد, جحا) when fitting
- **Pan-Arabic, not country-specific.** Don't lean Egyptian-only or Gulf-only.

**Length**

- One sentence each. Maximum two short sentences.
- EN and AR may differ in length — that's correct, not a bug.

### Style requirements (contractual)

**EN — words to AVOID:**
`easy`, `simple`, `just`, `click` (use `tap`), `awesome`, `amazing` (as filler), `leverage`, `elevate`, `unlock your potential`, `unleash`, `empower`. Double-hyphen → em dash (—). Oxford commas. Sentence case. No emoji.

**AR — strictly FORBIDDEN markers:**
`دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`

Otherwise: conversational MSA as written on Arabic apps and UIs. Arabic punctuation (، ؟). Western digits (1, 2, 3).

**Tashkeel:** sparing — only for pronunciation disambiguation.

### The 104 katakana to author

Use these exact keys (match `scripts/manifests/n5_katakana.json`):

**Base (46):**
`a, i, u, e, o, ka, ki, ku, ke, ko, sa, shi, su, se, so, ta, chi, tsu, te, to, na, ni, nu, ne, no, ha, hi, fu, he, ho, ma, mi, mu, me, mo, ya, yu, yo, ra, ri, ru, re, ro, wa, wo, n`

**Dakuten (20):**
`ga, gi, gu, ge, go, za, ji, zu, ze, zo, da, di, du, de, do, ba, bi, bu, be, bo`

Dakuten mnemonics should reference the **base katakana** plus the two-dot diacritic (called "tenten" or 濁点). Example: ガ should reference カ + the dots that voice it.

**Handakuten (5):**
`pa, pi, pu, pe, po`

Similarly, handakuten = base ハ-row + small circle ("maru"). パ references ハ + the circle.

**Yoon (33):**
`kya, kyu, kyo, sha, shu, sho, cha, chu, cho, nya, nyu, nyo, hya, hyu, hyo, mya, myu, myo, rya, ryu, ryo, gya, gyu, gyo, ja, ju, jo, bya, byu, byo, pya, pyu, pyo`

Yoon = full-size character + small や/ゆ/ヨ. キャ references キ and ヤ.

### Output

Write a single JSON file at:

```
scripts/output/codex-l2-06-katakana.json
```

Schema:

```json
{
  "type": "katakana",
  "source": "codex-l2-06-katakana-2026-06-06",
  "_meta": {
    "authored_by": "codex",
    "spec": "docs/codex-spec-l2-06-katakana-2026-06-06.md",
    "sources_consulted": [
      "https://www.tofugu.com/japanese/learn-katakana/",
      "..."
    ]
  },
  "items": {
    "a": { "mnemonic_en": "...", "mnemonic_ar": "..." },
    "i": { "mnemonic_en": "...", "mnemonic_ar": "..." }
  }
}
```

- Each item: ONLY `mnemonic_en` and `mnemonic_ar`. The CLI fills the rest from manifest seed.
- All 104 keys MUST be present
- Pure JSON, no trailing commas, no code fences
- Write to the file path directly; do not paste back in chat

### Acceptance criteria

- [ ] All 104 keys present in the order above
- [ ] Both `mnemonic_en` and `mnemonic_ar` non-empty per item
- [ ] No AR forbidden markers
- [ ] Arabic punctuation (، ؟) used
- [ ] No EN filler-list words
- [ ] No emoji, no double-hyphen
- [ ] Dakuten entries reference base katakana
- [ ] Handakuten entries reference ハ-row base
- [ ] Yoon entries reference both parent characters
- [ ] JSON validates
- [ ] `_meta.sources_consulted` cites real URLs

### Self-review checklist (slow down here)

1. **Read 10 random AR mnemonics aloud.** Do they sound native? If translated, rewrite with Arabic-native imagery.
2. **5 random AR mnemonics for cultural fit.** Pan-Arabic, not country-specific.
3. **EN voice check.** No corporate filler. "tap" not "click". Em dash not double-hyphen.
4. **JSON parses.**
5. **Dakuten/handakuten/yoon coherence** — does ガ reference カ? Does キャ combine キ and ヤ?
6. **Count: 104 entries.** Run `Object.keys(items).length === 104` mentally.

Quality matters more than speed. This content sets the AR moat.

---

## Claude's post-Codex review (NOT for Codex to act on)

After Codex finishes, Claude runs:

1. Verify file exists + parses
2. All 104 keys present
3. Sample-read 20 AR mnemonics for translationese
4. Sample-read 10 EN for corporate-filler voice
5. Validate every item against `validateContentItem('katakana', item)` after seed merge
6. Spot-check 5 dakuten + 5 yoon for combination coherence
7. Confirm katakana mnemonics differ from hiragana siblings (e.g., ア's mnemonic should NOT be the same as あ's)
8. Report summary to project lead

If >10 items need re-draft: partial failure, ask Codex to redo those keys.
