# Learning Experience — Tomodachi

> Authoritative design doc for how a learner moves through Tomodachi: onboarding, lesson flow, mastery, spaced-repetition scheduling, mistake handling, audio behavior, lesson page anatomy per content type, the full quiz question catalog, transitions, empty states, and accessibility. Locked before any L2.B content authoring or L2.C build work begins, per the Phase L2 gate in `Phases_and_Tasks.md` §L2.
>
> | | |
> |---|---|
> | **Version** | v1.6 |
> | **Visibility** | TRACKED |
> | **Last updated** | 2026-06-05 (v1.6: fifth external-agent review applied — final review-cycle pass, see v1.6 changelog at end) |
> | **Governance** | See `PROJECT_RULES.md` §2 (design docs require project lead review & amend before downstream work begins) |
> | **Companion docs** | `GAMIFICATION_DESIGN.md` v1.6 (XP/levels/badges/streaks/quests), `CONTENT_GUIDELINES.md` (bilingual writing standards), `Commercialization_Plan.md` (Pro vs Free matrix) |

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

### 2.0 Lesson numbering scheme — v1.2 clarification

Lessons have **two identifiers** in the schema (finalized in L2.03):

- **`lessonKey`** — track-prefixed, position-within-track. Examples: `hiragana:01`, `hiragana:14`, `vocab:greetings:1`, `kanji:numbers:1`, `grammar:desu`. Stable, never changes after content authoring. This is what `users/{uid}/progress/lessons/{lessonKey}` keys off.
- **`globalOrder`** — integer position in the unified linear path (1, 2, 3, ...). Determined by the interleaving order finalized in L2.05+ authoring. Drives "Continue Lesson N" dashboard CTA + lesson-N+1 unlock logic. Can be reshuffled across releases without breaking progress data (since progress is keyed off `lessonKey`, not `globalOrder`).

The tables below use **within-track positions** (Hiragana 1-14, Katakana 1-14, etc.) for clarity. Their interleaved global order is described in §2.7 below.

### 2.1 Hiragana track (14 lessons)

Standard row order. Each lesson = one row = 5 items, except the irregular rows which are 4 or 3. `lessonKey` = `hiragana:01` through `hiragana:14`.

| Track position | Content | Item count |
|---|---|---|
| Hiragana 1 | あいうえお (vowels) | 5 |
| Hiragana 2 | かきくけこ (k row) | 5 |
| Hiragana 3 | さしすせそ (s row) | 5 |
| Hiragana 4 | たちつてと (t row) | 5 |
| Hiragana 5 | なにぬねの (n row) | 5 |
| Hiragana 6 | はひふへほ (h row) | 5 |
| Hiragana 7 | まみむめも (m row) | 5 |
| Hiragana 8 | やゆよ (y row) | 3 |
| Hiragana 9 | らりるれろ (r row) | 5 |
| Hiragana 10 | わをん (w row + ん) | 3 |
| Hiragana 11 | Dakuten (が-行 + ざ-行) | 10 |
| Hiragana 12 | Dakuten (だ-行 + ば-行) | 10 |
| Hiragana 13 | Handakuten (ぱ-行) | 5 |
| Hiragana 14 | Yōon (きゃ・しゃ・ちゃ etc.) | ~21 |

Total: ~92 hiragana glyphs across the 14-lesson track.

### 2.2 Katakana track (14 lessons)

Same row structure as hiragana. `lessonKey` = `katakana:01` through `katakana:14`. Track-locally numbered 1-14. **Track start point (in the global interleaved order):** introduced after the first vocab cluster (see §2.7) so the learner has Japanese vocabulary to anchor katakana to, instead of seeing it as "more shapes". This is a deliberate choice per WaniKani / Renshuu evidence that katakana-without-context retention is worse than katakana-after-some-vocab.

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

Each cluster's lessons interleave with kana/katakana lessons so the learner is never doing more than 2 lessons of one content type back to back. Exact interleaving order — i.e., the `globalOrder` integer per lesson — is finalized in L2.03 (schema work) and L2.05+ (authoring).

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

### 2.7 Global interleaving sketch (illustrative; final order locks in L2.05+)

Concretely showing how the tracks weave together. Numbers are `globalOrder` values; lesson labels are `lessonKey`-style:

```
1.  hiragana:01    ← あいうえお
2.  hiragana:02    ← かきくけこ
...
10. hiragana:10    ← わをん, ん
11. vocab:greetings:1   ← Hiragana 1-10 lets the learner READ these
12. vocab:greetings:2
13. hiragana:11    ← Dakuten 行 1
14. vocab:numbers:1
15. hiragana:12    ← Dakuten 行 2
16. vocab:numbers:2
17. hiragana:13    ← Handakuten
18. vocab:verbs1:1
19. hiragana:14    ← Yōon
20. vocab:verbs1:2
21. katakana:01    ← Katakana track starts
22. vocab:time:1
23. grammar:desu   ← Grammar enters
... etc.
```

