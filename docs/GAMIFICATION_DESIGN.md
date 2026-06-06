# Gamification Design — Tomodachi

> Authoritative design doc for everything reward-shaped in Tomodachi: XP table, level curve, badge catalog (all 20+ specified), streak rules, daily quest system, leaderboard scoring, reward cadence, Pro-vs-Free differences, anti-burnout patterns, and the power-ups decision. Locked before any L2.C build work begins, per the Phase L2 gate in `Phases_and_Tasks.md` §L2.
>
> | | |
> |---|---|
> | **Version** | v1.6 |
> | **Visibility** | TRACKED |
> | **Last updated** | 2026-06-05 (v1.6: fifth external-agent review applied — final review-cycle pass, see v1.6 changelog at end) |
> | **Governance** | See `PROJECT_RULES.md` §2 (design docs require project lead review & amend before downstream work begins) |
> | **Companion docs** | `LEARNING_EXPERIENCE.md` (the learner journey — SRS, lessons, quizzes, mastery model — that this doc rewards), `CONTENT_GUIDELINES.md` (bilingual writing standards for badge names + descriptions), `Commercialization_Plan.md` (private — Pro vs Free feature matrix in §6) |

---

## Scope

This doc specifies *every* numeric value, formula, threshold, and copy line for the reward layer. What an action is worth, what triggers it, what the user sees, how often, and where. When this doc and another conflict, this doc wins for gamification surfaces; the other wins for its own scope.

