# Tomodachi Progress Log

This file records the important implementation, debugging, deployment, and documentation changes for Tomodachi (formerly HiraQuest). Keep entries concise and useful for future debugging.

## Entry Format

```markdown
## YYYY-MM-DD — Short Title
**Status:** 🔵 IN PROGRESS | ✅ DONE | ⚠️ BLOCKED | 🔁 CHANGE
**Scope:** Code | Firebase | GitHub Pages | Docs | Data
**Summary:** What changed and why.
**Files / Areas:** Important files or services touched.
**Verification:** What was checked.
**Open Follow-up:** Anything still unresolved.
```

---

## 2026-05-26 — Phase R1: Rename HiraQuest → Tomodachi + Folder Reorganization
**Status:** ✅ DONE (visual rename verified locally; post-login smoke test deferred to production)
**Scope:** Code | Docs | GitHub
**Summary:** Cosmetic brand rename from "HiraQuest" to "Tomodachi" across the entire codebase, plus reorganization of the flat `js/` folder into subdirectories per `PROJECT_RULES.md` §7.1. No backend changes (Firebase project ID `hiraquest0` stays until Phase R2). Local directory path rename deferred to R1.12 (requires a fresh Claude Code session because of folder-bound chat scoping).

**Files / Areas:**
- **Renames (history preserved via `git mv`):**
  - `HiraQuest_Progress_Log.md` → `Tomodachi_Progress_Log.md`
  - `HiraQuest_Master_Plan.md` → `Tomodachi_Master_Plan.md` (local, gitignored)
  - `js/firebase.js` → `js/data/firebase.js`
  - `js/config.js` → `js/config/firebase.js`
  - `js/config.template.js` → `js/config/firebase.template.js`
  - `js/core.js` → `js/core/core.js`
  - `js/audio.js` → `js/audio/audio.js`
  - `js/leaderboard.js` → `js/data/leaderboards.js`
  - `js/game.js` → `js/games/engine.js`
  - `js/duel.js` → `js/games/duel.js`
  - `js/coop.js` → `js/games/coop.js`
- **Brand strings replaced:** `index.html` (title, loading text, brand block, nav title, settings version), `app.js` (user-facing error & welcome strings, version display), every JS module header comment, `css/style.css` header, `README.md` (full rewrite), `favicon.svg` (gradient id `hq`→`td`, emoji 🏯 replaced with brand kanji 友 in white, font-weight 700).
- **Brand subtitle updated:** "Master Hiragana together" → "Master Japanese, together" (matches `Commercialization_Plan.md` §1; reflects Japanese-only-forever scope, not kana-only).
- **Imports updated:** All 12 cross-module imports across 8 files updated for the new subdirectory paths. Cache busters bumped `?v=20260525` → `?v=20260526a` on all module imports plus `index.html` script/link tags. Favicon cache buster `?v=1` → `?v=2`.
- **localStorage migration (R1.05a):** Lines 7-23 of `js/core/core.js` — one-shot migration that copies `hiraquest-*` keys to `tomodachi-*` on first load. Idempotent; harmless after the first run. Existing users keep their settings (theme, audio toggle, practice mode, win condition, last-bracket, etc.) across the rename.
- **`.gitignore`:** New entry `Tomodachi_Master_Plan.md`. Defensive entries from Phase 0 (audio/, content/, scripts/cache/ etc.) carried forward.

**What was deliberately NOT changed (intentional, documented in code comments):**
- Firebase config values (`projectId: "hiraquest0"`, `authDomain: "hiraquest0.firebaseapp.com"`, `storageBucket: "hiraquest0.firebasestorage.app"`) — Firebase project IDs are immutable. Phase R2 migrates data to fresh `tomodachi-prod`.
- The single remaining `hiraquest-` reference in `js/core/core.js:8` — that's the comment header for the migration code itself, documenting what it migrates.

