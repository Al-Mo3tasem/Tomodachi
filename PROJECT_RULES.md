# Tomodachi — Project Rules

> This document defines the rules, standards, and conventions that govern all work on Tomodachi (formerly HiraQuest). It applies to all contributors and to all AI tools (Claude, Codex) used during development. Before proceeding with any implementation, decision, or refactor, consult this document first.
>
> | | |
> |---|---|
> | **Version** | v1.0 |
> | **Status** | Authoritative |
> | **Visibility** | TRACKED in repo (no business secrets — those live in the gitignored `Commercialization_Plan.md`) |
> | **Last updated** | 2026-05-26 |

---

## Table of Contents

1. [Document Authority & Hierarchy](#1-document-authority--hierarchy)
2. [Phases & Task Governance](#2-phases--task-governance)
3. [Change Management](#3-change-management)
4. [Working Directory & Push Origin](#4-working-directory--push-origin)
5. [Configuration & Secrets](#5-configuration--secrets)
6. [Cross-Environment Config Switching](#6-cross-environment-config-switching)
7. [Code Standards](#7-code-standards)
8. [Schemas & Data Contracts (no-Pydantic edition)](#8-schemas--data-contracts-no-pydantic-edition)
9. [Logging & Debugging](#9-logging--debugging)
10. [Code Comments](#10-code-comments)
11. [Bilingual Content Discipline](#11-bilingual-content-discipline)
12. [RTL / LTR Parity](#12-rtl--ltr-parity)
13. [Naming Conventions](#13-naming-conventions)
14. [Cache-Buster Protocol](#14-cache-buster-protocol)
15. [Firestore Security Rules Protocol](#15-firestore-security-rules-protocol)
16. [Free-Tier Quota Awareness](#16-free-tier-quota-awareness)
17. [Codex / Claude Task Split (Enforceable)](#17-codex--claude-task-split-enforceable)
18. [Audio Asset Pipeline](#18-audio-asset-pipeline)
19. [Cookie Consent & GDPR Data Handling](#19-cookie-consent--gdpr-data-handling)
20. [Information Currency](#20-information-currency)
21. [Learning Capture (Learning Log)](#21-learning-capture-learning-log)
22. [Pre-Merge / Release Checklist](#22-pre-merge--release-checklist)

---

## 1. Document Authority & Hierarchy

### 1.1 Core documents

| Document | Purpose | Visibility | Owner |
|---|---|---|---|
| **`Phases_and_Tasks.md`** | What is planned. Authoritative phase + task list with dependencies. | TRACKED | Project lead |
| **`Tomodachi_Progress_Log.md`** *(renamed from `HiraQuest_Progress_Log.md`)* | What was done, how, when. Implementation records. | TRACKED | All contributors (AI + human) |
| **`PROJECT_RULES.md`** *(this document)* | How all work is done. Standards, conventions, governance. | TRACKED | Project lead |
| **`CONTENT_GUIDELINES.md`** | Bilingual writing & translation standards (EN + AR). Kanji mnemonic format. Tone guide. | TRACKED | Project lead + content reviewer |
| **`Learning_Log.md`** | What was learned during execution — technologies, libraries, decisions between alternatives, and why. Teaching artifact for the project lead's skill growth. | TRACKED | All contributors (AI + human) |
| **`Tomodachi_Master_Plan.md`** *(renamed from `HiraQuest_Master_Plan.md`)* | Full game design + architecture. Long-form planning. | **GITIGNORED** (local-only) | Project lead |
| **`Commercialization_Plan.md`** | Business strategy, pricing, capacity, launch sequence. | **GITIGNORED** (local-only) | Project lead |

### 1.2 Rule of precedence

If a conflict exists between a decision in a chat, an inline code comment, or an informal note — and what is written in the core documents — **the core documents win**. Update the documents, never the other way around.

### 1.3 Auto-loading

The tracked documents listed above are deliberately committed so that any tool starting on a fresh clone (Claude session, Codex session, new contributor) can read them and orient itself without needing the user to re-explain context.

---

## 2. Phases & Task Governance

### 2.1 Phases come from the Commercialization Plan

The high-level phase spine is defined in `Commercialization_Plan.md` §15 (Phase L1 landing → L4 Pro launch → L5 scale). The `Phases_and_Tasks.md` document breaks each phase into ordered, dependency-aware tasks.

### 2.2 Following the plan

- All work must follow the tasks defined in `Phases_and_Tasks.md`.
- Tasks within a phase are completed in their defined order unless explicitly independent (no shared inputs, schemas, or upstream outputs).
- A task from a later phase may begin before the current phase fully closes only when **both** are true:
  - The later task has no dependency — data, schema, decision, or upstream artifact — on any open task in the current phase.
  - The parallel start is documented in `Tomodachi_Progress_Log.md` as a `[CHANGE]` entry naming the open tasks and explaining why they don't block the new work.

### 2.3 Starting a task

Before starting any task:

1. Confirm it's the next one in the current phase sequence.
2. Confirm all predecessor tasks are marked complete in the Progress Log.
3. If the task requires a decision that is not yet closed, **stop and close the decision first**.

### 2.4 Completing a task

When a task is finished:

1. Record completion in `Tomodachi_Progress_Log.md` **immediately** — not at the end of the phase.
2. If in progress, log as `🔵 IN PROGRESS` until fully done.
3. Include: what was done, how, decisions made during execution, open items that emerged.
4. Return to `Phases_and_Tasks.md` and confirm the entry still reflects reality. If not, update it.
5. Add the relevant Learning Log entry (see §21).

### 2.5 Completing a phase

When all tasks in a phase are complete:

1. Full review of `Phases_and_Tasks.md` entries for that phase — confirm every task reflects reality.
2. Full review of `Tomodachi_Progress_Log.md` entries for the phase — confirm completions are recorded.
3. Confirm Learning Log entries exist for every task that introduced new tech or made a non-obvious decision.
4. **Only then** move to the next phase.

### 2.6 Adding or removing tasks

Tasks are not added or removed informally. If new work is identified or existing work becomes unnecessary:

1. State the proposed change clearly.
2. Get confirmation from the project lead.
3. Update `Phases_and_Tasks.md` and record the reason in the Progress Log.

---

## 3. Change Management

### 3.1 Any change triggers a documentation review

If anything changes — a design decision, a Firestore field, a function signature, a workflow step:

1. Identify every document, code comment, schema, or Firestore rule that references the changed element.
2. Update each one (or raise the update need explicitly).
3. **No change is considered complete** until all affected references are updated.

This rule applies even if the affected element is from a previous phase that is already complete.

### 3.2 Decision changes

If a previously closed decision is revisited and changed:

1. Document why the decision changed in the Progress Log (short and direct).
2. Update `Commercialization_Plan.md` (if business-facing) or `Tomodachi_Master_Plan.md` (if design-facing).
3. Update `Phases_and_Tasks.md` if scope is affected.
4. Identify and update all downstream artifacts.

### 3.3 Firestore schema changes

If a Firestore document shape changes after data has been written under the old shape:

1. Identify all existing data using the old shape (count via Firestore console or a one-off script).
2. Define and execute the migration **before** continuing new work that depends on the new shape.
3. Update `Firestore_Rules.md` if the rule expressions need to change.
4. Document the migration in the Progress Log with: schema before, schema after, doc count migrated, rollback plan.

### 3.4 Code changes that affect existing modules

When editing existing code:

- Follow the file's existing structure and conventions exactly.
- If you find a violation of these rules in existing code, **note it but don't refactor as a side effect** of your change — open a separate task for the cleanup.
- A bug fix is not a refactor invitation.

---

## 4. Working Directory & Push Origin

### 4.1 Hard constraint

All work — code edits, doc updates, fixture rebuilds, dependency changes, env-var tweaks, commits, and pushes — happens in the **main project working tree**, never inside a `.claude/worktrees/...` subdirectory or any other auxiliary checkout.

### 4.2 Identifying the main project clone

The canonical clone is identifiable by these properties — verify before starting work:

1. `git worktree list` (run from inside the directory) shows that directory as the **first row with `[main]`** branch (no `[claude/...]` annotation).
2. `git remote -v` returns `origin` pointing at the project's GitHub repo URL: `https://github.com/Al-Mo3tasem/Tomodachi`.
3. The directory is NOT located under any `.claude/worktrees/` parent.

Current main project clone path: `d:\MO3 LAP\MyProjects\Tomodachi\`. The absolute path may differ on other machines.

### 4.3 If the current directory fails any check

Stop and switch to the main project directory before doing anything that produces commits, files, or other persistent state.

### 4.4 Worktree posture

Worktrees may exist on disk (Claude Code creates them automatically for some sessions). They are **not deleted**, but they are **not the source of truth** — treat them as scratch.

**Pushes to GitHub originate only from the main project clone**, never from a worktree. PRs may merge worktree branches via the GitHub UI; the local `git push` always runs in the main clone.

### 4.5 Why this rule exists

Past projects have suffered divergent doc/state copies between main clone and a `.claude/worktree`, costing ~30 minutes of reconciliation per incident. This rule prevents that class of incident.

---

## 5. Configuration & Secrets

### 5.1 No behavioral values are hardcoded in logic code

Every threshold, flag, model name, mode switch, or tunable parameter lives in a config file or environment variable. This applies to:

- Firebase project IDs (loaded by env per §6)
- Game tuning constants (Survival starting timer, ramp rate, XP-per-correct, etc.)
- Free vs Pro feature gates (the matrix from `Commercialization_Plan.md` §6 is implemented as a config object, not as `if (user.isPro)` scattered across modules)
- Feature flags
- API endpoints and public keys (private keys go in Cloud Functions only — see §5.3)
- Debug and logging flags (see §9)
- Streak boundaries, freeze count, max friends, daily quest count
- Capacity-related caps (registration cap, target counter baseline)

### 5.2 Public config (`js/config/`)

All client-side config lives in `js/config/` and is divided by purpose:

- `js/config/firebase.js` — Firebase config switching (see §6)
- `js/config/game.js` — gameplay tuning (timers, scoring formula constants)
- `js/config/features.js` — Free vs Pro feature gates (mirrors `Commercialization_Plan.md` §6)
- `js/config/limits.js` — caps, ceilings, baseline offsets
- `js/config/debug.js` — debug flag defaults (overridden by URL params)
- `js/config/i18n.js` — supported locales (`['en', 'ar']`), default, RTL list

### 5.3 Secrets never live in the client

- Firebase **client** config (apiKey, authDomain, projectId, etc.) is technically public but should always be **domain-restricted** in the Firebase console (already done — see `HiraQuest_Progress_Log.md` 2026-05-20 entry).
- Real secrets (Resend API key, Brevo API key, Sentry DSN for server, Stripe/Paymob secret keys, Abstract/Kickbox API keys) live **only in Cloud Functions environment variables**, set via `firebase functions:secrets:set`.
- A `.env.example` at repo root documents the names and purposes of all Cloud Functions secrets without values.

### 5.4 Env-style flag naming

Boolean flags as strings parsed explicitly:

```js
// Good
const debugPipeline = (urlParams.get('debug_pipeline') || localStorage.getItem('DEBUG_PIPELINE')) === 'true';

// Bad
const debugPipeline = !!urlParams.get('debug_pipeline');
```

---

## 6. Cross-Environment Config Switching

### 6.1 Three environments

Dev (local laptop) · Staging (Cloudflare Pages) · Prod (GitHub Pages). Each has its own Firebase project (see `Commercialization_Plan.md` §13).

### 6.2 The loader

`js/config/firebase.js` exports a single `getFirebaseConfig()` function that selects the right config object by hostname:

```js
// js/config/firebase.js
const configs = {
  dev:     { apiKey: '...', projectId: 'tomodachi-dev',     /* ... */ },
  staging: { apiKey: '...', projectId: 'tomodachi-staging', /* ... */ },
  prod:    { apiKey: '...', projectId: 'tomodachi-prod',    /* ... */ },
};

export function getFirebaseConfig() {
  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return configs.dev;
  if (h.endsWith('.pages.dev') || h === 'staging.tomodachi.com') return configs.staging;
  return configs.prod;
}

export function getEnv() {
  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'dev';
  if (h.endsWith('.pages.dev') || h === 'staging.tomodachi.com') return 'staging';
  return 'prod';
}
```

### 6.3 Rules

- **Never hardcode** a Firebase project ID anywhere except in `js/config/firebase.js`.
- All other code reads via `getEnv()` if it needs to know the environment.
- Adding a new env (e.g., `qa`) means updating the loader and adding a new Firebase project — never branching code by string comparison elsewhere.

---

## 7. Code Standards

### 7.1 Folder structure (post-reorganization)

The current flat `js/` folder will be reorganized during Phase R1 (brand rename) into the structure below. All new files land in the new structure; the rename PR moves existing files.

```
js/
├── core/                    # Shared state, UI helpers, utilities
│   ├── state.js             # cross-module state container
│   ├── ui.js                # $, toast, showScreen, modal helpers
│   ├── theme.js             # light/dark, prefers-reduced-motion
│   └── utils.js             # shuffle, clamp, withTimeout, formatTime
├── config/                  # All configuration (see §5)
│   ├── firebase.js          # env loader
│   ├── game.js              # gameplay tuning
│   ├── features.js          # free/Pro gates
│   ├── limits.js            # caps, baseline offsets
│   ├── debug.js             # debug flag defaults
│   └── i18n.js              # locale config
├── data/                    # All Firestore + Auth I/O
│   ├── firebase.js          # SDK init + surface re-exports
│   ├── auth.js              # signup, login, reset, delete account
│   ├── users.js             # user profile CRUD
│   ├── sessions.js          # game_sessions CRUD
│   ├── leaderboards.js      # denormalized leaderboard reads/writes
│   ├── content.js           # content_sets reads (hiragana, katakana, vocab, kanji, grammar)
│   ├── friends.js           # friend invites, list, block/unblock
│   ├── promos.js            # promo code validation
│   └── reports.js           # user reports (admin queue)
├── games/                   # Game modes
│   ├── engine.js            # parametric game engine (shared)
│   ├── zen.js               # Zen Mode
│   ├── survival.js          # Survival Rush
│   ├── duel.js              # Real-time duel (host-authority)
│   └── coop.js              # Co-op sync match
├── ui/                      # Screen-level UI modules
│   ├── auth_screens.js
│   ├── dashboard.js
│   ├── settings.js
│   ├── nav.js
│   ├── profile.js
│   ├── leaderboard_screen.js
│   ├── lesson_screen.js
│   └── admin/               # admin-only screens
│       ├── promo_admin.js
│       └── content_admin.js
├── i18n/                    # Internationalization
│   ├── index.js             # i18next init
│   ├── locales/
│   │   ├── en.json
│   │   └── ar.json
│   └── rtl.js               # RTL detection + dir attribute management
├── audio/                   # Pronunciation + SFX
│   ├── tts.js               # cached file player + Web Speech fallback
│   └── sfx.js               # WebAudio sound effects
├── analytics/               # Observability
│   ├── ga4.js               # Google Analytics 4 + consent
│   ├── sentry.js            # error reporting init
│   └── consent.js           # cookie banner + decision storage
├── validators/              # Runtime validation at boundaries (see §8)
│   ├── user.js              # validateUserDoc(doc) → {ok, errors}
│   ├── session.js
│   └── content.js
└── app.js                   # Entry point — wires modules, no business logic
```

### 7.2 Module files

Each module exports a small, named API. Default exports are avoided — they make grep harder and refactors riskier.

```js
// Good
export function showDashboard() { /* ... */ }
export function refreshStats() { /* ... */ }

// Bad
export default { showDashboard, refreshStats };
```

### 7.3 File header comment

Every JS module begins with a comment block stating **what** the file contains, **why** it exists, and any non-obvious constraints. Empty files are not acceptable.

```js
/**
 * games/duel.js
 *
 * Real-time head-to-head duel mode. Implements host-authority sync over
 * a single Firestore `game_sessions` document. The host generates the
 * question list and is the only client that advances rounds; clients
 * write only their own answers.
 *
 * Idempotency: local scheduling flags + a synchronous `resolvingRound`
 * guard against the snapshot race where two resolves fire before the
 * first write lands. See `Tomodachi_Progress_Log.md` 2026-05-22 entry.
 *
 * Shared with coop.js via the invite system (this module owns the
 * invite modal; coop.js reuses it).
 */
```

### 7.4 JSDoc types on exported functions

Every exported function carries JSDoc covering parameters and return type:

```js
/**
 * Compute the score for a Survival Rush round.
 * @param {object} round
 * @param {number} round.difficulty   Difficulty factor 0.0–1.0
 * @param {number} round.elapsedMs    Time taken to answer in ms
 * @param {number} round.streak       Consecutive correct count
 * @returns {number} Integer score (>=0)
 */
export function computeSurvivalScore(round) { /* ... */ }
```

VS Code reads these and shows inline hints during development. They are not a build-time check — see §8 for runtime validation.

### 7.5 No logic in entry points

`js/app.js` only wires modules together. No game scoring, no Firestore queries, no business logic. Same rule for Cloud Functions index files.

### 7.6 Function standards

- Every function has a single responsibility.
- Function signatures match documentation in `Tomodachi_Master_Plan.md` exactly. Signature changes update the plan first, then the code.

### 7.7 No commented-out code

Dead code is deleted, not commented out. Use git history if something needs preservation.

---

## 8. Schemas & Data Contracts (no-Pydantic edition)

JavaScript has no built-in equivalent of Python's Pydantic, but the principle — **schemas are the contract** — still applies.

### 8.1 Firestore document shapes are the source of truth

Each Firestore collection has a canonical shape documented in `Tomodachi_Master_Plan.md` §Data Model. Any code that reads or writes that collection must conform.

### 8.2 Runtime validators at boundaries

Every Firestore read or write that crosses a module boundary passes through a hand-rolled validator in `js/validators/`. The validator returns `{ ok: true, value }` or `{ ok: false, errors: [...] }`.

```js
// js/validators/user.js
export function validateUserDoc(doc) {
  const errors = [];
  if (typeof doc.username !== 'string' || !/^[a-z0-9_]+$/.test(doc.username)) {
    errors.push('username must be lowercase alphanumeric + underscore');
  }
  if (typeof doc.displayName !== 'string' || doc.displayName.length < 1) {
    errors.push('displayName required');
  }
  // ... more checks
  return errors.length ? { ok: false, errors } : { ok: true, value: doc };
}
```

### 8.3 Where validators run

- **On every Firestore read** at the data-module boundary (in `js/data/*.js`)
- **On every Firestore write** before calling `setDoc`/`updateDoc`
- **On every user input** that flows into a write (forms in `js/ui/*.js`)
- Invalid data is logged via Sentry with context and never propagated downstream as raw

### 8.4 LLM / external API outputs

For any LLM-generated content (Codex translation passes, AI hints) that lands in the app:

- Pass through a validator on import (length, character set, prohibited tokens)
- Never display raw LLM output to users without the validator pass

### 8.5 Schema change discipline

See §3.3. Schema changes require a migration plan documented in the Progress Log before being deployed.

---

## 9. Logging & Debugging

### 9.1 Debug logging controlled by env-style flags

Every significant step (auth flow, game round, Firestore I/O, validation check) has a debug log statement gated by a flag.

### 9.2 Flag naming

Debug flags follow `DEBUG_<COMPONENT>`. Set via URL query string (`?debug_game=true`) or localStorage:

| Flag | Controls |
|---|---|
| `DEBUG_AUTH` | Auth flows (signup, login, password reset) |
| `DEBUG_GAME` | Game engine state, scoring computations |
| `DEBUG_DUEL` | Duel sync events, snapshot diffing |
| `DEBUG_COOP` | Co-op sync events |
| `DEBUG_DATA` | Every Firestore read/write |
| `DEBUG_VALIDATOR` | Validator pass/fail with errors |
| `DEBUG_I18N` | Missing translation key warnings |
| `DEBUG_QUOTA` | Read/write counters this session |

`DEBUG_ALL=true` enables all at once.

### 9.3 Log format

Every debug log includes:

- Component name in brackets
- Step description in plain language
- Relevant data (input/output summary, error message)

```js
// Good
console.debug(`[duel] Resolving round ${roundNum} (host=${isHost}, my answer=${myAnswer})`);

// Bad
console.debug('resolving');
```

### 9.4 Production defaults

In prod, all `DEBUG_*` flags default to `false`. Only `warn` and `error` levels log to console by default. Enabling any debug flag in prod is a deliberate user action (URL param) — never the default.

### 9.5 Sentry captures errors automatically

- Sentry is initialized in `js/analytics/sentry.js` once cookie consent is granted (or always, depending on consent scope — to be decided per the Privacy Policy)
- Caught errors that are recoverable: `Sentry.captureMessage(...)`
- Uncaught errors: Sentry captures automatically via window.onerror
- Source maps uploaded on each prod deploy (release checklist §22)

---

## 10. Code Comments

### 10.1 Comments explain why, not what

The code says what it does. Comments say why a decision was made or what a non-obvious constraint requires.

```js
// Good
// 300ms response-time floor — below this is mechanically impossible
// for a human reader; counts as the anti-cheat baseline from Master Plan §Survival.
if (elapsedMs < 300) elapsedMs = 300;

// Bad
// clamp elapsedMs to 300
if (elapsedMs < 300) elapsedMs = 300;
```

### 10.2 Plain language, developer voice

Comments are clear and direct, as if explaining your own thinking. If a reader would still be confused, rewrite the comment.

### 10.3 Decision references

Any code block implementing a specific project decision references it:

```js
// Free users get 1 freeze/month; Pro 3. See Commercialization_Plan.md §6.
const maxFreezes = isPro ? 3 : 1;
```

### 10.4 No commented-out code

Dead code is deleted. Version control preserves it.

---

## 11. Bilingual Content Discipline

The Arabic-first pedagogy is Tomodachi's primary moat (see `Commercialization_Plan.md` §2). It collapses if the Arabic quality is sloppy.

### 11.1 Every user-facing string exists in both languages

- All UI strings live in `js/i18n/locales/en.json` and `js/i18n/locales/ar.json`
- A missing AR key blocks the merge — the i18n loader logs a warning during dev, and the release checklist (§22) verifies key parity

### 11.2 AR is not translated from EN by default

- Where AR pedagogy needs different framing than EN (idioms, cultural references, grammar explanations leveraging Arabic linguistic intuition), the AR version is **authored**, not translated.
- Where simple parity is fine (button labels, generic toasts), translation is acceptable.

### 11.3 Codex AR drafts require Claude pass

Per the Codex/Claude split (§17), Codex generates first-draft AR translations. **Every AR draft passes through Claude review before merge.** No exception. The review checks:

- Linguistic accuracy
- Tone consistency with the brand voice (calm + capable + culturally respectful)
- Appropriate dialect handling (default to Modern Standard Arabic / فصحى; allow conversational Egyptian only for example sentences in vocab where flagged)

### 11.4 Side-by-side review

The dev workflow includes a screen toggle for AR/EN side-by-side rendering. Every new screen passes a side-by-side visual review before merge.

### 11.5 Quality bar

If the AR is something a native Arabic speaker would visibly notice as machine-translated, it does not ship. The moat collapses on the first viral screenshot of a clunky AR sentence.

---

## 12. RTL / LTR Parity

### 12.1 Direction is data, not magic

The user's locale choice sets `<html dir="rtl">` or `<html dir="ltr">`. All directional CSS uses **logical properties** (`margin-inline-start`, `padding-block-end`, `border-inline-end`, etc.) when supported; physical properties (`margin-left`) only when logical fails.

### 12.2 RTL test on every screen

Every screen is tested in both directions before merge:

- Nav bar layout
- Progress bars and timers (direction of fill)
- Modal positioning
- Game card animations (slide direction)
- Icon mirroring (chevrons, arrows, send-message icons)

### 12.3 Don't mirror what shouldn't mirror

- Brand wordmark, logos, numerals — never mirror
- Emoji, character glyphs (Japanese hiragana/katakana/kanji) — never mirror
- Profile avatars — never mirror

### 12.4 RTL-specific CSS

When logical properties aren't enough, scope by `[dir="rtl"]`:

```css
[dir="rtl"] .chevron-next {
  transform: scaleX(-1);
}
```

---

## 13. Naming Conventions

### 13.1 JS modules

- File names: lowercase, underscore-separated where multi-word: `game_engine.js`, `leaderboard_screen.js`
- Exported function names: camelCase: `computeSurvivalScore`, `validateUserDoc`
- Exported constants: SCREAMING_SNAKE_CASE: `MAX_FRIENDS_FREE`, `STREAK_FREEZE_MONTHLY_FREE`

### 13.2 Firestore collections (existing + planned)

| Collection | Purpose | Status |
|---|---|---|
| `users` | User profiles | Existing |
| `game_sessions` | Audit trail of all games | Existing |
| `leaderboards` | Denormalized top-N (per gameType+bracket) | Existing |
| `content_sets` | Hiragana, katakana, vocab, kanji, grammar | Existing (hiragana seeded) |
| `friends` | Friend relationships | To plan |
| `invites` | Pending duel/co-op invites | Existing (subdoc on users) |
| `reports` | User reports for admin queue | To build |
| `blocks` | User blocks | To build |
| `promo_codes` | Promo codes for admin management | To build (Phase L4) |
| `waitlist` | Email waitlist (if not using Brevo) | Likely NOT used — Brevo is the store |

### 13.3 Status fields

All status fields use values from a single constants module (`js/config/constants.js`). Never typed as raw strings in logic code.

- `game_session.status`: `pending`, `in_progress`, `completed`, `forfeit`, `disconnected`
- `user.status`: `active`, `banned`
- `report.status`: `open`, `reviewed`, `dismissed`, `actioned`
- `promo_code.status`: `active`, `expired`, `disabled`

### 13.4 i18n keys

Hierarchical dot-notation, namespace-prefixed:

- `auth.login.button` — "Sign In" / "تسجيل الدخول"
- `dashboard.greeting.morning` — "Good morning, {{name}}" / "صباح الخير، {{name}}"
- `game.zen.timer.warning` — "10 seconds left" / "10 ثوانٍ متبقية"
- `error.network.timeout` — "Network timed out" / "انتهت مهلة الشبكة"

Namespaces map to module purpose, not to UI sections — so `auth.*` keys are usable in dashboard if needed.

### 13.5 Cloud Function names

- HTTP-triggered: `api_<verb>_<noun>` — `api_get_quota_status`, `api_validate_promo_code`
- Scheduled: `cron_<purpose>` — `cron_daily_backup`, `cron_quota_check`, `cron_reset_weekly_leaderboard`
- Firestore-triggered: `on_<collection>_<action>` — `on_user_create`, `on_session_write`

---

## 14. Cache-Buster Protocol

GitHub Pages serves static files aggressively cached. To guarantee browsers fetch updated files after a deploy:

### 14.1 Every local import has `?v=<version>`

- All `<script src=...>` and `<link href=...>` tags in `index.html`
- All ES module imports in JS (`import { x } from './core/utils.js?v=...'`)

### 14.2 Version format

`YYYYMMDD<letter>` — e.g., `?v=20260601a`. The letter increments on multiple deploys per day.

### 14.3 Bump rule

- **Any change to a tracked JS or CSS file** → bump the version on every consumer of that file
- **A `css/style.css` change** → bump `?v=` on the `<link>` in `index.html`
- **A `js/core/utils.js` change** → bump `?v=` everywhere it's imported (use grep)

### 14.4 Verification

The release checklist (§22) includes "grep for old version strings" as a step.

---

## 15. Firestore Security Rules Protocol

### 15.1 Rules live in `Firestore_Rules.md`

The canonical security ruleset is documented in `Firestore_Rules.md`. Rules edits update the markdown file first, then get pasted into the Firebase Console.

### 15.2 Rule change checklist

When updating Firestore rules:

1. Edit `Firestore_Rules.md` with the new rule block + reasoning
2. Test the new rules in the Firebase Console Rules Playground (simulates reads/writes)
3. Apply via Firebase Console → Firestore → Rules → paste → Publish
4. Verify in a real session — sign in, perform the action the rules govern, confirm it works
5. Commit the doc change with message format: `firestore-rules: <one-line summary>`

### 15.3 Three-environment rule application

When the prod Firebase project changes, **also apply equivalent rules to staging and dev projects.** Different rules across environments cause confusing dev-but-not-prod or vice versa bugs.

### 15.4 No backwards-incompatible rule change without grace period

If a rule change would break an existing client (e.g., requiring a new field):

1. Deploy the new client first (writes the new field on every update)
2. Wait 7 days (data has rolled over)
3. Then deploy the stricter rule

---

## 16. Free-Tier Quota Awareness

The Spark free tier ceilings are documented in `Commercialization_Plan.md` §7: 50K reads/day, 20K writes/day, 1 GB storage.

### 16.1 Every new feature estimates read/write cost

When designing a feature, estimate per-DAU read/write cost in the design notes. Examples:

- Realtime listener on `game_sessions` → ~1 read per write by any session participant
- New "online friends" indicator → could be 5+ extra reads per dashboard load, multiplied by DAU
- Daily quest generation → 1 read + 1 write per user per day

### 16.2 High-write features require batching or rejection

Features that would push us past the 20K writes/day ceiling at expected DAU need:

- Client-side batching (`writeBatch()`)
- Server-side aggregation in Cloud Function
- Or rejection during design review

### 16.3 Denormalize aggregates

Following the existing leaderboard pattern (one doc per bracket holding top N), denormalize any list-of-many-things into a single doc when:

- Reads are far more frequent than writes
- The list size is bounded (e.g., top 10)
- The list updates can be merged into one transaction

### 16.4 Realtime listeners cost reads continuously

A `onSnapshot` listener that stays open is a read per snapshot delivered. For features like "live leaderboard", prefer manual refresh-on-action over realtime, unless realtime is the feature's whole point (duel/co-op are exceptions).

### 16.5 The quota monitor catches what design didn't

The daily Cloud Function (see `Commercialization_Plan.md` §7) emails at 60/80/95% — but it's a safety net, not an excuse for sloppy designs. Treat it as a smoke alarm, not a usage indicator.

---

## 17. Codex / Claude Task Split (Enforceable)

The full split rationale lives in `Commercialization_Plan.md` §16. This section is the enforceable rule.

### 17.1 Codex does

- Bulk content drafts (EN+AR translations, vocab decks, kanji mnemonics, grammar explanations, example sentences)
- UI string translation passes
- README / FAQ / marketing copy first drafts
- Email template drafts
- Test data generation
- Simple component scaffolding **following an existing pattern** in the codebase
- Audio batch scripts (calling Azure TTS)
- Mechanical refactors (rename, simple lint fixes)

### 17.2 Claude does

- Architecture decisions
- Cross-module refactors
- Security-sensitive code (auth, Firestore rules, payments)
- Multiplayer / realtime sync code (host-authority logic)
- Performance optimizations
- Debugging non-trivial bugs
- Plan updates / decision records
- New feature design

### 17.3 Codex output review gates

Codex output is **reviewed by Claude before merge** when it touches:

- Live user data (Firestore writes, Auth flows)
- Bilingual user-facing strings (a subtle AR mistake is reputation damage)
- Firestore security rules or Cloud Functions
- Anything money-related (Pro feature gates, promo codes, payment integration)

Review is recorded in the Progress Log entry for that task.

### 17.4 Boundary conflicts

When a task spans both — e.g., "add a settings screen for promo code admin":

- Claude designs the architecture and writes the security-sensitive code
- Codex generates the boilerplate forms and the AR translations
- The PR/commit message names both contributors

### 17.5 Mechanical / judgment fuzziness

When in doubt → Claude. The cost of Claude doing "too much" is small; the cost of Codex writing security code or subtle AR text is large.

---

## 18. Asset Storage Tiers & Audio Pipeline

### 18.1 The tiering principle

Tomodachi's IP — curated vocabulary lists, original kanji mnemonics, original grammar explanations, original example sentence selections, daily quest algorithms, scoring formulas — is the result of significant invested effort. **What goes to the public repo gets stolen.** Every asset and content type is assigned to a storage tier based on sensitivity and access pattern.

### 18.2 The four storage tiers

| Tier | What lives here | Storage | Access | Examples |
|---|---|---|---|---|
| **T1 — Public repo** | App code, design files, planning docs (tracked), schemas (structure only), brand assets meant to be public | GitHub repo `Al-Mo3tasem/tomodachi` | Everyone | `js/*`, `css/*`, favicon, OG images, README, PROJECT_RULES.md, CONTENT_GUIDELINES.md, Phases_and_Tasks.md, Learning_Log.md |
| **T2 — Auth-gated Firestore** | Curated learning content (vocab, kanji, grammar, examples, mnemonics) in both languages | Firestore collections `content_sets/*` | Authenticated users only (per security rules) | Vocab cards, kanji cards, grammar lessons, example sentences |
| **T3 — Private cloud storage** | Audio assets, image assets used inside lessons, stroke-order SVGs | Firebase Storage with signed URLs (or Cloudflare R2) | Authenticated users only, via short-lived signed URLs from Cloud Function | All pronunciation MP3s, kanji stroke SVGs, lesson illustrations |
| **T4 — Never persisted to repo** | Authoring inputs/outputs, raw content drafts, prompts used with Codex, scratch files | Local disk only (gitignored) | Project lead only | Vocab CSV inputs, GPT prompt drafts, intermediate JSON before Firestore push, business notes |

### 18.3 Mapping rules

- If an asset is **rendered visibly during gameplay** but doesn't contain unique content → could be T1 or T3 — judgment call by IP value
- If an asset **contains original curated content** (any vocab list, any mnemonic, any grammar explanation) → T2 (text) or T3 (audio/images)
- If an asset is **authoring tooling** (scripts, batch generators, prompts) → T1 (the *script* is in repo) but its **input and output content** is T4 (never committed)
- If an asset is **a business artifact** (pricing decisions, capacity numbers, revenue projections) → T4 (gitignored)

### 18.4 Audio pipeline — Tier 3

- **Source:** Azure Cognitive Services TTS (project lead's sponsorship credits). Browser TTS (Web Speech API) is **fallback only**.
- **Generation:** standalone Node script (`scripts/generate_audio.js`) reads content from Firestore via Admin SDK, calls Azure TTS for each new phrase, uploads result to Firebase Storage at `audio/{category}/{key}.mp3`. Script runs on the project lead's machine with privileged credentials; never as part of a deploy.
- **Naming:** `audio/{category}/{key}.mp3` where category ∈ {`hiragana`, `katakana`, `vocab`, `examples`, `grammar_examples`}, key matches the Firestore doc key exactly.
- **Access:** the client never has the raw bucket URL. A Cloud Function `api_get_audio_url(content_key)` returns a signed URL (1-hour TTL) only if the requester is an authenticated user *and* the content key is one they're authorized to see (free tier vs Pro gating happens here).
- **Caching:** browser caches each signed URL's response for the URL's lifetime; on each lesson load, we re-request fresh signed URLs from the Cloud Function. The MP3 itself is cached aggressively by the browser per the URL.
- **Bandwidth budget:** Firebase Storage free tier — 5 GB storage, 1 GB/day egress, 50K daily ops. Audio total ~50-100 MB; ~1500 concurrent users could exceed daily egress. Migrate to Cloudflare R2 (10 GB free + zero egress fees) when egress nears the cap.

### 18.5 Fallback rule for missing audio

If a signed URL request fails (Cloud Function error, network issue), the client falls back to `speechSynthesis.speak()` with `lang='ja-JP'`. Falling back is logged to Sentry as `warn` — every fallback signals a real bug to investigate.

### 18.6 Audio batch generation gitignore

Outputs of `scripts/generate_audio.js` (intermediate `.mp3` files, the audio manifest, any `.wav` source) are **gitignored**. They are uploaded directly to Firebase Storage by the script, never staged in the repo.

### 18.7 Content protection limits (honest disclosure)

T2 (Firestore content) is readable by any authenticated user via their own SDK calls — a determined competitor signing up could in principle bulk-fetch content cards via dev tools. Mitigations:

- **Firestore rules** limit bulk reads (`content_sets` requires `request.auth != null`; consider rate-limiting via Cloud Function gateway later)
- **Cloud Function gateway** (Phase L3+): all content reads go through a server-side function that paginates and rate-limits
- **Watermarking** (post-launch consideration): subtle variations per user that make leaked content identifiable

Accept that *some* extraction risk is unavoidable for a client-rendered app. The realistic moat is brand + execution + ongoing content updates, not absolute IP secrecy.

---

## 19. Cookie Consent & GDPR Data Handling

### 19.1 Consent is required for non-essential cookies

- Essential cookies (Firebase Auth session) load unconditionally
- GA4 fires only after the user clicks Accept on the consent banner
- Sentry's user-tracking features fire only after Accept (errors still capture, but without user context)

### 19.2 Consent storage

The consent decision is stored in localStorage with a 1-year expiry. The banner re-shows after expiry.

### 19.3 Data we log

| Data | Where | Retention | User can delete? |
|---|---|---|---|
| Email + display name + username | Firestore `users` | Until account deletion | Yes — Settings → Delete Account |
| Game session results | Firestore `game_sessions` | 90 days, then auto-purged | Yes — Settings → Reset Progress |
| Leaderboard entry | Firestore `leaderboards` | Until reset or account deletion | Yes — Reset Progress wipes entries |
| GA4 events | Google Analytics | GA4 default retention | Via GA4 user-data-deletion endpoint |
| Sentry error events | Sentry | 30 days on free tier | On request via support form |

### 19.4 User data export

Per GDPR Article 20: a user can request all their data. MVP: handled manually via support form. Post-Pro launch: in-app "Download my data" button generating a JSON file from Firestore.

### 19.5 No tracking pixels on email

Brevo emails use UTM tracking only. No 1×1 invisible pixels for open-tracking. Open rates measured via link clicks instead.

---

## 20. Information Currency

### 20.1 Recommendations rest on current info, not training-cutoff knowledge

The web (Firebase pricing, Cloudflare features, library versions, payment processor policies) changes faster than any AI's training data. Any recommendation that locks in a long-lived choice (dependency, framework, service, pricing tier) is verified against current sources before being made.

### 20.2 What to verify before recommending

- Library versions, maintenance status, deprecation
- Service free-tier limits (Firebase, GitHub Pages, Cloudflare, Brevo, Resend, Sentry)
- API surfaces, model names, pricing
- Best practices and patterns (current vs. legacy)

### 20.3 When to verify

- Anytime locking a long-lived choice (dependency, framework, service)
- Anytime the relevant ecosystem moves fast (Firebase, LLM providers)
- Anytime the project lead references a specific version, deprecation, or release

### 20.4 How to communicate verification

State briefly what was verified and where:

> "Verified via Firebase docs (web search 2026-05-26): Spark plan still 50K reads / 20K writes per day."

This lets the project lead spot when a recommendation rests on assumption.

### 20.5 No stale recommendations

If currency can't be verified — no web access, source unavailable — say so explicitly. Never present old information as current.

---

## 21. Learning Capture (Learning Log)

### 21.1 Purpose

The Learning Log is a teaching artifact for the project lead. Its goal is to grow the project lead's understanding of:

- Technologies, libraries, and frameworks introduced
- Decisions made between competing alternatives, and **why** we picked what we did
- Concepts and terminology that matter for the project
- Tradeoffs accepted

It is **not** a "how to reproduce this code" document. The Master Plan + Progress Log + the code itself cover that. The Learning Log is decision-and-knowledge focused so the project lead develops real skill, not just "vibe coding" instincts.

### 21.2 Mandatory for tasks introducing tech or making decisions

Every task that introduces a new library, framework, service, pattern, or makes a non-obvious choice between alternatives **must** add a Learning Log entry before being marked complete.

Tasks that are pure code (e.g., "fix typo in label", "add another vocab card to the seed list") **do not** need an entry. The bar is "is there something to learn from this task that the project lead would want to remember?"

### 21.3 Entry format

Each entry uses this structure. Omit subsections not applicable to the task; **at least one substantive subsection** must be present.

```markdown
## [Phase X, Task Y] — Task Name
**Date:** YYYY-MM-DD

### Technology / Library Introduced
- **Name** — One-line summary. What problem it solves. Where it sits in our stack.
- **Version locked at:** (e.g., `i18next@23.11.5`)

### What it actually does (plain language)
- 2-4 sentences explaining the library/framework/service in plain language, in the context of how *we* use it.

### Alternatives considered
- **Option A** — what it does, why we didn't pick it (cost, complexity, missing feature, etc.)
- **Option B** — same
- **Option chosen** — and the deciding factor.

### Concepts to understand
- **Term** — Plain-language definition in our project's context.

### Tradeoffs accepted
- What we gave up by this choice, in case we ever need to revisit.

### Useful resources
- Official docs link
- One excellent tutorial or blog if relevant
- Anything the project lead should read to go deeper
```

### 21.4 Quality bar

Each entry should be readable as a standalone explanation of the technology and the decision. A reader (the project lead in 6 months) should be able to learn from the entry without needing the rest of the project context.

### 21.5 Plain language, developer voice

Same voice as code comments (§10.2). No jargon without definition. Analogies welcome.

### 21.6 When to update

- **At task completion** — before marking the task done in the Progress Log
- **Mid-task** — when introducing a new library, capture it before context fades
- **On change** — if a previously written entry becomes inaccurate due to later changes (per §3.1), update the entry as part of the change

### 21.7 Future Considerations & Deferred Improvements

The Learning Log contains a single top-level section titled **Future Considerations & Deferred Improvements**, separate from per-task entries. This is where ideas, optimizations, and improvements that are intentionally deferred to later versions are recorded.

Items belong here when:

- The improvement is real and worth doing eventually, but out of scope for the current task or phase
- A constraint (time, resources, available data, missing dependency) prevented the better solution
- A simpler approach was chosen now with awareness that something more sophisticated may be needed later

Each item includes:

- **Tag** — `[Phase X, Task Y]` or `[General]`
- **Date added** — YYYY-MM-DD
- **Description** — What the improvement is
- **Why deferred** — Constraint
- **Impact if done** — What gets better when addressed

When a deferred item is eventually implemented, mark it as resolved in place (do not delete) and reference the task entry where it was addressed.

### 21.8 Why this differs from the Byte+ project's Learning Log

The Byte+ Learning Log captures code-implementation reproducibility (functions built, pattern applied). Tomodachi's Learning Log captures tech decisions and conceptual growth — because the project lead's stated goal here is **skill growth**, not "be able to reproduce this code line by line."

---

## 22. Pre-Merge / Release Checklist

Before merging anything to `main` (production):

### 22.1 Code

- [ ] `node --check` passes on all changed JS modules
- [ ] No commented-out code (per §10.4)
- [ ] Every changed file has a current header comment (per §7.3)
- [ ] Every new exported function has JSDoc (per §7.4)
- [ ] Any new Firestore read/write goes through a validator (per §8.2)
- [ ] No raw `console.log` left in non-debug code paths (debug uses `console.debug` gated by flags)
- [ ] No hardcoded project IDs or other config that should be in `js/config/*` (per §5.1)

### 22.2 Bilingual

- [ ] Every new user-facing string has both EN and AR keys in `js/i18n/locales/`
- [ ] AR strings reviewed by Claude (if drafted by Codex per §11.3)
- [ ] Side-by-side AR/EN render check on every new screen

### 22.3 RTL

- [ ] Every new screen tested in `dir="rtl"`
- [ ] Directional icons mirror correctly (chevrons, arrows)
- [ ] Game animations slide the correct direction in RTL

### 22.4 Cache-buster

- [ ] `?v=` bumped on changed files in `index.html`
- [ ] `?v=` bumped in ES module imports where the imported file changed
- [ ] Grep confirms no stale version strings

### 22.5 Firestore

- [ ] If schema changed: migration plan documented in Progress Log (per §3.3)
- [ ] If rules changed: `Firestore_Rules.md` updated and rules applied to all 3 environments (per §15.3)

### 22.6 Quota

- [ ] New feature's per-DAU read/write cost estimated and noted (per §16.1)
- [ ] No new realtime listeners without explicit justification (per §16.4)

### 22.7 Observability

- [ ] Sentry source maps uploaded for the new release
- [ ] Any new GA4 events documented (event name, parameters)

### 22.8 Docs

- [ ] `Tomodachi_Progress_Log.md` entry written
- [ ] `Phases_and_Tasks.md` task status updated
- [ ] `Learning_Log.md` entry added if the task introduced new tech or made a non-obvious decision (per §21.2)
- [ ] If a decision was changed, the relevant master doc updated (per §3.2)

### 22.9 Deployment

- [ ] Pushed from the **main project clone**, not a worktree (per §4)
- [ ] Pushed to `staging` first, soaked, then promoted to `main`
- [ ] Post-deploy smoke test: sign in, play one quick game, view dashboard, confirm no errors in console

---

*End of rules v1.0. Amendments require a Progress Log entry recording why the rule changed.*