Out of scope: the *content* being rewarded (lives in `CONTENT_GUIDELINES.md`), the *learning loop* the reward attaches to (lives in `LEARNING_EXPERIENCE.md`), and *what code calls what* (lives in `PROJECT_RULES.md` + the Master Plan's data model).

## Relationship to `Commercialization_Plan.md` §4

`Commercialization_Plan.md` §4 ("Engagement layer") was locked earlier in Phase 0 with these positions:
- Streaks: soft streak, 1 freeze Free / 3 freezes Pro, midnight local TZ — ✅ **honored unchanged here**.
- XP & levels: "1 XP per correct answer, linear `floor(XP / 100)`, no cap" — 🔁 **superseded** by this doc's flat-per-action XP table + flatter `120 * N^1.8` 100-level curve, per project lead's 2026-06-05 L2.02 decision and v1.1 → v1.2 → v1.3 refinements.
- Badges: "~20 milestone badges, no tiers, 4×5 grid on profile" — 🔁 **expanded** to hybrid model with ~22 badges: ~16 visible count-milestones + ~6 hidden surprise achievements per project lead's 2026-06-05 L2.02 decision.
- Daily quests: "1 quest Free / 3 quests Pro at midnight" — ✅ **honored**, refined here with quest-type catalog + per-tier quest count clarifications.
- Notifications: email-only at launch — ✅ **honored**.
- Leaderboards: weekly + monthly + all-time + friends-only filter — ✅ **honored**, scoring formula specified here.

Project lead should sync `Commercialization_Plan.md §4` to the values in this doc at their convenience (it's gitignored, so this happens privately).

---

## 1. XP table — flat per-action

Per project lead's 2026-06-05 decision: flat XP values, no scaling by content type or mastery state. Predictable, easy to communicate, hard to game.

### 1.1 Core actions

| Action | XP | Notes |
|---|---|---|
| Correct answer (first try) | 10 | Regardless of content type, mastery state, or quiz question type. |
| Correct answer (on retry within same lesson or quest session) | 5 | Half value — still rewards getting it right, signals first-try wasn't perfect. Applies to lessons AND daily quests; retries inside game sessions (Survival/Duel/Co-op) don't exist — those are single-attempt per item. |
| Lesson complete | 50 | Fires once when the retry queue empties (per `LEARNING_EXPERIENCE.md` §6.1). Wraps a coffee-break session in a clear reward beat. |
| Daily quest complete | 100 | Fires when all items in the day's quest are answered correctly. |
| Perfect lesson (zero wrong) | +50 bonus | Stacks on top of the 50 lesson-complete XP — total 100 for a perfect lesson. |
| Personal best on Survival/Zen/Duel | +50 bonus | One-time per game mode per content set; tracked in user doc. |
| Win a duel | 75 | Loss = 0 XP from the duel itself (the player's correct answers during the duel still earn 10 each). |
| Complete a co-op session | 60 | Both players get 60 if they clear, regardless of who answered more. |
| First session of the day | +20 bonus | Fires once the user crosses the 3-card threshold (§3.1 qualifying-session definition) on a new local-TZ day. Optimistic animation can render at the 3rd card; the ledger event commits at session-exit per §7.7. Cap: 1/day. |
| Item promoted to `mastered` (reps ≥ 5) | 30 | One-time per item. Fires the moment SM-2 promotes the item. |
| Suggest a mnemonic that gets accepted | 100 | One-time per accepted submission. Future (L3+) when admin moderation UI ships per `LEARNING_EXPERIENCE.md` §13.2. |

### 1.2 No-XP actions (deliberate)

- Wrong answer: 0 XP (no negative XP — that violates the "calm pace, no guilt loops" voice).
- Skipping a lesson / closing mid-way: 0 XP for unanswered items; already-answered items keep their 10/5 XP per §1.1.
- Reviewing a `mastered` item: 0 bonus XP on top of the per-answer 10 (the item is already earning its keep via the daily quest aggregate).
- Login without playing: 0 XP. Streak counts a session, not a login.

### 1.3 No explicit XP cap (anti-grind via natural pacing)

Per project lead's v1.1 decision: no user-facing XP cap. Premium adult-learning apps (Duolingo, Babbel, Pimsleur) and engagement-design references (Apple Fitness, Strava) don't show explicit XP ceilings. The cap construct reads as game-mechanical and clashes with the calm-pace adult-learner brand voice.

Anti-grind protection lives in three already-specced mechanisms instead:

1. **Daily new-items cap** per `LEARNING_EXPERIENCE.md §5.1` + §5.3 — 15 base / 20 accelerated (Free), 30 base / 40 accelerated (Pro). The user *physically can't* introduce more new content per day, so XP-from-new-learning has a natural ceiling.
2. **Session-length fatigue signal** per `LEARNING_EXPERIENCE.md §5.2` — at 25+ minutes in a single session, a soft "you've been at it for a while — see you tomorrow" prompt appears with a Done CTA. Progress is auto-preserved via the in_progress doc; no explicit save action needed. Doesn't force-end the session, but creates a moment of reflection.
3. **Anti-cheating server-side validation** per §6.5 below — Survival/Duel/Co-op sessions go through `api_game_session_start` (server picks items) and `api_game_session_end` (server re-grades + computes XP). The threat model per the v1.5 honest disclosure: client receives item prompts AND answers in the start response (required for instant per-card feedback — game UX needs it), so a determined cheater who reads the answers and submits plausible-timing perfect responses can inflate their own XP. Mitigations: server re-grading, nonce-anti-replay, per-item ≥ 200ms timing, sum ≤ wall-clock, rate-limit flagging. Accepted risk for learning-app leaderboards at the L2 beta scale.

User can play as long as they want and earn as much XP as they earn. The brand bets on natural rhythm + content gating, not explicit caps.

### 1.4 Cumulative XP storage

Stored at `users/{uid}.xp` (number). Increments via idempotent transaction at session-exit commit per `LEARNING_EXPERIENCE.md §6.2`. Daily XP rollup at `users/{uid}/daily/{YYYY-MM-DD}.xp` is kept for analytics (per-day aggregate visible on profile + leaderboard tooltips); it is NOT a cap enforcement mechanism — no XP cap exists per §1.3.

---

## 2. Level curve — flattened, 100 levels

Per project lead's v1.1 decisions: flatter exponent (`120 * N^1.8` instead of `100 * N^2`) AND 100 levels total (instead of 50). Combined effect: longer arc, more granular reward beats, less grindy late-game.

### 2.1 Formula

```
XP needed to *reach* level N (cumulative): 120 * N^1.8
XP needed to go *from level N to N+1*:     120 * ((N+1)^1.8 - N^1.8)
Level = max(1, min(100, floor((xp / 120) ^ (1 / 1.8))))
```

The `max(1, ...)` wrapper handles the bootstrap case: at xp=0 the raw floor evaluates to 0, but every account is L1 by definition (§2.2 row 1). The clamp ensures no user is ever displayed at "Level 0."

The 1.8 exponent (vs the 2.0 quadratic) flattens the curve: levels feel slightly harder early but significantly easier mid-to-late, giving steady reward beats over the year-long arc instead of asymptotic grind at level 40+.

### 2.2 Level milestones table

| Level | Cumulative XP to reach | XP from prev level | Typical effort |
|---|---|---|---|
| 1 | 0 | — | Default — every account starts here. |
| 2 | ~418 | ~418 | ~4 lessons. End of first day. |
| 3 | ~867 | ~449 | ~7 lessons. Day 2. |
| 5 | ~2,174 | ~589 | End of week 1. |
| 10 | ~7,572 | ~1,011 | End of month 1. |
| 20 | ~26,389 | ~1,758 | Hiragana + katakana + first 2-3 vocab clusters mastered. ~end of month 2-3. |
| 30 | ~55,369 | ~2,400 | Halfway through N5 vocab. ~month 4-5. |
| 50 | ~159,049 | ~3,533 | N5 nearly complete. ~month 7-9. |
| 75 | ~334,884 | ~4,841 | Mid-N4. ~month 14-16. |
| 100 | ~477,612 | ~5,943 | **MAX LEVEL** — N5 complete, deep into N4, possibly into N3. ~month 18-22. |

Numbers are approximate (decimal exponent → fractional XP rounded). Stored XP is integer; level computation rounds with `floor`.

The flatter curve means each individual level requires less of a leap, especially mid-game. A user at level 30 vs level 35 sees ~12K XP between them (vs ~25K under the old quadratic) — that's roughly 2-3 weeks of moderate play instead of 5-6 weeks. The dopamine cadence is better.

### 2.3 Past level 100

When a user hits the 477K XP threshold, level display becomes **"Lv. 100 ✦ Master"** with a small star glyph. Additional XP earned past 477K accumulates internally but doesn't show a level number — it shows total XP only ("Master · 612,400 XP"). The "Master" tier is the social-proof badge for completing N5 + deep N4 + reaching for N3 territory.

Per project lead's v1.1 reasoning ("let's make it 100"): 100 levels with a flatter curve gives the user 100 distinct mile-markers across a 18-24 month learning arc, instead of 50 with an aggressively-growing gap. Each level-up still feels like an event because of §7.4 reward cadence; the increased frequency doesn't dilute the feel.

### 2.4 Level-up surface

On the moment of leveling up:
- Toast fires: "Level {N}!" / «المستوى {N}!» — center of screen, 1.2s.
- Small celebratory animation: brand-crimson burst (respects `prefers-reduced-motion` per `LEARNING_EXPERIENCE.md` §12.3).
- The new level number visibly slots into the dashboard's profile card.
- No audio fanfare by default (per the same shared-space concern §7.2 raises — but the per-session mute toggle covers this).
- Milestone levels (5, 10, 20, 30, 40, 50): toast wording upgrades to "Level {N} — {milestone label}!" with labels like "Word Builder", "Kanji Climber", "N5 Master" (final labels chosen in L2.13 implementation, drafted by Codex per the AR-voice memory).

### 2.5 No level-gated content

Level is **purely a display reward**. It doesn't unlock content, doesn't gate features, doesn't change what the user can do. Linear lesson unlock is per `LEARNING_EXPERIENCE.md` §2 (strict lockstep, lesson-by-lesson), independent of level.

---

## 3. Streak mechanics

Per project lead's 2026-06-05 decision + `Commercialization_Plan.md §4`: soft streak with auto-freezes.

### 3.1 What counts as a session

A *session* = at least 3 cards completed (correct or wrong) in any mode within a single local-TZ day. Modes that count: Lessons, daily quests, Zen, Survival, Duel, Co-op. The 3-card threshold prevents accidental session-creation by someone who just opened the app to check status.

### 3.2 Day boundary

User's local timezone, stored as `users/{uid}.tz` (IANA timezone string, e.g., `Africa/Cairo`). Defaults to `Africa/Cairo` if unset (target audience baseline).

A "day" is from local 00:00 to 23:59:59.999. Sessions completed across midnight count toward whichever day they started in.

### 3.3 Streak counter

Stored at `users/{uid}.streak` as:

```
{
  current: N,                    // active streak length in days
  longest: M,                    // all-time max of current
  lastActiveDay: 'YYYY-MM-DD',   // most recent qualifying-session day
  lastResetFrom: N,              // value of current the moment before the most recent reset
                                 // — needed for the §3.5 48h grace restore. 0 if never reset.
  lastResetAt: 'YYYY-MM-DD',     // when the most recent reset happened
                                 // — null if never reset. used by §3.5 to check 48h window.
  lastGraceUsed: 'YYYY-MM-DD'    // last time §3.5 grace was applied
                                 // — null if never. cap: once per 7 calendar days.
}
```

- `current` increments by 1 on the first qualifying session of a new local day, IF the previous day also had a session (or had a freeze applied — see §3.4).
- `current` resets to 1 on the first session of a day if the previous day was missed AND no freeze covered it. The reset operation MUST also write `lastResetFrom = (current before reset)` + `lastResetAt = today`, otherwise §3.5 grace can't fire correctly.
- `longest` updates whenever `current` exceeds `longest`.

### 3.4 Freezes

| Tier | Freezes per calendar month | Regeneration | Auto-application |
|---|---|---|---|
| Free | 1 | First of each calendar month (UTC) | Auto-applied to a missed day if available, silently. |
| Pro | 3 | First of each calendar month (UTC) | Same. |

Stored at `users/{uid}.freezes` = `{ available: N, lastRefilled: 'YYYY-MM' }`.

#### Settlement (v1.5 — handles cron-vs-early-session race)

Settlement = the act of processing the transition out of an inactive day: either apply a freeze, or reset the streak. v1.5 makes settlement a **shared transaction** that both the daily cron AND the session handler can invoke; whichever fires first wins, the other no-ops.

**Shared settlement transaction** (`settleStreakIfNeeded`):

Inputs: `uid`, `today` (local-TZ date string).

1. Read `users/{uid}.streak` in a transaction.
2. Compute `daysSinceActive = today − streak.lastActiveDay`.
3. If `daysSinceActive ≤ 1`: no missed days, no-op (no settlement needed).
4. If `daysSinceActive ≥ 2`: there are `daysSinceActive − 1` missed day(s) between `lastActiveDay` and `today` that need settlement. For each missed day in chronological order:
   - If `freezes.available > 0`: decrement freezes by 1. (Do NOT reset streak.)
   - Else: reset the streak ONCE — write atomically `streak.lastResetFrom = streak.current`, `streak.lastResetAt = <date of first missed day after freezes ran out>`, `streak.current = 0`. Stop iterating (further misses don't compound — once reset, the streak is already 0).
5. Set `users/{uid}.streakSettledThrough = <yesterday's date>` so future calls of this transaction know not to re-process.

The transaction is idempotent on `streakSettledThrough` — calling it twice for the same date is a no-op the second time.

**Daily cron:**

A scheduled Cloud Function runs daily at user's local midnight + 1 hour. For each user, it calls `settleStreakIfNeeded(uid, today)`. This is the **backstop** path — handles users who don't play that day.

**Session handler:**

When a qualifying session (≥ 3 cards) completes for the first time on a new day, the session handler:
1. First calls `settleStreakIfNeeded(uid, today)` — settles any prior-day misses if the cron hasn't fired yet (covers the early-morning play scenario).
2. Then processes today's session: `streak.current += 1` (or `= 1` if just reset), `streak.lastActiveDay = today`, `streak.longest = max(longest, current)`.
3. Then §3.5 grace check fires (if applicable).

Both paths converge through the shared transaction. A user who plays at 00:30 before the 01:00 cron runs will have the session handler perform settlement, writing `streakSettledThrough = yesterday`; the cron at 01:00 reads that value, sees yesterday is already settled, and no-ops. A user who doesn't play at all gets settled by the cron (which then writes `streakSettledThrough = yesterday` itself). Race-free.

### 3.5 48-hour re-engagement grace

Per project lead's L2.02 spec: if the user returns within 48 hours of missing a day AND used zero freezes for it (because they had none, so streak was reset), the most-recent reset is **rolled back** as a "welcome back" gesture.

**Algorithm (uses the §3.3 v1.3 state fields):**

On the user's first qualifying-session of the day (i.e., when the 3-card threshold is crossed and the streak handler runs), check:

1. Was `lastResetAt` within the last 48 hours? (uses local TZ; compare against today − 48h.)
2. Was `lastGraceUsed` more than 7 days ago, or null? (cap: once per 7 calendar days.)
3. Is `lastResetFrom > 0`? (there's something to restore — never restore from 0.)

If all three are true:
- `current = lastResetFrom + 1` (restore + count today).
- `lastGraceUsed = today`.
- `lastResetFrom = 0` (consumed).
- `lastResetAt = null` (consumed).
- Fire a one-time toast: "Welcome back — your streak is back" / «أهلًا بعودتك — رصيد المتابعة عاد لك».

If any of the three checks fail: no grace; streak proceeds with `current = 1` (today is day 1 of a new streak).

This is silent forgiveness for the user who missed Saturday but came back Monday — without becoming the default expectation.

**Idempotency:** the algorithm is purely a function of the stored state. Re-running it after a successful grace is a no-op (`lastResetFrom` is 0 → check 3 fails → no second restore).

### 3.6 At-risk notification

Fires once per day at the user's local 20:00 (8 PM) IF:
- User has `current >= 3` (no point alerting at streak=1).
- User has had zero qualifying sessions today.
- User has push/email notifications enabled.
- User hasn't already received an at-risk notification today.

Channel: email at launch (per `Commercialization_Plan.md §4` notifications-locked decision). Web push deferred per the same.

Body (EN draft, final from Codex per the AR-voice memory):
- Subject: "Your streak is at risk"
- Body: "Hey {name}, you're on a {N}-day streak. A 3-card session today keeps it going. Takes about 2 minutes."
- Single CTA: "Open Tomodachi" → deep-links to dashboard.

Opt-out: a single toggle in Settings → Notifications → "Streak reminders" → on/off.

### 3.7 Streak counter UI

Dashboard top-right corner under the user's display name, in a small chip:

```
🔥 7    or, when at risk in the evening:    🔥 7 ·
```

(The trailing dot is a discrete "your day isn't done yet" signal — no shouting flame animation.)

At streak = 0: chip hides entirely. No "0 day streak" display — that's shame-coded.

On hover/tap of the chip: tooltip shows "{N} days · {M} freezes available" / «{N} يومًا · {M} أيام تجميد متاحة».

---

## 4. Daily quest system

Per `Commercialization_Plan.md §4`: 1 quest Free / 3 quests Pro. Quest generation algorithm from `LEARNING_EXPERIENCE.md §4.4` (SM-2 driven). This section specifies what KIND of quests exist and how XP/badge progress attaches.

### 4.1 Quest types

Per project lead's v1.1 decision: expanded Variety pool to include Streak and Speed subtypes.

| Type | Description | Free | Pro |
|---|---|---|---|
| **Review** | "Review these N items today" — items selected by SM-2 from due+lapsed+learning queue. N typically 5-10. | Always 1 of these. | Always 1 of these. |
| **Duel** | "Win a duel today" or "Complete a duel today" (depending on user's friend-online state). | Never. | 1 if user has ≥1 friend; rolls over to Variety if not. |
| **Variety** | Rotates among the subtypes below. Random pick per day, with logic to avoid same-subtype-yesterday repeats. | Never. | 1, varying daily. |

Daily count: Free = 1 quest. Pro = up to 3 quests (Review + Duel + Variety; falls back gracefully if a quest type can't be generated for the user that day).

#### 4.1.1 Variety quest subtypes (expanded in v1.1)

| Subtype | Prompt | Completion signal | Notes |
|---|---|---|---|
| `master_one_new` | "Move 1 new item to mastered today" | Any item promoted to `m: 'mastered'` (reps ≥ 5) | Most common — drives long-term retention. |
| `coop_one` | "Complete 1 co-op session" | One coop session finished | Skipped if user has no online friends; falls back to next subtype. |
| `zen_5min` | "Play a Zen session of ≥5 minutes" | Single Zen session crosses 5 min | Encourages reflection mode. |
| `listening_drill` | "Try a listening drill" | Any listening-drill session completed | Variety + audio engagement. |
| `streak_10` (NEW, v1.1) | "Get 10 correct answers in a row in any mode" | Counter resets on any wrong; hits 10 = quest done | Per-session streak, distinct from daily streak. Rewards focus. |
| `speed_20` (NEW, v1.1) | "Answer 20 cards correctly in under 2 minutes" | 20 correct within a 120-second window | Rewards quick recall; skipped if user's avg response time > 8s recently (would set up failure). |
| `master_audio` (NEW, v1.1) | "Use audio playback on 10 cards today" | Speaker icon tap or auto-play counts | Encourages audio engagement — most underutilized feature. |
| `mixed_session` (NEW, v1.1) | "Play 3 different modes today" | E.g., Zen + Survival + Duel = 3 modes. | Rewards exploring the breadth. |

The Cloud Function picks one Variety subtype per day per Pro user, using a weighted random selection:
- Subtypes the user hasn't seen in 14 days: weight 3x.
- Subtypes the user completed yesterday: weight 0 (skip same-subtype repeats).
- Subtypes that don't apply to the user's current state (e.g., `coop_one` with no online friends): weight 0.
- All other subtypes: weight 1x.

This keeps Variety quests feeling varied without becoming chaotic.

### 4.2 Quest generation timing

Scheduled Cloud Function runs at user's local midnight + 5min. Writes today's quests to `users/{uid}/quests/{YYYY-MM-DD}` as:

```
{
  quests: [
    { type: 'review', items: ['kana:あ', 'vocab:こんにちは', ...], status: 'pending' },
    { type: 'duel',   target: 'win',                            status: 'pending' },
    { type: 'variety', subtype: 'master_one_new',               status: 'pending' }
  ],
  generatedAt: ISO timestamp,
  expiresAt: end-of-day local TZ
}
```

### 4.3 Quest completion + reward

- Each quest completion fires: +100 XP (per §1.1) + small "Quest complete!" toast.
- All Pro quests for the day completed: +50 XP bonus ("Day cleared").
- Quest completion contributes to several badges (see §5).

### 4.4 Rolled-over vs failed quests

If user doesn't complete a quest by end-of-day local TZ:

- **Review quest items**: unanswered items roll over into tomorrow's review quest at higher priority. The quest itself is marked `expired`, not "failed" — no negative XP, no shame language.
- **Duel quest**: silently expires, no rollover (it's about social engagement, doesn't make sense to insist on tomorrow).
- **Variety quest**: silently expires, no rollover. Tomorrow's variety picks a different subtype to avoid the exact same expired-yesterday prompt.

### 4.5 Quest difficulty curve (anti-stagnation)

If user completes Review quest with 100% first-try accuracy for **3 consecutive days**, next Review quest size bumps from N=5-8 to N=8-10 silently (capped at the §5.1 hard ceiling of 10 from `LEARNING_EXPERIENCE.md`). Resets to baseline if accuracy slips. The cap is hard — no acceleration past 10.

If user fails to complete Review quest for **3 consecutive days**, next Review quest size shrinks to N=3-5 (just the most-overdue lapsed items) for a one-day breather. This is the same "fatigue response" referenced in `LEARNING_EXPERIENCE.md §5.2`.

### 4.6 Empty-state on quest

Per `LEARNING_EXPERIENCE.md §11.3`: when user has no quests (typically because they've mastered the only items they've unlocked AND it's too early in their journey for the algorithm to find weak items), dashboard shows "Quest cleared for today — see you tomorrow." No Pro upsell on this tile (would feel pestered).

---

## 5. Badge catalog

22 badges per the hybrid model from project lead's 2026-06-05 L2.02 decision: ~16 count-milestone badges (visible roadmap with progress bars) + ~6 surprise achievements (hidden until unlocked).

Stored at `users/{uid}/badges/{badgeId}` as `{ unlockedAt: timestamp, progress: N }`.

### 5.1 Count milestones — visible roadmap (16 badges)

These appear in the user's profile badge grid with progress bars even before unlock. User sees the roadmap.

| ID | EN name | AR name (draft — Codex revises per AR voice) | Unlock condition |
|---|---|---|---|
| `cards_10` | First Ten | أول 10 بطاقة | 10 cards mastered (reps ≥ 5) |
| `cards_50` | Steady Builder | بناء ثابت | 50 cards mastered |
| `cards_100` | Triple Digits | 100 بطاقة | 100 cards mastered |
| `cards_500` | Five Hundred Strong | 500 بطاقة | 500 cards mastered |
| `streak_7` | One Week | أسبوع متواصل | Current streak ≥ 7 |
| `streak_30` | One Month | شهر متواصل | Current streak ≥ 30 |
| `streak_100` | One Hundred Days | 100 يوم متواصل | Current streak ≥ 100 |
| `friends_5` | Small Circle | 5 أصدقاء | 5 friends added |
| `friends_25` | Wide Circle | 25 صديقًا | 25 friends added |
| `hiragana_complete` | Hiragana Master | أتقنت الهيراغانا | All 92 hiragana mastered |
| `katakana_complete` | Katakana Master | أتقنت الكاتاكانا | All 92 katakana mastered |
| `vocab_n5` | N5 Vocab Master | أتقنت مفردات N5 | All N5 vocab (~800) mastered |
| `kanji_n5` | N5 Kanji Master | أتقنت كانجي N5 | All ~100 N5 kanji mastered |
| `grammar_n5` | N5 Grammar Master | أتقنت قواعد N5 | All N5 grammar points mastered |
| `n4_starter` | N4 in Sight | N4 على الأبواب | First N4 content unlocked (post-L3) |
| `duel_10` | Duel Veteran | 10 مبارزات | 10 duels won |

### 5.2 Surprise achievements — hidden until unlocked (6 badges)

User doesn't see these on roadmap. They reveal with delight on unlock.

| ID | EN name | AR name (draft) | Unlock condition |
|---|---|---|---|
| `first_session` | First Steps | أول خطواتك | Complete first lesson. (Visible for ~24h then hidden if not earned, to avoid feeling unattainable.) |
| `first_duel_win` | First Victory | أول انتصار | Win first duel. |
| `first_coop` | First Co-Op | أول تعاون | Complete first co-op session. |
| `pro_upgrade` | Pro Member | عضو برو | Upgrade to Pro (any tier). |
| `founder` | Founder | من المؤسسين | Registered before the platform hits 1,000 waitlist signups (per `Commercialization_Plan.md` "Founder" tier). |
| `bilingual` | Bilingual | ثنائي اللغة | Used both EN and AR UI in same calendar week. |

### 5.3 Badge profile presentation

- **Count milestones grid**: 4 columns × 4 rows = 16 slots. Each badge shows icon + name + progress bar (e.g., "6 / 10 cards mastered"). On unlock: icon goes from grey to full color + small "Unlocked!" overlay for 2s.
- **Surprise achievements row**: below the count grid, a single row labeled "Achievements". Locked surprise badges show as a grey question-mark glyph (no name, no description). Unlocked ones show full color + name + reveal animation on first view ("✨ Achievement: First Victory").
- Tap any badge → bottom-sheet modal with full description, unlock date, EN+AR text per locale.

### 5.4 Unlock event

Triggered server-side via Cloud Function on the relevant signal (mastery promotion → check cards_* milestones; streak increment → check streak_* milestones; etc.). Writes:
- `users/{uid}/badges/{badgeId}` with `unlockedAt`.
- A queued notification (handled by §3.6 notification system, but with badge-unlock template).
- XP bonus: +25 XP per badge unlocked (visible count milestones) or +50 XP per badge unlocked (hidden surprise — bigger reward for the rarer thing).

### 5.5 Future badges (placeholders, not yet enabled)

L3+ badge candidates documented here so the gamification team knows the slot exists:
- `mnemonic_accepted` — Suggested a mnemonic that the team accepted (per `LEARNING_EXPERIENCE.md §13.2`).
- `weekly_top10` — Reached top 10 on a weekly leaderboard.
- `helpful_hand` — Helped 10 different friends via co-op sessions.

These don't ship in L2 beta but the IDs are reserved.

---

## 6. Leaderboard scoring

Per project lead's v1.1 decision: unify all three leaderboards to XP-based. Simpler model, single mental construct ("XP wins"), single scoring source. Trade-off: drops the existing Survival-best-score all-time leaderboard from the leaderboards surface.

### 6.1 Scoring source — XP across all three periods

| Board | Source | Resets |
|---|---|---|
| **Weekly** | XP earned this week | Monday 00:00 UTC |
| **Monthly** | XP earned this month | 1st of month 00:00 UTC |
| **All-time** | Cumulative XP since account creation | Never |

All three boards rank by the same currency. Less to explain, less to maintain, less to debug. The user's mental model is "more XP = higher rank, always."

### 6.2 What happens to the existing Survival-bracket leaderboards?

The pre-commercialization model had Survival best-score leaderboards per bracket (5/10/15/25/46 characters × game mode). v1.1 drops these from the leaderboard surface but **preserves the data** on the user's own profile page as "Personal bests":

```
Profile → Personal bests
  Survival · 5 chars:  240 pts
  Survival · 10 chars: 180 pts
  Survival · 25 chars: 95 pts
  ...
```

Personal bests are still tracked + updated on every Survival session. They just don't appear on the social leaderboard surface — they're for the individual user's self-reference. This matches mature self-improvement apps (Strava personal bests, Apple Fitness personal records) where the social comparison is one metric (cumulative output) and the self-comparison is many (personal bests across categories).

If beta users push back wanting per-bracket competition, we can re-add bracket leaderboards as a separate "Skill challenges" tab in L3. Not in scope for L2 launch.

### 6.3 Scoring details

- Stored at `leaderboards/weekly/{YYYY-WW}/{uid}`, `leaderboards/monthly/{YYYY-MM}/{uid}`, and `leaderboards/alltime/{uid}` as `{ xp, displayName, avatar, lastPlayed }`.
- Updated on every XP-earning action (via the same transaction that increments `users/{uid}.xp`).
- Top 10 globally per period + top 10 friends-only (Pro toggle, per §6.4).
- Tiebreaker: most-recent `lastPlayed` wins (rewards consistency over single-day grinding).
- Period boundaries handled by scheduled Cloud Functions:
  - Weekly: each Monday 00:00 UTC, archive previous week's top 100 to `leaderboards/weekly_archive/{YYYY-WW}`, then clear active board.
  - Monthly: 1st of month 00:00 UTC, same pattern with `leaderboards/monthly_archive/{YYYY-MM}`.
  - All-time: no reset, no archive.

### 6.4 Pro: friends-only filter

Across all three boards (weekly, monthly, all-time), Pro users see a toggle:
- "All players" — global top 10.
- "Friends only" — top 10 filtered to user's friend list.

Free users see "All players" only. The Pro feature lives in the lockable strip above the leaderboard table.

### 6.5 Anti-cheating posture (v1.5 — honest threat model, instant feedback retained)

**Why this section was wrong in v1.2 through v1.4:** earlier versions claimed answers stay server-side and the client "learns correctness only at session end." That contradicts the actual game design — Survival/Duel/Co-op show immediate per-card correct/wrong feedback (existing `js/games/` behavior, not negotiable for the game UX). v1.5 corrects the docs to match the real posture and is honest about the security trade-offs.

**The actual model:** the client receives item prompts AND correct answers via the RPC start response (and from `content_sets` which is client-readable anyway). The client renders instant per-card feedback during play. At session end, the server re-grades responses against its own copy of the answers and computes XP from validated correctness. The anti-cheat layers are **response-time plausibility, server re-grading, nonce-anti-replay, and rate limits** — NOT "answers hidden from client."

**Server-issued game sessions** (Survival / Duel / Co-op — lessons + daily quests use the `LEARNING_EXPERIENCE.md §6.2` in_progress model; see §7.7 for the split + the same re-grading model applied there):

1. **Session start.** Client calls `POST /api_game_session_start` with `{ mode, charSet, bracket }`. Cloud Function:
   - Picks the item sequence (random / SRS-informed / duel-shared per mode).
   - Writes a `game_sessions/{sessionId}` doc with `{ uid, mode, charSet, bracket, itemKeys: [...], startedAt, expiresAt (start + 30min), nonce, completed: false }`. Note: the doc stores only `itemKeys`, not the answers themselves — answers are fetched from `content_sets` at end-RPC grading time.
   - Returns `{ sessionId, items[] (with `prompt` AND `correctAnswer` per item — needed for instant feedback during play), nonce, expiresAt }` to the client.
2. **Session play.** Client renders items in order, displays prompts, accepts user input, compares against `correctAnswer` for instant green/red feedback per card, accumulates `responses[]` locally. No XP awarded mid-session; the client's running score is for display only and isn't trusted.
3. **Session end.** Client calls `POST /api_game_session_end` with `{ sessionId, nonce, responses: [{ itemKey, userAnswer, responseMs, clientCorrect }, ...] }`. Cloud Function:
   - Validates `sessionId` exists, `uid` matches caller, `nonce` matches, `completed: false`, current time < `expiresAt`.
   - Validates `responses.length === itemKeys.length` and `responses[i].itemKey === itemKeys[i]` (no reordering, no insertion).
   - **Re-grades each response server-side** by fetching the item from `content_sets` and comparing `userAnswer` to the canonical answer. Server's `serverCorrect[i]` is authoritative; `clientCorrect[i]` is logged for cheat-detection (if `clientCorrect[i]` disagrees with `serverCorrect[i]` more than ~rare-input-edge-case rate, flag the account).
   - Validates response times: sum of `responseMs` ≤ wall-clock between start and end + small slack; no single `responseMs < 200ms` (sub-human reaction time).
   - Computes XP per §1.1 **using `serverCorrect` only**.
   - Writes XP + leaderboard updates in a single transaction; marks `completed: true`; persists `responses[]` + `serverCorrect[]` for audit.
   - Returns committed result + XP earned.
4. **Session expiration.** Scheduled Cloud Function cleans `game_sessions/*` docs > 24h old. Active sessions > 30min are stale; `api_game_session_end` rejects them.

**Firestore security rules (v1.5, unchanged from v1.4):**

```
match /game_sessions/{sessionId} {
  allow read:   if false;        // never readable by client
  allow write:  if false;        // only Cloud Function service account writes
  allow create: if false;
  allow delete: if false;
}
```

Client never directly reads `game_sessions`. All access is RPC-mediated. The doc holds session-binding state (uid, nonce, completed flag) — those must stay tamper-proof. Answers themselves come via the RPC response (and are public-by-design in `content_sets` anyway), so server-only-readable on the doc isn't about answer secrecy — it's about session integrity.

**What this anti-cheat model catches:**
- ✅ Client claims item was correct when it wasn't: server re-grading catches this. XP not awarded.
- ✅ Client replays an old session payload: nonce already consumed → rejected.
- ✅ Client claims sub-200ms response times: per-item plausibility check rejects.
- ✅ Client claims more items completed than session has: length mismatch rejected.
- ✅ Client claims items not in session: itemKey mismatch rejected.
- ✅ Client tries direct write to `users/{uid}.xp` or `leaderboards/*`: security rules deny.

**What this anti-cheat model does NOT catch (acknowledged accepted risk):**
- ❌ A determined cheater who reads the `correctAnswer` field from the start RPC response and submits perfect responses with plausible timing. There is no defense against this short of removing instant feedback — which would damage the learning UX. We accept this risk.
- Mitigation: leaderboards for L2 beta are between 50 users who know each other socially. A user gaming the leaderboard is mostly hurting their own learning. Post-launch, if leaderboards become more public, we can add: behavioral-pattern flagging (always-perfect runs across many sessions), randomized item ordering vs predictable, and human moderation review.
- This is the same posture as Duolingo, WaniKani, Quizlet — instant-feedback learning apps have to make this trade-off.

**Schema impact for L2.03:** `game_sessions/{sessionId}` collection with the v1.5 simplified shape (`itemKeys[]` not `itemAnswers{}`; server fetches from `content_sets` at grading time) + the read-denied + write-denied security rules. All game session access through the `api_game_session_start` / `api_game_session_end` Cloud Functions.

**Other layers (kept):**
- **Server-side XP enforcement:** all XP writes via Cloud Functions only — never client direct.
- **Rate limits:** > 10 session-end calls / 60s flags account to moderation queue.
- **Server re-grading is the universal rule:** applies to game sessions (per this section) AND to lesson/quest commits (per §7.7).

### 6.6 Empty state

- New leaderboard period (first day): "Be the first on this week's board." Single CTA to play.
- User has zero XP this period: their row at the bottom of their visible range, greyed out, "Play to enter the board."

---

## 7. Reward cadence — what fires when

The choreography of reward feedback. Inspired by mobile-game best-practices: micro-rewards every few seconds, mid-rewards every minute, milestone-rewards every session.

### 7.1 Per-card

- Correct answer (any quiz type):
  - 250ms green flash + check icon over the card.
  - "+10" XP text floats up from where the answer was tapped, fades out in 600ms.
  - 250ms auto-advance to next card (per `LEARNING_EXPERIENCE.md §10.1`).
- Wrong answer:
  - 250ms red flash + ✕ icon.
  - Correct answer revealed below the wrong selection.
  - **No XP animation** — wrong answer is 0 XP, no fake-feedback.
  - Tap-to-continue (no auto-advance) — explicit moment to absorb the correction.

### 7.2 Per-lesson

- Lesson outcome screen (full screen, fixed):
  - Top: lesson name + complete checkmark animation (200ms).
  - Middle: XP earned this lesson (sum of per-card + lesson-complete + perfect-bonus if applicable) in a big number with brief count-up animation.
  - Below XP: any milestones triggered (level up, badge unlock) — animated in sequence with 400ms between each.
  - Bottom: two CTAs — "Continue to lesson N+1" + "Done".
- If lesson triggered a level up: the level-up overlay shows BEFORE the outcome screen, dismissed by tap.

### 7.3 Per-session

- "First session of the day" bonus (+20 XP per §1.1) fires (optimistically) once the user crosses the 3-card threshold (per §3.1 qualifying-session definition) on a new local day. A small "+20 First session" toast confirms. The actual commit happens at session-exit per §7.7.
- Daily quest completion (any quest): "Quest complete! +100 XP" toast (1.5s).
- All Pro quests complete: "Day cleared! +50 bonus" toast on top of the last quest completion.

### 7.4 Per-day

- Streak increment on first session of the day: streak chip in dashboard updates with a brief 200ms pulse. No standalone toast for the streak (would over-celebrate something the user expects).
- Streak-at-risk email fires at 20:00 local per §3.6.

### 7.5 Per-event (rare)

- Level-up: full-screen overlay with level number animation. Dismissed by tap. Doesn't auto-dismiss to ensure the moment is felt.
- Badge unlock: bottom-of-screen popover with badge icon + name + description. Dismissed by tap, auto-dismisses after 4s.
- Master tier (level 100): special overlay with extended celebration. One-time per account.

### 7.6 Anti-fatigue rule — sequence reward animations, don't stack them

**The problem this solves:** when a single moment in the app triggers multiple rewards at once — for example, you complete a lesson AND that completion was perfect AND it pushed you up a level AND it unlocked a badge — that's 4 reward animations competing for attention in the same second. If we throw them all on screen simultaneously, none of them lands. The user sees a blur of confetti, dismisses it, and the dopamine hit each individual reward was *meant* to produce gets diluted to nothing.

**The fix:** when ≥2 reward animations would fire within a 5-second window, they enter a small queue and play sequentially, ~400ms apart. The user sees them in order: lesson complete → +50 perfect bonus → level up → badge unlock. Each one gets its own moment. Total elapsed time across all 4: ~2 seconds. Premium apps do this — Apple Fitness "ring closed" + "personal best" + "monthly award" plays as a sequence, not a pile-up.

Implementation: a single client-side `RewardQueue` consuming events and rendering them with a brief gap between each. Empties as it plays. Cleared on screen change.

Per project lead's v1.1 confirmation: keep the queue behavior, but document the *why* clearly so future contributors don't "optimize" it back into a simultaneous stack.

### 7.7 Optimistic UI vs committed XP (v1.5 — server re-grades, xpEventLog is display-only)

**Why this changed from v1.4:** v1.2–v1.4 said the Cloud Function reads `in_progress.xpEventLog` and commits XP based on its entries. But the client writes that log (mid-session state persistence requires client writes to in_progress). A malicious client could forge "I correctly answered N items" entries that never happened, then trigger commit → leaderboard inflation. v1.5 fixes this by making `xpEventLog` purely cosmetic — the server discards it at commit and **re-grades from `itemState` against `content_sets` answers**.

XP commit happens via two parallel paths, but BOTH now apply the same server-re-grade-not-client-trust principle:

| Path | Used for | XP commit mechanism (v1.5) |
|---|---|---|
| **In-progress path** | Lessons + daily quests | Optimistic mid-session UI driven by client; deferred commit at session-exit where **server re-grades from `in_progress.itemState`** (responses + timing) against `content_sets` answers; `xpEventLog` ignored at commit (display-only). Idempotent via `committed_events/{eventId}`. |
| **Game-session path** | Survival, Duel, Co-op | Optimistic per-card UI driven by client (with server-provided answers per §6.5); committed inside `api_game_session_end` where server re-grades from `responses[]` against `content_sets` answers (per §6.5). |

This section covers the in-progress path. The game-session path is fully specified in §6.5; both paths follow the v1.5 universal rule: **trust nothing the client wrote about correctness or XP; re-grade from raw responses + server-known answers at commit time.**

**In-progress path (lessons + daily quests):**

During a session:
- Client renders +10 animation on every correct-answer card (correctness determined client-side by comparing user input to the item's `correctAnswer` field from `content_sets`).
- Client appends an entry to the in-memory `xpEventLog` with a deterministic `eventId` (e.g., `lesson:hiragana:01:item:あ:first_try` or `quest:2026-06-05:item:vocab:こんにちは:first_try`). This log is **purely cosmetic** — it drives optimistic UI animations and the `pendingXp` counter.
- Client also writes to `in_progress.itemState[itemKey] = { status, responseMs, userAnswer, attempts }` — this is the **authoritative trace** the server will re-grade from.
- The xpEventLog *also* syncs to `in_progress.xpEventLog` for resume display continuity (so a resumed session can re-render the "+10" history if needed) — but the server ignores it at commit.
- Client increments a session-local `pendingXp` counter shown next to the user's dashboard XP (e.g., dashboard reads `XP: 1,234 (+30 pending)`).
- `users/{uid}.xp` does NOT change yet.
- Leaderboard standings do NOT change yet.
- Badge unlocks do NOT fire yet — they're checked after the server's re-grading + commit.

At session-exit (lesson outcome reached OR quest completed OR 24h TTL expired; see `LEARNING_EXPERIENCE.md §6.2` for the full trigger list), the session-exit Cloud Function:

1. Reads `in_progress/{sessionKey}.itemState` — the per-item responses + timing.
2. For each item, **fetches the canonical answer from `content_sets`** and re-grades the user's response.
3. Validates response-time plausibility (per-item ≥ 200ms, sum ≤ wall-clock between startedAt and now + slack).
4. Computes XP per §1.1 from server-graded correctness only. Ignores the client's `xpEventLog`.
5. Constructs the **server-authoritative event list** with deterministic eventIds (same shape as the client's xpEventLog, but derived from server-graded results).
6. Applies each event via idempotent transaction keyed on `eventId`:
   - If `eventId` already in `users/{uid}/committed_events/{eventId}`: skip (resume safety net).
   - Otherwise: increment `users/{uid}.xp`, write `committed_events` marker, update affected leaderboards, in the same transaction.
7. Runs badge unlock checks after XP commits.
8. Marks the in_progress doc as `committed: true` + timestamp.
9. Returns the committed result to the client; client animates a "synced" indicator (subtle, ~500ms).

If `xpEventLog` and the server's re-graded events disagree by more than a rare-edge-case threshold (e.g., the client claimed first_try on items the server graded as wrong), log to a moderation queue for review — this is a likely-cheat signal.

**What the user sees on the in-progress path:**
- During session: lots of +10 confetti, dashboard XP looks like it's increasing in real-time (because of `pendingXp` display).
- At session-exit: a single brief "synced" pulse, no jarring "XP corrected" moment. Numbers match what they expected.
- On unexpected close: the optimistic animations they saw mid-session are honored by the deferred commit when the session eventually exits (resume-then-finish, or 24h TTL cron) — same eventIds, same XP, no double-award, no loss.
- On resume: the prior session's pending XP entries (which are present in the resumed `in_progress.xpEventLog` because they hadn't committed yet) **stay displayed as pending** in the resumed session's UI. They commit when this resumed session itself exits. Dashboard XP does NOT include them until that moment.

**Why this scoping matters:**
- Premium UX on the surface where users spend most time (lessons + quests).
- Game sessions don't need optimistic mid-session XP because they're short bursts (~1-3 min) where the user is in flow — the small latency at session-end commit is invisible.
- Game sessions can't safely use the optimistic model anyway because the client doesn't have correctness signal mid-session (server holds the answers, per §6.5).

**Edge case — network failure during in-progress session:** if the client can't reach Firestore to persist the in_progress doc updates mid-session, optimistic UI continues to render based on local state, and the periodic in_progress writes retry. If the user closes the app while in this state, on next open the local pending state syncs to in_progress, then session-exit commit fires normally. The only true data loss path is full client crash before any persist write — acceptable risk for v1.

**Edge case — network failure during game session:** the entire `api_game_session_end` RPC retries with the same `(sessionId, nonce)` — idempotent on the server side because `completed: true` short-circuits a second commit. If the RPC never succeeds, the 24h TTL cleanup eventually drops the session unfinished, with no XP awarded. Acceptable v1 risk.

---

## 8. Pro vs Free gamification matrix

Cross-references `Commercialization_Plan.md §6` (the canonical Pro vs Free matrix — gitignored). This section specifies only the gamification-surface differences.

| Surface | Free | Pro |
|---|---|---|
| **Daily quests** | 1 quest/day (Review) | 3 quests/day (Review + Duel + Variety) |
| **Freezes** | 1/month | 3/month |
| **48h re-engagement grace** | Yes (1x per 7 days) | Yes (1x per 7 days) — same rules |
| **Leaderboard filter** | All-players view only | Friends-only filter available across weekly/monthly/all-time |
| **Streak at-risk notification** | Available, opt-out from Settings | Same |
| **Badges visible roadmap** | All 16 count milestones visible | All 16 visible |
| **Surprise achievements** | All 6 unlockable | All 6 unlockable |
| **`pro_upgrade` badge** | Locked until upgrade | Unlocks on first paid month |
| **New items/day cap** | 15 base / 20 accelerated (per `LEARNING_EXPERIENCE.md §5.1` + §5.3) | 30 base / 40 accelerated |
| **Concurrent learning items cap** | 20 (per `LEARNING_EXPERIENCE.md §5.1`) | 20 (same — caps are protective, not paywalled) |
| **XP cap** | None (per §1.3 v1.1 — anti-grind via natural pacing) | None |

Note: gamification is **not heavily paywalled**. The Pro upgrade is about *more capacity* (more quests, higher cap, more freezes, friends filter) rather than gating reward access. This matches `Commercialization_Plan.md` "free remains substantial" principle.

---

## 9. Anti-burnout patterns

Cross-cutting concerns that protect long-term engagement at the cost of short-term metrics.

### 9.1 Notification frequency caps

- Streak-at-risk: max 1/day per §3.6.
- Daily quest reminder: opt-in only (default off per `Commercialization_Plan.md §4`).
- Weekly summary email: opt-in only.
- Badge unlock email: max 3/week (multiple unlocks in same week consolidate into one email).
- "Friend came online" toast: in-app only, never email/push.

### 9.2 Notification suppression rules

- If user just played within the last 6 hours: suppress streak-at-risk for that day.
- If user has set "Quiet hours" in Settings (TBD feature for L3+): suppress all reward-related notifications during quiet hours.
- If user explicitly closed last 3 reward toasts without interaction (rough proxy for "I get it, leave me alone"): pause auto-celebrations for the rest of the session (the data still updates, just no overlays).

### 9.3 Streak forgiveness

Per §3.5 — the 48h re-engagement grace exists specifically to prevent the "I missed yesterday so I might as well stop" effect. One-shot per 7 days because true forgiveness only works if it's not the default expectation.

### 9.4 No "you missed X days" / "your X is at risk" outside the agreed channels

Specifically forbidden:
- Email subject lines starting with negative framing ("Don't lose your streak!").
- Push notifications with countdown timers.
- Dashboard banners listing what the user has "lost" (lapsed items, broken streak, missed days). The banners are forward-looking only ("Today's lesson keeps you moving").

This is enforced via copy review on every new gamification surface. Codex specs for any gamification copy must reference this section.

### 9.5 Difficulty-down responses

Per `LEARNING_EXPERIENCE.md §5.2` + this doc §4.5: if user is struggling (accuracy drops, quest skips pile up), the system adjusts down silently. No "you're struggling" message — just a smaller, easier quest tomorrow.

---

## 10. Power-ups / consumables — skip for MVP

Per `Phases_and_Tasks.md` L2.02 spec: "Default: skip for MVP; revisit at Phase L5."

This doc confirms the decision: **no power-ups, no consumables, no purchasable XP boosters, no "double XP weekend" events, no freeze potions, no streak-restoration shop items** in L2 beta or L3 public launch.

Rationale:
- Power-ups encode the dopamine economy of casino-mechanics-style games. That's antithetical to the calm-pace adult-learner brand.
- They introduce paywall surfaces inside the learning loop, which conflicts with "free remains substantial".
- They create economy-balancing maintenance burden (does double-XP-weekend break our XP economy math?).
- The Pro tier's value lives in *more capacity* (more quests, higher cap, more freezes) — not in tradable items.

Reconsider in L5+ ONLY if both of these hold: (a) we have enough active users for "weekend events" to feel social, AND (b) user-research shows demand without a backlash from the existing user base.

---

## 11. v1.1 changelog — project lead's review of the 8 open questions

All 8 questions from v1.0 resolved on 2026-06-05. Status of each below; sections updated in place.

| # | Original question | v1.1 resolution | Section updated |
|---|---|---|---|
| 1 | Daily XP soft cap at 1500 Free / 2500 Pro | 🔁 **Removed** — no user-facing XP cap. Premium adult-learning apps (Duolingo, Babbel, Pimsleur, Apple Fitness) don't show explicit caps; anti-grind protection lives in already-specced mechanisms (L2.01 §5.1 new-items/day cap, L2.01 §5.2 session-length fatigue signal, §6.5 server-side validation). | §1.3 rewritten + §8 matrix updated |
| 2 | Quadratic level curve exponent (`100 * N^2`) | 🔁 **Flattened** — now `120 * N^1.8`. Levels feel similar early, easier mid-to-late. Steadier reward beats over the year-long arc. | §2.1 formula + §2.2 table both updated |
| 3 | Max level at 50 (Master tier) | 🔁 **Doubled to 100** — combined with flatter curve, gives 100 mile-markers across an 18-24 month arc instead of 50. Master ✦ tier moves to L100. | §2.3 rewritten |
| 4 | Quest types: Review / Duel / Variety | 🔁 **Variety expanded** — added Streak (10-in-a-row in any session), Speed (20 cards correct in 2 min), Audio (10 audio-tap cards), and Mixed Session (3 different modes) subtypes. Total Variety pool now 8 subtypes with weighted random selection logic. | New §4.1.1 added |
| 5 | 22 total badges (16 visible + 6 surprise) | ✅ **Confirmed** — start with 22, adjust based on beta data. | §5 unchanged |
| 6 | All-time leaderboard stays Survival-score-based | 🔁 **Unified** — all three boards (weekly/monthly/all-time) now XP-based. Existing Survival best-scores moved to "Personal bests" section on the user's own profile page (preserved, just not on the social leaderboard surface). Per-bracket competition can return in L3 as a separate "Skill challenges" tab if beta users push back. | §6 fully rewritten + subsections renumbered |
| 7 | Anti-fatigue rule: queue reward animations | ✅ **Confirmed** with clearer explanation in the doc — the problem solved is the simultaneous reward pile-up where each individual moment gets diluted to nothing. Queue means each one *lands*. Apple Fitness ring + personal-best + monthly-award sequence is the reference pattern. | §7.6 rewritten with rationale |
| 8 | 48h grace one-shot per 7 days | ✅ **Confirmed** — silent forgiveness for the user who missed Saturday but came back Monday, without becoming the default expectation. | §3.5 unchanged |

**Net of v1.1:** 3 confirmations (Q5, Q7, Q8) + 5 substantive changes (Q1 removed cap, Q2 flattened curve, Q3 doubled levels, Q4 expanded Variety, Q6 unified leaderboards). The XP cap removal cascaded through §1.3 rewrite + §8 Pro-vs-Free matrix update. The leaderboard unification cascaded through §6 full rewrite with subsection renumbering + Personal bests moved to profile.

**No new open questions.** This doc is now ready to support L2.03 (content schema work) and downstream L2.C build tasks. The numeric tuning (XP-per-action values, badge thresholds, Variety quest weighting) remains the largest reservoir of "we'll calibrate from beta data" calls — treat the current numbers as starting points, not final values, and plan a tuning pass after the first 30-50 beta users have played for 2-4 weeks.

---

## 12. v1.2 changelog — external-agent review applied

Applied a 10-finding external-agent code-review pass on 2026-06-05 alongside `LEARNING_EXPERIENCE.md` v1.2. Findings affecting GAMIFICATION_DESIGN.md:

| External finding | Issue | v1.2 resolution | Section updated |
|---|---|---|---|
| #1 — Stale XP cap copy | §7.3 still referenced the removed XP soft cap with a "Soft cap hit" dashboard ribbon bullet | Removed the bullet entirely. Aligns with §1.3 "no cap by design." | §7.3 |
| #2 — Master tier level mismatch | §7.5 said "Master tier (level 50)" while §2.3 v1.1 had moved Master to level 100 | Fixed to "Master tier (level 100)." | §7.5 |
| #3 — Quest size conflict 10 vs 12 | §4.5 acceleration bumped Review quest to N=8-12, but `LEARNING_EXPERIENCE.md §5.1` caps quest size at 10 | Aligned acceleration bump to N=8-10 with explicit "capped at the §5.1 hard ceiling of 10" reference. | §4.5 |
| #9 — Anti-cheat session signatures forgeable | v1.1's "session signatures derived client-side" model is forgeable by anyone who reverse-engineers the formula | Rewrote §6.5 with **server-authoritative game sessions**: server picks items + holds answers + issues a nonce; client plays through the server-issued sequence; server grades responses. Bulletproof against client-side cheating without adding meaningful latency or cost. Adds a `game_sessions/{sessionId}` Firestore collection to L2.03 schema work. | §6.5 fully rewritten |

**Net of v1.2:** 4 GAMIFICATION_DESIGN.md fixes applied (the rest in LEARNING_EXPERIENCE.md v1.2). Biggest schema-shape impact is §6.5's new `game_sessions/{sessionId}` collection — L2.03 must specify this with appropriate Firestore security rules (caller-read-own + Cloud-Function-only-write).

**No new open questions.**

---

## 13. v1.3 changelog — second external-agent review applied

Second external-agent code-review pass on 2026-06-05 (after v1.2 landed). Found 9 issues: 3 high, 4 medium, 2 low. Findings affecting GAMIFICATION_DESIGN.md:

| External finding | Issue | v1.3 resolution | Section updated |
|---|---|---|---|
| #2 High — Level can be 0 | Formula `min(100, floor((xp/120)^(1/1.8)))` yields 0 at xp < 120, but every account is L1 by definition | Wrapped formula in `max(1, ...)` + added explanation paragraph. New accounts now always display L1 even before earning XP. | §2.1 |
| #3 Medium — XP animation vs commit alignment | Docs said XP is not committed mid-session AND showed +10 per correct card. Reader can't tell if those are real or optimistic | Added new §7.7 explicitly modeling optimistic UI (local pendingXp counter + xpEventLog entries) vs deferred commit at session-exit (idempotent via eventId). Premium UX without correctness compromise. | New §7.7 + §7.3 cross-ref + §1.4 rewrite |
| #4 Medium — First-session-of-day fired before qualifying session | +20 bonus could fire on 1 card while §3.1 requires 3 cards for a "session" | Tied +20 to crossing the 3-card threshold, optimistic animation at 3rd card, committed at session-exit. Logic consistent with §3.1 qualifying-session definition. | §1.1 + §7.3 |
| #5 Medium — Pro vs Free matrix didn't reflect base+accelerated caps | Matrix showed flat 15/30, but `LEARNING_EXPERIENCE.md §5.3` accelerates to 20/40 | Matrix now reads "15 base / 20 accelerated" + "30 base / 40 accelerated" with §5.1+§5.3 cross-ref. | §8 matrix |
| #6 Medium — Streak grace needs stored state | §3.5 restores pre-reset value, but streak schema only had `current` — nothing to restore TO | §3.3 schema expanded with `lastResetFrom`, `lastResetAt`, `lastGraceUsed`. §3.5 algorithm rewritten as a deterministic function of those fields with explicit idempotency guarantee. | §3.3 + §3.5 |
| #8 Low — Stale "quadratic 50-level" in relationship section | Top-of-doc relationship paragraph still said quadratic 50-level despite v1.1 flattening to `120 * N^1.8` 100-level | Fixed wording. | Relationship paragraph at top |
| #9 Low — "Daily-cap tracking" stale post-cap-removal | §1.4 still referenced cap tracking even though §1.3 v1.1 removed the cap | Renamed to "Daily XP rollup" for analytics-only purpose, with explicit "not for cap enforcement" callout. | §1.4 |

**Net of v1.3:** 7 GAMIFICATION_DESIGN.md fixes applied (the other 2 of the agent's 9 findings live in LEARNING_EXPERIENCE.md v1.3). The single biggest addition is **§7.7** (Optimistic UI vs committed XP) — this section is load-bearing for L2.13 lesson screen implementation because it specifies exactly what to render mid-session vs what to write to Firestore vs when.

The expanded streak schema (§3.3) is the second-biggest impact — L2.03 must include `lastResetFrom`, `lastResetAt`, `lastGraceUsed` in the user document schema, and L2.16 streak engine implementation must atomically write `lastResetFrom` + `lastResetAt` whenever it resets `current`.

**No new open questions.**

---

## 14. v1.5 changelog — fourth external-agent review applied

Fourth external-agent pass on 2026-06-05 (after v1.4 landed). Found 6 issues: 2 high, 2 medium, 2 low. Findings affecting GAMIFICATION_DESIGN.md:

| External finding | Issue | v1.5 resolution | Section updated |
|---|---|---|---|
| #1 High — xpEventLog client-forgeable | v1.2–v1.4 had server read `in_progress.xpEventLog` and commit XP from it. Client writes that log mid-session → can forge XP → leaderboard inflation (since v1.3 unified all leaderboards to XP-based) | Rewrote §7.7 to make `xpEventLog` **optimistic UI only**. At commit, server discards the client's log and re-grades from `in_progress.itemState` against `content_sets` answers. Server-graded correctness is authoritative; large client-vs-server mismatches log to moderation queue. | §7.7 fully rewritten |
| #2 High — Game-feedback contradiction | §6.5 v1.4 said "client learns correctness only at session end" while §7.7 said client tracks correctness locally. Survival/Duel/Co-op need immediate per-card feedback (existing UX, non-negotiable) — answers must reach client during play. Docs were lying about the threat model | Rewrote §6.5 with honest threat model: client receives prompts AND correct answers in the RPC start response (needed for instant feedback); server re-grades at end RPC. Anti-cheat is **response-time plausibility + server re-grading + nonce + rate limits**, NOT "answers hidden." Acknowledged in-doc that a determined cheater can read answers and fake perfect runs — accepted risk for learning-app leaderboards. Same posture as Duolingo/WaniKani/Quizlet. | §6.5 fully rewritten |
| #3 Medium — Streak settlement race | Cron runs at midnight + 1h; if user plays at 00:30, session handler runs before cron — disagrees about prior-day status. Two paths writing to the same state without coordination | Introduced shared `settleStreakIfNeeded` transaction with idempotency marker `streakSettledThrough`. Both cron and session-handler call it; whichever runs first wins, the other no-ops. Section handler now does: settlement first → then today's increment → then §3.5 grace check. Race-free. | §3.4 |
| #6 Low — "XP cap math" stale | Power-ups section referenced "XP cap math" even though the cap was removed in v1.1 | Reworded to "XP economy math." | §10 |

The other 2 findings (#4 quest doc completion in same transaction, #5 "Not in scope for v1.3" stale wording) live in `LEARNING_EXPERIENCE.md` v1.5 — see its changelog.

**Net of v1.5:** 4 GAMIFICATION_DESIGN.md fixes. The two architecturally-significant ones are §7.7 + §6.5, which together establish the v1.5 **universal server-re-grade rule**: server is the source of truth for correctness across lessons, quests, and games; client is allowed for optimistic display only; XP/leaderboard writes derive solely from server re-grading. The §3.4 race fix is the third meaningful change and feeds directly into L2.16 (streak engine implementation).

**Threat-model honesty disclosure:** v1.5 admits in §6.5 that the anti-cheat posture isn't "answers hidden from client" (impossible to combine with instant feedback) but rather "server re-grades + plausibility checks." A determined cheater who reads `content_sets` answers and submits plausible-timing perfect responses can inflate their own XP/leaderboard standing. Accepted risk for a learning app; mitigations available later if leaderboards expand beyond the L2 beta cohort.

**No new open questions.** Both docs ready for L2.03.

---

## 15. v1.4 changelog — third external-agent review applied

Third external-agent code-review pass on 2026-06-05 (after v1.3 landed). Found 9 issues: 2 high, 4 medium, 3 low. Findings affecting GAMIFICATION_DESIGN.md:

| External finding | Issue | v1.4 resolution | Section updated |
|---|---|---|---|
| #1 High — `game_sessions` answer leak | v1.2/v1.3 stored `itemAnswers` in `game_sessions/{sessionId}` AND allowed client read of own session — Firestore rules are doc-level, so client would get the whole doc including answers | Rewrote §6.5 with explicit RPC-only access model. Client NEVER reads `game_sessions` directly; security rules deny all client reads + writes; all access flows through `api_game_session_start` / `api_game_session_end` Cloud Functions which return sanitized data only. Right answers never leave the server until session-end RPC response. | §6.5 fully rewritten |
| #4 Medium — Resume XP display contradiction | §7.7 v1.3 said pending XP shown as already-committed on resume "or it commits when this resumed session itself exits" — the "or" is wrong, can't be both | Rewrote §7.7 to make pending stay pending on resume: prior session's pending XP entries remain in resumed `in_progress.xpEventLog`, stay displayed as pending in the resumed session UI, commit only when the resumed session itself exits. Dashboard XP doesn't include them until commit. | §7.7 |
| #5 Medium — Game-session vs in-progress commit paths mixed | §6.5 said games use `game_sessions`; §7.7 said session-exit reads `in_progress/{sessionKey}.xpEventLog`. v1.3 conflated the two paths | Split §7.7 into explicit two-path table: in-progress path for lessons + quests (optimistic + deferred commit); game-session path for Survival/Duel/Co-op (no optimistic XP; server commits inside session-end RPC). Game path can't use the optimistic model anyway because client doesn't have correctness signal mid-session. | §7.7 reorganized + §6.5 cross-ref |
| #6 Medium — Streak reset cron omits rollback fields | §3.3 said reset MUST write `lastResetFrom` + `lastResetAt`, but §3.4 cron bullet only said reset `current` to 0 | Updated §3.4 cron bullet to be explicit: reset is an atomic 3-field write (`lastResetFrom = old current`, `lastResetAt = today`, `current = 0`). Without this, §3.5 grace can't fire. | §3.4 |
| #7 Low/Medium — Retry XP unclear for quests | §1.1 retry XP row said "within same lesson"; LEARNING_EXPERIENCE.md says quests can also have retries | Updated wording to "within same lesson or quest session" + added explicit note that game sessions (Survival/Duel/Co-op) don't have retries — those are single-attempt per item. | §1.1 retry row |
| #8 Low — Stale 15 Free / 30 Pro caps + stale §6.4 reference | §1.3 still listed flat 15/30 caps and referenced §6.4 (which is now §6.5) and "session signatures" (which were replaced by server-authoritative sessions in v1.2) | Updated §1.3 to "15 base / 20 accelerated (Free), 30 base / 40 accelerated (Pro)" per §5.1+§5.3 cross-ref. Fixed §6.4 → §6.5. Removed stale signature wording, replaced with server-authoritative summary. | §1.3 |

**Net of v1.4:** 6 GAMIFICATION_DESIGN.md fixes applied (the other 3 of the agent's 9 findings live in LEARNING_EXPERIENCE.md v1.4). The single biggest fix is **§6.5** — the v1.2/v1.3 design would have leaked `itemAnswers` to the client via doc reads, defeating the entire server-authoritative session premise. v1.4 closes that hole structurally (no client reads, RPC-only access).

The §7.7 split into two commit paths (in-progress for lessons/quests; game-session for games) is the second-biggest impact for L2.03 — schemas must specify both paths' Cloud Function contracts (the in-progress session-exit committer + the `api_game_session_end` grader+committer) as separate but consistent units of work.

**No new open questions.**

---

## 16. v1.6 changelog — fifth external-agent review applied (final review-cycle pass)

Fifth external-agent pass on 2026-06-05. Found 6 issues: 2 high, 3 medium, 1 low. Mostly text-consistency cleanup from my v1.4→v1.5 edits not propagating everywhere. No architectural decisions changed. Findings affecting GAMIFICATION_DESIGN.md:

| External finding | Issue | v1.6 resolution | Section updated |
|---|---|---|---|
| #4 Medium — `streakSettledThrough` race example contradicted itself | §3.4 settlement set `streakSettledThrough = yesterday`, but the race-example sentence said the cron sees `streakSettledThrough = today` | Aligned to "yesterday" throughout (settlement marker = "most recent date settled"). Updated the race-example sentence to read consistently with the transaction step. | §3.4 race example |
| #5 Medium — §1.3 anti-cheat summary still claimed answers held server-side | v1.5 §6.5 was rewritten with the honest threat model, but the §1.3 summary still claimed "client-side score forging is structurally impossible" | Rewrote §1.3 bullet 3 to reflect the honest model: client receives answers for instant feedback, server re-grades + plausibility checks + rate limits, accepted risk for L2 beta scale. | §1.3 |

The other 4 findings (#1 missing userAnswer field in itemState, #2 unconditional completion writes, #3 stale xpEventLog text, #6 stale version references + changelog order) live in `LEARNING_EXPERIENCE.md` v1.6 — see its changelog. Cosmetic note: this doc's changelog sections are not in strict numerical version order (v1.4 closure sits below v1.5 changelog because of how the v1.5 edit was inserted). Not fixing — content is correct, ordering is cosmetic, and the user explicitly warned against scope creep in this pass.

**Net of v1.6:** 2 GAMIFICATION_DESIGN.md fixes. Combined with the 4 LEARNING_EXPERIENCE.md fixes, all 6 fifth-review findings resolved.

**Recommendation: stop the external-review cycle here.** Five passes, ~40 findings total resolved across two docs. Pass 5 found mostly text-consistency leftovers from my own pass-4 edits, not new architecture problems. Diminishing returns are clear. Both docs are L2.03-ready.

**No new open questions.**

---

## 17. v1.6 closure

This doc + `LEARNING_EXPERIENCE.md` v1.6 together satisfy the Phase L2 gate's design-docs precondition, with five external-agent review passes applied. With both approved by project lead, downstream tasks can proceed:

- **L2.03** — finalize `content_sets/*` Firestore schemas in `Tomodachi_Master_Plan.md` (incorporates field requirements surfaced in both design docs, plus the v1.2 `users/{uid}/in_progress/{sessionKey}` schema from `LEARNING_EXPERIENCE.md §6.2`, the v1.4 `game_sessions/{sessionId}` schema from §6.5 of this doc with read-denied + write-denied security rules, the v1.3 expanded `users/{uid}.streak` shape from §3.3, the v1.3 `users/{uid}/committed_events/{eventId}` ledger from §7.7, and the v1.6 `itemState` field additions from `LEARNING_EXPERIENCE.md §6.2` — `userAnswer` + `questionType` per item, needed for server re-grading).
- **L2.04** — build the interactive content authoring CLI tool (`scripts/author_content.js`), aware of the schemas from L2.03 + the audio strategy from `LEARNING_EXPERIENCE.md §7`.
- **L2.05+** — content authoring marathon begins.

After L2.04 + L2.05 land, the gamification engine itself is ready to be built (L2.15-L2.18) since it has both content to attach to + a fully-specified, five-times-externally-reviewed design.
