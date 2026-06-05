# Learning Experience — Tomodachi

> Authoritative design doc for how a learner moves through Tomodachi: onboarding, lesson flow, mastery, spaced-repetition scheduling, mistake handling, audio behavior, lesson page anatomy per content type, the full quiz question catalog, transitions, empty states, and accessibility. Locked before any L2.B content authoring or L2.C build work begins, per the Phase L2 gate in `Phases_and_Tasks.md` §L2.
>
> | | |
> |---|---|
> | **Version** | v1.0 |
> | **Visibility** | TRACKED |
> | **Last updated** | 2026-06-05 |
> | **Governance** | See `PROJECT_RULES.md` §2 (design docs require project lead review & amend before downstream work begins) |
> | **Companion docs** | `GAMIFICATION_DESIGN.md` (XP/levels/badges/streaks — to be written next), `CONTENT_GUIDELINES.md` (bilingual writing standards), `Commercialization_Plan.md` (Pro vs Free matrix) |

---

## Scope

This doc covers everything a user *experiences* between sign-in and finishing a lesson. Out of scope: what content gets authored (that's `CONTENT_GUIDELINES.md`), what motivates engagement (that's `GAMIFICATION_DESIGN.md`), and what the Firestore schemas look like (that's locked in `Tomodachi_Master_Plan.md` after L2.03). When this doc and another conflict, this one wins for the learner-facing surface; the other wins for its own scope.

## Conventions

- "Item" = a single Firestore content doc (one kana, one vocab, one kanji, one grammar point).
- "Lesson" = a curated sequence of items the user works through in one session, usually 5-12 items.
- "Card" = the on-screen unit during practice — one prompt + one response.
- "Quest" = a daily SRS-generated review set chosen by the algorithm, not curated.
- "Mastery state" / "M-state" = the per-item state stored in `users/{uid}/progress/{itemKey}` per the SM-2 algorithm specified below.
- Free tier = the default; Pro tier = paid tier per `Commercialization_Plan.md` §6.

---

## 1. Onboarding flow

**Decision:** no placement test. Every new account starts at lesson 1, kana row 1. Advanced learners who already know hiragana subscribe to Pro to unlock free-browse and jump ahead. This is the explicit MVP tradeoff per the 2026-06-05 design discussion: MENA audience skews beginner, and advanced learners are mostly on Anki / WaniKani already.

### First-time flow

1. **Sign up** — already shipped (auth screen per L1.01).
2. **Welcome screen** (new) — full-bleed warm-paper background, scarf-crimson logo, bilingual greeting:
   - EN: "Welcome, {name}. Ready to learn your first 5 characters?"
   - AR: "أهلاً بك يا {name}. مستعد لتتعلّم أول 5 أحرف؟"
   - Single primary CTA: "Start lesson 1" / «ابدأ الدرس الأول»
   - Secondary text link: "What's inside?" → opens a 30-second tour modal (3 screens: "What you'll learn", "How it works", "Daily quests"). Skippable.
3. **Lesson 1** — the あいうえお row, 5 items, one at a time. See §8.1 (kana lesson anatomy).
4. **Lesson 1 outcome** — confetti + first-badge unlock animation + the line: "You learned 5 kana. Lesson 2 unlocks in your dashboard."
5. **Dashboard** — first visit shows a soft tooltip pointing at "Daily quest" (which is empty until lesson 1 completes) and "Continue lesson 2" CTA.

### Returning user flow

- If a quest is active: dashboard surfaces the quest button first, "Continue lesson N" second.
- If no quest pending: "Continue lesson N" is primary.
- If a friend just came online: the friend bar lights up but doesn't steal focus from the lesson CTA.

### Tour modal content (drafted later by Codex per `feedback-ar-voice-common-tech-not-strict-msa`)

- Screen 1 — "What you'll learn": JLPT N5 in your first few months. Kana, vocab, kanji, basic grammar.
- Screen 2 — "How it works": Short daily sessions, review what slipped, move forward at your pace.
- Screen 3 — "Daily quests": Each morning we pick 3 cards that need your attention. ~5 minutes.

---

## 2. Linear path structure

The linear order is the same for every Free user. Pro users can free-browse but the recommended path is identical.

### 2.1 Hiragana (lessons 1-14)

Standard row order. Each lesson = one row = 5 items, except the irregular rows which are 4 or 3.

| Lesson | Content | Item count |
|---|---|---|
| 1 | あいうえお (vowels) | 5 |
| 2 | かきくけこ (k row) | 5 |
| 3 | さしすせそ (s row) | 5 |
| 4 | たちつてと (t row) | 5 |
| 5 | なにぬねの (n row) | 5 |
| 6 | はひふへほ (h row) | 5 |
| 7 | まみむめも (m row) | 5 |
| 8 | やゆよ (y row) | 3 |
| 9 | らりるれろ (r row) | 5 |
| 10 | わをん (w row + ん) | 3 |
| 11 | Dakuten (が-行 + ざ-行) | 10 |
| 12 | Dakuten (だ-行 + ば-行) | 10 |
| 13 | Handakuten (ぱ-行) | 5 |
| 14 | Yōon (きゃ・しゃ・ちゃ etc.) | ~21 |

Total: ~92 hiragana glyphs across 14 lessons.

### 2.2 Katakana (lessons 15-28)

Same row structure as hiragana. Introduced **after** the first vocab cluster (see below) so the learner has Japanese vocabulary to anchor katakana to, instead of seeing it as "more shapes". This is a deliberate choice per WaniKani / Renshuu evidence that katakana-without-context retention is worse than katakana-after-some-vocab.

### 2.3 Vocab clusters (interleaved with kana + katakana)

Thematic clustering, frequency-weighted. Each cluster = 15-25 items, taught as 2-3 lessons of 8-10 items each. Order:

1. **Greetings & politeness** (~15 items) — こんにちは, ありがとう, すみません, おはよう, etc. Sits *after* hiragana lessons 1-10 (so the learner can read what they're learning).
2. **Numbers 1-20 + counting** (~25 items) — basic numbers + native counters いち, に, さん, よん, etc.
3. **Daily verbs (group 1)** (~20 items) — します, たべます, のみます, いきます, きます, etc.
4. **Time & days** (~20 items) — きょう, あした, きのう, days of the week, months.
5. **Family & people** (~20 items) — かぞく, ちち, はは, あに, いもうと, ともだち.
6. **Food & drink** (~25 items) — ごはん, パン, みず, おちゃ, etc. (last cluster uses katakana words).
7. **Places** (~20 items) — いえ, がっこう, レストラン, えき, etc.
8. **Body & feelings** (~20 items)
9. **Weather & nature** (~15 items)
10. **Adjectives (group 1)** (~25 items) — basic い-adjectives and な-adjectives.
11-N. Remaining clusters as required to reach ~800 N5 items total.

Each cluster's lessons interleave with kana/katakana lessons so the learner is never doing more than 2 lessons of one content type back to back. Exact interleaving order is finalized in L2.03 (schema work) and L2.05+ (authoring).

### 2.4 Kanji (after vocab cluster 5)

103 N5 kanji, taught in *visual-radical-family order* — kanji that share visual components cluster together so radicals reinforce naturally. Each lesson = 5-7 kanji. ~16-20 kanji lessons total.

Order rationale: not by frequency (which scatters visually similar kanji across the curriculum), not by stroke count alone (which front-loads simple but disconnected kanji). Visual-radical clustering — taught with explicit radical introduction in lesson 1 of the kanji track — gives the learner a mental scaffolding that compounds.

Exact order is finalized in L2.08 authoring, but lesson 1 covers 一二三四五 (numbers + clean horizontal-stroke kanji) and the radical 木 (tree) is introduced before 林 (woods) and 森 (forest).

### 2.5 Grammar (interleaved with vocab from cluster 3)

~50 N5 grammar points, taught in **dependency order** — no grammar point appears before all its prerequisites. Each lesson = 1 grammar point + 4-8 example sentences + a short drill.

Foundation order:
1. です (copula) — needed for almost everything.
2. わたしは + topic marker は — needed for self-introduction.
3. これ / それ / あれ + か (question) — needed for noun-pointing.
4. ます-form (polite present) — gates all verb-aware grammar.
5. を (object marker) — gates transitive verbs.
6. に (direction marker) — gates motion verbs.
7. で (location of action) — gates place + verb.
8. て-form — gates verb chaining, requests, ongoing actions.
9-N. Remaining N5 points (negation, past, adjective conjugation, time expressions, etc.) — finalized in L2.09.

### 2.6 Listening drills (after vocab cluster 4)

Standalone audio-prompt drills (different from vocab cards): user hears a short phrase, picks the meaning from 4 options OR types what they heard. ~100 listening items spanning N5 surface area. Introduced as a separate game mode on the dashboard ("Listening drill"), not as forced lessons in the linear path — but daily quests will include listening items once the user has reached cluster 4.

---

## 3. Mastery model

Mastery is per-item, not per-lesson. A lesson is *complete* when every item in it has been answered correctly within that session (originally or on retry — see §6). A lesson is *passed* — meaning the next lesson unlocks — when complete.

Item-level mastery state lives in `users/{uid}/progress/{itemKey}`. Fields per SM-2 (§4):

```
{
  ef: 2.5,            // ease factor; starts at 2.5
  interval: 0,        // days until next review; 0 = learning queue
  reps: 0,            // consecutive correct count since last lapse
  due: null,          // ISO timestamp of next due review
  lapses: 0,          // total wrong answers ever
  lastSeen: null,     // ISO timestamp of last review
  m: 'learning'       // 'learning' | 'reviewing' | 'mastered' | 'lapsed'
}
```

### Mastery states

- **learning** — first lesson in progress, not yet correctly answered in a real review.
- **reviewing** — answered correctly at least once, on a review schedule. Current interval < 30 days.
- **mastered** — current SM-2 interval ≥ 30 days AND at least 4 consecutive correct reviews. Visible to user as a small mastery dot on the item.
- **lapsed** — was reviewing or mastered but just got a wrong answer. Drops back to learning queue; reps resets to 0.

### Dashboard mastery rollups

- "Hiragana mastery: 23/92" — count of items with `m: 'mastered'` over total in category.
- Mastery isn't a gate — you don't need everything mastered to move forward. Lesson unlock is based on lesson-completion (§3 above), not mastery. Mastery is shown for feedback + the future gamification badges.

---

## 4. SRS algorithm — Anki SM-2

Chosen per the 2026-06-05 design discussion: battle-tested, well-documented, familiar to Japanese learners, ships fast. FSRS is the future but adds project risk for ~10-20% efficiency gain that we won't notice at N=50 beta users.

### 4.1 Quality rating

User-facing response is binary: **correct** or **wrong**. We don't expose an "easy / good / hard" picker (Anki's UX) because adult learners on mobile shouldn't have to self-rate; the response time + first-try correctness gives us enough signal.

Internally we map to SM-2's 0-5 quality scale:

| Response | Quality (q) |
|---|---|
| Wrong (any) | 0 |
| Correct on retry (within same session) | 3 |
| Correct on first try, response time > 8s | 4 |
| Correct on first try, response time ≤ 8s | 5 |

Response time is measured from card-show to first input. The 8s threshold is a starting estimate, tunable from L2 user data.

### 4.2 Interval calculation

After a review with quality `q`:

```
if q < 3:
    # Wrong answer → lapse
    interval = 0           // back into learning queue
    reps = 0
    lapses += 1
    m = 'lapsed'
else:
    # Correct answer
    if reps == 0:
        interval = 1       // 1 day
    elif reps == 1:
        interval = 6       // 6 days
    else:
        interval = round(interval * ef)
    reps += 1
    ef = max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
    m = 'mastered' if interval >= 30 and reps >= 4 else 'reviewing'

due = now + interval days
lastSeen = now
```

The ease factor floor of 1.3 prevents pathological cards from getting reviewed daily forever.

### 4.3 Learning queue

Items with `interval = 0` (new items + lapsed items) live in the learning queue. They're shown:

- Within a lesson session: at the end of the lesson if originally wrong (retry budget — §6).
- In daily quests: prioritized over `reviewing` items.
- The learning queue isn't shown as a separate UI surface — it just feeds into quest generation and lesson completion.

### 4.4 Daily quest generation

Runs as a scheduled Cloud Function at the user's local midnight (TZ from `users/{uid}.tz`, defaulting to Africa/Cairo).

Algorithm:
1. Find all items where `due ≤ today` (overdue + due today).
2. Sort by: `lapsed` first, `learning` second, `reviewing` third (by oldest `due` within each bucket).
3. Pick up to 10 items. Cap at 10 even if more are due, so the quest never feels impossible.
4. Write to `users/{uid}/quests/{YYYY-MM-DD}` with the chosen item keys.
5. If <3 items qualify (early in user's journey), backfill with the next 3-X unstarted items from the user's next-up linear lesson, marked as "preview".

The quest is presented on the dashboard as "Today's quest — X items, ~Y minutes" where Y = item count × 30 seconds (rough estimate).

### 4.5 Completion of a quest

When the user answers all items in today's quest (correctly or after retry), the quest is marked complete. XP awarded per `GAMIFICATION_DESIGN.md`. If the user doesn't complete the quest by the end of the day, *unanswered items roll over* into tomorrow's quest at higher priority. A repeatedly-skipped quest is a signal to lighten future quests (handled in §5 difficulty curve).

---

## 5. Difficulty curve & pacing

### 5.1 Hard caps

| Cap | Value | Why |
|---|---|---|
| New items introduced per day (Free) | 15 | Prevents content overdose; adult learners overestimate their capacity. |
| New items introduced per day (Pro) | 30 | Pro gets ~2x because power users self-pace. |
| Review burden per quest | 10 | Quest never feels impossible. |
| Lesson item count (standard) | 5-8 | Short enough to fit in a coffee break. |
| Lesson item count (review lesson) | up to 12 | Review lessons can be denser since the user already knows the items. |
| Concurrent learning items (in queue) | 30 | Prevents the learning queue from becoming a swamp. If 30 items are stuck in learning, no new lessons unlock until 5+ are promoted to reviewing. |

### 5.2 Fatigue signals + responses

Tracked per-user via Cloud Function on each session-end:

- **Accuracy drop** — if last-10-card accuracy drops below 60% within a session, show a soft prompt: "Want to take a breather? Your progress is saved." Continue button next to it.
- **Session length** — if a session exceeds 25 minutes, prompt "You've been at it for a while. Save and continue tomorrow?" Save button next to it.
- **Repeated quest skip** — if user skips today's quest 3 days in a row, next quest is capped at 5 items + only `lapsed` items (the urgent ones). No `learning` or `reviewing` backfill that day.
- **Streak-at-risk** — handled in `GAMIFICATION_DESIGN.md` streak section, but per this doc: if the user has an active streak and it's after 8pm local without an active session today, a gentle (non-spammy) notification fires. Cap: 1 streak-at-risk notification per day, opt-out from settings.

### 5.3 Pace acceleration for advanced users

If a user has answered ≥90% correct on first try for the last 30 cards, the daily new-item cap silently bumps from 15 to 20 (Free) or 30 to 40 (Pro). Resets if accuracy drops.

---

## 6. Mistake handling

**Decision per 2026-06-05:** retry budget per lesson. Forgiving, matches the "calm pace, no guilt loops" brand voice.

### 6.1 In-lesson behavior

- Each lesson has N items (5-12 per §5.1).
- Wrong answer on any item:
  1. Show correct answer with brief explanation (1-2 sentences from the item's `meaning_story` or its EN/AR `meaning`).
  2. Show "Got it" button (not "Continue") — emphasis on understanding, not just clicking through.
  3. Item goes into the *end-of-lesson retry queue*.
- After all original items are answered (correct or wrong), the retry queue runs. Each retry-queue item must be answered correctly to clear it.
- If wrong again on retry, item goes back to retry queue (with a brief "Try again" feedback). Loops until correct.
- Lesson is *complete* when the retry queue is empty.

### 6.2 Lesson abandonment

If the user closes the lesson mid-way:
- Items already answered correctly: SM-2 state updated normally.
- Items not yet answered: no state change.
- Items in retry queue: marked as wrong for that day (so they show up in tomorrow's quest as `lapsed`).
- Lesson is *not* marked complete; next time the user opens lesson N, they restart from item 1 (no resume mid-lesson). This is a deliberate choice — resume-mid-lesson adds significant state-management complexity for a feature most users won't use given lesson lengths are short.

### 6.3 No "lesson failed" state

There is no lesson fail. Wrong answers always go to retry, retry always continues until passed. The brand voice forbids punishing a tired Tuesday-night brain.

---

## 7. Audio integration

### 7.1 What has audio

- **Kana items** — single-glyph audio (`audio_url` field).
- **Vocab items** — word audio (single MP3).
- **Kanji items** — reading audio per major reading (multiple URLs in `readings[].audio_url`).
- **Grammar items** — no item-level audio, but example sentences each have audio.
- **Listening drill items** — full-phrase audio is the prompt; no glyph shown until response.

### 7.2 Playback rules

- **Auto-play on card show: NO** by default. The reason: many users practice in shared spaces (commute, office, café) where surprise audio is hostile. User taps the speaker icon to hear.
- **Exception 1: listening drill mode** — auto-plays once on card show (the audio *is* the prompt). User can re-play via tap.
- **Exception 2: "Listen" practice mode in Zen/Survival** — the existing `practice=listen` setting in those games (per `js/games/`) already auto-plays per their design; this carries forward.
- **User can toggle "auto-play audio" globally** in Settings (default off). If on, audio plays once per card-show automatically.
- **Replay** — speaker icon on every audio-bearing card, tappable any number of times.

### 7.3 Loading strategy

- Cards pre-fetch their audio URL when the *previous* card is shown, so by the time the user advances, the next card's audio is in browser cache.
- Signed URLs cached client-side per content key for the signed URL's lifetime (1 hour per L2.12).
- On audio fetch failure: show the card normally, hide the speaker icon, log to Sentry if consented. No user-facing error toast (audio is enhancement, not core).

### 7.4 Voices

- Primary: `ja-JP-NanamiNeural` (Azure Neural TTS — see L2.11).
- Alternate: `ja-JP-KeitaNeural`. Used for vocabulary example sentences to give voice variety. Single-glyph audio stays Nanami for consistency.

---

## 8. Lesson page anatomy

Each content type has its own lesson shape. The lesson screen (`js/ui/lesson_screen.js`, built in L2.13) renders per the appropriate template.

### 8.1 Kana lesson

```
┌──────────────────────────────────┐
│  [back]   Lesson N — Hiragana    │
│           Row: あいうえお          │
├──────────────────────────────────┤
│                                  │
│   [INTRO CARD]                    │
│   "Today: あ い う え お"          │
│   "5 vowels. Tap to hear each."  │
│   Mini-row of all 5 with speaker │
│   [Start drill →]                │
│                                  │
├──────────────────────────────────┤
│   [DRILL — one at a time]         │
│   Large glyph:  あ                │
│   [🔊]                            │
│   "What sound?"                   │
│   [ a ]  [ i ]  [ u ]  [ e ]  *MC*│
│                                  │
│   (Or: type the romaji  *typing*) │
│   Reveal "story" link if struggle │
├──────────────────────────────────┤
│   [OUTCOME]                       │
│   "Lesson complete. 5 kana down."│
│   [Continue to lesson N+1]        │
└──────────────────────────────────┘
```

Drill item question type per §9.1.

### 8.2 Vocab lesson

```
┌──────────────────────────────────┐
│  [back]   Lesson N — Vocab        │
│           Cluster: Greetings     │
├──────────────────────────────────┤
│   [INTRO PEEK]                    │
│   List of all items in lesson:    │
│     こんにちは — Hello / مرحباً    │
│     ありがとう — Thank you / شكراً │
│     ...                           │
│   [Start drill →]                 │
├──────────────────────────────────┤
│   [DRILL CARD — 6 question types  │
│    per §9.2, picked by mastery]   │
│   Word: こんにちは [🔊]            │
│   "What does it mean?"           │
│   [ Hello ]   [ Thanks ]          │
│   [ Sorry ]   [ Bye ]             │
├──────────────────────────────────┤
│   [EXAMPLE SENTENCE PEEK]         │
│   After every 3 correct in a row, │
│   show an example sentence with  │
│   the most recent item. No quiz. │
├──────────────────────────────────┤
│   [OUTCOME — same as kana]        │
└──────────────────────────────────┘
```

### 8.3 Kanji lesson

```
┌──────────────────────────────────┐
│  [back]   Lesson N — Kanji        │
│           Today: 一二三四五         │
├──────────────────────────────────┤
│   [INTRO PER KANJI — one at a     │
│    time]                          │
│   Large kanji:  一                │
│   Meaning: one / واحد             │
│   Radical(s): 一                  │
│   Meaning story: [from item.meaning_story_en
│                  + item.meaning_story_ar] │
│   Readings: いち, ひと-つ          │
│   Reading story: [item.reading_story] │
│   Example: 一人 (ひとり) — one person│
│   [I got it →]                    │
├──────────────────────────────────┤
│   [DRILL — mixed question types   │
│    per §9.3]                      │
├──────────────────────────────────┤
│   [OUTCOME — same as kana]        │
└──────────────────────────────────┘
```

### 8.4 Grammar lesson

```
┌──────────────────────────────────┐
│  [back]   Lesson N — Grammar     │
│           Today: です            │
├──────────────────────────────────┤
│   [EXPLANATION]                   │
│   Title: です — "to be"           │
│   EN body: [item.body_en — 1-3    │
│             short paragraphs]    │
│   AR body: [item.body_ar]        │
│                                  │
│   [EXAMPLES — 4-8 sentences]      │
│   Each: JA / romaji / EN / AR    │
│   [🔊 plays JA]                   │
│   [Continue to drill →]           │
├──────────────────────────────────┤
│   [DRILL — fill-in-blank +        │
│    sentence ordering per §9.4]   │
├──────────────────────────────────┤
│   [OUTCOME — same as kana]        │
└──────────────────────────────────┘
```

### 8.5 Listening drill (standalone, not in linear path)

Dashboard tile "Listening drill" → 10-item session of audio-only prompts. Same shape as a vocab lesson except every card *starts* with auto-played audio and the prompt is "What did you hear?" (typing) or "Pick the meaning" (multiple choice).

---

## 9. Quiz question types

Question type for each item per drill is chosen by the engine based on the item's mastery state. The catalog:

### 9.1 Kana

| Type | Prompt | Response | When fired |
|---|---|---|---|
| **glyph→reading** | Show kana, ask for romaji | Typing or 4-option MC | Primary. Always in learning state. |
| **reading→glyph** | Show romaji, ask for kana | 4-option MC | Reviewing state. Inverts the recall direction. |
| **audio→glyph** | Play audio, ask for kana | 4-option MC | Reviewing + listening enabled. |

### 9.2 Vocab

| Type | Prompt | Response | When fired |
|---|---|---|---|
| **word→meaning** | Show JA word, ask for meaning | 4-option MC (EN options + AR option for AR locale) | Learning state. |
| **meaning→word** | Show meaning, ask for JA word | 4-option MC with kana options | Reviewing. |
| **audio→word** | Play JA audio, ask for kana | 4-option MC | Reviewing, when audio loaded successfully. |
| **fill-in-blank sentence** | "わたしは＿＿を食べます" with options | 4-option MC | Mastered items, occasionally — gives reinforcement in context. |
| **typing** | Show meaning, type JA reading | Romaji input, IME-tolerant | Pro only by default (Free finds it punishing; tunable). |

### 9.3 Kanji

| Type | Prompt | Response | When fired |
|---|---|---|---|
| **kanji→meaning** | Show kanji, ask for meaning | 4-option MC | Learning. |
| **kanji→reading** | Show kanji + context word, ask for reading | 4-option MC | Reviewing. Context word helps disambiguate readings. |
| **meaning→kanji** | Show meaning, ask for kanji | 4-option MC of visually distinct kanji | Reviewing. |
| **reading→kanji** | Show reading + context, ask for kanji | 4-option MC | Reviewing, mastered. |
| **vocab-in-context** | Show a vocab item using the kanji, ask for the kanji's meaning | 4-option MC | Mastered. Bridges kanji-mastery to vocab-recognition. |

### 9.4 Grammar

| Type | Prompt | Response | When fired |
|---|---|---|---|
| **fill-in-blank** | Show sentence with one particle/conjugation blank | 4-option MC | Primary. All states. |
| **sentence ordering** | Show jumbled words (chips), assemble into correct sentence | Drag-to-order chips | Reviewing+. Tests structural understanding. |
| **true/false grammaticality** | Show full sentence, ask "Is this grammatical?" | Yes/No | Mastered. Hardest type. |
| **translate-in** | Show EN or AR sentence, pick the JA translation | 4-option MC | Mastered. |

### 9.5 Listening drill

| Type | Prompt | Response | When fired |
|---|---|---|---|
| **audio→meaning** | Auto-play audio phrase, ask for meaning | 4-option MC | Primary. |
| **audio→typing** | Auto-play audio, type what you heard | Hiragana typing | Pro / advanced. |

### 9.6 General rules across all types

- 4-option MC: 1 correct + 3 distractors. Distractors are picked from items in the same lesson or visually/semantically similar items (engine logic, L2.14).
- Typing input is romaji-tolerant for kana (both `ち` = `chi` and `ti`) and IME-tolerant for kanji items.
- No timer pressure inside lessons (timer is the Zen/Survival mode's thing, not the learn-mode thing).
- Response shown after each answer: correct → green flash + 250ms next-card delay; wrong → red flash + reveal correct answer + brief explanation + tap to continue (no auto-advance on wrong).

---

## 10. Transition rules

### 10.1 Within a lesson

- Intro card → drill cards: tap "Start drill".
- Drill card → next drill card: 250ms auto-advance on correct; manual tap-to-continue on wrong (with explanation).
- Last original drill card → retry queue (if any): silent transition with "Quick review of what slipped" header card for 2 seconds.
- Retry queue cleared → outcome screen.
- Outcome screen → dashboard: tap "Continue to lesson N+1" (next-lesson route) or "Done" (dashboard route).

### 10.2 Between lessons

- Completing lesson N immediately enables lesson N+1 on the dashboard.
- No auto-jump from lesson N outcome to lesson N+1 start — user always explicitly chooses to continue. Adult learners don't want to be auto-fed; they want choice.
- Exception: if lesson N+1 is the kana-row continuation (lesson 1 → 2 → 3 within hiragana), the outcome screen's primary CTA is "Continue to lesson N+1". Otherwise primary is "Done".

### 10.3 Lesson → daily quest → game modes

- Daily quest is independent of lessons. User can do quest before, after, or instead of lessons that day.
- Existing Zen / Survival / Duel / Coop modes (per `js/games/`) continue to use the user's *full character set* (all kana the user has unlocked + optionally a custom selection). Lessons don't gate access to game modes — once you've passed lesson 1, all 5 of those kana are eligible to appear in any game mode.

### 10.4 Sign-out / sign-in

- Mid-lesson sign-out: lesson progress lost (per §6.2). User sign-in lands on dashboard, not mid-lesson.
- Mid-quest sign-out: quest progress saved. User sign-in lands on dashboard with quest still active.

---

## 11. Empty states

### 11.1 First-time dashboard

- Profile card: shows 0 across all stats.
- Mastery bar: 0/92.
- Daily quest: "Complete your first lesson to start daily quests" — disabled tile.
- Continue lesson: "Lesson 1 — Hiragana row 1" — primary CTA.
- Friend bar: "Add your first friend" — secondary CTA.
- Recent history: "No lessons played yet."

### 11.2 No friends added

- Friend bar shows: "Add your first friend" with a + icon.
- Friend-required game modes (Duel, Coop) show grayed out with tooltip: "Add a friend to duel" / "Add a friend to play co-op".

### 11.3 No quests today

- Possible reasons: user is brand new (< 1 lesson complete) OR every item is in `mastered` state with `due > today` (rare in early phase).
- Display: "Quest cleared for today — see you tomorrow."
- Pro upsell only fires on the Pro upgrade card elsewhere on dashboard, not on the empty quest tile. (Avoid feeling pestered.)

### 11.4 Streak broken

- Dashboard banner (dismissible): "Welcome back. Streak reset to 0. Today's lesson keeps you moving."
- Notice is calm, no shame language. Per `feedback-premium-modern-ux` and brand voice.
- Banner dismisses on dismiss OR after 7 days.

### 11.5 Lesson locked

- Lesson tile shows lock icon + "Complete lesson N first".
- Tap → modal: "Complete lesson N to unlock this." No upsell shown here for Free users; Pro upsell lives in a single dedicated upgrade card, not scattered as friction.

### 11.6 Content not loaded (network failure or Firestore down)

- Spinner for up to 8 seconds.
- After 8s: "Couldn't load your lesson. Retry." button.
- Sentry logs failure (if consented).

### 11.7 Audio not loading

- Speaker icon hides on individual cards. User can still complete the lesson; the item just has no audio that day.
- Background retry every 30s in case it's a transient network blip.

---

## 12. Accessibility

Per scope (`Commercialization_Plan.md` §11): EN + AR + light/dark + RTL only. Broader a11y (screen readers, motor accessibility) is explicitly deferred to L5+. Within this scope:

### 12.1 Colorblind safety

- Correct/wrong feedback uses **icon + color + position**, never color alone:
  - Correct: ✓ + green flash + advance.
  - Wrong: ✕ + red flash + stay-and-reveal.
- Status dots on friend bar: shape changes (filled circle = online, empty circle = offline, half = in-game), not just color.

### 12.2 Font sizing

- All UI fonts use `rem` units relative to root, so browser-level zoom + OS-level font-size respected.
- No fixed `px` font sizes anywhere in lesson surfaces. (Existing app has some `px` from earlier phases; cleanup deferred unless flagged.)
- Japanese glyph displays use larger sizes (clamp(3rem, 8vw, 5rem)) so even at small viewport they remain readable.

### 12.3 Motion-reduce

- `@media (prefers-reduced-motion: reduce)`:
  - Disables confetti animation on lesson outcome.
  - Disables card-flip transition (cards swap instantly).
  - Disables streak-flame pulse.
  - Keeps essential feedback animations (correct/wrong flash) but at 50% duration.

### 12.4 Keyboard

- Lesson drill: number keys 1-4 select multiple-choice option. Enter advances on correct.
- Lesson outcome: Enter = primary CTA.
- Reset, sign-out, settings — already keyboard-accessible from earlier phases.

### 12.5 RTL

- All lesson surfaces use logical CSS properties (`margin-inline-start`, etc.) — already established in L1.02.
- Quiz options reorder correctly in RTL (numbered 1-4 in DOM, but visually displayed right-to-left under `dir="rtl"`).
- Japanese text itself is always LTR even inside an RTL container (browser handles this natively for the `<bdi>` element + the Japanese script Unicode block).

### 12.6 Audio captions

- Out of scope for v1 (would require transcript per audio file in EN + AR).
- Tracked as future work in `Phases_and_Tasks.md` Phase L5.

---

## Cross-references

- **`GAMIFICATION_DESIGN.md`** (to be written next, L2.02) — XP per action, level curve, badge catalog, streak rules in full, daily quest rewards, leaderboard scoring.
- **`CONTENT_GUIDELINES.md`** — what each item's fields should contain (e.g., mnemonic structure §8, vocab fields §9, kanji fields §10). This doc says *how* items are presented; that doc says *what* the items contain.
- **`PROJECT_RULES.md`** §7 (file structure), §13 (i18n key shape), §18 (audio + content authoring).
- **`Tomodachi_Master_Plan.md`** — to be updated in L2.03 with the finalized `content_sets/*` Firestore schemas referenced throughout this doc.
- **`Commercialization_Plan.md`** §6 (Free vs Pro feature matrix).

---

## Open questions for review

The following choices were made by Claude's judgment and benefit from explicit project lead confirmation. Mark each ✓ or push back:

1. **Katakana introduced after vocab cluster 1, not immediately after hiragana** (§2.2). Rationale: katakana-with-vocab-anchor beats katakana-in-isolation per WaniKani / Renshuu evidence. Alternative is to teach all kana first.
2. **Kanji taught in visual-radical-family order, not pure frequency order** (§2.4). Rationale: radical reinforcement compounds. Alternative is JLPT-list order (essentially frequency).
3. **Auto-play audio OFF by default** (§7.2). Rationale: shared spaces. Alternative is on-by-default with off-toggle (matches Anki).
4. **Internal SM-2 quality rating mapped from response time, not user self-rating** (§4.1). Rationale: adult mobile users don't want to self-rate every card. Alternative is to expose a 3-button (again / good / easy) picker.
5. **Mid-lesson sign-out abandons progress** (§6.2). Rationale: complexity vs benefit. Alternative is full resume-mid-lesson state persistence.
6. **No timer pressure inside lessons** (§9.6). Rationale: lesson = learning, not testing. Alternative is a soft per-card timer.
7. **30-day interval threshold for "mastered" state** (§3). Rationale: matches Anki's "mature" threshold. Alternative thresholds: 21d (Renshuu), 90d (conservative), or "X consecutive correct answers" instead of interval-based.
8. **Concurrent learning items capped at 30** (§5.1). Rationale: prevents learning swamp. Alternative caps: 20 (stricter), 50 (looser), or no cap.

Push back on any of these before we start L2.02 (GAMIFICATION_DESIGN), since some of them affect that doc (badges per mastery, XP per quality rating, etc.).