Schema notes:
- `lessonKey` is the stable identifier (never changes after content authoring).
- `globalOrder` is the integer position in the linear path (can shift across releases without breaking progress data).
- Lesson `N+1` unlocks when lesson `N` is complete, where `N` is `globalOrder`.
- "Continue Lesson N" on the dashboard displays `globalOrder` + the lesson's display name from the schema.
- Final `globalOrder` values are assigned in L2.05+ as content is authored.

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
- **reviewing** — answered correctly at least once, on a review schedule.
- **mastered** — `reps ≥ 5` (5 consecutive correct answers since last lapse). Visible to user as a small mastery dot on the item. Per project lead's v1.1 decision: consecutive-correct count is the mastery signal, not interval length. By the time reps hits 5, the SM-2 interval is naturally ~30 days+ anyway, so the rule is simpler-to-explain without changing behavior much in practice.
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
    m = 'mastered' if reps >= 5 else 'reviewing'

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
5. If <3 items qualify (early in user's journey), backfill with the next 3-X unstarted items from the user's next-up linear lesson, marked as `preview: true` per item (see §4.4.1 below).

The quest is presented on the dashboard as "Today's quest — X items, ~Y minutes" where Y = item count × 30 seconds (rough estimate).

#### 4.4.1 Preview backfill rules (v1.2 clarification)

When a quest backfills with preview items from the user's next-up lesson, the rules are:

| Concern | Preview behavior |
|---|---|
| **SRS state update** | YES — preview items update SM-2 state normally (they are real reviews with a real response time + correctness). |
| **Counts against daily new-items cap** | YES — a preview item, even if encountered via quest before its lesson, counts as a new item for cap purposes (per §5.1). |
| **Counts against concurrent-learning cap** | YES — preview items in `learning` state count toward the 20-item concurrent cap. |
| **Awards XP** | YES — correct-answer XP fires normally (per `GAMIFICATION_DESIGN.md §1.1`). |
| **Unlocks lesson progress** | NO — the lesson itself must still be formally completed via the lesson screen (per §6.1 retry-queue-empty rule). Preview items just pre-warm the user's familiarity with content they'll see soon. |
| **Affects `globalOrder` unlock** | NO — completing a preview item doesn't push the user forward in the linear path. The user still has to do the actual lesson. |

Effect: previews accelerate exposure but not progression. A user doing previews gets a head start on familiarity; a user skipping previews doesn't fall behind.

#### 4.4.2 What happens when the formal lesson runs an already-previewed item (v1.3 clarification)

If a user previewed `kana:あ` via quest backfill, then later reaches the formal `hiragana:01` lesson (which contains あ), the formal lesson behaves as follows:

- **Always render the intro card** for the lesson, regardless of how many items in the lesson the user has already previewed. The intro card teaches the *concept* (e.g., "5 vowels — the foundation of every other row"), not just the individual items. A user who's drilled あ via quest still benefits from learning that あ is part of the vowel row.
- **Render all items in the drill phase**, including previewed ones. The lesson is the structured exposure; skipping items would create gaps in the user's mental scaffolding.
- **Quiz question type per item adapts to mastery state.** A previewed item that's already in `reviewing` state gets a `reviewing`-tier quiz question (e.g., reading→glyph instead of glyph→reading for kana per §9.1). A still-`learning` item gets the standard `learning`-tier question. The user experiences the lesson as appropriately challenging — neither babying them on items they've seen, nor pretending they haven't.
- **SM-2 state continues to update normally** at session-exit per §4.6 — previews didn't "use up" the item's exposure budget.
- **XP awards normally** per §6.1 retry-budget rules. No penalty for previewed items.

This means the formal lesson is always worth doing, even after preview, because (a) the intro card grounds the concept, (b) the structured drill order reinforces patterns the random quest order doesn't, and (c) completing the lesson unlocks the next one (preview doesn't).

### 4.5 Completion of a quest

When the user answers all items in today's quest (correctly or after retry), the quest is marked complete. XP awarded per `GAMIFICATION_DESIGN.md`. If the user doesn't complete the quest by the end of the day, *unanswered items roll over* into tomorrow's quest at higher priority. A repeatedly-skipped quest is a signal to lighten future quests (handled in §5 difficulty curve).

### 4.6 SM-2 update timing — one update per item per session-exit (v1.2)

**Rule:** within a single lesson or quest session, an item gets **exactly ONE SM-2 update**, applied at session-exit (lesson complete OR session abandoned + 24h TTL elapsed). Not one update per card-show, not multiple updates for wrong-then-correct.

During a session, item state lives in `users/{uid}/in_progress/{sessionKey}` per §6.2 — including a flag per item recording its terminal status (`first_try_correct` / `retry_correct` / `unresolved`). Only when the session terminates does the Cloud Function commit one SM-2 update per item, mapped to quality per the §4.1 table:

| Session-exit status | SM-2 quality (q) | Notes |
|---|---|---|
| `first_try_correct`, response time ≤ 8s | 5 | Fastest, most confident. |
| `first_try_correct`, response time > 8s | 4 | Correct but slower — possibly recalled mid-effort. |
| `retry_correct` (got it wrong then right within session) | 3 | Treated as borderline "passing." |
| `unresolved` (closed mid-session, 24h TTL expired with item still in retry queue) | 0 | Treated as a lapse. |

**Why this matters:** without this rule, a wrong-then-correct item could trigger two SM-2 updates (q=0 then q=3) — the q=0 would lapse the item, then the q=3 would treat it as a fresh learning encounter. Result: ease factor drifts, intervals get scrambled, mastery state becomes meaningless. The "one update per session-exit" rule prevents this.

**Implementation note:** the session-exit commit is the only place SM-2 state mutates. All within-session correctness signals stay in the `in_progress` doc until the session ends. Resume (per §6.2) restores the `in_progress` doc; the SM-2 commit fires once the lesson actually completes (or once the 24h TTL expires for items still unresolved).

---

## 5. Difficulty curve & pacing

### 5.1 Base caps (v1.2 rename — were "Hard caps")

These are **baseline values**. They are NOT immutable — §5.3 (pace acceleration) raises the daily new-items cap silently when a user is consistently performing at ≥90% first-try accuracy. The "Base" label reflects this: these are the starting numbers; performance signals can adjust them within the documented bounds.

