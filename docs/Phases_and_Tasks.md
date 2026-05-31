# Tomodachi — Phases & Tasks

> Authoritative task list decomposing the launch phases from `Commercialization_Plan.md` §15 into ordered, dependency-aware tasks. Every task has an ID, owner, description, and acceptance criteria. No work begins on a task whose dependencies are not closed.
>
> | | |
> |---|---|
> | **Version** | v1.0 |
> | **Visibility** | TRACKED |
> | **Last updated** | 2026-05-26 |
> | **Governance** | See `PROJECT_RULES.md` §2 (Phases & Task Governance) |

---

## Conventions

### Task IDs

`{Phase}.{NN}` — phase code (e.g., `R1`, `L2`), zero-padded sequence within phase.

Phases:
- **0** — Planning chassis (this planning round)
- **R1** — Rename: HiraQuest → Tomodachi (cosmetic + folder reorg)
- **R2** — Backend migration to new Firebase projects
- **R3** — Custom domain
- **L1** — Landing page + waitlist
- **L2** — Closed beta (N5 content build)
- **L3** — Public free launch
- **L4** — Pro launch
- **L5** — Scale & optimize (ongoing, no fixed end)

### Status values

- `TODO` — not started
- `🔵 IN PROGRESS` — actively worked on
- `BLOCKED` — waiting on a decision or external dependency
- `✅ DONE` — completed; recorded in `Tomodachi_Progress_Log.md`
- `⚠️ DEFERRED` — moved to a future phase or skipped

### Owners

