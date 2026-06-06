# Follow-up for the kana Codex session (hiragana + katakana)

> **Date:** 2026-06-06
> **Session:** the one that produced `codex-l2-05-hiragana.json` + `codex-l2-06-katakana.json`
> **Action:** revise both output files in place

---

## Pass this as your next message to that Codex session

The hiragana and katakana files you wrote are **mechanically correct**: 104/104 valid in both, no missing keys, AR uses Arabic-native imagery (ن, ك, ا letters; نور, شعر, كاتب words — good), no forbidden dialect markers. Thank you.

**One issue to fix: the AR voice is too textbook-formal.** The original spec asked for "Careem/Anghami modern-MENA-app register" — but many entries default to a 1990s Arabic-grammar-textbook register. Examples from your output:

- ❌ *"يشبه «あ» حرف «أ» مرسومًا بلفّة واسعة، فاقترب منه كصوت «a» القريب من «أ»"* — "fa-iqtarib minhu ka-sawti" reads like a writing exam.
- ❌ *"فيمتزج «كي» مع «يا» ليعطي صوت «kya»"* — "fa-yamtazij...li-yu'ti sawta" is stilted-academic.
- ❌ *"يحافظ «が» على شكل «か» المرتبط بـ«كا» ويضيف نقطتي التنتن، فيتحول الصوت إلى «ga»"* — overlong, formal.

**Target register** is what you'd read on a Careem ride-summary screen, an Anghami player notification, an Arabic UI string in a modern app. Short. Conversational. Direct. Examples of the same content rewritten:

- ✅ *"«あ» يشبه «أ» مع ذيل ملفوف. صوته «a»."*
- ✅ *"«き» مع «ya» الصغيرة تصير «kya». صوته «كيا»."*
- ✅ *"«が» = «か» مع نقطتين، فيصير «ga»."*

### What to revise

Walk through every entry in BOTH files (`codex-l2-05-hiragana.json` + `codex-l2-06-katakana.json`) and tighten the AR mnemonic for **voice and register**. Rules:

1. **Keep the imagery and phonetic anchor** — they're correct. Don't change the Arabic letter references (ن, ك, ا), don't change which Arabic word you used as the sound hook (نور, شعر, etc.). Just change how the sentence is constructed.
2. **Cut the academic connective tissue.** Drop "فاقترب منه كصوت", "ليعطي صوت", "فيمتزج", "يحافظ على شكل" formulas. Use short clauses, declarative sentences.
3. **Aim for 50-100 characters per AR mnemonic** in most cases. The current output averages 120-150 characters; that's textbook density. Modern app voice is denser meaning per word.
4. **Read each one aloud (or imagine speaking it).** If it sounds like a teacher reading from a board, rewrite. If it sounds like a friend explaining something in a café, ship it.
5. **EN side stays mostly as-is.** Light polish only — if you see filler ("simply", "just remember"), trim it. Otherwise don't touch EN.
6. **Keep all 104 keys in each file**, same order, same `_meta` block with updated `sources_consulted` if you check new ones.
7. **Don't switch to dialect.** Modern conversational MSA, not Egyptian/Levantine/Gulf colloquial. Same forbidden list as the original spec: `دلوقتي, ازاي, فين, بصّ, شوف, عايز, عاوز, يلّا, خلّاص, كده, بقى, أوي`.

### Specific patterns to compress

Pattern in your output → suggested rewrite:

| Verbose pattern | Tight rewrite |
|---|---|
| "يشبه «X» حرف «Y» مرسومًا بـ..." | "«X» يشبه «Y»." |
| "فاربطه بصوت «Z» في كلمة «W»" | "صوته «Z» كما في «W»." |
| "فيمتزج «A» مع «B» ليعطي صوت «C»" | "«A» + «B» = «C»." |
| "يحافظ على شكل «X» ويضيف..." | "«X» + [diacritic] = ..." |
| "فيتحول الصوت إلى «X»" | "فيصير «X»." |

### Yoon mnemonics are the most over-formal

All 33 yoon entries in both files follow the same verbose template ("يلتقي ... مع ... الصغيرة، فيمتزج ... مع ... ليعطي صوت ..."). This is repetitive AND verbose. Pick a tighter template and apply it consistently. Suggestion:

> **Old:** *"يلتقي مفتاح «き» مع «や» الصغيرة، فيمتزج «كي» مع «يا» ليعطي صوت «kya»."*
> **New:** *"«き» + «や» الصغيرة = «きゃ»، صوته «كيا»."*

Half the length. Same pedagogical content. Modern-app voice.

### Output

**Overwrite the same two files in place** at:
- `scripts/output/codex-l2-05-hiragana.json`
- `scripts/output/codex-l2-06-katakana.json`

Same JSON schema. Same key set. Same `_meta` block (update `sources_consulted` if you consult anything new during the revision).

### Self-review before finishing

1. **Read 15 random AR mnemonics aloud across both files.** Each should sound like an app micro-copy, not a textbook explanation.
2. **Check average AR length.** If most entries are >120 characters, you're still over-explaining. Aim for 60-100.
3. **Check yoon consistency.** All yoon entries (in both files) should follow the same tightened template.
4. **No forbidden dialect markers.**
5. **All 104 keys per file, same order.**
6. **JSON validates.**

Quality > speed. This sets the AR brand voice for the entire app.
