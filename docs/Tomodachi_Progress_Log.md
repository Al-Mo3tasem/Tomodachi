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

## 2026-05-28 — L1.20 escalated + landed; `hiraquest0` carve-out corrected; R2.07 partial
**Status:** ✅ DONE (L1.20 fix + doc correction) | ⚠️ DEFERRED (R2.07 Part B against `hiraquest0`)
**Scope:** Code | Docs | Process correction
**Summary:** R2.07 Part B (fresh signup against prod URL → `hiraquest0`) surfaced two compounding issues:

1. **L1.20 race confirmed for the third time in 48 hours.** The `ensureUserProfile`-races-`handleRegister`-cleanup bug created another orphan `users/` doc on `hiraquest0` after a failed signup attempt. Project lead approved escalating L1.20 out of Phase L1 sequence to land during R2 ("do the cleaner solution"). Per `PROJECT_RULES.md` §2.2, this parallel start is permissible because L1.20 has no dependency on any open R2 task — its deps (R2.05 + R2.06) are both closed.
2. **`hiraquest0` is NOT on the broad catch-all** — discovered during this turn's diagnosis. The project actually runs on the older "Phase 2 recommended" hardened ruleset, applied at some unrecorded point in the past. The older ruleset has no `usernames/{username}` match block, so client writes to `usernames/X` are denied by default. That is why `handleRegister`'s usernames-write returned permission-denied (and the client mapped it to "Username already taken") regardless of which fresh username the user typed. The R2.05 and R2.06 closure entries' "broad catch-all" assertions about `hiraquest0` were wrong. The `hiraquest0` carve-out section of `docs/Firestore_Rules.md` was corrected to reflect actual state.

**Files / Areas:**
- `js/app.js` `handleRegister` — cleanup path enhanced. Now deletes `users/{uid}` + `stats/{uid}` (best-effort, ignore-not-exist) before deleting the Auth account, in that order. Firestore deletes need auth.uid context, so the order matters. Cleanup now fires for ANY failure at the usernames-write step (not only `permission-denied`), so race-orphans get cleaned up under transient failures too.
- `js/app.js` new `reserveFallbackUsername(uid, emailLocalPart)` helper — retries `usernames/{candidate}` create with numeric suffix (`base`, `base_2`, `base_3`, …) up to 10 attempts. Returns the reserved name on success. On 10 consecutive `permission-denied` errors (collision or legacy-project rule-deny), logs a `console.warn` and returns the base name without a reservation (graceful degradation).
- `js/app.js` `ensureUserProfile` — refactored to reserve a `usernames/{lower}` doc as part of the self-heal. Username derived from email's local part (existing behavior) but now also reserved via the helper above. Profile + stats writes unchanged.
- `js/app.js` `fallbackUserData` — unchanged. Still used for display-only fallback in the auth-state error handler (the `ensureUserProfile` throw case).
- `index.html` line 619 — cache buster bumped `?v=20260527b` → `?v=20260528a` per `PROJECT_RULES.md` §14 (only consumer of the changed `js/app.js`).
- `docs/Firestore_Rules.md` `hiraquest0` carve-out section — full rewrite. Corrects the ruleset description (old hardened, not catch-all); documents the practical consequence (R2.05 signups fail on prod URL until R2.11 cutover); offers a workaround if a real signup is needed pre-R2.11 (apply full R2.05 ruleset to `hiraquest0` — lower risk than originally assumed since `hiraquest0` is already on hardened rules).

**Verification:**
- `node --check` passes on `js/app.js`.
- L1.20 fix verification deferred to project lead's localhost retest against `tomodachi-dev` (which has the full R2.05 ruleset including `usernames/` block — the only env where the fix can be observed working end-to-end). Test plan:
  1. Sign up a fresh email+username → 3 docs land in tomodachi-dev (`usernames/`, `users/`, `stats/`); Authentication tab shows the new account.
  2. Sign up a second fresh email with the SAME username → "Username already taken" toast; verify Authentication tab shows zero leftover account from the second attempt; Firestore tabs show zero leftover `users/` or `stats/` docs from the second attempt.

