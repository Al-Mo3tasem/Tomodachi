# Tomodachi — Lesson-Path Review Brief (self-contained, for external reviewers)

> **How to use this file:** paste the ENTIRE file to an AI model, or hand it to a human
> reviewer. Section 1 is the prompt/instructions; everything after it is the context
> they need. No other material is required.

---

## 1. PROMPT — instructions to the reviewer

You are reviewing a proposed **lesson ordering** for a Japanese-learning app. You are
acting as an expert in **second-language acquisition and Japanese pedagogy** (JLPT N5
level, absolute beginners). Judge the proposal on pedagogy, motivation, and cognitive
load — NOT on software architecture (that is out of scope and already settled).

Read sections 2–6 carefully, then answer **only** in the JSON schema of section 7.
Be opinionated and concrete: vague praise is useless. If you propose moving a lesson,
say from where to where and why. Challenge the proposal wherever the research or your
experience disagrees with it — the authors want it broken before it ships, not
flattered. If you are unsure about something, say so in `confidence_notes` rather than
guessing silently.

Specific questions you MUST take a position on (see `answers` in the schema):

1. **Kanji entry point** — the proposal starts kanji at global lesson ~36 (after 5
   vocab clusters, mid-katakana). Too early, too late, or right? Consider that the
   audience are absolute beginners, mostly native Arabic speakers.
2. **Grammar density** — grammar appears roughly every 4–6 lessons (54 points spread
   across the course, dependency-ordered, です first). Is that pacing right for
   retention, or should grammar cluster differently?
3. **Katakana start** — katakana begins only after the learner has ~2 vocab clusters
   + all 14 hiragana lessons (design rationale: katakana-without-context retains
   poorly). Agree or not?
4. **Dakuten/yōon placement** — hiragana lessons 11–14 (dakuten, handakuten, yōon)
   are interleaved WITH early vocab instead of finishing all 14 hiragana lessons
   first. Right call, or should the full syllabary come first?
5. **Vocab cluster order** — greetings → numbers → daily verbs → time/days →
   family/people → food/drink → places → body/feelings → weather/nature →
   adjectives. Would you reorder any cluster, and why?
6. **The 2-in-a-row rule** — no content type ever appears more than twice
   consecutively. Is this constraint helping (variety/interleaving effect) or
   hurting (context switching)?
7. **Arabic-speaker considerations** — anything in the ordering that should change
   given L1-Arabic learners specifically (script direction, phonology gaps like
   p/v sounds, existing exposure patterns in MENA)?
8. **Grammar curriculum conflict (IMPORTANT)** — the project has TWO candidate
   grammar orders and needs a ruling:
   - **Order A (the design doc):** function-first foundation — です (copula) →
     は (topic) → these/those + か → ます-form → を → に → で → て-form → the rest.
     Grammar starts early (lesson ~14) and each point is immediately usable in
     tiny sentences.
   - **Order B (the authored content):** particle-block-first — は → が → を →
     に → で → へ → と → の → から → まで → も → や → か → ね → よ, and only
     THEN です(16), copula variants, ます(20), verb forms, adjectives,
     comparatives, connectors, time expressions.
   Which order serves absolute beginners better, and if B, should the lesson
   path still interleave the particle block with vocab/kana or teach particles
   in one run? Answer in `answers.q8_grammar_order` with A / B / hybrid + rationale.

---

## 2. PROJECT CONTEXT — what Tomodachi is

- A **web app teaching Japanese to Arabic speakers** (MENA market), bilingual
  Arabic-first + English. All mnemonics and explanations exist in **both** Modern
  Standard Arabic and English; Arabic quality is a core differentiator ("the moat").
- **Audience:** absolute beginners, JLPT **N5** scope, mostly no prior Japanese.
  Mostly mobile users. Gamified: streaks, XP, daily quests, real-time 1-v-1 duels
  and co-op games with friends.
- **Model:** one **linear lesson path** (lesson N+1 unlocks when N is complete — no
  placement test; advanced learners can pay to free-browse) PLUS free-form
  **practice games** (pick any unlocked characters/words and drill). This review is
  about the linear path only.
- A lesson = **5–12 items** taught in one sitting (~5–10 min), then a short quiz.
- Spaced repetition (SRS) reviews of past items run alongside the path (out of
  scope here, but it means missed items resurface — the path does not need to
  re-teach).

## 3. THE CONTENT CORPUS (already written, real counts)

| Track | Items | Per-lesson | Lessons | Internal order source |
|---|---|---|---|---|
| Hiragana | 104 glyphs (46 base + dakuten/handakuten/yōon) | one kana row | **14** | standard gojūon rows |
| Katakana | 104 glyphs (same structure) | one row | **14** | same |
| Vocabulary | 353 now, 681 total planned (~800 eventual) | 8–10 words | **~35–40** | thematic clusters (below) |
| Kanji | 103 (N5) | 5–7 kanji | **~18** | visual-radical families (kanji sharing components taught together) |
| Grammar | 54 points | 1 point + examples | **54** | dependency order (no point before its prerequisites) |

Every vocab item has: Japanese, kana reading, romaji, EN + AR meanings, an example
sentence (JA/EN/AR), audio. Every kana has a mnemonic in EN and AR. Every kanji has
readings, meanings (EN+AR), and two-part mnemonic stories (meaning + reading).

## 4. LOCKED DESIGN CONSTRAINTS (not up for review — work within them)

1. Hiragana rows 1–10 (the 46 base kana) come **before any vocabulary** — the
   learner must read kana before words (no romaji-led vocab).
2. The learner is **never given more than 2 lessons of the same content type
   back-to-back** (interleaving is a deliberate design choice — but see Q6: you may
   critique the *strictness*).
