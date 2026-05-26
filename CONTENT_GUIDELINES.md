# Tomodachi — Content Guidelines

> Editorial standards for all written content in Tomodachi. Applies equally to AI-drafted text (Codex) and human-authored text. The bilingual quality bar is the moat — these rules exist to protect it.
>
> | | |
> |---|---|
> | **Version** | v1.0 |
> | **Visibility** | TRACKED |
> | **Last updated** | 2026-05-26 |
> | **Audience** | All content contributors (project lead, Codex, Claude, future hires) |

---

## Table of Contents

1. [Purpose & first principles](#1-purpose--first-principles)
2. [Bilingual philosophy: parallel, not translation](#2-bilingual-philosophy-parallel-not-translation)
3. [English voice & tone](#3-english-voice--tone)
4. [Arabic voice & tone](#4-arabic-voice--tone)
5. [Arabic dialect policy](#5-arabic-dialect-policy)
6. [Japanese conventions inside EN/AR text](#6-japanese-conventions-inside-enar-text)
7. [Translation review process](#7-translation-review-process)
8. [Hiragana & Katakana content format](#8-hiragana--katakana-content-format)
9. [Vocabulary card format](#9-vocabulary-card-format)
10. [Kanji card format (with mnemonic style)](#10-kanji-card-format-with-mnemonic-style)
11. [Grammar lesson format](#11-grammar-lesson-format)
12. [Example sentence format](#12-example-sentence-format)
13. [Numbers, dates, punctuation, typography](#13-numbers-dates-punctuation-typography)
14. [Content sourcing & licensing](#14-content-sourcing--licensing)
15. [Style nitpicks (the petty list)](#15-style-nitpicks-the-petty-list)

---

## 1. Purpose & first principles

### 1.1 Why this matters

The Arabic-first pedagogy is Tomodachi's primary moat (see `Commercialization_Plan.md` §2). If a native Arabic speaker reads a clunky AR sentence, the moat collapses. These guidelines exist to prevent that — and to keep EN content equally high-quality, since most users will sample both languages while learning.

### 1.2 First principles

- **Both languages get original thought, not just translation.** An AR speaker learning the particle は does not need an Arabic translation of an English explanation; they need an Arabic explanation that uses Arabic linguistic intuition.
- **Brevity > completeness.** A 3-sentence explanation that lands beats a 10-sentence one that drifts. Adult learners' time is the scarcest resource.
- **Examples over rules.** Every grammar point earns at least 2 example sentences. Rules without examples are abstract; examples without rules are scattered. Both.
- **Respect the learner.** Never condescend. Never use "easy peasy" / "بسيطة جداً" filler. State the thing, show the example, move on.
- **No emoji in lesson body content.** Acceptable in UI (toast messages, encouragement). Never inside a grammar explanation or vocab definition.

---

## 2. Bilingual philosophy: parallel authoring is the default

### 2.1 Rule

**Every piece of lesson content is authored independently in each language, thinking in that language.** The AR version is not "translated from" the EN version, nor vice versa — both are written for their own audience by someone (or something) thinking in that language.

This applies to:

- Vocabulary card notes & usage hints
- Kanji mnemonics (meaning + reading stories)
- Grammar explanations (body, contrasts, common mistakes)
- Example sentence selections (some sentences may need to differ between EN and AR for cultural fit)
- Daily quest copy
- Welcome / onboarding / marketing copy
- FAQ answers
- Error messages with explanatory content (not just "Error: ...")

### 2.2 The only exception — trivial 1:1 UI strings

Direct translation is acceptable **only** for:

- Button labels with no nuance ("Sign In" → «تسجيل الدخول»)
- Form field labels ("Email" → «البريد الإلكتروني»)
- Short status toasts with no pedagogical content ("Saved" → «تم الحفظ»)
- Navigation items ("Settings" → «الإعدادات»)

Anything beyond a 1:1 label is parallel-authored.

### 2.3 Authoring discipline: one item at a time

Content is **authored one item at a time**, not batch-generated. The pipeline for vocab/kanji/grammar:

1. Pick the next single item
2. Author the EN version, thinking in English
3. Author the AR version, thinking in Arabic (not by translating §2.1)
4. Review the pair side-by-side: does each one stand on its own?
5. Commit the item
6. Move to the next

Codex may *draft* a first pass, but each item gets a focused human-review-with-eyes-on before merge. Speed is not the goal here — the AR moat lives or dies on this discipline.

### 2.4 The two versions don't have to be the same length

A Japanese grammar point may need 2 sentences in EN and 4 in AR (or vice versa) to land cleanly. That's expected, not a bug.

---

## 3. English voice & tone

### 3.1 Voice

Calm, capable, culturally respectful. Like a knowledgeable friend explaining something at a café — not a lecturer, not a corporate brochure, not an over-friendly mascot.

### 3.2 Tone

- **Confident, not bossy.** "は marks the topic of the sentence." not "You MUST remember that は marks the topic!"
- **Warm, not chatty.** "Nice work on your first 10 hiragana." not "OMG amazing job!!"
- **Specific, not vague.** "Tap a character to hear its pronunciation." not "Click around to explore."
- **Direct, not euphemistic.** "Wrong answer." not "Hmm, close but not quite!"

### 3.3 Grammatical conventions

- Title case for screen titles, button labels (≤ 4 words): "Sign In", "Start Quiz"
- Sentence case for everything else: "Master Japanese, your way."
- Oxford comma always
- Em dash `—` (not double-hyphen `--`)
- Curly quotes `" "` in body text; straight `" "` only in code

### 3.4 Words we avoid

- "Easy", "simple", "just" (minimizing words insult the learner)
- "Awesome", "amazing", "perfect" as filler (use only when actually warranted)
- "Click" (use "tap" or "select" — mobile-first audience)
- "Hit" as in "hit submit"

---

## 4. Arabic voice & tone

### 4.1 Voice

نبرة هادئة وواثقة ومحترِمة لثقافة المتعلِّم. كصديق عارف يشرح بهدوء في مقهى — لا كأستاذ صارم، ولا كنشرة شركة، ولا كتميمة مرحة مبالَغ فيها.

(Calm, confident voice that respects the learner's culture. Same character as the English voice, expressed natively.)

### 4.2 Tone

- **واثقة بلا تَسلُّط:** «تَدُلّ «は» على موضوع الجملة.» وليس «احفظ جيداً أنّ «は» تدلّ على موضوع الجملة!»
- **دافئة بلا كثرة كلام:** «أحسنتَ في أول عشرة أحرف هيراغانا.» وليس «رائع جداً جداً!!»
- **محدَّدة بلا غموض:** «اضغط الحرف لتسمع لفظه.» وليس «استكشف الصفحة.»
- **مباشرة بلا تَلطُّف زائد:** «إجابة خاطئة.» وليس «قريبة لكن ليست تماماً!»

### 4.3 Avoid translationese

Signs of translationese that disqualify AR content:

- Direct EN word order forced into AR ("هذا هو شيء جميل" instead of natural "هذا شيء جميل")
- Calques from English idioms ("في النهاية" used to mean "at the end of the day")
- Over-formal AR constructions where natural conversational AR works ("نَودُّ منكم أن تَتفضَّلوا بـ..." for "please [do X]")
- Underuse of natural Arabic features: dual form (مثنّى), broken plurals, idafa (إضافة) — these aren't formal; they're how AR works

### 4.4 Words we avoid

- «بسيط جداً», «سهل جداً» — minimizing, same reason as EN
- «رائع», «مذهل», «ممتاز» as filler — only when warranted
- «اضغط هنا» as a CTA — use the actual verb («اشترك», «ابدأ»)
- Pure dialectal verbs in lesson content («بصّ», «شوف») — see §5 below

---

## 5. Arabic dialect policy — **Modern Standard Arabic only**

### 5.1 The rule (no exceptions)

**All Arabic content in Tomodachi is written in Modern Standard Arabic (فصحى).** No Egyptian. No Levantine. No Gulf. No Maghrebi. No mixing.

This applies to every surface: lesson bodies, grammar explanations, kanji mnemonics, vocab notes, error messages, legal pages, UI strings, welcome emails, onboarding copy, encouragement toasts, marketing copy, FAQ answers, push notifications. **Every Arabic string ships in MSA.**

Why MSA-only:

- Universally understood across MENA (our target geography)
- Matches the educational register learners expect from a serious learning app
- Doesn't alienate Gulf, Levantine, or Maghrebi users
- Avoids the worst possible failure mode: register-mixing within a single sentence

### 5.2 Never mix registers within a sentence

Specifically forbidden — mixing Egyptian markers with MSA in the same sentence:

- ❌ «ما عندكش أصدقاء بعد» (Egyptian negation -ش + MSA «بعد» — register-mixed, unacceptable)
- ✅ «ليس لديك أصدقاء بعد» (clean MSA)
- ❌ «يلّا نبدأ التعلّم» (Egyptian «يلّا» + MSA «التعلّم» — mixed)
- ✅ «هيّا نبدأ التعلّم» (clean MSA equivalent)
- ❌ «تمام كده!» (pure Egyptian)
- ✅ «أحسنت!» or «ممتاز!» (MSA equivalent of an encouragement)

### 5.3 Egyptian markers to consciously avoid

These signal Egyptian dialect and must not appear in our content:

| Egyptian | MSA equivalent |
|---|---|
| ما + verb + ش (negation) | لا + verb / لم + verb / ليس |
| يلّا | هيّا / لنَبدأ |
| خلّاص | حسناً / انتهى الأمر |
| كده | هكذا / بهذا الشكل |
| دلوقتي | الآن |
| إيه / فين / إزاي | ما / أين / كيف |
| بصّ / شوف | انظر / تأمَّل |
| عايز / عاوز | أريد / أُريدُ |
| بَعد + ش | لم يَحِن بعد / ليس بعد |

### 5.4 When MSA feels stiff — natural MSA, not casual Egyptian

If a sentence in pure MSA feels overly formal for the context (e.g., a friendly encouragement toast), the fix is **natural conversational MSA**, not Egyptian. MSA has registers too:

- Overly formal: «نُهَنِّئُكَ على إنجازك المُتميِّز» (encyclopedia register)
- Natural MSA: «أحسنت! أداء رائع.» (still MSA, but conversational)
- Wrong fix: «برافو يا نجم!» (Egyptian — forbidden by §5.1)

The author's job is to write natural MSA that sounds warm without code-switching.

### 5.5 Edge case: Japanese transliterations and brand names

Brand names (Tomodachi, Cairo, Tokyo) and Japanese transliterations (هيراغانا, روماجي) are not dialect markers — they cross all Arabic registers and are fine in MSA content. See §15.2 for the canonical transliterations.

---

## 6. Japanese conventions inside EN/AR text

### 6.1 Hiragana, katakana, kanji always in original script

Never transliterate Japanese characters into Latin or Arabic script in lesson body. Always show the Japanese:

- ✅ "The particle は marks the topic."
- ✅ «تدلّ «は» على موضوع الجملة.»
- ❌ "The particle wa marks the topic."

### 6.2 Romaji policy

Romaji (Hepburn romanization) is included as a learning aid **only**:

- On the first appearance of a new word/phrase per lesson
- On vocab cards (next to the Japanese, smaller font)
- Inside parentheses for clarity in body text: 「ありがとう」 (arigatou)

After a learner has been introduced to a character, the romaji is dropped. Adults shouldn't be crutch-fed forever.

### 6.3 Arabic transliteration of Japanese (Pro feature)

For absolute beginners struggling with romaji, a Pro feature shows Arabic-letter transliteration alongside Japanese on cards: ありがとう = أَرِيغَاتُو. Rules for this transliteration table will be authored as a separate sub-document when the Pro feature ships.

### 6.4 Names and proper nouns

- Japanese names in EN: standard Hepburn — "Tokyo", "Yokohama", "Hayao Miyazaki"
- Japanese names in AR: phonetic Arabic — «طوكيو», «يوكوهاما», «هاياو ميازاكي»
- A canonical Japanese-to-Arabic transliteration table for common names lives in `content/transliteration_ja_to_ar.json` (to be created during Phase L2)

### 6.5 Honorifics

- さん in lesson examples is glossed once per learner ("〜san: polite suffix attached to a name") then used freely
- 先生 (sensei), 君 (kun), ちゃん (chan), 様 (sama): introduced as separate vocab cards; never assumed

---

## 7. Translation review process

### 7.1 The default flow

1. Content authored in primary language (EN or AR — author's choice)
2. Codex drafts the second language version (per `PROJECT_RULES.md` §17)
3. Claude reviews the second language version (per `PROJECT_RULES.md` §11.3, §17.3)
4. Project lead reviews the final pair before merge
5. Merge gates: both versions present, both pass review

### 7.2 What the review checks

For the AR version specifically:

- **Linguistic accuracy** — grammatically correct MSA, idiomatically natural
- **Pure MSA** — no Egyptian, no Levantine, no mixing within a sentence (per §5)
- **Authored, not translated** — the AR reads like something written *in* Arabic, not converted from English (per §2.1)
- **No translationese** — see §4.3 disqualifiers
- **Cultural fit** — references and examples that work for an Arabic-speaking learner (not US-specific cultural references that don't translate)
- **Length sanity** — AR is allowed to be longer or shorter than EN, but not 3× the length

For the EN version specifically:

- **Voice match** — see §3.2
- **Authored, not translated** — if the AR was authored first, the EN reads like something written *in* English, not converted from Arabic
- **No corporate filler** — "leverage", "elevate", "unlock your potential"
- **Active voice** — "Press Start" not "Start can be pressed"
- **No emojis in lesson body** — see §1.2

### 7.3 Review escape hatch

If a reviewer disagrees with the draft strongly enough to want a full rewrite, they rewrite — not "request changes" in a loop. Rewriting is faster than reviewing iterations.

### 7.4 Native speaker pass (deferred)

Once revenue justifies (~Phase L4+), pay a native AR speaker (~$200-500) to review the full N5 content body. This is a Future Considerations item until then.

---

## 8. Hiragana & Katakana content format

### 8.1 Card data structure

Each kana character is one Firestore doc in `content_sets/{kana_type}/{key}` with:

```js
{
  key: 'a',                    // Latin slug, unique per kana_type
  glyph: 'あ',                 // The character
  romaji: 'a',                 // Hepburn
  row: 'a',                    // a, ka, sa, ta, na, ha, ma, ya, ra, wa, n, gojuon, dakuten, yoon
  // Bilingual learning aids (parallel-authored, never translated)
  mnemonic_en: 'Looks like an "A" with a backwards "h" tail.',
  mnemonic_ar: '...',          // Authored independently per §10.5 principles
  // Audio — content key, not URL. Client fetches signed URL via Cloud Function.
  audio_key: 'hiragana/a',     // Resolves to `audio/hiragana/a.mp3` in Firebase Storage
  // Metadata
  jlpt: 'pre-n5',
  difficulty: 1                // 1-5; used for adaptive review
}
```

### 8.2 Mnemonics

- One sentence each, EN + AR
- Visual: anchor to a memorable shape (a face, an animal, a familiar letter)
- Per §2.1 the AR mnemonic is authored separately, not translated — the imagery and phonetic hooks are AR-native

### 8.3 Audio

- Single short clip (~500 ms) of the character pronounced in isolation
- Native-quality voice from Azure TTS (`ja-JP-NanamiNeural` or `ja-JP-KeitaNeural`)
- Stored in Firebase Storage at `audio/hiragana/{key}.mp3` (per `PROJECT_RULES.md` §18.4 — Tier 3, accessed via signed URL only)

---

## 9. Vocabulary card format

### 9.1 Card data structure

```js
{
  key: 'n5_v_001_eat',          // Slug: {jlpt}_v_{NNN}_{en_root}
  jlpt: 'n5',
  category: 'verbs',            // verbs, nouns, adjectives, adverbs, expressions, counters, days/dates, family, food, etc.
  // The word
  japanese: '食べる',
  reading: 'たべる',
  romaji: 'taberu',
  // Translations
  en: { primary: 'to eat', notes: 'Ichidan verb. Polite form: 食べます (tabemasu).' },
  ar: { primary: 'يأكل', notes: 'فعل من الفئة الأولى (ichidan). صيغة المهذَّب: 食べます (tabemasu).' },
  // Usage
  example_ja: '朝ご飯を食べます。',
  example_en: 'I eat breakfast.',
  example_ar: 'آكُل الإفطار.',
  example_audio_key: 'examples/n5_v_001_eat',
  // Audio for the word itself (resolves via signed URL Cloud Function — see PROJECT_RULES.md §18.4)
  audio_key: 'vocab/n5_v_001_eat',
  // Metadata
  difficulty: 1,
  related: ['n5_v_002_drink', 'n5_n_005_breakfast']
}
```

### 9.2 The "notes" field

- Brief — 1-2 sentences max
- Captures the *one* thing that would otherwise confuse the learner
- Examples of good notes:
  - "Used for non-living things. For living things, use いる."
  - "Polite suffix — never used about yourself."
- Don't restate the obvious ("This is a verb")

### 9.3 Example sentences

- Always one example per card
- Use only kana and kanji already introduced (or that this card teaches)
- Real-life context — avoid surreal "the cat sits on the moon" filler
- Single short sentence (≤ 10 words in Japanese)

### 9.4 Related words

- Up to 5 keys of related vocab in the `related` array
- Used for "see also" links on the lesson card and for personalized review (§3 Engagement in Commercialization Plan)

---

## 10. Kanji card format (with mnemonic style)

### 10.1 The two-mnemonic structure (WaniKani-inspired)

Each kanji card carries **two short, separate stories** — one for the *meaning* and one for the *primary reading*. They are not one big story; they are two focused mnemonics that work independently and connect when chained.

**Why two:** the learner has to remember two unrelated things about each kanji — what it *means* and how it's *pronounced*. One story can't anchor both well, because the shape→meaning hook and the meaning→sound hook are different kinds of associations. WaniKani's research-backed structure splits them deliberately.

**Each story is one short scene** — 1-2 sentences max. Not a paragraph, not a chain of events. One vivid picture.

### 10.2 Walked-through example: 人 (person)

**Step 1 — Meaning story (anchors shape to meaning):**

> EN: *Two legs walking forward. A person is just two legs that walked into the scene.*

> AR: *ساقان تَسيران إلى الأمام. الإنسان ببساطة ساقان دَخَلَتَا المشهد.*

This story uses only the kanji's visual shape (人 looks like two legs). Reading it once should imprint the meaning "person" the next time you see 人.

**Step 2 — Reading story (anchors meaning to primary on'yomi sound):**

The primary on'yomi of 人 is **ジン (jin)**. We need a story that, when you think "person", makes "jin" come to mind.

> EN: *Whenever the person walks past, a JIN-gle bell rings.*

This works because "JIN-gle" contains the sound "jin", and a jingle bell is a vivid memorable image. The reader sees a person, thinks "JIN-gle bell rings", and the "jin" reading surfaces.

> AR: *كُلَّما يَمُرّ شخصٌ، يَظهرُ جِنِّيٌّ بجواره.* (Whenever a person passes, a *jinn* appears beside them.)

The AR reading mnemonic is **NOT** a translation of the EN one. It uses a different culturally-portable phonetic hook: «جِنّ» (jinn) which contains the same /jin/ sound but anchors to Arabic-native imagery. The English jingle-bell association doesn't help an Arabic-thinking reader; the jinn association does.

**Both stories together** give the learner: shape → meaning ("two legs = person") + meaning → reading ("person summons a jinn = jin").

### 10.3 Card data structure

```js
{
  key: 'k_n5_001_person',
  jlpt: 'n5',
  ordinal: 1,                   // Order within JLPT level
  kanji: '人',
  onyomi: ['ジン', 'ニン'],     // primary first
  kunyomi: ['ひと'],
  en_meanings: ['person', 'people'],
  ar_meanings: ['شخص', 'إنسان'],
  mnemonic: {
    en: {
      meaning_story: 'Two legs walking forward. A person is just two legs that walked into the scene.',
      reading_story: 'Whenever the person walks past, a JIN-gle bell rings.'
    },
    ar: {
      meaning_story: 'ساقان تَسيران إلى الأمام. الإنسان ببساطة ساقان دَخَلَتَا المشهد.',
      reading_story: 'كُلَّما يَمُرّ شخصٌ، يَظهرُ جِنِّيٌّ بجواره.'
    }
  },
  radicals: ['k_rad_person'],   // keys into content_sets/radicals
  stroke_count: 2,
  example_vocab_keys: ['n5_n_001_person', 'n5_n_002_japanese_person']
}
```

### 10.4 Authoring rules for both stories

**For the meaning story:**
- Anchor to the kanji's visible shape or its radical components
- One vivid scene, 1-2 sentences
- Specific concrete imagery ("two legs walking forward") beats abstract ("humanity")

**For the reading story:**
- Identify the primary on'yomi (or most-useful reading for that kanji)
- Find a phonetic hook in the target language that contains that sound (EN: "jin-gle", "jin-x", "ninja"; AR: «جِنّ», «جِنازة», «جِنرال»)
- Write a 1-2 sentence scene that links the kanji's *meaning* to that sound

### 10.5 The AR reading story is authored independently

Per §2.1 (parallel authoring): the AR reading mnemonic is **never a translation of the EN one**. It uses an Arabic-language phonetic hook with Arabic-native imagery. If no good Arabic phonetic hook exists for a given reading, sometimes the AR mnemonic uses the same English-rooted hook (e.g., the word "ninja" is recognizable in Arabic too) — but that's the author's judgment per kanji, not a fallback rule.

### 10.6 Rules for both stories

- **Visual, not abstract.** Concrete images beat concepts.
- **Specific, not generic.** "Two legs walking" beats "limbs moving".
- **Cultural fit.** The image should land for the target language reader. AR mnemonics use AR-portable imagery; EN mnemonics use EN-portable imagery.
- **No politics, no religious controversy, no real-person names** (other than mythic/historical figures known across cultures).
- **Avoid forced rhymes.** Better a clean image than a clever pun that takes 3 reads to parse.

### 10.7 Radicals are content too

Radicals (kanji building blocks) are their own content set with their own mnemonics (one meaning story each — radicals don't have readings to memorize, so no reading story). When a learner studies a kanji whose radicals they've already learned, the meaning story can reference them by name: "person + sun + mouth → bright". This is faster and stickier than memorizing 300 unrelated kanji.

### 10.8 Stroke order

- Stroke order data is stored as SVG paths in Firebase Storage at `kanji_strokes/{key}.svg`
- Optional learning aid; not the focus of the lesson

---

## 11. Grammar lesson format

### 11.1 Lesson data structure

```js
{
  key: 'g_n5_001_wa_topic',
  jlpt: 'n5',
  ordinal: 1,
  // Title
  title_en: 'は — the topic particle',
  title_ar: 'الجسيم «は» — جسيم الموضوع',
  // Lesson body
  body_en: '...',              // Markdown, see §11.2
  body_ar: '...',              // Markdown
  // Example sentences (each is a SentenceExample object)
  examples: [
    {
      ja: '私は学生です。',
      romaji: 'Watashi wa gakusei desu.',
      en: 'I am a student.',
      ar: 'أنا طالب.',
      breakdown: '私 (I) + は (topic) + 学生 (student) + です (am).'
    },
    // ... more
  ],
  // Linked content
  related_grammar: ['g_n5_002_ga_subject'],
  introduces_vocab: ['n5_n_004_student'],
  // Metadata
  difficulty: 1,
  estimated_minutes: 3
}
```

### 11.2 Lesson body shape

Each lesson body follows this template (in both EN and AR):

```markdown
**What it does** *(1 short paragraph — what this grammar point means)*

**When to use it** *(1 short paragraph — situations and contexts)*

**The pattern** *(structural form, e.g., `[Topic] は [Comment].`)*

**Contrast** *(only if there's a commonly-confused alternative — explain the difference in 1 sentence)*

**Common mistakes** *(only if there's a top-1 mistake learners make — name it in 1 sentence)*
```

Total body: 4-8 sentences per language. Anything longer → split into 2 lessons.

### 11.3 The examples array

- 2-4 examples per lesson
- First example uses only previously-introduced vocab + the new grammar point
- Subsequent examples can introduce new vocab (with breakdown explaining each piece)
- Every example has the `breakdown` field — names the function of each component

---

## 12. Example sentence format

### 12.1 Universal rules (apply to all example sentences, in any content type)

- Single Japanese sentence per example, ≤ 10 words preferably
- Real-life context (greeting a coworker, ordering food, asking directions) over filler ("the moon eats the cat")
- Use vocab and kanji the learner has been exposed to in the current JLPT level
- Audio file per example sentence, Azure TTS

### 12.2 The four parallel fields

Every example sentence carries four pieces:

- `ja` — the Japanese sentence in its natural script (mix of kana + kanji as appropriate to JLPT level)
- `romaji` — Hepburn romanization (for early learners; can be hidden once user advances)
- `en` — natural English translation, not literal
- `ar` — natural Arabic translation, not literal

### 12.3 Optional `breakdown` field

For grammar lessons (per §11.3), the breakdown names each component's function. Format:

`"Word1 (meaning1) + Word2 (function2) + Word3 (meaning3)."`

In English. AR breakdown is constructed mechanically at render time from the same data for consistency — we don't dual-author breakdowns.

### 12.4 Example bank reuse

A single example sentence can be referenced from multiple content cards (vocab, grammar, kanji). To prevent duplication, all example sentences live in `content_sets/examples/{key}` and are referenced by key from other content. The key format: `ex_{jlpt}_{nnn}_{en_slug}`.

---

## 13. Numbers, dates, punctuation, typography

### 13.1 Numbers

- **In English UI:** Western Arabic numerals (1, 2, 3) always
- **In Arabic UI:** Western Arabic numerals (1, 2, 3) by default — they're widely accepted across MENA and avoid confusion with Eastern Arabic numerals (١، ٢، ٣) on mixed-script screens
- **Configurable per user:** a Settings option (Pro) allows Eastern Arabic numerals in AR mode — default off

### 13.2 Dates

- **EN:** "May 26, 2026" or "26 May 2026" (locale-appropriate)
- **AR:** «٢٦ مايو ٢٠٢٦» or «26 مايو 2026» (matching the numeral preference)
- ISO format (`2026-05-26`) for any data field, log line, or filename — never user-facing

### 13.3 Punctuation in Arabic

- Arabic comma (،) not Latin (,)
- Arabic question mark (؟) not Latin (?)
- Arabic semicolon (؛) when needed
- Latin parentheses ( ) — Arabic parentheses are not common practice; using Latin is standard

### 13.4 Typography

- **Latin (EN):** Inter, weights 400/500/600/700
- **Japanese:** Noto Sans JP, weights 400/500/700
- **Arabic:** **Cairo** (primary) — chosen for excellent screen rendering at small sizes + variety of weights + free OFL license. Backup: Tajawal.
- Final Arabic font choice locked here. Revisit only if Cairo fails on production data (e.g., missing glyphs for technical content) — unlikely.

### 13.5 Letter spacing & line height

- AR text needs more vertical space than Latin. Set `line-height: 1.7` for AR body, `1.5` for Latin body
- Letter-spacing on Latin headings: -0.01em (subtle tightening). On Arabic headings: default (no tightening — AR letters connect)

---

## 14. Content sourcing & licensing

### 14.1 Allowed sources

| Type | Allowed sources |
|---|---|
| Vocab lists | JLPT N5/N4 official guides (out of copyright), Tofugu vocab lists (Creative Commons attribution), free public WaniKani-style lists, custom curation by project lead |
| Kanji data | KanjiDic2 (public domain), JLPT official kanji lists, custom mnemonics (always original) |
| Grammar points | Standard JLPT N5/N4 syllabi (universally known structures, no copyright), original explanations |
| Audio | Azure TTS only (see `PROJECT_RULES.md` §18); browser TTS as fallback |
| Images | Original creations, free SVG icons (Heroicons MIT, Lucide ISC) |
| Translations to AR | Authored by us (per §2.2); never copied from a copyrighted source |

### 14.2 Not allowed

- Copy-paste from any commercial textbook (Genki, Minna no Nihongo, Tobira, etc.)
- Copy-paste from competitor apps (Duolingo, WaniKani, Bunpro, LingoDeer content)
- AI-translated content from Google Translate without human review
- Stock images with restrictive licenses

### 14.3 Attribution

If a free-licensed source is used (e.g., KanjiDic2, a CC-BY vocab list), attribution lives in a `LICENSES.md` file at repo root — never inside lesson content.

### 14.4 Trademark caution

- Don't use real Japanese product/brand names in example sentences ("I drink Asahi") — risk of unauthorized use claims
- Use generic alternatives ("I drink beer", "I drink coffee")

---

## 15. Style nitpicks (the petty list)

### 15.1 EN nitpicks

- "Japanese" not "japanese" — always capitalized
- "JLPT N5" not "jlpt n5" — acronyms always uppercase
- "Hiragana", "Katakana", "Kanji" — capitalized when referring to the writing systems (proper-noun feel)
- "Romaji" — capitalized when referring to the system; "romaji" lowercase when describing "the romaji of this word is..."
- "Kana" (lowercase) when used as a general term for hiragana + katakana collectively

### 15.2 AR nitpicks

- «هيراغانا», «كاتاكانا», «كانجي» — these are the agreed transliterations; don't drift to «هيراجانا» or other variants
- «روماجي» for romaji
- «جلبت N5» — keep JLPT in Latin script (acronym), level in Latin too. Better: «المستوى الخامس (N5)» in long form, «N5» in short form
- «تومودَاتشي» — the brand name in AR, with the fatha on the daal explicit when typographically useful

### 15.3 Filenames & keys

- All Firestore document keys: lowercase, underscore-separated
- All audio file names: lowercase, underscore-separated, match the doc key exactly
- Never include AR characters in filenames, keys, or commit messages — keep these ASCII-only for tooling sanity

### 15.4 Commit messages for content edits

Content-only commits use the prefix `content:` followed by what changed:

- `content: add 20 N5 vocab cards (food category, EN + AR)`
- `content: fix AR mnemonic for 学 (radicals story)`
- `content: regenerate audio for hiragana row sa`

---

*End of guidelines v1.0. Amendments require Progress Log entry per `PROJECT_RULES.md` §3.*