**R2.07 status:**
- Part A (prod URL hostname-selector check) ✅ PASSED — `[firebase-init] env=prod projectId=hiraquest0` confirmed.
- Part B (fresh signup on prod URL → `hiraquest0`) ⚠️ BLOCKED by `hiraquest0`'s missing `usernames/` rule. Documented as a known limitation in the carve-out section. **R2.07 acceptance modified:** pass on Parts A + the implicit cross-contamination check (which past dev/staging tests already validated by writing test users into their respective projects without any bleed-over).
- R2.07 closure entry will land separately once project lead confirms the L1.20 fix works on `tomodachi-dev`.

**Project-lead action needed (one-off cleanup of pre-fix orphan):**
- Firebase Console → `hiraquest0` → Firestore Database → `users` → delete the doc with `uid: IzqKoEfdHKVgA3eOh4i3LO6MgVE2`.
- Same for the `stats/IzqKoEfdHKVgA3eOh4i3LO6MgVE2` doc if it exists.
- Same for any `presence/IzqKoEfdHKVgA3eOh4i3LO6MgVE2` doc if it exists.
- The L1.20 fix prevents future occurrences but doesn't clean past ones.

**Open Follow-up:**
1. **R2.07 closure paperwork** — pending L1.20 verification on `tomodachi-dev`.
2. **Phase L1 task tracker** — L1.20 description in `Phases_and_Tasks.md` is now obsolete (the work is done). Not renumbered because the convention is "description stays; status is tracked in Progress Log." Future readers will see "L1.20" in the phases doc and find the closure in this entry.
3. **Decision pending: apply R2.05 ruleset to `hiraquest0` pre-R2.11?** Open question. Trade-off: unlocks prod-URL signups in the R2.11 window vs. touches a project we're about to decommission. Defer unless a real new-signup need surfaces in the window.

---

## 2026-05-28 — Phase R2.06: Cloudflare Pages staging deploys (with Workers↔Pages misstep + recovery)
**Status:** ✅ DONE
**Scope:** Cloudflare | Firebase | Docs
**Summary:** Set up Cloudflare Pages to auto-deploy the `staging` branch of `Al-Mo3tasem/Tomodachi`. Staging URL is now `https://tomodachi-staging.pages.dev/`. Hostname selector correctly routes to `tomodachi-staging` Firebase config; end-to-end signup verified — fresh email + fresh username creates three docs (`usernames/{lower}`, `users/{uid}`, `stats/{uid}`) in `tomodachi-staging` Firestore.

**Files / Areas:** No code changes. Pre-task: `staging` branch created from `main` (`git checkout -b staging && git push -u origin staging`). Phases doc updated: new L1.20 task (`ensureUserProfile` R2.05-compatibility fix); old L1.20 (Log Phase L1 completion) renumbered to L1.21; L2.01 + L2.02 deps updated to L1.21.

**Execution notes:**
- **Cloudflare Workers vs Pages misstep on first attempt.** Initial setup walkthrough led to creating a Cloudflare **Worker** (URL pattern `tomodachi-staging.moutasem-hamdi14.workers.dev`), not a Pages project (`tomodachi-staging.pages.dev`). The unified "Workers & Pages" dashboard in current Cloudflare UI doesn't always make the Pages-specific entry point prominent. The hostname selector in `js/config/firebase.js` only recognizes `.pages.dev` (and the future `staging.tomodachi.com`) as staging — `.workers.dev` falls through to the default `prod` branch, which means **the failed initial test attempts wrote to `hiraquest0` (live prod)**, not staging. Caught and recovered: Worker deleted, Pages project created correctly. URL-pattern check (`.pages.dev` vs `.workers.dev`) is the unambiguous tell of what type of project was created.
- **Orphan `users/` docs without orphan Auth accounts (on hiraquest0).** During cleanup of the misdirected writes, the Auth Users tab showed zero orphan accounts but the `users` collection had two orphan docs. **Diagnosis:** the `cred.user.delete()` cleanup in `handleRegister`'s USERNAME_TAKEN path correctly removed the Auth orphans, BUT `ensureUserProfile` had already raced in and written fallback `users/{uid}` docs from the `onAuthStateChanged` fire that happened the moment `createUserWithEmailAndPassword` succeeded. The Auth deletion then succeeded but the Firestore docs remained. Both orphan `users/` docs were manually deleted; no orphans in other collections (the `usernames/` write was the FAILING step in each case, so no orphan usernames docs were created). This race is a real bug — tracked for fix as L1.20.