3. Grammar is taught in **dependency order**; です (copula) is foundational.
4. Progress is stored per-lesson, and the global order can be re-shuffled in later
   releases without breaking user progress — so your suggestions are cheap to adopt.
5. Listening drills are a separate dashboard game mode, NOT lessons in the path.

## 5. THE PROPOSED ORDER UNDER REVIEW

### 5a. Opening 40 lessons (concrete)

| # | Lesson | Content |
|---|---|---|
| 1–10 | hiragana 1–10 | the 46 base kana, one row per lesson (あ row → わをん) |
| 11 | vocab: greetings 1 | こんにちは, ありがとう, すみません… |
| 12 | vocab: greetings 2 | greetings continued |
| 13 | hiragana 11 | dakuten (が・ざ rows) |
| 14 | grammar 1 | です (copula) |
| 15 | vocab: numbers 1 | いち, に, さん… |
| 16 | hiragana 12 | dakuten (だ・ば rows) |
| 17 | vocab: numbers 2 | numbers + counting continued |
| 18 | hiragana 13 | handakuten (ぱ row) |
| 19 | grammar 2 | は (topic marker) |
| 20 | hiragana 14 | yōon (きゃ, しゃ…) — **hiragana complete** |
| 21 | vocab: daily verbs 1 | します, たべます, のみます… |
| 22 | katakana 1 | ア row — **katakana starts** |
| 23 | vocab: daily verbs 2 | verbs continued |
| 24 | grammar 3 | これ / それ / あれ + か |
| 25 | katakana 2 | カ row |
| 26 | vocab: time & days 1 | きょう, あした, きのう… |
| 27 | katakana 3 | サ row |
| 28 | grammar 4 | ます-form (polite present) |
| 29 | vocab: time & days 2 | days of week, months |
| 30 | katakana 4 | タ row |
| 31 | vocab: family & people 1 | かぞく, ちち, はは… |
| 32 | katakana 5 | ナ row |
| 33 | grammar 5 | を (object marker) |
| 34 | vocab: family & people 2 | people continued |
| 35 | katakana 6 | ハ row |
| 36 | **kanji 1** | 一二三四五 + radical 木 — **kanji starts** |
| 37 | vocab: food & drink 1 | ごはん, みず, おちゃ… |
| 38 | katakana 7 | マ row |
| 39 | grammar 6 | に (direction marker) |
| 40 | kanji 2 | next visual-radical family |

### 5b. Pattern for the remainder (~lessons 41–135)

Same weave continues: katakana 8–14 finish interleaved with vocab clusters 6–10
(places, body & feelings, weather & nature, adjectives, …); kanji lessons 3–18
proceed in radical-family order roughly every 3–5 lessons; grammar 7–54 continues
in dependency order (で location, て-form, negation, past tense, adjective
conjugation, time expressions…). Katakana completes near lesson ~55. The back half
of the course is carried mostly by kanji, grammar, and the remaining vocab
clusters. Full course ≈ **130–140 lessons**.

## 6. KNOWN GAPS (the authors already know these — factor them in, don't just repeat them)

- The 353 existing vocab words carry these tags (item counts): verbs 82,
  adjectives 59, expressions 40 (greetings live here), nouns 37, time 29,
  places 18, food 16, adverbs 14, people 11, counters 10, family 9, body 9,
  days 7, nature 8, weather 4. Mapping these to the thematic lesson clusters is
  in progress; cluster sizes in §5 are targets.
- **The stored grammar order is Order B of question 8** (particles 1–15 first,
  です at #16, ます at #20) while the design doc specified Order A (です first).
  The proposal in §5 assumed Order A — your answer to q8 decides which stands.
- Kanji's current stored order is not yet the visual-radical-family order; a
  re-ordering pass is planned before kanji lessons are built.
- Only 353 of the eventual ~681 vocab words are deployed; later clusters may
  initially be thinner than target.

## 7. REQUIRED OUTPUT SCHEMA

Respond with **exactly one JSON object**, no prose outside it:

```json
{
  "reviewer": "<model name or person name + one-line credential>",
  "overall_verdict": "approve | approve_with_changes | rework",
  "scores_1to5": {
    "reading_first_foundation": 0,
    "interleaving_and_pacing": 0,
    "cognitive_load_management": 0,
    "motivation_and_early_wins": 0,
    "jlpt_n5_alignment": 0,
    "fit_for_arabic_speakers": 0
  },
  "answers": {
    "q1_kanji_entry": "too_early | right | too_late — with 1-3 sentence rationale",
    "q2_grammar_density": "…",
    "q3_katakana_start": "…",
    "q4_dakuten_yoon_placement": "…",
    "q5_vocab_cluster_order": "…",
    "q6_two_in_a_row_rule": "…",
    "q7_arabic_speaker_notes": "…",
    "q8_grammar_order": "A | B | hybrid — with rationale"
  },
  "issues": [
    {
      "severity": "blocker | major | minor",
      "location": "<lesson # or range, e.g. '36' or '11-20'>",
      "issue": "<what is pedagogically wrong>",
      "recommendation": "<specific fix: move/split/merge/reorder what to where>"
    }
  ],
  "proposed_reorderings": [
    { "move": "<lesson/cluster>", "from": "<position>", "to": "<position>", "rationale": "<why>" }
  ],
  "missing_considerations": ["<things the proposal never addresses but should>"],
  "confidence_notes": "<where you are least sure / what evidence you'd want>"
}
```

Severity guide: **blocker** = will measurably harm learning or retention for many
users; **major** = meaningfully suboptimal, should change before launch; **minor** =
polish. An empty `issues` array with verdict `approve` is acceptable ONLY if you
genuinely tried to find problems and failed.