**Verification:**
- `node --check` passes on all 10 JS modules in their new locations.
- Grep confirms no "HiraQuest" or `hiraquest-*` (lowercase, non-`hiraquest0`) brand strings remain in tracked `.js`/`.html`/`.css`/`.svg` files outside the documented exceptions.
- Visual smoke test on local server — auth screen shows "Tomodachi" brand, subtitle "Master Japanese, together", browser tab shows 友 favicon in white on blue gradient. **PASS.**
- Post-login flow smoke test **deferred** — blocked by two pre-existing app issues (see Open Follow-up below). Same backend code path as production, so testing on production post-deploy is equivalent.

**Splits deferred from R1.04 (intentional):**
PROJECT_RULES.md §7.1 calls for splits: `core.js` → `state.js + ui.js + theme.js + utils.js`; `audio.js` → `tts.js + sfx.js`; `engine.js` → `engine.js + zen.js + survival.js`. For R1, only file *moves* happened (single-file form preserved at new locations). The intra-file splits happen during Phase L2.C when new modules need to import from them — a focused refactor under controlled change.

**Open Follow-up:**
1. **R1.01 (User):** Rename GitHub repo `Al-Mo3tasem/hiraquest` → `Al-Mo3tasem/tomodachi`. Update local remote: `git remote set-url origin https://github.com/Al-Mo3tasem/tomodachi.git`.
2. **R1.02 (User):** Firebase Console → Project Settings → Public-facing name "HiraQuest" → "Tomodachi". (Project ID stays `hiraquest0`.)
3. **R1.11 (User):** Post-deploy production verify at `https://al-mo3tasem.github.io/tomodachi/` (or new custom domain). Verify rename took, sign in, play one round, confirm.
4. **R1.12 (Deferred):** Local directory rename `MyProjects/hiraquest/hiraquest/` → `MyProjects/tomodachi/`. Requires fresh Claude session (folder-bound chat). User has begun by creating the `tomodachi` folder and will copy contents over. New session at the new path reads the memory file + tracked docs and orients.
5. **Pre-existing issue surfaced by R1.09 smoke test (NOT caused by R1):** New-account registration fails with "Missing or insufficient permissions" because the pre-signup `users` collection read happens unauthenticated, and the hardened Firestore rule blocks unauthenticated reads. This is documented in `Firestore_Rules.md` lines 99-106. Workaround per the doc: temporarily relax the `users` read rule, register, restore. **Real fix tracked separately** — to be replaced in Phase L1 by the registration cap system that uses a Cloud Function gateway.
6. **Pre-existing issue:** No in-app "Forgot password" flow. Firebase Auth supports `sendPasswordResetEmail` but the UI doesn't expose it. **Workaround:** reset via Firebase Console → Authentication → Users → ⋮ menu → Reset Password (sends email). **Tracked for Phase L1** (proper authentication UI as part of the landing-page polish).
7. **Splits of core.js / audio.js / engine.js** — to happen during Phase L2.C build under controlled refactor, NOT a goal in itself.

---