- `Claude` — judgment-needing work (architecture, security, multiplayer, decisions)
- `Codex` — mechanical work (bulk content, translations, scaffolding, fixes)
- `User` — anything requiring the project lead's account access, payment, or manual steps in external tools
- `Mixed` — multi-step work spanning the above (each step's owner specified in description)

### Phase gates

Each phase has a **gate** at the top — the set of conditions that must be true before the phase is considered closed and the next phase can begin.

---

## Phase 0 — Planning chassis

**Gate:** All four planning docs complete; project lead has reviewed and approved.

| ID | Task | Deps | Owner | Status |
|---|---|---|---|---|
| 0.01 | Decide commercialization direction (10 blocks of strategic decisions) | — | Mixed | ✅ DONE |
| 0.02 | Write `Commercialization_Plan.md` (business plan, gitignored) | 0.01 | Claude | ✅ DONE |
| 0.03 | Write `PROJECT_RULES.md` (technical conventions, tracked) | 0.02 | Claude | ✅ DONE |
| 0.04 | Write `CONTENT_GUIDELINES.md` (bilingual writing standards, tracked) | 0.03 | Claude | ✅ DONE |
| 0.05 | Write `Phases_and_Tasks.md` (this doc) | 0.03 | Claude | 🔵 IN PROGRESS |
| 0.06 | Write `Learning_Log.md` stub (scaffold ready for entries) | 0.03 | Claude | ✅ DONE |
| 0.07 | Project lead review of all planning docs; amend or approve | 0.02–0.06 | User | TODO |
| 0.08 | Update memory: capture project rename + brand decisions for future sessions | 0.07 | Claude | TODO |

---

## Phase R1 — Rename: HiraQuest → Tomodachi (cosmetic + folder reorg)

**Gate:** Repo renamed; all visible UI says "Tomodachi"; folder reorg complete; `node --check` passes on all modules; staging deploy verified; prod deploy verified; no Firebase project changes yet.

**Outcome:** Users see "Tomodachi" everywhere except the internal Firebase project ID (which we'll handle in Phase R2). Codebase is in its new modular structure.

### R1.01 — Rename GitHub repository
**Deps:** 0.07
**Owner:** User
**Description:** GitHub repo Settings → General → scroll to "Repository name" → change `hiraquest` → `tomodachi` → Rename. GitHub auto-redirects the old URL. Local clone needs `git remote set-url origin https://github.com/Al-Mo3tasem/tomodachi.git`.
**Acceptance:** `git remote -v` shows new URL; `https://github.com/Al-Mo3tasem/hiraquest` redirects to new repo; GitHub Pages publish URL becomes `al-mo3tasem.github.io/tomodachi/`.

### R1.02 — Update Firebase project display name (cosmetic)
**Deps:** R1.01
**Owner:** User
**Description:** Firebase Console → Project Overview → Project Settings → "Public-facing name" → change to "Tomodachi". Project ID stays `hiraquest0` for now (immutable; full migration is Phase R2).
**Acceptance:** Firebase console shows "Tomodachi" as the project name everywhere it's displayed.

### R1.03 — Rename master plan and progress log files
**Deps:** R1.01
**Owner:** Claude
**Description:** `git mv HiraQuest_Master_Plan.md Tomodachi_Master_Plan.md`; `git mv HiraQuest_Progress_Log.md Tomodachi_Progress_Log.md`. Update `.gitignore` to swap the old master plan entry for the new name (already done — verify). Add gitignore entry for the new master plan name.
**Acceptance:** Files renamed; `.gitignore` correct; git history preserved (verify with `git log --follow`).

### R1.04 — Reorganize `js/` folder into subdirectories
**Deps:** R1.01
**Owner:** Claude
**Description:** Move existing flat `js/` files into the structure defined in `PROJECT_RULES.md` §7.1:
- `js/app.js` → keep at top
- `js/firebase.js` → `js/data/firebase.js`
- `js/core.js` → split into `js/core/ui.js`, `js/core/state.js`, `js/core/utils.js`, `js/core/theme.js`
- `js/game.js` → `js/games/engine.js` (the parametric engine) — Zen/Survival logic extracted into `js/games/zen.js` and `js/games/survival.js`
- `js/duel.js` → `js/games/duel.js`
- `js/coop.js` → `js/games/coop.js`
- `js/leaderboard.js` → `js/data/leaderboards.js`
- `js/audio.js` → split: `js/audio/sfx.js` + `js/audio/tts.js`
- `js/config.js` → `js/config/firebase.js`
- `js/config.template.js` → `js/config/firebase.template.js`
Update all imports. Bump `?v=` cache-busters. `node --check` every module.
**Acceptance:** All imports resolve; `node --check` passes on every module; existing functionality unchanged (smoke test: login, play one zen + survival round, view leaderboard).

### R1.05 — Update all UI strings: "HiraQuest" → "Tomodachi"
**Deps:** R1.04
**Owner:** Codex (find/replace pass) → Claude (review)
**Description:** Grep for "HiraQuest" and "hiraquest" across all `.html`, `.css`, `.js`, `.md` (tracked) files. Replace with "Tomodachi" / "tomodachi" preserving case. Spot-check: `index.html` title, brand block, nav title, loading text, footer (if any). Audio file paths and Firestore project ID are NOT touched in this phase.
**Acceptance:** No occurrence of "HiraQuest" (case-insensitive) in tracked files except in `Tomodachi_Progress_Log.md` historical entries.

### R1.06 — Update favicon to Tomodachi placeholder
**Deps:** R1.05
**Owner:** Claude (svg edit) or User (manual design)
**Description:** Edit `favicon.svg` to reflect Tomodachi branding. Placeholder direction: a stylized 友 character in a clean rounded square. Final logo design is a separate task in Phase L1.
**Acceptance:** Favicon visible in tab; svg validates; loads in Chrome + Safari + Firefox.

### R1.07 — Bump all cache-busters
**Deps:** R1.04, R1.05, R1.06
**Owner:** Claude
**Description:** Update `?v=` query strings on all local imports per `PROJECT_RULES.md` §14. Use today's date: `?v=20260601a`. Verify via grep: no stale version strings remain.
**Acceptance:** Grep for old version strings (`v=20260525`, etc.) returns no results; new strings present on every imported file.

### R1.08 — Update `README.md` to reflect Tomodachi
**Deps:** R1.05
**Owner:** Codex → Claude (review)
**Description:** Currently the README is one line ("# hiraquest"). Expand to a proper README: brand, one-sentence description, link to the deployed site, link to the contributing guidelines (this PROJECT_RULES.md). Bilingual is not required — the README is a public tech-facing doc.
**Acceptance:** README renders cleanly on GitHub; describes Tomodachi; ≤ 200 lines.

### R1.09 — Local smoke test
**Deps:** R1.04, R1.05, R1.07
**Owner:** User
**Description:** Run a local server (`python -m http.server` or VS Code Live Server) from the repo root. Open in a browser. Verify: login works; dashboard loads; Zen mode plays; Survival mode plays; leaderboard loads; settings screen opens; no console errors. Tests both EN UI rendering (AR not yet enabled).
**Acceptance:** No console errors; all flows work end-to-end.

### R1.10 — Push to main (production deploy)
**Deps:** R1.09
**Owner:** User
**Description:** Commit changes per `PROJECT_RULES.md` §22 release checklist. Push to `main`. GitHub Pages auto-deploys.
**Acceptance:** New deploy live at `al-mo3tasem.github.io/tomodachi/`; old URL redirects; existing users can still log in (data unchanged — same Firebase project).

### R1.11 — Production smoke test + log Phase R1 completion
**Deps:** R1.10
**Owner:** User → Claude (logs)
**Description:** Test the production site end-to-end. Record completion in `Tomodachi_Progress_Log.md` per `PROJECT_RULES.md` §2.4. Add Learning Log entry covering the folder reorganization (what new structure means, why we split it that way, tradeoffs).
**Acceptance:** Progress Log entry written; Learning Log entry written.

### R1.12 — Rename local directory path (deferred from in-session execution)
**Deps:** R1.11
**Owner:** User (closes VS Code) → Claude (rename via Bash + updates path references)
**Description:** Rename the local directory `d:\MO3 LAP\MyProjects\hiraquest\hiraquest\` to `d:\MO3 LAP\MyProjects\tomodachi\` (flatten — the outer `hiraquest/` folder is a useless wrapper containing only the project; siblings like Byte+, ExerciseDetection sit at `MyProjects/` level).

**Why this is its own task (deferred from R1.04):** Claude Code chat is folder-bound. Closing VS Code mid-rename would kill the session containing the R1 work-in-progress. Doing this *after* R1.11 closes means the work is committed, pushed, verified, and a fresh Claude session can pick up via the memory file + tracked docs without context loss.

**Step-by-step (for the future fresh Claude session):**
1. User closes VS Code completely (File → Close Folder won't release the OS file handle reliably; full close is safer).
2. User opens PowerShell (or Explorer) outside the project: `cd "d:\MO3 LAP\MyProjects"`
3. Verify nothing else has the folder open (`hiraquest`): if locked, kill the holding process.
4. Rename via PowerShell: `Move-Item hiraquest\hiraquest tomodachi` then `Remove-Item hiraquest` (the now-empty wrapper).
5. User opens VS Code at `d:\MO3 LAP\MyProjects\tomodachi\` (File → Open Folder).
6. User launches a fresh Claude Code session there.
7. New Claude session reads the memory file (`tomodachi-commercialization.md`) and the tracked planning docs to orient.
8. New Claude updates path references:
   - `PROJECT_RULES.md` §4.2 — remove the "will become" caveat, lock new path
   - `tomodachi-commercialization.md` (memory) — update path mention
   - `hiraquest-deploy-workflow.md` (memory) — update path mention; consider renaming the memory file itself to `tomodachi-deploy-workflow.md`
9. Commit the path updates to main: `git commit -m "chore: update path references to renamed local directory"`

**Acceptance:** Working tree path is `d:\MO3 LAP\MyProjects\tomodachi\`; all doc path references updated; new Claude session works with the new path; Progress Log entry added.

---

## Phase R2 — Backend migration: 3 Firebase projects + Cloudflare Pages staging

**Gate:** Three Firebase projects (`tomodachi-dev`, `tomodachi-staging`, `tomodachi-prod`) operational; existing `hiraquest0` data migrated to `tomodachi-prod`; Cloudflare Pages serving staging URL; config switching loader works in all three environments; `hiraquest0` decommissioned.

**Outcome:** Clean three-environment topology. Project IDs no longer surface anywhere ugly.

### R2.01 — Create `tomodachi-dev` Firebase project
**Deps:** R1.11
**Owner:** User → Claude (config wiring)
**Description:** Firebase Console → Add project → name "Tomodachi Dev" → ID `tomodachi-dev`. Enable Authentication (email/password), Firestore, Cloud Functions, Cloud Storage. Note the config object (apiKey, etc.). Add domain `localhost` to authorized domains.
**Acceptance:** Project visible in Firebase Console; config object captured.

### R2.02 — Create `tomodachi-staging` Firebase project
**Deps:** R1.11
**Owner:** User → Claude (config wiring)
**Description:** Same as R2.01, ID `tomodachi-staging`. Add `*.pages.dev` and (later) `staging.tomodachi.com` to authorized domains.
**Acceptance:** As R2.01.

### R2.03 — Create `tomodachi-prod` Firebase project
**Deps:** R1.11
**Owner:** User → Claude (config wiring)
**Description:** Same as R2.01, ID `tomodachi-prod`. Add `al-mo3tasem.github.io` and (later) `tomodachi.com` to authorized domains.
**Acceptance:** As R2.01.

### R2.04 — Implement config switching loader
**Deps:** R2.01, R2.02, R2.03
**Owner:** Claude
**Description:** Implement `js/config/firebase.js` per `PROJECT_RULES.md` §6.2 — hostname-based selector returning the right config object. Update `js/data/firebase.js` to use it. Verify each environment returns the correct config.
**Acceptance:** Loading the app on `localhost` → dev project; on `*.pages.dev` → staging; on github.io → prod. Verified by console-logging the project ID on each.

### R2.05 — Apply hardened Firestore security rules to all 3 environments
**Deps:** R2.04
**Owner:** User (manual paste) → Claude (rule authoring)
**Description:** Claude finalizes the hardened rules from `Firestore_Rules.md` (existing). User pastes into each Firebase Console Rules tab, tests via Rules Playground, publishes. Document the rule set in `Firestore_Rules.md` if it differs from current.
**Acceptance:** Rules active on all 3 projects; basic auth flow works on each.

### R2.06 — Set up Cloudflare Pages for staging branch deploys
**Deps:** R2.02
**Owner:** User → Claude (config notes)
**Description:** Cloudflare Pages → Create project → Connect to GitHub repo `Al-Mo3tasem/tomodachi`. Configure: production branch = `staging` (yes, "production" in CF terminology means the live branch they auto-deploy; we use it for our staging). Build command: none (static site). Output directory: `/`. Custom domain: defer to R3.
**Acceptance:** Pushing a commit to `staging` branch triggers a Cloudflare Pages deploy; the deploy URL works; loads the staging Firebase config.

### R2.07 — Test full 3-environment topology
**Deps:** R2.04, R2.05, R2.06
**Owner:** User
**Description:** Sign up a test user on each environment (dev, staging, prod via current github.io). Verify each test user is created in the correct Firebase project (not bleed-over). Verify Firestore reads/writes work on each.
**Acceptance:** 3 separate test users, one per project; no cross-contamination.

### R2.08 — Export data from `hiraquest0`
**Deps:** R2.07
**Owner:** Claude (gcloud commands) → User (runs commands with their gcloud auth)
**Description:** Run `gcloud firestore export gs://hiraquest0.appspot.com/exports/pre-migration-{date}` from a gcloud-authenticated shell. Verify the export completed in GCS console.
**Acceptance:** Export folder exists in GCS bucket with all collections.

### R2.09 — Import data to `tomodachi-prod`
**Deps:** R2.08
**Owner:** Claude (gcloud commands) → User (runs)
**Description:** First, grant the `tomodachi-prod` service account read access to the `hiraquest0` GCS bucket. Then run `gcloud firestore import gs://hiraquest0.appspot.com/exports/pre-migration-{date} --project=tomodachi-prod`. Verify document counts match between source and dest.
**Acceptance:** Document counts match for every collection (`users`, `game_sessions`, `leaderboards`, `content_sets`).

### R2.10 — Migrate Auth users from `hiraquest0` to `tomodachi-prod`
**Deps:** R2.09
**Owner:** Claude (script) → User (runs)
**Description:** Use Firebase Auth Admin SDK: `firebase auth:export users.json --project=hiraquest0` then `firebase auth:import users.json --project=tomodachi-prod --hash-algo=...`. Password hashes carry over via `--hash-algo` matching `hiraquest0`'s scheme (SCRYPT by default in Firebase).
**Acceptance:** User count matches between source and dest; test login with one existing user against `tomodachi-prod` (via staging URL pointed at prod project for one test).

### R2.11 — Cutover: switch prod config to `tomodachi-prod`
**Deps:** R2.10
**Owner:** Claude → User (push)
**Description:** Update `js/config/firebase.js` so the `prod` branch returns the `tomodachi-prod` config. Bump cache-busters. Push to `staging` first; verify on Cloudflare staging URL (which uses staging Firebase project — confirms loader logic still works). Then push to `main`. The cutover is the moment users start hitting `tomodachi-prod`.
**Acceptance:** Production site now writes to `tomodachi-prod`; verified by checking Firebase Console → Firestore on `tomodachi-prod` showing a recent write.

### R2.12 — 48-hour production soak
**Deps:** R2.11
**Owner:** User (passive monitoring)
**Description:** Watch Sentry (if already integrated) and the Firebase console for any errors. Real users (you + any beta friends) use the app for 48 hours.
**Acceptance:** No critical errors; existing users can still log in; new signups land in `tomodachi-prod`.

### R2.13 — Decommission `hiraquest0`
**Deps:** R2.12
**Owner:** User
**Description:** After 1 week of stable operation on `tomodachi-prod`: Firebase Console → `hiraquest0` → Project Settings → Manage Resources → Delete Project. (Two-week grace period before final deletion — recoverable until then.)
**Acceptance:** `hiraquest0` marked for deletion; no traffic visible on its Firestore in the last 7 days.

### R2.14 — Log Phase R2 completion
**Deps:** R2.13
**Owner:** Claude
**Description:** Progress Log entry summarizing migration; Learning Log entry covering Firestore export/import process, gcloud, multi-project Firebase architecture.
**Acceptance:** Entries written.

---

## Phase R3 — Custom domain

**Gate:** `tomodachi.com` purchased; DNS configured; HTTPS provisioned; production serving from custom domain.

**Note:** This phase happens late — just before public launch (Phase L3). Don't run it during R1/R2.

### R3.01 — Purchase tomodachi.com
**Deps:** L2 nearing completion
**Owner:** User
**Description:** Go to GoDaddy (or Cloudflare's domain marketplace) and purchase tomodachi.com from the aftermarket. Current price ~$19 — verify before paying. After purchase, transfer to Cloudflare Registrar (cheapest renewals + free WHOIS privacy).
**Acceptance:** Domain owned, in Cloudflare account.

### R3.02 — DNS configuration for prod (`tomodachi.com` → GitHub Pages)
**Deps:** R3.01
**Owner:** User → Claude (notes)
**Description:** Add `CNAME` file at repo root containing `tomodachi.com`. In Cloudflare DNS: `A` records for `tomodachi.com` → GitHub Pages IPs (185.199.108.153, 109, 110, 111); `CNAME` for `www` → `al-mo3tasem.github.io`. Wait for SSL provisioning (~30 min). Verify HTTPS works.
**Acceptance:** `https://tomodachi.com` loads the production site; `www.tomodachi.com` redirects.

### R3.03 — DNS for staging (`staging.tomodachi.com` → Cloudflare Pages)
**Deps:** R3.01
**Owner:** User
**Description:** In Cloudflare Pages project settings, add `staging.tomodachi.com` as a custom domain. Cloudflare auto-creates the DNS record.
**Acceptance:** `https://staging.tomodachi.com` loads the staging deploy.

### R3.04 — Update all references and configs to new domain
**Deps:** R3.02, R3.03
**Owner:** Claude → User (Firebase domain auth)
**Description:**
- Firebase Console (all 3 projects) → Authentication → Settings → Authorized domains → add `tomodachi.com` and `staging.tomodachi.com`
- GA4 → property settings → update domain
- Brevo, Resend → verify domain (SPF/DKIM records added to Cloudflare DNS)
- Sentry → update domain whitelist
- Hostname-based loader in `js/config/firebase.js` → add the new domains
- Update `Tomodachi_Master_Plan.md` and `Commercialization_Plan.md` URLs
**Acceptance:** All services recognize the new domain; auth flow works on the custom domain.

### R3.05 — Log Phase R3 completion
**Deps:** R3.04
**Owner:** Claude
**Description:** Progress Log entry; Learning Log entry on domain transfer + DNS + GitHub Pages custom domains.
**Acceptance:** Entries written.

---

## Phase L1 — Landing page + waitlist

**Gate:** Public landing page live in EN + AR with full RTL support; waitlist captures emails to Brevo; visible counter live (with baseline inflation); cookie consent + GA4 working; Sentry capturing; ToS + Privacy Policy published; 50+ initial signups achieved.

**Outcome:** A public face on the brand. Interest captured while the product is still being built.

### L1.01 — i18next setup ✅ DONE 2026-05-28
**Deps:** R2.14 (backend migration done)
**Owner:** Claude
**Description:** Install i18next + i18next-browser-languagedetector via CDN ES module imports. Create `js/i18n/index.js` with init logic. Create `js/i18n/locales/en.json` and `js/i18n/locales/ar.json` with initial keys (auth.*, dashboard.*, common.*). Implement `t(key)` helper. Wire into `js/app.js`. Update all existing UI strings to use translation keys.
**Acceptance:** Toggling locale at runtime updates all UI strings; missing keys log a warning; both languages render.
**Closure:** Landed via i18next 26.3.0 + i18next-browser-languagedetector 8.2.1 via jsdelivr `/+esm`. 124 unique keys in `index.html` (via `data-i18n*` attributes), 54 static `t()` keys in `js/app.js`, full namespace tree in `en.json`. `ar.json` ships with `[AR] <en value>` placeholders pending L1.03's Codex AR pass. EN | AR toggle wired on auth screen + nav. `<html lang>` syncs on `languageChanged`; `<html dir>` is L1.02's job. Outdated `🔒 Only 2 accounts` form note removed in the same pass. See `Tomodachi_Progress_Log.md` 2026-05-28 entry for full detail + Learning Log entry for the i18next decision discussion.

### L1.02 — RTL infrastructure ✅ DONE 2026-05-28
**Deps:** L1.01
**Owner:** Claude
**Description:** Build `js/i18n/rtl.js` that sets `<html dir>` based on locale. Update `css/style.css` to use CSS logical properties (`margin-inline-start` etc.) wherever directional. Add `[dir="rtl"]` overrides for cases logical properties can't cover (icon mirroring). Add Cairo font import for AR text.
**Acceptance:** Switching to AR mirrors the entire layout; icons that should mirror do (chevrons, arrows); icons that shouldn't don't (avatars, kana characters).
**Closure:** Landed. `js/i18n/rtl.js` ships `applyDirection(locale)` wired into `i18n/index.js` init + every `languageChanged` event. 11 of 16 directional CSS properties converted to logical (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start/end`, `border-inline-start`); 2 kept physical by intent (toggle-slider knob — toggles are LTR even in AR UIs; `.duel-player-opp` — in-game, deferred to L2.C). Cairo font via `:lang(ar)` + AR line-height 1.7. Back-button arrow moved from i18n strings to CSS pseudo-element so the glyph flips with direction (← in LTR; → in RTL). `.mode-arrow` flipped via `transform: scaleX(-1)` in RTL. **Also bundled the L1.01-flagged data-i18n-clobbers-runtime-state bug fix** for friend bar + select-screen subtitle/info/start-button: introduced three explicit patterns (A static, B dynamic-translatable, C dynamic-untranslatable) plus a new `onLocaleChange()` hook for Pattern D (parametric interpolated strings like `Welcome back, {{name}}`). See `Tomodachi_Progress_Log.md` 2026-05-28 entry + Learning Log entry for the three-patterns taxonomy.

### L1.03 — Translate existing UI strings to AR ✅ DONE 2026-05-28
**Deps:** L1.01
**Owner:** Codex (drafts) → Claude (review per `CONTENT_GUIDELINES.md` §7)
**Description:** Codex drafts AR translations for every key in `en.json` per `CONTENT_GUIDELINES.md` §4 (voice) and §5 (dialect — default MSA). Claude reviews every string. Project lead final approval.
**Acceptance:** `ar.json` has every key from `en.json` filled; reviewed; merged.
**Closure:** Codex Spec C run returned a full AR translation of all ~140 keys. §17.3 review found ~85% high quality with 4 specific issues (counter_line tamyiz regression, hero.promise less parallel-authored than current, success_title slightly stiff, duel_btn wrong meaning — see Progress Log entry for details). All 4 fixed via Claude surgical overrides. `ar.json` now ships 214 leaf keys with **zero `[AR] ` placeholders** for the first time since L1.01.

### L1.04 — Landing page hero section (bilingual) ✅ DONE 2026-05-28
**Deps:** L1.02, L1.03
**Owner:** Claude (structure) + Codex (copy drafts) → Claude (review)
**Description:** Replace the existing auth screen as the unauthenticated landing. Hero: brand name, one-line promise, EN/AR toggle, big email field, "Join Waitlist" button. Counter prominent below field. Background: clean, soft, calm (no animations beyond a subtle one-time hero fade).
**Acceptance:** Hero renders correctly in both languages; layout breathes; CTA is obvious.
**Closure:** Landed ahead of L1.03 — the AR-side hero copy was already finalized via the L1.04 Codex Spec B review (Claude-corrected the `شخصًا` tamyiz issue in the counter line; picked v2 AR for the promise per §2.4 parallel-authoring). New `<section id="screen-landing">` is the unauthenticated default; the auth-screen is still fully functional, reachable via the landing-nav's "Sign in" button. Soft radial-gradient background, `clamp()` typography, one-shot 0.6s fade-in animation. Email-form submit stubbed (real Brevo POST is L1.08); counter stubbed at the 350 baseline (real Brevo count overlay is L1.09); both stubs explicitly tagged in code with the task ID that will replace them. 3 new locale keys ship with `[AR] ` placeholders for L1.03 Codex to fill (`hero.sign_in_link`, `auth.back_to_landing`, `toast.waitlist_stub`). See `Tomodachi_Progress_Log.md` 2026-05-28 entry + Learning Log entry on the stub-vs-full pattern.

### L1.05 — Three feature cards (bilingual) 🔵 FRAME DONE 2026-05-28
**Deps:** L1.04
**Owner:** Claude (structure) + Codex (copy drafts) → Claude (review)
**Description:** Three cards below hero: (1) Arabic-first pedagogy, (2) Multiplayer with friends, (3) Calm pace, soft streaks. Each: icon + headline + 1-2 sentence description. Both languages.
**Acceptance:** Cards render in both languages; copy matches voice guidelines.
**Frame status:** HTML + CSS + i18n keys + placeholder EN copy shipped 2026-05-28. Three cards render below the hero, 3-column on desktop, 1-column on tablet/mobile. Hover lift + premium typography per the [[feedback-premium-modern-ux]] memory.
**Closure:** Codex Spec D returned EN + AR copy at premium production quality (~95% per §17.3 review). v1 picks across all three cards integrated into both `en.json` and `ar.json`. Final titles: "Arabic From the Start" / «شرح عربي من الأصل»; "Duels and Co-Op" / «مبارزات وتعاون مع الأصدقاء»; "Pace Without Guilt" / «وتيرة بلا شعور بالذنب». v2 alternates preserved in `scripts/output/codex-d-feature-cards.json` for future reference.

### L1.06 — Screenshots section 🔵 FRAME DONE 2026-05-28
**Deps:** L1.05
**Owner:** User (captures) + Claude (markup)
**Description:** 3-4 product screens showing current state of app: dashboard, duel, lesson preview, leaderboard. Bilingual versions (capture each screen in both EN and AR after L1.03). Optimized (WebP, ~150KB each).
**Acceptance:** Screenshots load on both desktop and mobile; correct language version shown based on toggle.
**Frame status:** Section structure + phone-frame placeholders + i18n keys shipped 2026-05-28. Three phone-frame cards (Dashboard / Duel / Leaderboard) with distinct soft gradients + 友 watermark + premium hover lift. New `screenshots.*` namespace (section_title + section_subtitle, both languages). **Awaiting real screen captures** post-L2 content reseed when the app screens are visually meaningful. Real-image swap is a small content-only commit. See `Tomodachi_Progress_Log.md` 2026-05-28 entry.

### L1.07 — FAQ section ✅ DONE 2026-05-28
**Deps:** L1.05
**Owner:** Codex (drafts) → Claude (review) → User (final approval)
**Description:** 6-8 questions: "When is it launching?", "Is it free?", "Mobile app?", "Why Arabic-first?", "What content levels?", "How is my data handled?", "Pro pricing?", "I'm not an Egyptian Arabic speaker — will it work for me?". Both languages.
**Acceptance:** Renders in both languages; accordion-style expand/collapse works.
**Closure:** Codex Spec A reviewed copy (8 Q&A pairs) integrated under `faq.*` namespace in both locales. Accordion uses native `<details name="faq-group">` — one-at-a-time auto-close with zero JS. Custom +/− marker via `[open]` attribute selector, subtle bordered rows, accent-color shift on open. Premium-modern pattern (Stripe / Linear style). See `Tomodachi_Progress_Log.md` 2026-05-28 entry.

### L1.08 — Email signup → Brevo integration
**Deps:** L1.04
**Owner:** Claude
**Description:** Brevo contact list API integration. On form submit: validate email (basic regex + disposable blocklist per `Commercialization_Plan.md` §5); send POST to Brevo's `/v3/contacts` endpoint with `email`, `attributes` (language preference, signup source). On success, show "Thanks — you're on the list" thank-you state. Double opt-in flow handled by Brevo.
**Acceptance:** Form submission creates contact in Brevo list; double opt-in email sent; thank-you UI shown.

### L1.09 — Visible counter with baseline inflation
**Deps:** L1.08
**Owner:** Claude
**Description:** Counter shows real waitlist count + 350 baseline. Reads count from Brevo (or from a single Firestore doc updated by Cloud Function on each signup — TBD based on Brevo API latency). Updates in real-time when a new signup happens. Caps at 1,000.
**Acceptance:** Counter displays correctly; increments on signup; doesn't exceed 1,000.

### L1.10 — Cookie consent banner (EN + AR) ✅ DONE 2026-05-28
**Deps:** L1.03
**Owner:** Claude
**Description:** Lightweight homemade banner per `PROJECT_RULES.md` §19. Three buttons: Accept All, Reject Non-Essential, Customize. EN + AR copy in i18n files. On Accept: localStorage `consent.{date}` saved (1-year expiry). On Reject: GA4 and Sentry user-context disabled.
**Acceptance:** Banner shows on first visit; clicking Accept sets storage; clicking Reject also sets storage (with `denied` value); banner doesn't reappear within the 1-year window unless user clicks the footer "Cookie Settings" link.
**Closure:** Premium-modern slide-up banner + customize modal landed. Three buttons (Reject Non-Essential / Customize / Accept All), non-blocking, no X close button (GDPR-compliant). Customize modal has Essential always-on + Analytics toggle + Error-monitoring toggle, with Cancel/Save Preferences actions. Decision persists as `{ v, decidedAt, expiresAt, analytics, errorContext }` in `tomodachi-consent` localStorage key with 365-day TTL. Gating consumption (GA4 + Sentry user-context) is L1.11 + L1.14 work — they read `loadConsent().analytics` and `.errorContext` respectively. Footer "Cookie Settings" re-open link deferred to L1.17 staging deploy when footer ships with ToS/Privacy links from L1.13. See `Tomodachi_Progress_Log.md` 2026-05-28 entry.

### L1.11 — GA4 integration with Consent Mode v2
**Deps:** L1.10
**Owner:** Claude
**Description:** Add GA4 (Google Tag) script. Default consent state: denied (per Consent Mode v2 spec). On user Accept: `gtag('consent', 'update', {ad_storage: 'granted', analytics_storage: 'granted'})`. Define initial events: `page_view`, `waitlist_signup`.
**Acceptance:** GA4 real-time dashboard shows page views after consent granted; no events fire before consent.

### L1.12 — SEO baseline
**Deps:** L1.04
**Owner:** Claude
**Description:** Per `Commercialization_Plan.md` §9 SEO section: per-page `<title>`, `<meta description>`, OG/Twitter card tags, JSON-LD `Course` + `EducationalOrganization` schema, `sitemap.xml`, `robots.txt`, `hreflang` alternate links. EN + AR variants. Brand image OG card.
**Acceptance:** Google's Rich Results Test passes; social card preview works on Twitter/Facebook OG debugger.

### L1.13 — ToS + Privacy Policy + Cookie Policy
**Deps:** L1.10
**Owner:** User (Termly generation) → Claude (customization) → User (review)
**Description:** Per `PROJECT_RULES.md` §19 and `Commercialization_Plan.md` §8: generate baseline policies via Termly free tier. Claude customizes for our specifics. Author the AR version per `CONTENT_GUIDELINES.md`. Publish at `/privacy.html`, `/terms.html`, `/cookies.html`.
**Acceptance:** All 3 pages live in both languages; linked from footer.

### L1.14 — Sentry integration
**Deps:** L1.11
**Owner:** Claude → User (Sentry account)
**Description:** Create Sentry project. Add Sentry SDK to `js/analytics/sentry.js`. Configure: project DSN, release version (from a constant or build script), source maps upload on deploy. Initialize after consent granted (anonymized) or after login (with user context).
**Acceptance:** Sentry captures a test error; user context attached after login; source maps work in error stack traces.

### L1.15 — Logo and brand identity refinement
**Deps:** L1.04
**Owner:** User (design choice) → Claude (implementation)
**Description:** The favicon placeholder from R1.06 needs a real Tomodachi logo. Options: hire a designer (Mostaql/Fiverr ~$50-100) OR craft a simple wordmark + 友 lock-up ourselves. Lock the choice; produce logo assets (SVG + 32px + 192px + 512px PNG for PWA).
**Acceptance:** Logo files in `assets/brand/`; favicon, PWA icons, OG image all use the consistent logo.

### L1.16 — PWA install manifest
**Deps:** L1.15
**Owner:** Claude
**Description:** Create `manifest.json` with name, short_name, icons (PWA sizes), theme_color, background_color, display: "standalone". Link from `index.html`. Add install banner trigger (Chrome's `beforeinstallprompt`). Online-only — no service worker yet (full offline is deferred per `Commercialization_Plan.md` §11).
**Acceptance:** Chrome's Application tab shows valid manifest; install banner appears after engagement criteria met.

### L1.17 — Deploy landing to staging, then prod
**Deps:** L1.06–L1.16
**Owner:** User
**Description:** Per release checklist (`PROJECT_RULES.md` §22). Push to `staging`, soak 24h, promote to `main`.
**Acceptance:** Landing page live on production; signups capture into Brevo; counter live.

### L1.18 — Seed first 50 waitlist signups
**Deps:** L1.17
**Owner:** User
**Description:** Share landing URL with personal network (friends, family, your existing channels) to capture initial 50 signups. This validates the funnel + provides social proof for later marketing.
**Acceptance:** 50 confirmed (double-opted-in) emails in Brevo list.

### L1.19 — Refactor `saveProfileSettings` to use `usernames/` atomic lock ✅ DONE 2026-05-28
**Deps:** R2.05
**Owner:** Claude
**Description:** Bring the username-change path in `js/app.js` (`saveProfileSettings`) onto the same atomicity pattern that R2.05 established for the signup flow. Currently the function uses `query(collection(db, 'users'), where('username', '==', ...))` to check uniqueness — race-vulnerable when two users try to claim the same new username simultaneously. Refactor to: (1) create the new `usernames/{newLower}` doc as the atomic lock (relies on the R2.05 `allow create` rule); (2) delete the old `usernames/{oldLower}` doc; (3) update `users/{uid}.username`. ~30 LOC. Pattern matches the R2.05 signup flow refactor; reuse the same error-mapping idiom (`permission-denied` → "Username already taken").
**Acceptance:** Username change in Settings uses the atomic pattern; `node --check` passes; race-test (two browser tabs racing on the same target username) shows one succeeds and one gets "Username already taken."
**Closure:** Landed. Atomic pattern via `setDoc(usernames/{newLower}, {uid, createdAt})` mirrors `handleRegister`. Display-name-only fast path skips the usernames juggle. Failure between gate-claim and `users/` write triggers a synchronous rollback (`claimedNewUsername` flag) — distinct from L1.20's prevent-the-race pattern because there's no in-process listener competing here, only cross-window writers resolved by Firestore's create-semantics atomicity. Project lead's two-window race-test (step 5 of L1.19 test plan) confirmed: one window wins, one gets "Username already taken", Firestore state matches. See `Tomodachi_Progress_Log.md` 2026-05-28 entry + Learning Log entry on the in-process-vs-cross-window distinction.

### L1.20 — Make `ensureUserProfile` honor R2.05's `usernames/` invariant
**Deps:** R2.05, R2.06
**Owner:** Claude
**Description:** `js/app.js` `ensureUserProfile` (lines 56-86) was designed pre-R2.05 to self-heal users who have an Auth account but no Firestore profile (e.g., signup that dropped mid-write). R2.05's signup refactor introduced the `usernames/{lower}` uniqueness lock but did NOT update `ensureUserProfile`, leaving two failure modes:
1. **Orphan `users/` docs during a failing signup.** `onAuthStateChanged` fires as soon as `createUserWithEmailAndPassword` succeeds. `ensureUserProfile` runs in the auth-state callback, sees no `users/{uid}` doc, and writes a fallback profile. Meanwhile `handleRegister` may be failing at the `usernames/` write (collision) and calling `cred.user.delete()` to clean up the Auth account. The Auth deletion succeeds but the `users/{uid}` doc that `ensureUserProfile` just wrote stays — Firestore orphan with no Auth backing. **Confirmed empirically during R2.06 Step C testing** — found two orphan `users/` docs on `hiraquest0` with no matching Auth accounts.
2. **Self-heal bypasses uniqueness lock.** When `ensureUserProfile` creates a fallback profile, it derives a username from the email's local part and writes only the `users/{uid}` doc — NOT a corresponding `usernames/{lower}` reservation. A future user could legitimately claim that same username via the R2.05 signup flow, leaving two `users/` docs sharing a username with only one reservation.

Two-part fix:
- **(a)** Extend `handleRegister`'s cleanup path: when the `usernames/` write fails and we're about to delete the Auth account, also `getDoc + deleteDoc` on `users/{uid}` and `stats/{uid}` to remove any docs `ensureUserProfile` may have raced in.
- **(b)** Make `ensureUserProfile` reserve a `usernames/{lower}` doc as part of its self-heal. If the derived username is taken, retry with a numeric suffix (e.g., `alice_2`, `alice_3`). Surface a warning to the user if multiple retries fail.

Pattern matches L1.19's atomicity approach. Estimate ~40 LOC across both functions.
**Acceptance:** Race-test (mock a failing usernames write via a forced collision) leaves zero Firestore orphans. Fresh-user self-heal scenario (auth exists, no `users/`) creates both `users/{uid}` AND `usernames/{lower}` consistently.

### L1.21 — Log Phase L1 completion
**Deps:** L1.20
**Owner:** Claude
**Description:** Progress Log entry; Learning Log entries covering i18next, RTL CSS logical properties, Sentry setup, GA4 Consent Mode v2, Cloudflare Pages branch deploys, Brevo API.
**Acceptance:** Entries written.

---

## Phase L2 — Closed beta: design, content, gamification, beta launch

**Gate:** Two design docs (LEARNING_EXPERIENCE.md + GAMIFICATION_DESIGN.md) written and approved before any content/build tasks begin. Full JLPT N5 content authored one-by-one in EN + AR with focused review on each item (kana + ~800 vocab + ~100 kanji + N5 grammar + listening drills). Audio in Firebase Storage with signed-URL gateway. Learn-mode lesson screens built per the design doc. Gamification (quests, streaks, XP/levels, badges, leaderboards) built per the design doc. Bilingual rename complete in all UX. Cloud Function quota monitoring + daily backups deployed. Sentry catching errors. 30-50 invited beta users actively playing.

**Outcome:** A real product. Real users learning. Real feedback. Built on a designed foundation, not improvised.

**Phase L2 sub-blocks:** L2.A design → L2.B content authoring → L2.C build → L2.D beta launch & iterate.

---

### L2.A — Design before building

The user feedback in iteration 1 was clear: gamification depth needs more thought than "ship XP and badges". Both the learning experience and the gamification mechanics get explicit design docs *before* any building begins.

#### L2.01 — Write `LEARNING_EXPERIENCE.md` design doc
**Deps:** L1.21
**Owner:** Claude (drafts) → User (review & amend)
**Description:** A new tracked design doc covering the full learner journey. Must specify:
- **Onboarding flow** — first-time signup → placement (or skip) → first lesson
- **Linear path structure** — exact ordering of topics through N5 (hiragana row order, katakana row order, vocab clustering, kanji ordinal, grammar dependency tree)
- **Mastery model** — what "mastered" means per content type; review triggers; demotion on failure
- **SRS algorithm** — the spaced-repetition logic used for personalized daily quests (intervals, ease factor, item resurrection rules)
- **Difficulty curve** — pacing rules (max new items/day, max review burden, fatigue caps)
- **Mistake handling** — immediate vs deferred correction; retry policy; one-mistake-doesn't-fail-the-lesson logic
- **Audio integration** — when does TTS play automatically vs on tap; pre-loading strategy
- **Lesson page anatomy** — exact sections, in order, for each content type (kana / vocab / kanji / grammar lessons each have different shapes)
- **Quiz question types** — full catalog with examples (glyph→meaning, meaning→glyph, audio→glyph, fill-in-blank, multiple choice, type-in, sentence-ordering, etc.) and which type fires for which mastery state
- **Transition rules** — when "Learn" hands off to "Quiz" and back
- **Empty states** — no friends, no quests, no streak, lesson locked, content not yet loaded
- **Accessibility notes** — colorblind safety, font-size considerations, motion-reduce behavior (AR/EN only per scope; broader a11y deferred per Commercialization_Plan.md §11)
**Acceptance:** `LEARNING_EXPERIENCE.md` v1.0 committed (tracked); project lead reviewed and approved.

#### L2.02 — Write `GAMIFICATION_DESIGN.md` design doc
**Deps:** L1.21
**Owner:** Claude (drafts) → User (review & amend)
**Description:** A new tracked design doc covering the full engagement-mechanics surface. Must specify:
- **XP table** — exact XP awarded for every action (correct answer = X, perfect game = Y, streak day = Z, daily quest complete = W, badge unlock = N, etc.)
- **Level curve** — XP→level formula; total levels; milestone-level rewards if any
- **Badge catalog** — all 20 badges from `Commercialization_Plan.md` §4 fully specified: unlock condition, icon, name (EN+AR), description (EN+AR), order of presentation
- **Streak rules in detail** — exact UTC-offset logic per user TZ; what counts as a "session" (≥3 cards in any mode); freeze trigger (auto-applies at end of missed day); freeze regeneration (1 per calendar month for Free, 3 for Pro); user-facing text on streak counter, at-risk warning, freeze-used confirmation
- **Daily quest algorithm** — exactly how the SRS layer picks the next 3 weakest items; quest framing copy per type; rolled-over-vs-failed quest behavior; quest difficulty curve (a Pro user shouldn't get the same easy quest every day)
- **Reward cadence** — what fires immediately on correct answer vs end of round vs end of session; balance dopamine without numbness
- **Leaderboard scoring** — how leaderboard score relates to XP (same? separate?), how Survival score per-round translates to ranking
- **Pro vs Free gamification difference** — what visibly changes for Pro across XP, badges, quests, streaks, leaderboards (cross-reference the matrix in `Commercialization_Plan.md` §6)
- **Anti-burnout patterns** — when do we stop pushing notifications? When does a streak warning suppress for that night?
- **Power-ups / consumables** — decision: do we have any (e.g., "double XP weekend", "freeze potion") or skip entirely? Default: skip for MVP; revisit at Phase L5
**Acceptance:** `GAMIFICATION_DESIGN.md` v1.0 committed (tracked); project lead reviewed and approved.

#### L2.03 — Content schema finalization
**Deps:** L2.01, L2.02
**Owner:** Claude
**Description:** With both design docs locked, finalize the Firestore `content_sets/*` schemas in `Tomodachi_Master_Plan.md`. Per content type: vocab, kanji, grammar, examples, radicals, listening drills. Write validators in `js/validators/content.js` matching the schema.
**Acceptance:** Schemas documented; validators written; `node --check` passes.

---

### L2.B — Content authoring (one item at a time)

Per `CONTENT_GUIDELINES.md` §2.3: every content item is authored individually, **not** batch-generated. Codex may draft, but each item is reviewed with eyes on before commit. The AR quality moat lives or dies here.

#### L2.04 — Build interactive content authoring tool
**Deps:** L2.03
**Owner:** Claude
**Description:** A small Node CLI tool (`scripts/author_content.js`) that walks one content item at a time. For each item:
1. Show the prompt to the project lead (vocab item, kanji, grammar point pending authoring)
2. Optionally call Codex to draft EN, AR, mnemonics
3. Display the draft side-by-side with input prompts for edits
4. Accept project lead's final EN + AR versions
5. Write the single item to Firestore via Admin SDK
6. Log progress in a local (gitignored) progress JSON

Tool is **interactive**, not batch — each item gets the lead's attention. Output files are T4 (gitignored per `PROJECT_RULES.md` §18.2 — never committed).
**Acceptance:** Tool walks a sample 5-item vocab session end-to-end; each item lands in Firestore; gitignore prevents output files from being committed.

#### L2.05 — Author Hiragana mnemonics & polish
**Deps:** L2.04
**Owner:** User (drives) + Codex (drafts) → Claude (review)
**Description:** Hiragana is already seeded in Firestore but mnemonics may be missing or weak. Walk through all 46 + dakuten + yōon (~70 items) one at a time. Each gets EN mnemonic + AR mnemonic per `CONTENT_GUIDELINES.md` §8.
**Acceptance:** Every hiragana doc has both EN and AR mnemonics meeting the §8 quality bar; reviewed.

#### L2.06 — Author Katakana content
**Deps:** L2.04
**Owner:** User + Codex + Claude (review)
**Description:** All 46 katakana + dakuten + yōon, same structure as hiragana. Authored one-by-one.
**Acceptance:** Katakana set fully in Firestore; reviewed.

#### L2.07 — Author N5 vocabulary (~800 words)
**Deps:** L2.04
**Owner:** User (drives) + Codex (drafts) → Claude (review)
**Description:** Walk the JLPT N5 vocab list using the L2.04 tool. Per item: EN translation + EN usage note + AR translation + AR usage note + example sentence (JA, EN, AR). Each item authored individually per `CONTENT_GUIDELINES.md` §2.3, §9. Realistic pacing: ~50 items/day with proper care = ~16 working days.
**Acceptance:** 800 vocab docs in Firestore; project lead has reviewed each AR string; spot-check by Claude of 50 random docs shows zero MSA violations.

#### L2.08 — Author N5 kanji (~100 kanji)
**Deps:** L2.04
**Owner:** User + Codex + Claude (review)
**Description:** Per kanji: readings, EN+AR meanings, EN meaning_story + AR meaning_story, EN reading_story + AR reading_story (independently authored, NOT translated — per `CONTENT_GUIDELINES.md` §10.5), radicals, stroke count, example vocab. ~100 kanji × deep care = ~10-15 working days.
**Acceptance:** 100 kanji docs; every mnemonic pair reviewed.

#### L2.09 — Author N5 grammar (~50 points)
**Deps:** L2.04
**Owner:** User + Codex + Claude (review)
**Description:** Per grammar point: title (EN+AR), body following §11.2 template (EN+AR independently authored), 2-4 example sentences each with all four fields (JA, romaji, EN, AR) + breakdown. ~50 × deep care = ~8-12 working days.
**Acceptance:** 50 grammar docs; reviewed.

#### L2.10 — Author listening drill bank
**Deps:** L2.07
**Owner:** User + Codex + Claude (review)
**Description:** Standalone audio-prompt drills (different from vocab cards): listener hears a phrase, picks the meaning or matches a kana. ~100 listening items spanning N5 surface area.
**Acceptance:** Listening drills in Firestore; tested in existing audio-prompt game mode.

#### L2.11 — Generate all audio via Azure TTS into Firebase Storage
**Deps:** L2.05–L2.10
**Owner:** User (Azure auth + GCP) + Claude (script)
**Description:** Node script `scripts/generate_audio.js` per `PROJECT_RULES.md` §18.4. Iterates all content docs needing audio, calls Azure TTS, uploads MP3s to Firebase Storage at `audio/{category}/{key}.mp3`. Voices: `ja-JP-NanamiNeural` (primary), `ja-JP-KeitaNeural` (alternate for variety). Output files are gitignored (T4 per §18.2).
**Acceptance:** Every audio_url referenced in Firestore content resolves to a file in Firebase Storage; playback verified via signed URL on sample 20 items.

#### L2.12 — Build Cloud Function audio URL signer
**Deps:** L2.11
**Owner:** Claude
**Description:** Cloud Function `api_get_audio_url(content_key)` per `PROJECT_RULES.md` §18.4. Authenticates the caller, verifies they have access to that content (free vs Pro gating), returns a 1-hour signed URL for the audio file. Client code in `js/audio/tts.js` calls this function and caches signed URLs per content key for the URL lifetime.
**Acceptance:** Authenticated user can play audio; unauthenticated request returns 401; signed URL expires after 1 hour.

---

### L2.C — Build the learn + gamification surface

#### L2.13 — Learn-mode lesson screen
**Deps:** L2.03, L2.05–L2.09 (some content present), L2.12 (audio working)
**Owner:** Claude
**Description:** Build `js/ui/lesson_screen.js` following `LEARNING_EXPERIENCE.md` lesson-page anatomy. Renders any content type per spec, bilingual + RTL, Free linear unlock, Pro free-browse.
**Acceptance:** Lesson screen renders kana, vocab, kanji, grammar; audio plays via signed URL; navigation matches spec.

#### L2.14 — Extend quiz engine for new content types
**Deps:** L2.13
**Owner:** Claude
**Description:** Per `LEARNING_EXPERIENCE.md` quiz question types catalog. Extend the existing parametric engine in `js/games/engine.js`.
**Acceptance:** Each content type has its quiz mode working in both EN and AR UI.

#### L2.15 — SRS layer + daily quest engine
**Deps:** L2.14
**Owner:** Claude
**Description:** Implement the SRS algorithm specified in `LEARNING_EXPERIENCE.md`. Build the scheduled Cloud Function that runs per user at their midnight local TZ, identifies weak items, writes the day's quests to user doc. Dashboard surfaces today's quests.
**Acceptance:** Quests appear daily; algorithm matches the design doc; quest completion grants the specified XP + badge progress.

#### L2.16 — Streak system
**Deps:** L2.15
**Owner:** Claude
**Description:** Implement per `GAMIFICATION_DESIGN.md` streak rules. Streak counter UI, freeze auto-application, midnight rollover Cloud Function, streak-at-risk email trigger via Brevo.
**Acceptance:** Streak visible; freeze auto-applies on miss; at-risk email delivered to test account.

#### L2.17 — XP + levels + badges
**Deps:** L2.15
**Owner:** Claude
**Description:** Implement per `GAMIFICATION_DESIGN.md` XP table + level curve + badge catalog.
**Acceptance:** XP increments per spec; level visible on dashboard + profile; all 20 badges unlock at the specified thresholds.

#### L2.18 — Leaderboard variants (weekly + monthly + all-time + friends-only)
**Deps:** L2.17
**Owner:** Claude
**Description:** Extend `js/data/leaderboards.js` to support `period={weekly,monthly,alltime}`. Scheduled Cloud Functions for resets. UI: bracket tabs + period tabs + friends-only toggle (Pro).
**Acceptance:** All 4 leaderboard views work; reset functions run on schedule.

#### L2.19 — Friend system polish: unfriend + block + report
**Deps:** L2.16
**Owner:** Claude
**Description:** Add unfriend, block (bidirectional invisibility), report (writes to `reports` collection). Admin queue UI deferred to L3; beta uses Firestore console.
**Acceptance:** All 3 buttons functional.

#### L2.20 — Cloud Function: quota monitoring
**Deps:** L2.15
**Owner:** Claude
**Description:** Scheduled daily Cloud Function pulls Firestore usage, emails project lead via Resend at 60%/80%/95% thresholds.
**Acceptance:** Test alert sent (manually triggered with low threshold).

#### L2.21 — Cloud Function: daily backup to GCS
**Deps:** L2.20
**Owner:** Claude → User (GCS bucket setup)
**Description:** Scheduled Cloud Function exports Firestore daily to `gs://tomodachi-backups/{date}`. Lifecycle rule auto-deletes >30 days. Failure email.
**Acceptance:** First backup file appears; lifecycle rule confirmed; failure email tested.

#### L2.22 — Block-list profanity filter on signup
**Deps:** L2.19
**Owner:** Claude → Codex (block list aggregation)
**Description:** Aggregate ~5K terms in EN + AR + JP-romaji from open-source sources. Validate username at signup.
**Acceptance:** Test signups with blocked words rejected; clean usernames pass.

---

### L2.D — Beta launch & iterate

#### L2.23 — Beta invite flow
**Deps:** L2.18–L2.22
**Owner:** Claude → User (sends invites)
**Description:** Brevo email template + one-time access link validated via Cloud Function. User marked `tier: beta` in Firestore.
**Acceptance:** Test invite sent + redeemed end-to-end.

#### L2.24 — Invite first 30-50 beta users
**Deps:** L2.23
**Owner:** User
**Description:** First waitlist batch.
**Acceptance:** 30-50 beta users registered; active within a week.

#### L2.25 — Beta feedback gathering
**Deps:** L2.24
**Owner:** User → Claude (digest)
**Description:** Weekly check-in cycle.
**Acceptance:** 4 weekly summaries collected.

#### L2.26 — Iterate based on feedback
**Deps:** L2.25
**Owner:** Mixed
**Description:** Top 3-5 issues fixed; sub-tasks tracked.
**Acceptance:** Top issues resolved.

#### L2.27 — Log Phase L2 completion
**Deps:** L2.26
**Owner:** Claude
**Description:** Progress Log + Learning Log entries for: i18next + RTL, Azure Speech SDK + Firebase Storage, SRS algorithm design + implementation, Cloud Functions + scheduled jobs, signed URL pattern.
**Acceptance:** Entries written.

---

## Phase L3 — Public free launch

**Gate:** Domain live (Phase R3 complete); registration cap visible counter in place; soft-shutdown UX tested; promo code admin UI built; full EN+AR pass on every page; reports/blocks admin queue UI working; 100+ beta users converted without issue to the public flow.

**Outcome:** Open registrations. Anyone can sign up. Free tier capped at ~1000 (with Pro path remaining open longer per `Commercialization_Plan.md` §5).

### High-level tasks (granular breakdown to be filled in when this phase nears)

- L3.01 — Phase R3 (custom domain) completion as prerequisite
- L3.02 — Soft-shutdown UX implementation (capacity message + Pro signup path)
- L3.03 — Backend cap enforcement (Cloud Function gating signups beyond 1K real users)
- L3.04 — Admin UI for reports queue + ban actions
- L3.05 — Public-facing site polish (final SEO, performance audit, image optimization)
- L3.06 — Launch announcement (your channels; marketing plan deferred per `Commercialization_Plan.md` §9)
- L3.07 — First-72-hour monitoring rotation (Sentry + quota alerts watched closely)
- L3.08 — Iterate on issues surfaced by public traffic
- L3.09 — Phase L3 completion log

*Detailed task spec: filled in when Phase L2 closes.*

---

## Phase L4 — Pro launch

**Gate:** N4 content complete; payment processor wired (Lemon Squeezy or Paymob); promo code admin UI live; refund flow tested; Pro/Free feature gates implemented; email automation working; first 10 paying Pro users.

**Outcome:** Tomodachi makes money.

### High-level tasks (granular breakdown filled when phase nears)

- L4.01 — Finalize payment processor decision (Lemon Squeezy vs Paymob — see `Commercialization_Plan.md` §5)
- L4.02 — Integrate payment SDK / hosted checkout
- L4.03 — N4 content build (vocab + kanji + grammar + audio)
- L4.04 — Implement Pro/Free feature gate enforcement (the matrix from `Commercialization_Plan.md` §6)
- L4.05 — Promo code admin UI
- L4.06 — Welcome-to-Pro email + renewal reminder + cancellation emails (Resend)
- L4.07 — Refund flow tested end-to-end
- L4.08 — EU-compliant refund waiver checkbox at checkout
- L4.09 — Tax/VAT verified (handled by merchant-of-record if Lemon Squeezy)
- L4.10 — First 10 Pro signups (waitlist + Discord + friends)
- L4.11 — Phase L4 completion log

*Detailed task spec: filled in when Phase L3 closes.*

---

## Phase L5 — Scale & optimize

**Gate:** None (ongoing). Trigger events drive specific work items.

**Outcome:** Tomodachi grows durably.

### Trigger-based work items (no fixed order)

- **Trigger: sustained > 80% Spark quota** → upgrade to Firebase Blaze with budget cap; document migration
- **Trigger: Egyptian revenue > EGP 250K** → register sole proprietorship (منشأة فردية)
- **Trigger: friend-only duel saturation** → design + build public matchmaking with server-side anti-cheat
- **Trigger: support volume > 5 emails/day** → add Crisp or Tawk live chat; expand Discord moderation team
- **Trigger: visible AR-quality complaints** → hire native AR proofreader for full N5+N4 content pass (~$200-500)
- **Trigger: EU user growth** → full a11y audit (WCAG 2.1 AA); cookie banner conformance review
- **Trigger: viral spike** → pre-buy capacity, scale-out plan
- **Ongoing:** N5+N4 content depth (more vocab, more grammar nuances, listening drills, recall reviews)
- **Ongoing:** Engagement A/B testing (notification cadence, quest difficulty curves)
- **Ongoing:** Pro feature expansion based on usage data
- **Ongoing:** Tournaments (Phase L5 only if user demand is loud)
- **Ongoing:** PWA offline mode (deferred from L1)
- **Ongoing:** Native speaker audio premium pack (Pro v2)

---

## Open task ideas / parking lot

> Anything not yet assigned to a phase but worth remembering. When promoted to a phase, the item moves out of this list into the phase's task list.

- Mobile native wrappers (Capacitor / Tauri) — Phase L5+ once PWA proven
- TypeScript migration — `Commercialization_Plan.md` open question; revisit at Phase L4
- Native speaker audio recordings — Pro v2
- Public matchmaking — L5 trigger-based
- Tournaments — L5 trigger-based
- Clubs/guilds — L5 trigger-based
- Korean / Mandarin expansion — explicitly out of scope per `Commercialization_Plan.md` §2 (Japanese-only forever)
- Anki / 3rd-party deck import — speculative, low priority
- Browser extension for vocab lookups while browsing Japanese content — speculative

---

*End of v1.0. Amendments per `PROJECT_RULES.md` §2.6 — proposal, confirmation, update.*
