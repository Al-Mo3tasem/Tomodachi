# Follow-up for the kanji Codex session

> **Date:** 2026-06-06
> **Session:** the one that produced `codex-l2-08-kanji.json`
> **Action:** revise the output file in place

---

## Pass this as your next message to that Codex session

The kanji file you wrote is **mechanically excellent**: 103/103 valid, all readings + stroke counts verified accurate against Jisho, radicals coherently decomposed, all 4 stories per kanji populated. Thank you.

**Two issues to fix** — one specific, one across-the-board.

---

### Issue 1: six entries used English/Latin or dialect as the AR phonetic hook (fix these specifically)

| Key | Kanji | Field | Current problem | Fix |
|---|---|---|---|---|
| `k_n5_001_one` | 一 | `mnemonic.ar.reading_story` | uses «إيش» (Levantine/Gulf dialect for "what") | replace with a native-MSA anchor for /ichi/. Consider: «إيش» avoid; «عيش» (bread) gives /ʕaiʃ/ not /itʃi/; better candidates: «إيقاع» (rhythm), «إيمان», «إيفاد» (delegation), or a word containing /itʃ/ if you find one |
| `k_n5_016_day` | 日 | `mnemonic.ar.reading_story` | uses English "niche" written in Latin letters inside Arabic | replace with native-AR word for /ni/ or /nitʃi/. Consider: «نيّة» (intention), «نَيْل» (attainment), «نيشان» (mark/badge — common in modern Arabic) |
| `k_n5_062_buy` | 買 | `mnemonic.ar.reading_story` | uses English "buy" in Latin letters | replace with native-AR. The Arabic word for "selling" is «بَيع» — /bai/ sound IS already in Arabic. Use «بَيع» or «بائع» (seller) |
| `k_n5_064_read` | 読 | `mnemonic.ar.reading_story` | uses English "doc" in Latin letters | replace with native-AR for /doku/. Consider: «دُكّان» (shop), «دُكْتور» (doctor — modern loanword fully naturalized), «دَكّ» (pounding) |
| `k_n5_066_enter` | 入 | `mnemonic.ar.reading_story` | uses English "new" in Latin letters | replace with native-AR for /nyū/. Consider: «نُور» (light), «نُوبة» (turn/shift), «نُون» (the letter) |
| `k_n5_069_rest` | 休 | `mnemonic.ar.reading_story` | uses English "Queue" in Latin letters | replace with native-AR for /kyū/. Consider: «كَيد», «كأس», «قِيام» (rising), or your judgment — find an Arabic word starting with /ki:/ or /kju:/ |

For each of those 6, rewrite ONLY the `mnemonic.ar.reading_story` field. Keep the meaning_story, EN stories, readings, radicals, stroke_count, en_meanings, ar_meanings unchanged.

---

### Issue 2: AR voice is too textbook-formal across all 103 kanji

This is the bigger fix. The original spec asked for **Careem/Anghami modern-MENA-app register**. Your AR stories read more like an Arabic grammar textbook from the 1990s. Examples from your output:

- ❌ *"خط أفقي واحد على الورقة، ويظهر المعنى فورًا: «واحد»"* — "wa-yazhar al-ma'nā fawran" is academic. Modern: *"خط واحد. المعنى: «واحد»."*
- ❌ *"خطّان كالساقين يميلان للأمام، فترى شخصًا يمشي"* — "fa-tara shakhsan yamshi" reads like a writing exam.
- ❌ *"صوت ジン قريب من «جِنّ»، فتخيّل شخصًا يمشي وبجواره جِن يحرسه في الحكاية"* — overlong; the "fi al-ḥikāya" suffix is filler.

**Target register** is what you'd read on a Careem ride-summary screen, an Anghami player notification, an Arabic UI string in a modern app. Short. Conversational. Direct. Same content tightened:

- ✅ *"خط واحد. المعنى: «واحد»."*
- ✅ *"ساقان تمشيان للأمام = شخص."*
- ✅ *"ジン يشبه «جِنّ». تخيّل جنّيًا بجوار شخص يمشي."*

### What to revise (issue 2)

Walk through every kanji entry. For each one, look at all 4 stories (`mnemonic.en.meaning_story`, `mnemonic.en.reading_story`, `mnemonic.ar.meaning_story`, `mnemonic.ar.reading_story`) and tighten the **AR ones** for voice and register. Rules:

1. **Keep the imagery and phonetic anchor** — they're correct (you used جنّ, نيّة, مخ, شعور, جوّ, شعاع, جود — all good). Don't switch which Arabic word anchors the sound. Just rewrite the sentence around it.
2. **Cut academic connective tissue.** Drop "ويظهر المعنى فورًا", "فتخيّل ... في الحكاية", "كأنك تعدّ ... بهدوء", "ليعطي صوت", "فترى كذا". Use declarative sentences and equation-style fragments.
3. **Aim for 50-90 characters per AR story.** Your current average is 110-140 characters per story. Modern app voice is denser.
4. **Read each one aloud.** Teacher-at-board → rewrite. Friend-in-café → ship it.
5. **EN side stays mostly as-is.** Light polish only.
6. **Don't switch to dialect.** Modern conversational MSA. Same forbidden list as the original spec: `دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`.

### Patterns to compress

| Verbose pattern in your output | Tight rewrite |
|---|---|
| "ويظهر المعنى فورًا: «X»" | "المعنى: «X»." |
| "فتخيّل [scene] في الحكاية" | "تخيّل [scene]." |
| "فترى/فيكون كذا" | drop, use period + new clause |
| "صوت X قريب من «Y» في كلمة «Z»" | "X يشبه «Y» في «Z»." |
| "تخيّل X يقول/يعدّ/يحرس..." | "X = Y." (when the imagery is simple) |

### Keep these unchanged

- All 103 keys (same order)
- `onyomi`, `kunyomi`, `en_meanings`, `ar_meanings`, `radicals`, `stroke_count`, `example_vocab_keys` — all good, don't touch
- The `mnemonic.en.meaning_story` and `mnemonic.en.reading_story` for all 103 — light polish if you see filler, otherwise keep
- The `_meta` block (update `sources_consulted` if you check new sources during revision)

### Specific reminder for AR reading stories

This is the **highest-stakes field** in the corpus — it teaches the sound, in Arabic. The voice has to feel native AND the sound hook has to be a real Arabic word that contains the target sound. If you can't find a tight Arabic anchor, it's better to use the EN-rooted hook with a small note (e.g., «جاك» as a transliterated proper name) than to use raw Latin letters in the AR text.

### Output

**Overwrite the same file in place** at:
```
scripts/output/codex-l2-08-kanji.json
```

Same JSON schema. Same key set. Same per-item fields. Same `_meta` block (update `sources_consulted` if applicable).

### Self-review before finishing

1. **Verify the 6 specific keys from Issue 1 no longer contain Latin letters in the AR reading_story.**
2. **Read 20 random AR meaning_stories + 20 random AR reading_stories aloud.** Each should sound like app micro-copy, not a textbook explanation.
3. **Check average length** — most AR stories should be 50-90 characters now. If they're still 120+, you're still over-explaining.
4. **No forbidden dialect markers.** No Latin letters in any AR field.
5. **All 103 keys, same order.** All required fields per item.
6. **JSON validates.**

Kanji is the deepest, most-valued content type. **Quality matters more than speed.**