## 2026-05-26 — Phase 0: Planning Chassis for Commercialization
**Status:** ✅ DONE
**Scope:** Docs
**Summary:** Major pivot decided — project commercializes as **Tomodachi** (formerly HiraQuest). Established the planning chassis through ~12 rounds of focused decisions across 10 strategic blocks (audience, scope, monetization, hosting/capacity, legal, marketing, trust/safety, accessibility, ops). Locked: bilingual EN+AR from day 1; Japanese-only forever; multiplayer + Arabic-first as moats; freemium subscription with multi-axis Free/Pro split; MENA-first launch (Egypt → Gulf → global); waitlist → closed beta → public free → Pro launch sequence; Firebase + GitHub Pages stack stays; Cloudflare Pages staging; 3 Firebase projects (dev/staging/prod); Azure TTS (sponsorship credits); content/audio storage tiering with audio in Firebase Storage behind signed URLs; pure MSA for all Arabic content; parallel-authored bilingual content (not translated); SEO baseline; Sentry + GA4 + i18next; soft streaks; ~20 milestone badges; personalized daily quests via SRS; friends-only multiplayer (no public matchmaking at MVP); EU 14-day refund.
**Files / Areas:** `Commercialization_Plan.md` (new, gitignored — business plan, ~750 lines), `PROJECT_RULES.md` (new, tracked — 22-section technical conventions including asset storage tiers + Codex/Claude enforceable split + pre-merge checklist), `CONTENT_GUIDELINES.md` (new, tracked — MSA-only AR, parallel-authoring discipline, WaniKani-style bilingual kanji mnemonics with walked-through 人 example), `Phases_and_Tasks.md` (new, tracked — granular task list with IDs, dependencies, owners, acceptance criteria; Phase L2 sub-blocked into A-design / B-content / C-build / D-launch), `Learning_Log.md` (new, tracked — decision-and-knowledge stub for project lead's skill growth), `.gitignore` (defensive entries blocking T4 content/audio from accidental commit).
**Verification:** Project lead reviewed all four planning docs across two iteration rounds; iteration 1 corrected dialect policy to pure-MSA, clarified kanji mnemonic structure, switched audio storage from public repo to Firebase Storage with signed URLs, switched content authoring from batch to one-item-at-a-time pipeline.
**Open Follow-up:** Phase R1 (rename: HiraQuest → Tomodachi + folder reorg) begins next. Memory entry saved at `C:\Users\mouta\.claude\projects\d--\memory\tomodachi-commercialization.md` so future Claude sessions auto-orient on the four planning docs. `Commercialization_Plan.md` and the existing `HiraQuest_Master_Plan.md` (to be renamed `Tomodachi_Master_Plan.md` in R1.03) stay gitignored.

---

## 2026-05-20 — Initial Static App Structure
**Status:** ✅ DONE
**Scope:** Code
**Summary:** Created the base GitHub Pages app structure inside the nested `hiraquest/` folder.
**Files / Areas:** `index.html`, `css/style.css`, `js/config.js`, `js/app.js`.
**Verification:** Confirmed files existed in the expected folder.
**Open Follow-up:** None.

## 2026-05-20 — GitHub Repository Setup
**Status:** ✅ DONE
**Scope:** GitHub Pages / Git
**Summary:** Initialized Git, connected to `Al-Mo3tasem/hiraquest`, merged existing remote history, and pushed the local app.
**Files / Areas:** Git history, remote `origin`.
**Verification:** `main...origin/main` clean after push.
**Open Follow-up:** Global Git ignore warning remains: `C:\Users\mouta/.config/git/ignore` permission denied. It has not blocked work.

## 2026-05-20 — Firebase Config Added
**Status:** 🔁 CHANGE
**Scope:** Firebase / Config
**Summary:** Added Firebase client config to `js/config.js`. Later corrected the Firebase project from `hiraquest` to `hiraquest0` after Firestore rejected the wrong project.
**Files / Areas:** `js/config.js`, `js/config.template.js`, `Firebase SDK Initializatoin.txt`.
**Verification:** App now points to `projectId: "hiraquest0"`.
**Open Follow-up:** Future config changes must bump the `?v=` query version used by `index.html`, `app.js`, and maintenance pages.

## 2026-05-21 — Robust App Event Wiring
**Status:** ✅ DONE
**Scope:** Code
**Summary:** Replaced fragile inline event assumptions with `addEventListener` wiring for auth tabs, auth forms, navigation, mode buttons, settings, and placeholders.
**Files / Areas:** `index.html`, `js/app.js`.
**Verification:** JavaScript syntax checked with `node --check`.
**Open Follow-up:** Phase 2 gameplay screens still need real implementations.

## 2026-05-21 — Config Loading and Cache Fixes
**Status:** ✅ DONE
**Scope:** GitHub Pages / Config
**Summary:** Restored `js/config.js` to tracked deployed files after GitHub Pages returned 404 for it. Added version query strings to force browsers to load corrected config after deployment.
**Files / Areas:** `.gitignore`, `index.html`, `js/app.js`, `js/config.js`.
**Verification:** Confirmed `js/config.js` is tracked and `.gitignore` only ignores root `/config.js`.
**Open Follow-up:** Bump version strings for future config/app deployment changes.

## 2026-05-21 — Database Seed Workflow
**Status:** ✅ DONE
**Scope:** Data / Firebase
**Summary:** Created and temporarily deployed `seed.html` to seed Hiragana `content_sets`. After successful seeding, `seed.html` was removed from GitHub and remains ignored.
**Files / Areas:** `seed.html`, Firestore `content_sets`.
**Verification:** GitHub remote contains the seed deletion commit; `seed.html` is no longer tracked.
**Open Follow-up:** Recreate or force-add seed page only if database maintenance is needed.

## 2026-05-21 — Firestore Connectivity Hardening
**Status:** ✅ DONE
**Scope:** Firebase / Code
**Summary:** Added Firestore long polling, operation timeouts, visible auth/profile errors, and automatic profile/stats repair when Auth exists but Firestore documents are missing.
**Files / Areas:** `js/app.js`.
**Verification:** JavaScript syntax checked with `node --check`; deployment pushed.
**Open Follow-up:** If Firestore errors return, check browser console for whether the project is `hiraquest0` and inspect Firestore rules.

## 2026-05-21 — Profile Editor Added
**Status:** ✅ DONE
**Scope:** Code
**Summary:** Added a Profile section in Settings so users can correct display name and username after earlier Firestore profile creation issues.
**Files / Areas:** `index.html`, `css/style.css`, `js/app.js`.
**Verification:** Rebased on top of the GitHub-side `seed.html` deletion and pushed cleanly.
**Open Follow-up:** Username uniqueness depends on Firestore being reachable.

## 2026-05-21 — Documentation Governance Added
**Status:** ✅ DONE
**Scope:** Docs
**Summary:** Updated the master plan with progress-log rules and aligned the sections affected by recent Firebase/GitHub Pages/profile work.
**Files / Areas:** `HiraQuest_Master_Plan.md`, `HiraQuest_Progress_Log.md`.
**Verification:** Local doc diff reviewed.
**Open Follow-up:** Decide whether `HiraQuest_Master_Plan.md` and `HiraQuest_Progress_Log.md` should be tracked in Git or remain local project documents.

## 2026-05-22 — Code Modularised into ES Modules
**Status:** ✅ DONE
**Scope:** Code
**Summary:** Split the single 839-line `app.js` into focused ES modules so the
growing game code stays maintainable. Firebase init and the SDK surface moved to
`firebase.js`; shared state and UI helpers (`$`, `toast`, `showScreen`,
`setTheme`, `withTimeout`, `shuffle`, `clamp`) moved to `core.js`. `app.js` keeps
auth, presence, dashboard, character select, settings, and event wiring.
**Files / Areas:** `js/firebase.js` (new), `js/core.js` (new), `js/app.js`.
**Verification:** `node --check` passed on every module.
**Open Follow-up:** None.

## 2026-05-22 — Phase 2: Zen Mode & Survival Rush
**Status:** ✅ DONE
**Scope:** Code
**Summary:** Built the game engine (`game.js`) driving two modes from one
parameterised core. Zen Mode: relaxed, looping practice, typing or multiple
choice, optional pronunciation on each card, no timer/lives. Survival Rush:
typing-only, 3 lives, per-question timer starting at 5s and ramping -0.5s every
5 correct (floor 1.5s), Master-Plan scoring formula with difficulty/speed/round
factors, 300ms anti-cheat floor on response time. Added an animated card,
correct/wrong feedback, streak indicator, and a results overlay with score
count-up and confetti on a personal best.
**Files / Areas:** `js/game.js` (new), `js/audio.js` (new), `index.html`,
`css/style.css`.
**Verification:** `node --check` passed; full in-app verification pending on the
live deploy.
**Open Follow-up:** Play-test both modes after deploy; verify Web Speech voices
on the target browser.

## 2026-05-22 — Audio Engine (TTS + Sound Effects)
**Status:** ✅ DONE
**Scope:** Code
**Summary:** Added `audio.js`: Japanese pronunciation via the Web Speech API
(`ja-JP` voice auto-selected once voices load) and lightweight WebAudio sound
effects for correct/wrong/win/lose/start. Both respect the single "Sound &
Pronunciation" settings toggle. Audio context is unlocked on first game start to
satisfy browser autoplay policies.
**Files / Areas:** `js/audio.js` (new), `index.html`, `js/app.js`.
**Verification:** `node --check` passed.
**Open Follow-up:** Japanese TTS availability depends on the OS/browser voice
pack; the manual speaker button degrades gracefully when unsupported.

## 2026-05-22 — Solo Leaderboards
**Status:** ✅ DONE
**Scope:** Code / Data
**Summary:** Implemented `leaderboard.js` with a denormalised strategy — one
document per `survival_{bracket}` holding the top-10 entries, so reads are a
single O(1) fetch that does not slow as history grows. Brackets: 5/10/15/25/46.
Full `game_sessions` records are still written as the audit source of truth.
Added a full leaderboard screen with bracket tabs and a top-3 dashboard preview.
**Files / Areas:** `js/leaderboard.js` (new), `js/game.js`, `index.html`,
`css/style.css`.
**Verification:** `node --check` passed.
**Open Follow-up:** Optionally apply the hardened Firestore rules (see
`Firestore_Rules.md`).

## 2026-05-22 — Design & UX Polish
**Status:** ✅ DONE
**Scope:** Code / Design
**Summary:** Avatar emoji picker in Settings (16 options); dashboard mastery
progress bar and a "mastered N/46" stat; history items moved from inline styles
to CSS classes and now show score + accuracy; "coming soon" tags on Duel/Sync
modes; mode-aware options panel on the character-select screen; segmented input
control; toast accent colours; `prefers-reduced-motion` support; disabled-button
styling (previously missing).
**Files / Areas:** `index.html`, `css/style.css`, `js/app.js`.
**Verification:** `node --check` passed.
**Open Follow-up:** None.

## 2026-05-22 — Firestore Rules Documentation
**Status:** ✅ DONE
**Scope:** Docs / Firebase
**Summary:** Created `Firestore_Rules.md` documenting that the existing broad
catch-all rule already permits Phase 2, plus a recommended hardened ruleset that
scopes each collection and step-by-step console instructions to apply it.
**Files / Areas:** `Firestore_Rules.md` (new).
**Verification:** Rules reviewed against every Firestore call in the codebase.
**Open Follow-up:** User to decide whether to apply the hardened rules.

## 2026-05-22 — Phase 2.1: UX Revision (Expert Pass)
**Status:** ✅ DONE
**Scope:** Code / Design
**Summary:** Reworked Phase 2 from player feedback to be pedagogically sound.
- **Audio is now role-based, not a free setting.** In Reading practice the
  glyph is the prompt and audio is hidden until the answer reveal (no leak —
  previously you could sound-match without reading the hiragana). In the new
  **Listening practice** audio IS the prompt and the player picks the matching
  glyph. Survival stays pure reading.
- **Zen Mode is now a timed practice studio** with a session countdown
  (1/2/3 min) and a Practice toggle (Read / Listen). Every game now has a
  timer (Zen: session countdown; Survival: per-question).
- **Pause/resume:** games freeze cleanly when the tab is hidden (pause overlay)
  or when Settings is opened; Settings "Back" returns to the game and resumes
  it instead of dumping the player on the dashboard.
- **Shuffle is always on** (the toggle was removed — predictable order
  defeats practice).
- **Compact friend bar** replaces the oversized friend card (2-player app).
- **Reset My Progress** added to a Settings "Danger Zone" — type-to-confirm,
  wipes stats, solo game history, and leaderboard entries.
**Files / Areas:** `js/game.js`, `js/app.js`, `js/core.js`, `js/audio.js`,
`js/leaderboard.js`, `js/firebase.js`, `index.html`, `css/style.css`.
**Verification:** `node --check` passed on all modules; CSS braces balanced.
**Open Follow-up:** Apply the updated hardened rules (game_sessions now allows
participants to delete their own sessions, which powers the reset feature).

## 2026-05-22 — Phase 3: Duel Mode (Real-time VS)
**Status:** ✅ DONE
**Scope:** Code / Firebase
**Summary:** Built real-time head-to-head duels over Firestore in a new module,
`duel.js`. Architecture: **host-authority** — the host generates the question
list and is the only client that advances rounds (resolve → reveal → next);
each client writes only its own answer; both render purely from document
snapshots. Idempotency comes from local scheduling flags plus a synchronous
`resolvingRound` guard against the snapshot race where two resolves fire before
the first write lands.
- **Invites:** the host challenge targets the friend by `guestId`; the friend's
  dashboard runs an index-free listener (`where guestId == me`) and shows an
  accept/decline modal. 3-2-1 countdown, then synchronized rounds.
- **Scoring:** first correct +100, second correct +50, wrong −50, timeout 0.
  Win conditions: First-to-10 round wins, or 20 rounds by points.
- **Resilience:** opponent disconnect is caught by presence (→ forfeit win) and
  by a 26s stall watchdog; explicit exit forfeits; rematch is one click.
- Duel results update each player's `duelsWon` / `duelsLost`; the dashboard
  shows a Duel W–L stat and history rows show Won/Lost vs the opponent.
**Files / Areas:** `js/duel.js` (new), `js/app.js`, `js/core.js`,
`js/firebase.js` (deleteDoc/runTransaction surface), `index.html`,
`css/style.css`, `Firestore_Rules.md`.
**Verification:** `node --check` passed on all modules; CSS braces balanced.
Real-time sync needs a two-client play-test on the live deploy.
**Open Follow-up:** Apply the updated hardened rules — `game_sessions` update
now also allows the invited `guestId` to join a duel before being added to
`playerIds`. Phase 4 (Sync Match / Co-op) remains.

## 2026-05-22 — Phase 4: Sync Match (Co-op)
**Status:** ✅ DONE
**Scope:** Code / Firebase
**Summary:** Built real-time cooperative play in a new module, `coop.js`.
Both players see the same card and must each clear it (retries allowed) before
a shared time budget (5s × character count) runs out; the team shares one
score. Architecture mirrors the duel host-authority model — the host generates
the questions, advances a round once both players have cleared it, enforces the
deadline, and ends the match; clients write only their own per-round progress.
- **Scoring** (Master Plan formula): `(CorrectRounds×200 + PerfectRounds×100 +
  TimeBonus) × (CharacterCount/5)`, where a perfect round means neither player
  missed and TimeBonus rewards finishing the card set before the budget.
- **Shared invite system:** the dashboard invite listener (in `duel.js`) now
  matches both `duel` and `coop` sessions and routes accepts to the right
  module; the invite modal and lobby screen are shared.
- **Co-op leaderboard:** `leaderboard.js` generalised to per-(gameType+bracket)
  documents; the full leaderboard screen gained a Survival / Co-op toggle.
  Co-op entries are team entries (both avatars). Reset clears both.
- Dashboard gained a "Co-op Best" stat; co-op runs update `highestCoopScore`.
- Resilience reused from duel: presence-based and stall-watchdog disconnect
  handling; the stall warning now self-dismisses when a snapshot arrives.
**Files / Areas:** `js/coop.js` (new), `js/duel.js`, `js/leaderboard.js`,
`js/app.js`, `js/core.js`, `index.html`, `css/style.css`.
**Verification:** `node --check` passed on all modules; CSS braces balanced.
Real-time co-op needs a two-client play-test on the live deploy.
**Open Follow-up:** No Firestore rule change needed beyond the Phase 3 update
(co-op reuses `game_sessions` + the `guestId` join rule, and `leaderboards`
already allows authenticated writes). Phase 5 (Katakana / Words) remains.