The only true *hard* invariants are: review-burden-per-quest stays at 10 always (§4.4 enforces this), and concurrent-learning cap stays at 20 always (no acceleration on this — it's a swamp-prevention guardrail, not a performance reward).

| Cap | Value | Acceleration applies? | Why |
|---|---|---|---|
| New items introduced per day (Free) | 15 | Yes, can bump to 20 — see §5.3 | Prevents content overdose; adult learners overestimate their capacity. |
| New items introduced per day (Pro) | 30 | Yes, can bump to 40 — see §5.3 | Pro gets ~2x because power users self-pace. |
| Review burden per quest | 10 | No — hard ceiling | Quest never feels impossible. |
| Lesson item count (standard) | 5-8 | No — content-fixed | Short enough to fit in a coffee break. |
| Lesson item count (review lesson) | up to 12 | No — content-fixed | Review lessons can be denser since the user already knows the items. |
| Concurrent learning items (in queue) | 20 | No — hard ceiling | See §5.1.1 below for what this means + why it matters. |

#### 5.1.1 What "concurrent learning items" means

A "learning item" is one that the user has *seen* in a lesson but hasn't yet been correctly answered enough times in a real review session to enter the regular `reviewing` schedule — i.e., items with `m: 'learning'` or `m: 'lapsed'`. They're the half-learned pile.

Imagine an eager user who:
1. Powers through lessons 1-5 in one sitting (25 new items)
2. Gets ~half of them wrong on first try
3. Doesn't come back for a week
4. Returns to find ~12 items in their learning queue still waiting to be drilled correctly

That's 12 concurrent learning items. The user feels behind before they even start lesson 6 — every daily quest is dominated by re-drilling the half-learned items instead of building new ground.

**The cap of 20** says: if a user has 20 items currently in `learning` or `lapsed` state, new lessons stop unlocking until they bring some of them up to `reviewing` (= correctly answered with `interval ≥ 1`). The user sees a friendly dashboard banner: "Let's clear what we've started. {N} items waiting to settle in your daily quest — once 5 are reviewed, new lessons unlock again." No shame language, just a forcing function that keeps the queue tractable.

20 (vs my original 30) per project lead's v1.1 decision: stricter is better — keeps the learning experience focused, prevents the swamp from becoming a brand problem. Tunable from production data once we have beta users.

### 5.2 Fatigue signals + responses

Tracked per-user via Cloud Function on each session-end:

- **Accuracy drop** — if last-10-card accuracy drops below 60% within a session, show a soft prompt: "Want to take a breather? Your progress is saved." Continue button next to it.
- **Session length** — if a session exceeds 25 minutes, prompt "You've been at it for a while — see you tomorrow." with a single Done button. Progress is auto-preserved via the in_progress doc per §6.2; the prompt is a soft suggestion, not a save action.
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

### 6.2 Lesson abandonment + resume (v1.2 rewrite — added idempotency)

Per project lead's v1.1 decision: support mid-lesson resume, falling back to restart if implementation reveals UX problems. v1.2 adds explicit idempotency to prevent XP double-counting + harmonizes with the §4.6 one-update-per-session-exit rule.

#### Within-session state model (v1.2)

All within-session state lives in a single doc at `users/{uid}/in_progress/{sessionKey}`. The doc is the single source of truth — SM-2 state is NOT committed mid-session (per §4.6), XP events are NOT awarded mid-session (per `GAMIFICATION_DESIGN.md §7.6` + the v1.2 ledger model below).

```
{
  sessionKey: 'lesson:hiragana:01',         // matches lessonKey for lesson sessions
                                            // or 'quest:2026-06-05' for quest sessions
  lessonKey: 'hiragana:01',                 // null if not a lesson session
  currentIndex: 3,                          // 0-indexed position in the queue
  itemState: {                              // per-item state — keys = itemKey
    'kana:あ': { status: 'first_try_correct', responseMs: 4200, attempts: 1, userAnswer: 'a',  questionType: 'glyph_to_reading' },
    'kana:い': { status: 'wrong_in_queue',     responseMs: 6800, attempts: 1, userAnswer: 'u',  questionType: 'glyph_to_reading' },
    'kana:う': { status: 'first_try_correct', responseMs: 3100, attempts: 1, userAnswer: 'u',  questionType: 'glyph_to_reading' },
    'kana:え': { status: 'wrong_in_queue',     responseMs: 7400, attempts: 1, userAnswer: 'i',  questionType: 'glyph_to_reading' }
    // 'kana:お' not yet seen — absent from itemState
  },
  retryQueue: ['kana:い', 'kana:え'],        // derived from itemState wrong_in_queue
  xpEventLog: [                             // append-only ledger; deterministic eventIds
    { eventId: 'lesson:hiragana:01:item:あ:first_try',  type: 'card_correct', xp: 10 },
    { eventId: 'lesson:hiragana:01:item:う:first_try',  type: 'card_correct', xp: 10 }
    // wrong items don't get XP; retry-correct events append on resolution
  ],
  startedAt: '2026-06-05T14:32:00Z',
  lastTouched: '2026-06-05T14:36:12Z'
}
```

**Status values per item:**
- `first_try_correct` — answered correctly on first try.
- `retry_correct` — was wrong originally, then correct on retry (moves out of retryQueue).
- `wrong_in_queue` — was answered wrong, currently in retry queue waiting for retry.
- `unresolved` — was answered wrong, never returned to retry (only set at session-exit if user closes mid-retry-queue and TTL expires).

**Required fields per item (v1.6 — server needs these to re-grade):**
- `status` — terminal status enum above. Client-written based on local correctness check; server validates by re-grading.
- `responseMs` — milliseconds from card-show to first input. Used for SM-2 quality mapping (§4.1) + anti-cheat plausibility (§6.5 of GAMIFICATION).
- `attempts` — count of times this item was shown (= 1 for first-try items; >1 for items that went into and out of retry).
- `userAnswer` — the actual response the user submitted (typed string, selected option key, etc.). **This is the field the server re-grades against `content_sets` answers per the v1.5 server-re-grade rule.** Required for both kana/vocab/kanji multiple-choice + grammar fill-in-blank + typing modes.
- `questionType` — which §9 question variant was rendered (e.g., `glyph_to_reading`, `reading_to_glyph`, `audio_to_glyph` for kana). Tells the server which answer-field on the item to grade against.

#### XP event ledger — optimistic display only (v1.5 / v1.6 clarification)

The `xpEventLog` in the in_progress doc is **client-written, display-only**. It drives the mid-session "+10" animations and the `pendingXp` counter shown to the user. The server does NOT use it for commit decisions — at session-exit the server re-grades from `itemState` (per §6.2 commit steps + GAMIFICATION_DESIGN.md §7.7 v1.5 universal re-grade rule) and constructs its own authoritative event list with deterministic eventIds.

The `eventId` shape itself is still the dedup primitive — but server-derived, not client-derived:

- `lesson:hiragana:01:item:あ:first_try` — server-graded XP for first-try correct on item あ.
- `lesson:hiragana:01:item:い:retry_correct` — server-graded XP for retry-correct on item い.
- `lesson:hiragana:01:complete` — XP for completing the lesson (only fires when `exitReason = 'lesson_complete'`).
- `lesson:hiragana:01:perfect_bonus` — XP for the perfect-lesson bonus (only fires if server-graded zero wrongs across all items AND exitReason = 'lesson_complete').

The eventId is the deduplication key against `users/{uid}/committed_events/{eventId}` when writing XP + leaderboard updates. **A resumed session whose `committed_events` already contains an eventId never double-awards that XP** — this is the resume safety net.

Client-side, the `xpEventLog` entries the client writes use the SAME eventId shape as the server will later derive. This is so the client's optimistic +10 animations sync visually with the server's eventual commit. If client and server disagree on which eventIds existed (e.g., client claimed an item correct that server graded wrong), the disagreement is logged for cheat detection per GAMIFICATION_DESIGN.md §7.7 — but the server's grading wins for the actual XP write.

#### Session-exit commit (the one moment where state mutates real user data)

A session "exits" with one of four `exitReason` values; the commit function branches on this to determine which completion records to write (v1.6 — was unconditional in v1.5):

| `exitReason` | Trigger | Write `progress/lessons/{lessonKey}.completedAt`? | Write `quests/{date}.status`? |
|---|---|---|---|
| `lesson_complete` | Lesson outcome screen reached — retry queue empty + all items resolved | YES — unlocks `globalOrder + 1` | N/A |
| `quest_complete` | Last item in the day's quest answered correctly (per §4.5) | N/A | `'completed'` + `completedAt` |
| `ttl_expired` | 24h TTL on in_progress doc; background cron fires | NO — lesson is unfinished, must not unlock next | `'expired'` if quest session was unfinished (per §4.5 rollover rules) |
| `signed_out` | User tapped Logout while in_progress doc existed (per §10.4) | NO — same logic as TTL | `'expired'` if quest session was unfinished |

In ALL four cases the commit Cloud Function still:
1. Re-grades from `itemState` against `content_sets` (per server-re-grade rule).
2. Commits SM-2 updates for resolved items (`first_try_correct`, `retry_correct`).
3. Commits SM-2 q=0 lapse for items left `wrong_in_queue` or `unresolved` at the moment of exit (TTL/sign-out: per §4.6; lesson_complete/quest_complete don't have unresolved items by definition).
4. Writes server-derived XP events to `committed_events` idempotently.

The difference is what *completion* records get written. TTL/sign-out commit partial progress but DO NOT mark the lesson/quest as completed — that gate stays guarded by actual completion.

**No explicit "Save and exit" button in v1.x.** The natural close-app-and-resume flow covers the use case without needing a button: closing the app/page leaves the in_progress doc untouched; on re-entry within 24h, the user is prompted to "Resume" or "Start over" (see Resume flow below); past 24h the background cron commits. A manual button would either contradict the deferred-commit model (commit AND keep resumable can't both be true) or duplicate the natural behavior. If user research post-L2 beta shows demand for an explicit pause control, we can add a button later — its behavior would be "pause without commit," identical to closing the app, just psychologically reassuring. Not in scope for the design-docs cycle.

The session-exit commit Cloud Function (v1.6 — server re-grades + exitReason-gated completion):

Inputs: `(uid, sessionKey, exitReason)` where `exitReason ∈ {'lesson_complete', 'quest_complete', 'ttl_expired', 'signed_out'}`.

1. Reads the `in_progress/{sessionKey}` doc (`itemState[*]` user responses + timing; `sessionKey` to determine lesson vs quest).
2. **For each item in itemState, server fetches the canonical answer from `content_sets` and re-grades** the user's response (comparing `itemState[itemKey].userAnswer` against the item's answer field, per the `questionType` rendered). Server-graded correctness is authoritative; the client's `xpEventLog` entries are discarded and used only for cheat-detection signal (large mismatches → moderation queue per `GAMIFICATION_DESIGN.md §7.7`).
3. Validates response-time plausibility (per-item ≥ 200ms; sum ≤ wall-clock between startedAt and now + slack).
4. For each item, computes SM-2 update per §4.6 quality table using server-graded terminal status. For items left in `wrong_in_queue` or `unresolved` (only possible when exitReason is `ttl_expired` or `signed_out`), maps to q=0 lapse.
5. Writes all SM-2 updates to `users/{uid}/progress/{itemKey}` in a single transaction.
6. Computes XP per `GAMIFICATION_DESIGN.md §1.1` from server-graded correctness only. Constructs server-authoritative event list with deterministic eventIds. Applies each via idempotent transaction keyed on `eventId` against `users/{uid}/committed_events/{eventId}`.
7. **Completion writes branch on `exitReason`** (per the v1.6 table above):
   - `exitReason = 'lesson_complete'`: writes `users/{uid}/progress/lessons/{lessonKey}.completedAt = now` in the same transaction. This is what gates `globalOrder` unlock for the next lesson. Sanity-check first that retry queue is empty — if not (defensive — shouldn't happen for this exitReason), fall back to ttl_expired behavior.
   - `exitReason = 'quest_complete'`: updates `users/{uid}/quests/{YYYY-MM-DD}.status = 'completed'` + `.completedAt = now` in the same transaction.
   - `exitReason = 'ttl_expired'` or `'signed_out'`: NO lesson completion write. If sessionKey is a quest, write `users/{uid}/quests/{YYYY-MM-DD}.status = 'expired'` + `.expiredAt = now` (unfinished quest items roll over per §4.5).
8. Marks the in_progress doc as `committed: true` + `committedAt: now` + `commitExitReason: <exitReason>`; the doc is retained for 7 days for audit (server-side cleanup §6.2.5), then deleted.

This branching prevents the v1.5 bug where TTL expiry would silently unlock the next lesson (writing completedAt) even though the user never actually completed the current one. v1.6 makes completion writes contingent on actual completion exit reasons only.

#### Resume flow

When the user re-opens lesson N:
- If a non-committed in_progress doc exists for that lessonKey AND `lastTouched` is within the last 24 hours: prompt with 2 buttons:
  - "Resume — {M} items left" (primary), where M = total items − items with status in {first_try_correct, retry_correct}
  - "Start over" (secondary). Choosing this deletes the old in_progress doc and creates a fresh one. Note: this discards the prior xpEventLog without committing — items that were correctly answered in the prior attempt don't get XP credit if the user starts over. (Deliberate: prevents farm-the-lesson exploits.)
- If `lastTouched` is older than 24h: silently discard the resume state (a background cron Cloud Function commits the in_progress doc with `exitReason = 'ttl_expired'` per the v1.6 commit-function table — unresolved items as q=0 lapse, server re-grades resolved items for SM-2 + XP, no lesson/quest completion writes), then restart fresh.
- If no resume state exists: create a fresh in_progress doc, start lesson.

#### Server-side cleanup

A scheduled Cloud Function runs nightly:
1. Find `in_progress/*` docs where `lastTouched > 24h ago` AND `committed = false`.
2. For each: invoke the session-exit commit function with `exitReason = 'ttl_expired'`. Server re-grades from itemState, commits SM-2 updates + XP for resolved items (idempotent via `committed_events/{eventId}`), maps unresolved items to q=0 lapse, marks any unfinished quest as `'expired'`, does NOT write lesson `completedAt`.
3. Mark `committed: true` + `committedAt` + `commitExitReason: 'ttl_expired'`. Doc is retained for 7 more days for audit, then deleted.

**Fallback condition (unchanged from v1.1):** if implementation reveals that resume creates jarring UX edges (e.g., retry queue ordering looks weird, currentIndex doesn't map cleanly to the rendered card sequence after content updates, etc.), drop resume and fall back to restart-only behavior. The decision lives in L2.13 implementation; the schema above allows for both paths (just stop writing in_progress mid-session, only on outcome screen).

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

Per project lead's v1.1 decision: audio auto-plays by default. The bet is that hearing the language is core to learning it, and the discoverability of a user-toggleable "I'm in a quiet space" mute beats requiring every user to discover and tap the speaker on every card.

- **Auto-play on card show: YES** by default. The first time the user opens a lesson, audio plays automatically on each new card.
- **Mute discovery** — on the very first audio-playing card the user ever sees, a small one-time tooltip appears next to the speaker icon: "Tap to mute audio for this session" (and bilingual equivalent). Dismissible by tap-anywhere; never shown again after dismissal.
- **Per-session mute toggle** — the speaker icon in the lesson HUD is also a mute toggle. Tapping it once mutes auto-play for the rest of the current session (lesson). Re-tapping unmutes. Session-scoped, doesn't persist.
- **Global "auto-play audio" toggle in Settings** — default ON. Flipping off makes audio tap-only across all lessons until flipped back on. Persists to `users/{uid}.settings.audioAutoplay`.
- **Listening drill mode** — auto-plays regardless of any toggle (the audio *is* the prompt; without it there's no card).
- **"Listen" practice mode in Zen/Survival** — the existing `practice=listen` setting in those games (per `js/games/`) auto-plays per their existing design; unchanged.
- **Replay** — speaker icon on every audio-bearing card, tappable any number of times for re-listen even when auto-play is off or muted.
- **Failed audio fetch** — speaker icon hides for that card; lesson continues silently. No user-facing error.

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

### 10.4 Sign-out / sign-in (v1.4 — reconciled with the §6.2 resume model)

**Closing the app/tab** ≠ **Signing out**. They have different intent and different state behavior.

- **Closing the app or tab** (browser X, OS app-switch, accidental close): the in_progress doc is preserved untouched per §6.2. On re-entry the user is prompted to "Resume" or "Start over" if within 24h, or starts fresh if past 24h (background cron has committed by then).
- **Explicit sign-out** (tapping the Logout button in the nav): the user is saying "I'm done with this device/session." Any in_progress doc for that user is **immediately committed** via the same Cloud Function as a normal session-exit — unresolved items in retry queue map to q=0 lapse per §4.6, completed items commit normally, XP ledger flushes idempotently. No resume on next sign-in; the user starts fresh on the dashboard. This prevents the next person to sign in on a shared device from seeing the previous user's half-finished lesson (privacy) and prevents stale in_progress docs from accumulating per-user.
- **Mid-quest sign-out**: same behavior — quest in_progress doc commits immediately on sign-out. Quest is marked expired for the day if it wasn't completed (rolled-over items follow §4.5 rollover rules).

Implementation: the sign-out handler calls the session-exit commit Cloud Function before tearing down the auth state, then redirects to the landing page. If the commit fails (network), sign-out proceeds anyway and the 24h TTL cron will eventually clean up — slight risk of duplicate xpEventLog application is prevented by the `committed_events/{eventId}` idempotency markers.

User sign-in always lands on the dashboard, not mid-lesson. Mid-lesson land-back is only via Resume on app re-open (not via fresh sign-in).

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

## 13. User content feedback

Added in v1.1 per project lead's broader take on question 4: feedback patterns vary by context, not just SM-2 scheduling. Where SM-2 scheduling uses *internal* signal (response time mapped to quality 0-5 per §4.1) without asking the user to self-rate every card, this section covers the *user-facing* feedback surfaces — where the user actively tells us something about the content quality, not their own performance.

All four patterns share infrastructure: feedback writes to `users/{uid}/content_feedback/{itemKey}/{contextKey}` with the user's input + a timestamp + the locale they were in. Project lead reviews feedback periodically via the L2.04 authoring tool (extended in a later iteration) or a separate admin surface. Accepted feedback updates the item; rejected feedback is archived for pattern analysis.

### 13.1 Card quality — like / dislike (binary)

On every drill card, a small "Was this card helpful?" surface appears under the answer area *after* the user answers, with two icons: 👍 (helpful) / 👎 (not helpful). Optional — user can skip without feedback. Stored as `content_feedback/{itemKey}/card_quality`.

Use case: signals whether a card's question type, distractors, or framing works. A card with >20% 👎 across users gets flagged for redesign.

### 13.2 Mnemonic quality — like-only + alternative suggestion

On kanji and kana cards that show a mnemonic story (per `CONTENT_GUIDELINES.md` §8 / §10), under the mnemonic text:
- A heart icon for "this mnemonic helped me" — single-tap, no dislike option (mnemonics that don't help are simply ignored).
- An "✏️ Suggest a better one" link — opens a small modal with a 280-char textarea + locale toggle (EN or AR) + Submit / Cancel buttons.

User-submitted alternative mnemonics are stored as `content_feedback/{itemKey}/mnemonic_alt/{uid}` with their text, locale, and timestamp. They appear in a moderation queue for project lead review (per `CONTENT_GUIDELINES.md` §8 voice rules). Accepted alternatives can either replace the item's mnemonic or be added as a community-contributed alternate visible to users below the official one (decided per case).

This is the most important of the four patterns — mnemonics are deeply personal, and a Cairo university student's mnemonic for a kanji might genuinely beat what we authored. The brand wins when community contributions visibly land in the product.

### 13.3 Example sentence quality — like + alternative suggestion

On vocab and grammar cards that show an example sentence, under the sentence:
- Heart icon for "good example" (like-only, same rationale as mnemonics).
- "✏️ Suggest a better example" link — opens modal with fields for JA sentence + EN translation + AR translation + submit. Stored as `content_feedback/{itemKey}/example_alt/{uid}`.

### 13.4 Content errors — flag a problem (catch-all)

A small unobtrusive "Report a problem" link in the lesson HUD overflow menu (the … icon). Tap → modal with predefined options:
- "Translation is wrong"
- "Audio doesn't match"
- "Typo / spelling error"
- "Other" (free-text)

Submissions go to `content_feedback/{itemKey}/error_report/{uid}` and trigger a Sentry breadcrumb (not an actual error report — just a log entry the project lead can scan). High-volume error reports on the same item bubble up in the moderation queue.

### 13.5 Moderation & privacy

- All four patterns are off until L3 (post-launch). For L2 beta, only patterns 13.1 (like/dislike) and 13.4 (report problem) are wired; mnemonic + example suggestion modals come in L3 when the admin moderation UI is ready.
- All submissions store the user's `uid` — not anonymous — so the project lead can credit accepted contributions if/when we add an "originally suggested by @user" line on community mnemonics (TBD).
- Users can delete their own submissions from their profile (a "Your content suggestions" section in Settings). Deleted submissions are removed from the moderation queue.

### 13.6 Why this isn't the SRS quality rating

Worth being explicit: the SM-2 quality rating (§4.1) is an *internal scheduling signal* mapped from response-time + correctness without user awareness. The patterns above are *explicit user feedback* on content, not on scheduling. They feed two different systems:

- SM-2 quality → review interval, daily quest selection (the user's *own learning path*).
- User content feedback → moderation queue, content updates (the *quality of the content for everyone*).

Conflating them would be a category error. We need both, on different surfaces.

---

## Cross-references

- **`GAMIFICATION_DESIGN.md`** v1.6 — XP per action, level curve, badge catalog, streak rules in full, daily quest rewards, leaderboard scoring. Sibling doc; both must be at-version-or-higher before downstream tasks proceed.
- **`CONTENT_GUIDELINES.md`** — what each item's fields should contain (e.g., mnemonic structure §8, vocab fields §9, kanji fields §10). This doc says *how* items are presented; that doc says *what* the items contain.
- **`PROJECT_RULES.md`** §7 (file structure), §13 (i18n key shape), §18 (audio + content authoring).
- **`Tomodachi_Master_Plan.md`** — to be updated in L2.03 with the finalized `content_sets/*` Firestore schemas referenced throughout this doc.
- **`Commercialization_Plan.md`** §6 (Free vs Pro feature matrix).

---

## v1.1 changelog — project lead's review of the 8 open questions

All 8 questions from v1.0 resolved on 2026-06-05. Status of each below; relevant sections updated in place.

| # | Original question | v1.1 resolution | Section updated |
|---|---|---|---|
| 1 | Katakana timing (after vocab cluster 1 vs immediately after hiragana) | ✅ **Confirmed** — katakana stays after vocab cluster 1. | §2.2 unchanged |
| 2 | Kanji ordering (visual-radical-family vs JLPT frequency) | ✅ **Confirmed** — visual-radical-family order (project lead deferred to Claude's judgment). | §2.4 unchanged |
| 3 | Audio auto-play default | 🔁 **Flipped** — auto-play is now ON by default, with first-time mute tooltip + per-session toggle + global Settings toggle. | §7.2 rewritten |
| 4 | SM-2 quality from response time vs user self-rating | 🔁 **Reframed** — SM-2 internal scheduling stays response-time-mapped (unchanged), AND a new §13 added for user content feedback (like/dislike on cards, like-only + alternative suggestion on mnemonics + example sentences, error reporting). Two different systems. | §4.1 unchanged + new §13 |
| 5 | Mid-lesson abandonment | 🔁 **Flipped** — resume now supported with 24h TTL + user choice on re-entry. Fallback to restart if implementation reveals UX problems. | §6.2 rewritten |
| 6 | No in-lesson timer | ✅ **Confirmed** — no timer in lessons. | §9.6 unchanged |
| 7 | Mastered threshold (interval-based vs consecutive-correct) | 🔁 **Changed** — mastery now defined as `reps ≥ 5` (5 consecutive correct), interval requirement dropped. | §3 + §4.2 rewritten |
| 8 | Concurrent learning cap (was 30) | 🔁 **Tightened** — cap reduced to 20. New §5.1.1 added explaining what "concurrent learning items" means and why the cap exists. | §5.1 + new §5.1.1 |

**Net of v1.1:** 3 confirmations (Q1, Q2, Q6) + 4 flips/changes (Q3, Q5, Q7, Q8) + 1 reframe with a new doc section (Q4 → §13). All updates marked inline in the body with "v1.1 decision" notes for traceability.

**No new open questions.** This doc is now ready to support L2.02 (`GAMIFICATION_DESIGN.md`) and downstream L2.03 schema work. If anything in the v1.1 changes feels off on re-read, push back before L2.02 starts — some of these decisions (especially the new §13 user feedback patterns + the `reps ≥ 5` mastery rule) will be wired into the gamification XP / badges / quests design.

---

## v1.2 changelog — external-agent review applied

Applied a 10-finding external-agent code-review pass on 2026-06-05. Three findings were bug-grade (would have shipped broken behavior), four were design-gap-grade (would have caused schema/consistency confusion), three were pure cleanup of v1.1 stale text. Findings affecting LEARNING_EXPERIENCE.md:

| External finding | Issue | v1.2 resolution | Section updated |
|---|---|---|---|
| #5 — Lesson numbering ambiguity | "Hiragana lessons 1-14" + "Katakana 15-28" + interleaved vocab can't coexist | Introduced two-identifier model: `lessonKey` (stable, track-prefixed) + `globalOrder` (integer linear position). Tables now use within-track numbering. Added §2.0 (numbering scheme) + §2.7 (interleaving sketch). | §2.0, §2.1, §2.2, §2.3, §2.7 |
| #6 — SRS update timing | Risk of double SM-2 update on wrong-then-correct items | Added §4.6: exactly one SM-2 update per item per session-exit. Quality determined by terminal status (first_try / retry / unresolved). Within-session state lives in `in_progress` doc, never mutates SM-2 directly. | New §4.6 + §6.2 rewrite to harmonize |
| #7 — Resume idempotency | No XP event ledger → risk of double-awarding lesson-complete + perfect-lesson bonus on resume | Rewrote §6.2 with `xpEventLog` (deterministic eventIds, idempotent commits). Added explicit session-exit commit Cloud Function spec. | §6.2 fully rewritten |
| #8 — Preview quest backfill rules unclear | Silent on whether previews unlock progress / count against caps / award XP | Added §4.4.1 with explicit table: SRS state updates, counts against new-items + concurrent caps, awards XP, but does NOT unlock lesson progress or affect globalOrder. | New §4.4.1 |
| #4 — "Hard caps" not actually hard | §5.1 labeled "Hard caps" but §5.3 silently bumps them via acceleration | Renamed §5.1 "Hard caps" → "Base caps" + added "Acceleration applies?" column distinguishing soft (new-items/day) from hard (review burden, concurrent learning cap). | §5.1 table rewritten |
| #10 — Stale cross-refs | Frontmatter and Cross-references called GAMIFICATION_DESIGN.md "to be written next" — it now exists | Updated both. | Frontmatter + Cross-references |

**Net of v1.2:** 6 LEARNING_EXPERIENCE.md fixes applied (the rest in GAMIFICATION_DESIGN.md v1.2). The biggest schema-shape impact is the new in_progress doc model in §6.2 — L2.03 must specify the `users/{uid}/in_progress/{sessionKey}` schema with the v1.2 fields (itemState + xpEventLog + status enum). The session-exit commit Cloud Function also needs to be scheduled before L2.13 lesson screen implementation.

**No new open questions.** This doc is now ready for L2.03 (content schema work) without ambiguity in the learner-facing surface.

---

## v1.3 changelog — second external-agent review applied

Second external-agent pass on 2026-06-05 (after v1.2 landed). Found 9 issues across both docs: 3 high, 4 medium, 2 low. Findings affecting LEARNING_EXPERIENCE.md:

| External finding | Issue | v1.3 resolution | Section updated |
|---|---|---|---|
| #1 High — "Save and exit" contradiction | §6.2 said Save-and-exit commits AND keeps resumable, which can't both be true | Removed the "Save and exit" reservation entirely. Natural close-app-and-resume already covers the use case via the in_progress doc + 24h TTL. Future research can re-add an explicit button if needed; it would behave as "pause without commit." | §6.2 (session-exit triggers list rewritten) |
| #7 Medium — Formal lesson behavior with already-previewed items unspecified | §4.4.1 said previews update SM-2 normally, but didn't say what the formal lesson does when an item already has progress | Added §4.4.2: formal lesson always renders intro card + all items; quiz question types per item adapt to existing mastery state. Preview accelerates familiarity, formal lesson grounds concept + unlocks next. | New §4.4.2 |

The other 7 findings (#2, #3, #4, #5, #6, #8, #9) live in `GAMIFICATION_DESIGN.md` v1.3 — see its changelog for those.

**Net of v1.3:** 2 LEARNING_EXPERIENCE.md fixes applied. Combined with the 7 GAMIFICATION_DESIGN.md fixes, all 9 second-review findings are now resolved. The biggest cross-doc reconciliation is §7.7 in GAMIFICATION (Optimistic UI vs committed XP) — that section + §6.2 of this doc + §4.6 of this doc together specify the full transaction model for SM-2 state, XP ledger, and badge unlocks. L2.03 schema work + L2.13 lesson-screen implementation should treat them as a single load-bearing triad.

**No new open questions.** Both docs ready for L2.03.

---

## v1.5 changelog — fourth external-agent review applied

Fourth external-agent pass on 2026-06-05 (after v1.4 landed). Found 6 issues: 2 high, 2 medium, 2 low. Findings affecting LEARNING_EXPERIENCE.md:

| External finding | Issue | v1.5 resolution | Section updated |
|---|---|---|---|
| #4 Medium — Quest completion not in same transaction as XP | §6.2 v1.4 commit steps wrote SM-2 + XP + committed_events, but didn't update `users/{uid}/quests/{date}.status`. Quest status could lag XP commit | Added explicit step 7 to commit steps: `quests/{date}.status = 'completed'` + `completedAt = now` in the same transaction as XP. For lessons, added step 8: write `progress/lessons/{lessonKey}.completedAt` (which gates `globalOrder` next-lesson unlock). | §6.2 session-exit commit steps |
| #1 High — xpEventLog client-forgeable | (Cross-doc with GAMIFICATION §7.7.) `in_progress.xpEventLog` is client-written; server reading it for XP commit means client can forge XP → leaderboard inflation | Updated §6.2 session-exit commit Cloud Function to **re-grade from `itemState` against `content_sets` answers**, discarding the client's `xpEventLog` at commit time. Client's log used only for optimistic UI display + cheat-detection signal. Pairs with `GAMIFICATION_DESIGN.md §7.7` v1.5 rewrite. | §6.2 commit steps |
| #5 Low — "Not in scope for v1.3" stale | v1.4 doc still said "Not in scope for v1.3" inside the Save-and-exit reservation paragraph | Reworded to "Not in scope for the design-docs cycle." | §6.2 Save-and-exit paragraph |

The other 3 findings (#2 game-feedback contradiction, #3 streak race, #6 stale "XP cap math") live in `GAMIFICATION_DESIGN.md` v1.5 — see its changelog.

**Net of v1.5:** 3 LEARNING_EXPERIENCE.md fixes. The biggest cross-doc impact is the **server re-grade rule** — paired across `GAMIFICATION_DESIGN.md §7.7` v1.5 + this doc's §6.2 v1.5 session-exit commit. Combined, they specify a uniform "server is the source of truth for correctness, client is allowed for optimistic display only" model that applies to lessons, quests, AND games. L2.03 schema work must reflect this: server-side grading is a load-bearing primitive used in three places (lesson commit, quest commit, game session-end), all reading from `content_sets` answers.

**No new open questions.** Both docs ready for L2.03.

---

## v1.4 changelog — third external-agent review applied

Third external-agent pass on 2026-06-05 (after v1.3 landed). Found 9 issues: 2 high, 4 medium, 3 low. Findings affecting LEARNING_EXPERIENCE.md:

| External finding | Issue | v1.4 resolution | Section updated |
|---|---|---|---|
| #2 High — Quest completion missing as session-exit trigger | In-progress model added `quest:YYYY-MM-DD` sessionKey in v1.2, but the §6.2 session-exit triggers list only had "lesson outcome" and "24h TTL" — quests stranded | Added "Daily quest completed" as explicit immediate trigger. Now matches §4.5 quest-complete semantics. | §6.2 session-exit triggers list |
| #3 Medium — Sign-out vs close-app contradiction | §6.2 said close-app preserves in_progress; §10.4 said mid-lesson sign-out loses progress. Both can't be the right model for the same scenario | Rewrote §10.4 to distinguish: closing app/tab → preserve in_progress + resume on return; explicit sign-out → immediate session-exit commit (privacy + cleanup for shared devices). | §10.4 fully rewritten |
| #9 Low — "Save and continue tomorrow?" remnant | v1.3 removed the explicit Save-and-exit button, but §5.2 fatigue prompt still said "Save and continue tomorrow?" with a Save button | Reworded to "you've been at it for a while — see you tomorrow" with a Done button + explicit "progress auto-preserved via in_progress doc" callout. | §5.2 |
| #8 Low — Stale GAMIFICATION_DESIGN.md v1.2 reference | Cross-references section still pointed at v1.2 | Updated to v1.4. | Cross-references |

The other 5 findings (#1, #4, #5, #6, #7) live in `GAMIFICATION_DESIGN.md` v1.4 — see its changelog for those, including the **high-severity game_sessions answer-leak fix** which was the main blocker for L2.03 schema work.

**Net of v1.4:** 4 LEARNING_EXPERIENCE.md fixes applied. Combined with the 5 GAMIFICATION_DESIGN.md fixes, all 9 third-review findings are resolved. The biggest single fix in this pass is the game_sessions security model in GAMIFICATION §6.5 — v1.2/v1.3 had said client could read its own session, which would have leaked `itemAnswers` straight to the client; v1.4 denies all client reads and routes access through RPC-only.

**No new open questions.** Both docs ready for L2.03.

---

## v1.6 changelog — fifth external-agent review applied (final review-cycle pass)

Fifth external-agent pass on 2026-06-05. Found 6 issues: 2 high, 3 medium, 1 low. All resolved. **No architectural decisions changed** — these were text-consistency leftovers from my v1.4→v1.5 edits not propagating everywhere, plus two implementation-detail gaps the design assumed but didn't write down. Findings affecting LEARNING_EXPERIENCE.md:

| External finding | Issue | v1.6 resolution | Section updated |
|---|---|---|---|
| #1 High — Server re-grade can't work from documented `itemState` | itemState example showed only `{status, responseMs, attempts}` — no `userAnswer`. Server has nothing to re-grade against. Real schema gap. | Added required fields per item: `userAnswer` (the actual response — typed string / option key) + `questionType` (which §9 variant was rendered — tells server which answer field on the item to grade against). Updated the example doc shape. | §6.2 within-session state model |
| #2 High — Session-exit completion writes are unconditional | v1.5 steps 7/8 wrote quest `status = completed` for any quest session-exit and lesson `completedAt` for any lesson session-exit — including TTL expiry and sign-out. Would unlock next lesson after a 24h abandonment. | Added `exitReason` parameter to the commit function with branching table: only `lesson_complete` writes lesson completedAt; only `quest_complete` writes quest status='completed'; TTL/sign-out commit SM-2 + XP for resolved items but DO NOT mark completion + mark unfinished quests as `'expired'`. | §6.2 commit function rewrite |
| #3 Medium — Stale `xpEventLog` ledger text described old commit model | v1.5 §6.2 commit steps said "server re-grades, discards xpEventLog," but the older §6.2 "XP event ledger" subsection still said "Cloud Function reads xpEventLog, sums per-eventId, commits" — direct self-contradiction. | Rewrote the XP event ledger subsection to make explicit: client-side `xpEventLog` is optimistic display only; server derives its own authoritative event list at commit; the eventId *shape* is shared between client (for animation sync) and server (for `committed_events` dedup). Also updated TTL/cleanup text. | §6.2 XP event ledger + server-side cleanup |
| #6 Low — Stale `GAMIFICATION_DESIGN.md v1.4` cross-ref + changelog order | Cross-references section still pointed at v1.4 of the companion doc; this doc's changelog sections are not in strict version order (v1.5 inserted before v1.4 by my earlier edit). | Updated cross-ref to v1.6. Changelog order: not fixing in v1.6 — content is correct, ordering is cosmetic, project lead explicitly warned against scope creep. Will fix order in a passive cleanup pass if/when L2.03 needs it. | Cross-references |

The other 2 findings (#4 streak settlement marker text contradiction, #5 anti-cheat summary in §1.3 still claiming "answers held server-side") live in `GAMIFICATION_DESIGN.md` v1.6 — see its changelog.

**Net of v1.6:** 4 LEARNING_EXPERIENCE.md fixes. Combined with the 2 GAMIFICATION_DESIGN.md fixes, all 6 fifth-review findings resolved. The architecturally-meaningful fix is #2 (exitReason-gated completion writes) — without it, a user who closes the app mid-lesson would have the 24h TTL cron silently unlock their next lesson. Now completion writes are contingent on actual completion exit reasons. The schema-meaningful fix is #1 (userAnswer + questionType fields) — required for the v1.5 server-re-grade rule to actually function; L2.03 must include these fields in the `users/{uid}/in_progress/{sessionKey}.itemState` schema.

**Recommendation: stop the external-review cycle here.** Five passes, ~40 findings total resolved across two docs. Pass 5 found mostly v1.5 edit-propagation gaps, not new architecture problems. Diminishing returns are clear. Both docs are L2.03-ready.

**No new open questions.** Both docs ready for L2.03.