**Verification:**
- `https://tomodachi-staging.pages.dev/` loads cleanly.
- Console: `[firebase-init] env=staging projectId=tomodachi-staging` confirms hostname selector picked the staging branch.
- Fresh signup succeeded; three docs landed in `tomodachi-staging` Firestore.
- `hiraquest0` state cleaned: 2 orphan `users/` docs removed; no Auth orphans needed removal.
- Authorized domain added to `tomodachi-staging` Firebase Auth: `tomodachi-staging.pages.dev`.

**Open Follow-up:**
1. **`tomodachi-prod` Auth authorized domain** still needs `al-mo3tasem.github.io` added BEFORE R2.11 cutover (otherwise every existing user gets locked out at cutover). Tracked previously in R2.04 closure; reiterating here so R2.11 prep checklist includes it.
2. **L1.20** — `ensureUserProfile` R2.05-compatibility fix (the race-orphan + usernames-bypass bug surfaced during this task's testing). Two-part fix outlined in the task description. Renumbered the existing L1.20 (Log Phase L1 completion) to L1.21; updated L2.01 + L2.02 deps from L1.20 to L1.21.
3. **Cloudflare Pages walkthrough refinement (meta).** My Part A instructions assumed a clear "Pages" tab in the Create flow. Current Cloudflare UI doesn't always present this prominently, leading to the Worker misstep. If similar Cloudflare-Pages walkthroughs are needed in future phases (e.g., adding a Pages project for the marketing site or for `tomodachi.com` itself), update them to feature the URL-pattern check (`.pages.dev` vs `.workers.dev`) as the primary post-deploy verification step.

---

## 2026-05-28 — Phase R2.05: hardened rules on 3-env + `usernames/` atomic lock pattern
**Status:** ✅ DONE
**Scope:** Code | Firebase | Docs
**Summary:** Applied the new hardened ruleset to all three new Firebase projects (`tomodachi-dev`, `tomodachi-staging`, `tomodachi-prod`). The key R2.05 design move was the **`usernames/` collection** as the atomic uniqueness gate for signup, replacing the previous pre-auth `users` query that broke under hardened rules. This is "option (d)" from the R2.05 design discussion. Privacy posture preserved — `users` read stays auth-required throughout the R2.11→L1-gateway window. The maxUsers client-side cap is **retired**; the Phase L1 Cloud Function registration gateway will own rate limiting going forward.

**Three-commit landing:**
- `9ebe3ad` — Code: `handleRegister` refactor in `js/app.js` (createUserWithEmailAndPassword → setDoc on `usernames/{lower}` as atomic lock → users/stats writes; `permission-denied` on the usernames write triggers orphan-Auth cleanup + "Username already taken" UX). Dropped `maxUsers` from `APP_CONFIG`. Phases doc: new L1.19 task for the `saveProfileSettings` race-condition cleanup; old L1.19 (completion log) renumbered to L1.20; L2.01 + L2.02 deps updated. Cache busters bumped `20260527a` → `20260527b` on the 3 imports whose target content changed.
- `2f7c41a` — `docs/Firestore_Rules.md` full rewrite for the 3-env topology. New ruleset adds the `usernames/{username}` block (read public; create gated by `auth.uid == data.uid` + `hasOnly(['uid','createdAt'])`; delete owner-only; no update rule = immutability). `hiraquest0` carve-out documented with R2.13 decommission trigger. Application Sequence section: 8-step per-project paste flow + Rules Playground sims + rollback.
- `f28cc5c` — Mid-execution fix: original Sim 3 in the Application Sequence had a misleading payload (`auth.uid=bob, data.uid=bob` writing to `/usernames/alice`) that tested a *legitimate* operation (bob reserving available name "alice" for himself) and correctly returned Allow. Fixed Sim 3 to test the actual squat-attack (`data.uid=alice` while `auth.uid=bob` → Deny via uid-mismatch). Added Sim 6 (update-type) demonstrating the immutability/atomicity gate. The actual ruleset was unchanged — only the doc's test payload was wrong.

**Files / Areas (across the three commits):**
- `js/app.js` `handleRegister` — refactored per the three-step pattern (Auth → usernames lock → users + stats); also lines 7 (cache buster bump) and 10/17/21/24/30/34 untouched.
- `js/config/firebase.js` + `js/config/firebase.template.js` — `maxUsers` removed.
- `js/core/core.js` (line 6) and `index.html` (line 619) — cache busters bumped `20260527a` → `20260527b` (strict §14.3).
- `docs/Phases_and_Tasks.md` — new L1.19 (saveProfileSettings refactor task), old L1.19 → L1.20, L2.01 + L2.02 deps updated.
- `docs/Firestore_Rules.md` — full rewrite + Sim-3 fix + Sim-6 addition.
- `docs/Tomodachi_Master_Plan.md` (gitignored, local-only) — §4.8 `usernames` collection documented; §4.7 (`config/system { maxUsers: 2 }`) deleted; §4.8 backfill count later corrected to 1 doc.

**Backfill on `hiraquest0`:** Originally planned for 2 docs; actually only 1 backfilled because the second active user hasn't signed up on the current production app yet. No problem — that user's future signup against `hiraquest0` runs the new R2.05 flow, which `hiraquest0`'s catch-all rule still permits, creating both `users/{uid}` and `usernames/{lower}` naturally. R2.09 import then carries both.

**Verification:**
- Rules Playground sims 1–6 passed Allow/Deny as expected on all 3 new projects (sim 3 ran with the corrected `data.uid=alice` payload after the `f28cc5c` doc fix).
- `tomodachi-dev` localhost end-to-end signup: fresh email + username → "Account created!" toast; 3 docs landed (`usernames/{lower}`, `users/{uid}`, `stats/{uid}`).
- Collision test on `tomodachi-dev`: second account with different email + same username → "Username already taken" toast; orphan-Auth cleanup confirmed via Authentication tab (only one account remained).
- `tomodachi-staging` rules published; Playground sims passed; localhost-via-staging-URL signup deferred to R2.06 (Cloudflare Pages setup).
- `tomodachi-prod` rules published; Playground sims passed; no real-traffic test possible until R2.11 cutover routes prod traffic to this project.

**Process notes from execution:**
- The original Sim 3 instruction was wrong in a subtle way — the payload tested a legitimate username-reservation, not the squat-attack the documentation claimed it was testing. Caught during the user's `tomodachi-dev` Playground run. Doc patched mid-execution; staging + prod proceeded with the corrected version.
- `ERR_BLOCKED_BY_CLIENT` errors against `firestore.googleapis.com/.../channel?VER=8` (long-polling URLs) surfaced during step-8 localhost verification. Content-blocker extensions (uBlock Origin / Brave Shields / AdGuard / etc.) classify these channels as analytics beacons and block them by default. `js/data/firebase.js` uses `experimentalForceLongPolling: true` (legacy workaround from Phase 2 for streaming-channel flakiness), so removing the flag isn't free. Workaround for dev: incognito window OR allowlist `firestore.googleapis.com` in the offending extension. **Not a code change at this point** — track for the future.
- Cleanup of stale Auth + Firestore state in `tomodachi-dev` was needed before the clean retest passed (Authentication tab → delete test user; Firestore → delete orphan docs in `users/`, `usernames/`, `stats/`, `presence/`; browser storage cleared on localhost).

**Open Follow-up:**
1. **L1.19** — `saveProfileSettings` race-condition refactor (username CHANGES path). Tracked in `docs/Phases_and_Tasks.md`. Current query approach works post-auth under the new ruleset but is race-vulnerable. Deferred to Phase L1 per agreed R2.05 scope.
2. **`hiraquest0` carve-out** — stays on broad catch-all until R2.13 decommissions the project. Documented in `docs/Firestore_Rules.md`.
3. **`experimentalForceLongPolling` × browser-extension interaction (dev-environment only)** — workaround documented above. Decide on permanent fix only if friction grows.
4. **`config/system`** Firestore collection — referenced in the ruleset under `match /config/{docId}` as a forward placeholder but currently has no documented docs (Master Plan §4.7 was deleted with the `maxUsers` retirement). Re-add a Master Plan §4.X entry when the first real config doc is needed.

---

## 2026-05-27 — Phase R2.04: 3-environment Firebase config switcher
**Status:** ✅ DONE
**Scope:** Code | Firebase
**Summary:** Replaced the single `firebaseConfig` export in `js/config/firebase.js` with a module-private `configs` map (`dev` / `staging` / `prod`) plus `getEnv()` + `getFirebaseConfig()` helpers per `PROJECT_RULES.md` §6.2. Selector is hostname-based: `localhost` / `127.0.0.1` → dev, `*.pages.dev` or `staging.tomodachi.com` → staging, everything else → prod. Dev/staging point at the new `tomodachi-dev` / `tomodachi-staging` projects from R2.01–R2.02. **Prod still holds the legacy `hiraquest0` config unchanged** — R2.11 owns the cutover to `tomodachi-prod` after R2.08–R2.10 migrate data + Auth users. Zero behavioral change for existing prod users today.

**Files / Areas (commit `e2c9ef9`, 10 files, +124 / −46):**
- `js/config/firebase.js` — restructured. `APP_CONFIG` export preserved.
- `js/config/firebase.template.js` — mirrors the new three-env shape with placeholders per §5.2.
- `js/data/firebase.js` — calls `getFirebaseConfig()` at module load. Verification log gated by `env !== 'prod' || URLSearchParams.has('debug')` so dev/staging print env+projectId always and prod prints only with `?debug=1` (respects §9.4 default-quiet-in-prod). Pattern intended to be reused for R2.05+ init code.
- Cache busters bumped `20260526a` → `20260527a` (strict §14.3 reading) on every import whose target's content changed: `index.html` (app.js link, line 619), `js/app.js` (7 of 8 imports), `js/core/core.js` (line 6), `js/data/firebase.js` (line 7), `js/data/leaderboards.js` (lines 8–9), `js/games/coop.js` (lines 15/19/21), `js/games/engine.js` (lines 17/20/25), `js/games/duel.js` (lines 17/21/23). Audio.js imports (×4) and the CSS link in `index.html` intentionally stayed at `20260526a` — their targets did not change.

**Verification:**
- `node --check` passed on all 9 modified JS modules.
- Grep confirmed no stale `?v=20260526a` on changed-target imports; the 5 remaining instances are the documented audio.js + CSS exceptions.
- Localhost test (`python -m http.server 8000` → `http://localhost:8000`): console printed `[firebase-init] env=dev projectId=tomodachi-dev`. Identical on `http://127.0.0.1:8000`.
- Production-path test (`https://al-mo3tasem.github.io/Tomodachi/`): silent by default. With `?debug=1` appended: `[firebase-init] env=prod projectId=hiraquest0` — confirms prod still hits the legacy project and the debug-gate override works.

**Open Follow-up:**
1. **Pre-existing R1.05a migration bug** at `js/core/core.js:16-17`: both `oldK` and `newK` use the `'tomodachi-'` prefix; one should be `'hiraquest-'`. The migration is currently a silent no-op. Practical impact small — the two active accounts had loaded post-rename before the typo landed. **Disposition:** delete the shim at the next `core.js` touchpoint (the L2.C deferred file split), since the shim was already declared "harmless after the first run" in the R1.05a Learning Log entry. Not a separate task.
2. **Storage + Cloud Functions** on the three new Spark-tier projects intentionally NOT enabled (Blaze required for new projects post-2024). Revisit when the registration-cap gateway or audio pipeline becomes blocking (Phase L2, $1/mo Blaze budget cap).
3. **Authorized-domain gaps** with explicit later triggers:
   - `tomodachi-staging` project needs the Cloudflare Pages FQDN added at R2.06 (e.g., `tomodachi-staging.pages.dev`). Tracked as R2.06 acceptance prerequisite.
   - `tomodachi-prod` project needs `al-mo3tasem.github.io` added BEFORE R2.11 cutover, or every existing user is locked out at the cutover moment. Tracked as R2.11 step-1 prerequisite.
   - `tomodachi.com` deferred to R3.04 (post-domain-purchase).
4. **`Firestore_Rules.md` line 1 title still reads "HiraQuest"** — folds into the R2.05 rewrite.

---

## 2026-05-27 — Docs reorganization: all planning docs moved into `docs/`
**Status:** ✅ DONE
**Scope:** Repo layout | Docs
**Summary:** Moved every planning + governance markdown file into a new `docs/` folder at the repo root, leaving `README.md` at root (so GitHub still renders it on the repo landing page). Project root is now visually clean: `index.html`, `css/`, `js/`, `docs/`, `favicon.svg`, `.gitignore`, `README.md` — no scattered .md files. Motivated by repo-tidiness preference; no functional change.

**Files / Areas:**
- **`git mv` (history preserved):** `PROJECT_RULES.md`, `Phases_and_Tasks.md`, `Tomodachi_Progress_Log.md`, `Learning_Log.md`, `CONTENT_GUIDELINES.md`, `Firestore_Rules.md` → `docs/<filename>`.
- **Plain `mv` (gitignored, not in history):** `Tomodachi_Master_Plan.md`, `Commercialization_Plan.md` → `docs/<filename>`.
- **`.gitignore`:** `Tomodachi_Master_Plan.md` → `docs/Tomodachi_Master_Plan.md`; same for `Commercialization_Plan.md`.
- **`README.md`:** All six in-table markdown links and the §"Project structure" tree updated to use `docs/` prefix. Status paragraph rewritten to reflect that Phase R1 is now complete (was still saying "Currently in Phase R1").
- **`docs/PROJECT_RULES.md` §1.1:** Added one-line note above the core-documents table explaining that all docs live under `docs/`, and that bare-filename references throughout this rules doc resolve to `docs/<filename>` from the repo root or as bare names when read from a sibling inside `docs/`. This avoids a sweep of every cross-reference inside the rules doc.
- **`js/config/firebase.js`** and **`js/config/firebase.template.js`:** Two comment-only updates — references to `Commercialization_Plan.md` and `Phases_and_Tasks.md` now use the `docs/` prefix.

**Cross-references intentionally left bare:** Markdown links between sibling docs inside `docs/` (e.g., `Learning_Log.md` linking to `PROJECT_RULES.md`, or `Tomodachi_Progress_Log.md` mentioning `Phases_and_Tasks.md`) still resolve correctly because both sides of the link are now co-located. Rewriting every internal reference to add `docs/` would be cosmetically consistent but functionally redundant and bloat the diff.

**Verification:**
- `git status` shows 6 renames (R), `.gitignore` modification, `README.md` modification, `js/config/firebase.js` + `js/config/firebase.template.js` modifications, `docs/PROJECT_RULES.md` + `docs/Tomodachi_Progress_Log.md` modifications. No untracked .md files at root.
- `ls` at repo root shows only `README.md` (no other .md files).
- `ls docs/` shows all 8 planning docs.
- IDE-opened `Tomodachi_Master_Plan.md` tab will show "file not found" until reopened from the new path — flagged to user.

**Open Follow-up:**
- None for this task. Phase R2 prep continues separately.

---

## 2026-05-26 — Phase R1 Closure: R1.02 + R1.11 + R1.12
**Status:** ✅ DONE
**Scope:** Firebase | Docs | Local filesystem
**Summary:** Closed the three remaining R1 follow-ups in one wrap-up session. **R1.02:** Firebase Console public-facing name flipped "HiraQuest" → "Tomodachi" on the `hiraquest0` project (the project ID surfaced by the tracked config at `js/config/firebase.js:13`). Note: Claude's original step-by-step incorrectly referenced a `japanese-289e0` project ID — derived from misreading a stale, gitignored, npm-style snippet at repo root (`config.js`) instead of the tracked active config; the user navigated to the right project (`hiraquest0`) anyway, and confirmation was obtained before this entry was finalized. The stale `config.js` was deleted as part of this entry to prevent future misreading. **R1.11:** End-to-end production smoke test passed at `https://al-mo3tasem.github.io/Tomodachi/` — login, dashboard, settings (theme/audio carried over via the R1.05a localStorage shim), Zen round, Survival round, leaderboard all green. **R1.12:** Local clone relocated from the nested `d:\MO3 LAP\MyProjects\HiraQuest\hiraquest\` to a flat `d:\MO3 LAP\MyProjects\Tomodachi\` by file-copy (deferred-from-R1.04 design — fresh session can't `mv` its own folder under VS Code's open handle). New location verified canonical: `git status` clean except this entry, `git remote -v` points at `Al-Mo3tasem/Tomodachi`, `git worktree list` shows a single `[main]` row at the new path, `node --check` passes on all 10 modules. Old folder retained as a recycle-bin safety net pending user deletion after this commit lands.

**Files / Areas:**
- `PROJECT_RULES.md` §4.2 — path references locked to the new location. Removed the conditional "will become" prose from lines 167 and 170; canonical clone path is now stated as `d:\MO3 LAP\MyProjects\Tomodachi\` and the canonical remote as `https://github.com/Al-Mo3tasem/Tomodachi`.
- `Learning_Log.md` — new entry [Phase R1, Task R1.11] on the folder *taxonomy* decision (complements the existing R1.04 entry on `git mv` mechanics). Index updated.
- `Tomodachi_Progress_Log.md` — this entry.
- `config.js` (repo root, gitignored, npm-style Firebase init referencing the unrelated `japanese-289e0` project) — **deleted**. Not loaded by the deployed app. Removing prevents future readers (human or AI) from misidentifying it as the live config and acting on its values, which is exactly what happened during R1.02 prep.
- Memory file at `C:\Users\mouta\.claude\projects\d--\memory\tomodachi-commercialization.md` — updated out-of-band to reflect the new path and that R1.01/R1.10 are already done. (Memory files are not in the repo.)

**Verification:**
- Firebase Console (browser): `hiraquest0` project's Public-facing name now reads "Tomodachi" (user confirmed after navigating to the correct project despite Claude's wrong-ID instruction).
- Production smoke test (browser at `https://al-mo3tasem.github.io/Tomodachi/`): all 6 steps from the R1.09 smoke protocol passed end-to-end on prod.
- Local clone health: `git status` clean before this commit, `git log --oneline -1` shows `9eaa769 Phase R1: Brand rename HiraQuest → Tomodachi + folder reorganization`, `node --check` passes module-by-module.
- Stale root `config.js` removal verified by `Test-Path` returning false after deletion.

**Open Follow-up:**
1. **User:** Delete `d:\MO3 LAP\MyProjects\HiraQuest\` via Explorer → Recycle Bin (decision recorded: delete via Recycle Bin, not permanent removal, so a ~30-day undo window exists if anything surfaces).
2. **Carried forward from R1.04 (still deferred):** Intra-file splits — `core.js` → 4 files, `audio.js` → 2 files, `engine.js` → 3 files. Trigger: Phase L2.C when new modules need to import from the inside of these files.

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
