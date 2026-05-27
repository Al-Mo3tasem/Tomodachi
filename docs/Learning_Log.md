# Tomodachi — Learning Log

> Decision-and-knowledge artifact for the project lead's skill growth.
>
> | | |
> |---|---|
> | **Purpose** | Capture the technologies, libraries, frameworks, and decisions introduced during the project — explained so the project lead develops real understanding, not just "vibe coding" instincts. |
> | **Scope** | Tech intros, alternatives considered, why-we-picked-this, key concepts, tradeoffs accepted. **Not** function-by-function code reproducibility (that's the Master Plan + code itself). |
> | **Mandatory entries** | Every task that introduces a new library/framework/service or makes a non-obvious decision. See `PROJECT_RULES.md` §21.2 for the bar. |
> | **Optional entries** | Pure code tasks (typo fixes, adding one more seed item) — no entry needed. |
> | **Visibility** | TRACKED in repo. |

---

## Index

*(Entries listed newest first.)*

- **[Phase R2, Task R2.05]** — Firestore uniqueness via doc-as-key collection (atomicity through create semantics)
- **[Phase R2, Task R2.04]** — Hostname-based environment selection + prod-debug-gate idiom
- **[Phase R1, Task R1.11]** — Folder taxonomy: what each `js/` subdirectory captures and why this grouping
- **[Phase R1, Task R1.05a]** — localStorage migration on brand rename
- **[Phase R1, Task R1.04]** — Folder reorganization with `git mv` + cross-module import path updates

---

## Entry template (copy this when writing a new entry)

```markdown
## [Phase X, Task Y.NN] — Task Name
**Date:** YYYY-MM-DD
**Contributor:** Claude / Codex / Project Lead

### Technology / Library Introduced
- **Name** — One-line summary. What problem it solves. Where it sits in our stack.
- **Version locked at:** (e.g., `i18next@23.11.5`)

### What it actually does (plain language)
2-4 sentences explaining the library/framework/service in plain language, in the context of how *we* use it. Avoid jargon without definition.

### Alternatives considered
- **Option A** — what it does, why we didn't pick it (cost, complexity, missing feature, learning curve, regional support, etc.)
- **Option B** — same
- **Option chosen** — and the deciding factor.

### Concepts to understand
- **Term** — Plain-language definition in our project's context. Repeat for each concept that matters.

### Tradeoffs accepted
What we gave up by this choice, in case we ever need to revisit it. Be honest.

### Useful resources
- Official docs link
- One excellent tutorial or blog if relevant
- Anything the project lead should read to go deeper
```

---

## Entries

*(Entries appear below this line, newest first.)*

## [Phase R2, Task R2.05] — Firestore uniqueness via doc-as-key collection (atomicity through create semantics)
**Date:** 2026-05-28
**Contributor:** Claude (with project-lead direction on option choice + scope reductions)

### Technology / Library Introduced
- **Doc-as-key uniqueness pattern in Firestore** — a way to enforce unique-value constraints across documents in a collection when Firestore Security Rules can't natively express "no two docs may share a field value." You encode the unique value into the document ID, then rely on Firestore's create-vs-update semantics for atomicity: a `create` operation only succeeds when the doc doesn't already exist, so two simultaneous create attempts at the same path can never both win.
- **`allow create` vs `allow update` distinction in Firestore Security Rules** — separate rule clauses that fire based on whether the target document already exists. `create` fires on writes to non-existing paths; `update` on writes that target existing docs. Omitting `allow update` means updates are universally denied — which is how we enforce immutability on the `usernames/` collection.

### What it actually does (plain language)
Tomodachi needed to enforce "no two users may pick the same username" — a constraint that's natural in SQL (`UNIQUE` index) but not directly expressible in Firestore Security Rules. The pre-R2.05 approach was to *query* the `users` collection for the username before allowing the signup to proceed; under hardened rules (`allow read: if request.auth != null`), this query failed because the would-be user wasn't yet authenticated when the check ran.

R2.05's solution: a separate `usernames/` collection where the **document ID is the lowercase username itself**. The doc stores `{ uid, createdAt }`. The rule for `create` is: "anyone authenticated can create, BUT only with `data.uid == auth.uid` (you can only claim a name for yourself) and only with exactly `['uid', 'createdAt']` as fields (no schema injection)." The rule for `update` is absent — Firestore denies operations that have no matching `allow` clause, so usernames become immutable once written.

The atomicity is **implicit in Firestore's create semantics**. When bob and alice simultaneously try to register the same username `dragon`, the first request's `setDoc(usernames/dragon, {uid: bob})` finds no existing doc and succeeds as a create. The second request's `setDoc(usernames/dragon, {uid: alice})` finds the doc already exists and Firestore reinterprets the operation as an update — but our ruleset has no `allow update` for `usernames/`, so the second request gets `permission-denied`. The signup flow catches that exact error code and surfaces "Username already taken" to alice.

The squat-attack protection is the `data.uid == auth.uid` check: it prevents bob from creating `/usernames/alice` with `data.uid = alice` while signed in as bob. Without this check, bob could squat any username in the rightful owner's name, leaving the rightful owner unable to claim it (and the squatter able to delete it later anytime, since the delete rule checks `resource.data.uid == auth.uid`).

### Alternatives considered
- **(a) Relax `users` collection read to allow unauthenticated** — the simplest fix; the signup query just works. Rejected per project-lead decision because it exposes every user document (including email, displayName, createdAt) to any anonymous reader. PII concern, acceptable only as a temporary workaround until L1's Cloud Function gateway lands. We chose (d) instead specifically to keep `users` read auth-required.
- **(b) Move the uniqueness check to a callable Cloud Function** — server-side enforcement is the cleanest design, and avoids exposing any user data. Rejected for R2.05 because Cloud Functions require Blaze tier and the project is staying on Spark until at least L2. Will likely become L1's approach when the registration-cap gateway ships.
- **(c) Counter document + atomic increment trigger** — relevant for the now-retired maxUsers cap (count users via a separate `meta/registration_count` doc instead of `getDocs(users)`), but doesn't solve username uniqueness on its own. Also needs a Functions-based trigger for atomic increments. Rejected for the same Spark-tier reason as (b), and doesn't fit the username problem.
- **(d) Doc-as-key uniqueness via the `usernames/` collection** — chosen. Spark-compatible, no PII exposure, atomic uniqueness via create-semantics, no Functions dependency.
- **Sub-decision within (d): refactor `saveProfileSettings` (username CHANGE path) in R2.05 too** — explicitly deferred to L1.19 by project-lead direction. The existing query approach works correctly post-auth under hardened rules; the race condition (two users simultaneously claim the same new username via Settings) is benign at <50 users. Tracked in `Phases_and_Tasks.md` so the open follow-up doesn't decay.

### Concepts to understand
- **Doc ID as a uniqueness key** — any value that needs to be unique in a Firestore collection can be promoted to *be* the document ID instead of stored as a field. This converts "is anyone else using this value?" from a query (which requires `allow read` and an index) into a single-doc existence check (which is implicit in create semantics).
- **Create-vs-update reinterpretation** — Firestore looks at the path of a write and decides whether it's a create or update based on whether a doc already exists. The same client SDK call (`setDoc`) can be either operation depending on server-side state. Your rules need to handle both possibilities OR deliberately omit one to deny it entirely.
- **`request.resource.data` vs `resource.data` in rules** — `request.resource.data` is the **proposed new value** the client is trying to write; available on create + update. `resource.data` is the **existing document's data**; available on read, update, delete. For create operations, `resource` is `null` because nothing exists yet.
- **`.keys().hasOnly([...])`** — a Security Rules expression that returns true if and only if the document's keys are a subset of the provided list. Prevents schema-injection: even if an attacker authenticated and signed up legitimately, they couldn't slip extra fields (like `isAdmin: true`) into their usernames doc.
- **Orphan Auth + the `ensureUserProfile` self-heal** — Firebase Auth and Firestore are separate services with separate consistency models. If a signup flow creates an Auth account but fails to write the Firestore profile, the Auth account is "orphaned." The R2.05 `handleRegister` attempts `cred.user.delete()` when the usernames write fails; if that cleanup also fails (network, extension blocking), the Auth account persists. The pre-existing `ensureUserProfile` function creates a missing profile on the next successful login, which self-heals most orphan scenarios.

### Tradeoffs accepted
- **Duplicated username storage.** The canonical display username (original case) lives in `users/{uid}.username`; the uniqueness lock (lowercase) lives in `usernames/{lower}`. A username CHANGE has to update both: delete old `usernames/{oldLower}`, create new `usernames/{newLower}`, update `users/{uid}.username`. Three writes instead of one. Worth it: the uniqueness guarantee is structural, not best-effort.
- **`saveProfileSettings` not yet migrated.** Username CHANGES still race-vulnerable until L1.19. Acceptable at <50 users.
- **No transactional cleanup of partial signups.** If the network drops between the usernames write and the users write, we end up with a `usernames/{lower}` reservation but no profile. The user retries; `ensureUserProfile` heals the missing profile on next login. Acceptable; could be tightened with a Cloud Function transaction later.
- **Username changes via delete-then-create are not atomic.** Between the delete of `usernames/{old}` and the create of `usernames/{new}`, another user could grab the just-freed old name. Acceptable at scale; matters only when usernames have value to others (e.g., recognizable handles), which isn't the case in our friend-card-only social model.
- **One implicit Firestore "feature" we now depend on.** The "create-against-existing-doc becomes update" reinterpretation is documented Firestore behavior but isn't something the SDK exposes a direct API for. If Firestore ever changes this semantic, our atomicity gate breaks silently. Mitigation: the Playground simulations in `Firestore_Rules.md` Application Sequence include the immutability test (Sim 6), which would catch a regression here on the next rule deploy.

### Useful resources
- [Firebase docs: Security Rules data validation](https://firebase.google.com/docs/firestore/security/rules-conditions#data_validation) — official docs section on how rules match to write operations.
- [Stack Overflow: enforcing uniqueness in Firestore](https://stackoverflow.com/q/47089457) — community discussion of the doc-as-key pattern and its alternatives.
- [docs/Firestore_Rules.md](Firestore_Rules.md) — the R2.05 ruleset in full, with the Application Sequence + Playground sims.
- [docs/Tomodachi_Master_Plan.md §4.8](Tomodachi_Master_Plan.md) — the `usernames/` collection schema documented in the project's data model (gitignored, local-only).

---

## [Phase R2, Task R2.04] — Hostname-based environment selection + prod-debug-gate idiom
**Date:** 2026-05-27
**Contributor:** Claude

### Technology / Library Introduced
- **Hostname-based environment selector** — pattern for choosing between dev / staging / prod configuration at runtime by reading `location.hostname` in the browser. No build step, no env-var injection, no manual toggle. The browser tells us which environment it's in by *where it's running*.
- **Prod-debug-gate idiom** — `if (env !== 'prod' || params.has('debug')) { ... }` — a one-line gate that makes a side-effect (a console.log, a banner, a verification screen) verbose in dev/staging by default and opt-in only on prod via a `?debug=1` URL param. Reusable across the project.

### What it actually does (plain language)
With three separate Firebase backends (one per environment), the client app needs to point at the right one without us hand-editing which config it loads. The hostname is the cleanest signal we have: when the page is served from `localhost`, we're in dev; from `*.pages.dev`, we're in staging; from `al-mo3tasem.github.io` (or later `tomodachi.com`), we're in prod. The selector function `getEnv()` is six lines of `if`s returning one of three strings; `getFirebaseConfig()` indexes a `configs` map by that string. No magic, no framework.

The prod-debug-gate solves a related problem: per `PROJECT_RULES.md` §9.4, prod should be quiet by default — no info-level logs. But the R2.04 acceptance criterion specifically says "verified by console-logging the project ID on each." A pure `if (env !== 'prod') log()` makes prod silently un-verifiable — we couldn't ever check from a browser that prod is hitting the right backend. The `params.has('debug')` branch keeps prod quiet by default but gives an opt-in escape hatch: visit `?debug=1` once, see the log, leave.

### Alternatives considered
- **Build-time env injection (Vite / Webpack / esbuild)** — the modern-frontend default. Rejected: the project is vanilla JS with no build step; introducing one conflicts with the minimal-stack decision in `Commercialization_Plan.md`. The hostname approach gets the same outcome with zero new dependencies.
- **URL query parameter to select env** (`?env=staging`) — flexible but fragile. Anyone landing on a deep-linked URL might accidentally hit the wrong backend. Rejected as a primary selector.
- **localStorage flag** (`localStorage.setItem('TOMODACHI_ENV', 'staging')`) — useful for one-off dev testing but easy to forget, requires DevTools to flip. Rejected as primary.
- **`if (env === 'prod') skip log` (no escape hatch)** — what was proposed in the original plan and corrected by the project lead. Rejected because prod stays unverifiable: if R2.11 ever lands a wrong projectId, we'd only find out via Sentry errors, not a 5-second visual check.
- **Option chosen** — hostname-based selector with a per-call debug-gate idiom for prod observability.

### Concepts to understand
- **`location.hostname`** — browser-provided string telling you the host of the current page (`localhost`, `127.0.0.1`, `tomodachi-staging.pages.dev`, etc.). Read-only, set by the browser based on the URL. Available synchronously at module load time.
- **`URLSearchParams`** — modern browser API for parsing the `?key=value` portion of a URL. `new URLSearchParams(location.search).has('debug')` returns true if `?debug` (with or without a value) is present.
- **Module-private state via top-level `const`** — the `configs` map isn't exported; nothing outside the file can read or mutate it directly. Callers go through `getFirebaseConfig()`. The internal shape can change later (rename a key, add a field, switch to a remote-config fetch) without breaking any caller. Export surface stays narrow.
- **Strict §14.3 cache-buster reading vs. release-alignment** — R2.04 used strict (bump only on changed-target consumers; audio.js + CSS stay at the old buster). R1 used release-alignment (bump everything to today's date). Both valid; strict makes diffs sharper, release-alignment makes versions easy to eyeball at a glance.

### Tradeoffs accepted
- **Hostname is the only signal.** If we ever need to run dev locally but talk to staging or prod data, we'd need a DevTools override or add an opt-in URL parameter. Acceptable: 99% of dev work hits dev data.
- **Adding an environment means editing this file.** A hypothetical `qa` would need a new hostname rule + a `configs.qa` entry. Cheap. The alternative (config-as-data fetched at boot) adds a runtime dependency and a chicken-and-egg problem without enough benefit at this stage.
- **The debug gate is per-call, not centralized.** Every future verification log site has to remember the pattern. If many appear, extract a `debugLog(...)` helper; for now the one-liner is short enough that DRY would be premature.
- **`configs.prod` holds hiraquest0 values until R2.11.** Surfaces in the file as a comment + a code-level reminder. Easy to misread for "this is wrong, the prod project is tomodachi-prod." Will be deleted when R2.11 cutover commits.

### Useful resources
- [MDN: location.hostname](https://developer.mozilla.org/en-US/docs/Web/API/Location/hostname) — what it returns under various URLs.
- [MDN: URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) — modern query-string parsing.
- [12-factor app: III. Config](https://12factor.net/config) — the broader principle of "config lives in the environment, not the code." Hostname-based selection is one realization; build-time injection is another.
- [PROJECT_RULES.md §6.2](PROJECT_RULES.md) — the rule mandating this loader shape.
- [PROJECT_RULES.md §9.4](PROJECT_RULES.md) — the "prod stays quiet by default" rule that motivates the debug-gate idiom.

---

## [Phase R1, Task R1.11] — Folder taxonomy: what each `js/` subdirectory captures and why this grouping
**Date:** 2026-05-26
**Contributor:** Claude

### Technology / Library Introduced
- **Folder-by-role module taxonomy** — convention for grouping `.js` files into subdirectories named after the *responsibility* the files share, not the *feature* they implement. R1.04 moved the flat `js/` layout into five subdirectories: `core/`, `config/`, `data/`, `games/`, `audio/`. This entry covers the *taxonomy decision* itself (what does each name mean? why these five and not some other split?) as a complement to the R1.04 entry on the `git mv` mechanics.

### What it actually does (plain language)
Before R1.04, every `.js` file lived directly under `js/` — `core.js`, `game.js`, `duel.js`, `coop.js`, `leaderboard.js`, `firebase.js`, `audio.js`, `app.js`, `config.js`, `config.template.js`. That works fine at ~10 files. It stops working when the count grows because (1) the import lines at the top of each file lose information value — you can't tell from `import { ... } from './engine.js'` whether `engine` is a renderer, a game-mode controller, or a network engine, and (2) new contributors (including future AI sessions) waste tokens scanning the flat list to figure out what belongs to what subsystem.

The R1.04 reorganization picks **responsibility** as the grouping axis (not feature, not layer, not file size):

- **`js/core/`** — Shared *primitives*: app-wide state, theme/UI helpers, generic utilities. Things that almost every other module imports from. After the deferred split, this will be `state.js + ui.js + theme.js + utils.js`. The bar for adding a file here is high — it has to be genuinely shared infrastructure.
- **`js/config/`** — Static *configuration values* that the rest of the app reads but doesn't mutate. Currently `firebase.js` (real values, gitignored at the file-content level via `.gitignore`) and `firebase.template.js` (the public template). Future entries: environment-aware config per `PROJECT_RULES.md` §5 (`dev`/`staging`/`prod` Firebase configs picked by hostname); feature flag map; remote-config bootstrap.
- **`js/data/`** — *Persistence-layer* code that talks to Firestore / Firebase Storage / cloud functions. Reading and writing the source-of-truth data, plus the query shapes that need to live close to the data. Currently `firebase.js` (init + auth wiring) and `leaderboards.js` (Firestore reads/writes for the leaderboard). Future entries: user profile data access, content set loaders, SRS state persistence.
- **`js/games/`** — *Game-mode controllers* — modules that own the rules and state machine of one game mode. Currently `engine.js` (the parametric Zen/Survival engine), `duel.js` (real-time head-to-head), `coop.js` (real-time sync match). Future entries: `daily-quest.js`, additional multiplayer modes, the SRS-driven session controller from Phase L2.
- **`js/audio/`** — *Sound output*. Currently `audio.js` (mixed sfx + TTS); after the deferred R1.04 split this becomes `sfx.js` + `tts.js`. Separated from `data/` even though TTS will eventually call Azure TTS through a Cloud Function gateway — because *callers* of audio care about "play this sound" semantics, not which backend produces the audio bytes. Hiding the backend choice behind this folder lets us swap TTS providers later without touching call sites.

`js/app.js` stays at the top level. It's the entry point — the script tag in `index.html` loads it, and it kicks off the import graph. Putting it under any subdirectory would obscure that role.

### Alternatives considered
- **Group by feature instead of role** — e.g., `js/leaderboard/{ui.js,data.js,types.js}`, `js/duel/{ui.js,engine.js,protocol.js}`. This co-locates everything a feature needs, which is great when one developer owns one feature. Rejected: at our team-of-one scale, the same person touches all features and gets more value from "all data-access code in one place" than from "all leaderboard files in one place" — the import-line scanability wins. Reconsider if/when (a) features grow > ~5 files each and (b) different contributors specialize in different features.
- **Group by layer (MVC-ish)** — `js/models/`, `js/views/`, `js/controllers/`. Rejected: the app isn't shaped like MVC. Game-mode controllers (`engine.js`, `duel.js`, `coop.js`) hold both state and rendering hooks; splitting them across model/view/controller folders would scatter code that always changes together. MVC suits frameworks that enforce the split; vanilla-JS app code doesn't.
- **Flatten into one big `src/`** — popular in `webpack`-era codebases. Rejected: no build step here, so there's no `src/` vs `dist/` distinction; flatter doesn't help. Also `src/` would just push the same naming problem one level deeper.
- **Cut finer than 5 buckets** — e.g., separate `js/ui/` from `js/core/`, or `js/auth/` out of `js/data/`. Rejected for now: at 10 files, 5 buckets is already 2 files per bucket on average. Going finer means some buckets have 1 file, which is overkill. Add new buckets only when an existing one crosses ~6 files AND a coherent sub-grouping exists.
- **Group by JS-vs-static** (`js/dynamic/`, `js/static/`). Rejected: not a meaningful axis for this app — every file is dynamic.

### Concepts to understand
- **Folder names are documentation** — when you write `import { play } from '../audio/sfx.js'`, the path is doing some of the work that a comment used to do. The reader (or AI) sees three things at once: this file isn't local (`../`), it lives in the `audio` subsystem, and it's about sfx specifically. Picking subsystem names well repays itself on every import line for years.
- **Cohesion vs coupling** — "cohesion" means how related the things inside one module are; "coupling" means how dependent one module is on another. A good taxonomy maximizes cohesion within each subdirectory (everything in `data/` cares about persistence) and minimizes coupling between them (a `games/` module shouldn't need to know which Firestore collection a `data/` function targets — that's what the function is for).
- **The "should we split this folder" trigger** — a folder is ready to split when (a) it crosses ~6 files AND (b) you can articulate a coherent sub-grouping in one sentence ("the SRS-related state vs. the UI-related state"). If the sub-grouping needs a paragraph to explain, it's not real — leave the folder flat until a clearer line emerges.

### Tradeoffs accepted
- **Slightly longer relative-import paths** — `import { x } from '../core/utils.js'` instead of `import { x } from './utils.js'`. Worth it: the path tells you *which subsystem* utils belongs to, which a flat structure can't do. Cost is one to two extra characters per import line.
- **A module that genuinely spans two subsystems has nowhere clean to live** — e.g., a future "auth-aware leaderboard rendering" module. Mitigation: pick the subsystem that's *more about what the file owns* than the subsystem it *calls into*. If the file owns rendering and calls auth/data helpers, it goes in `games/` or `core/` — not `data/`. Re-home if the balance shifts.
- **Reorganization wasn't paired with file splits** — `core.js`, `audio.js`, and `engine.js` are still single files at their new locations even though `PROJECT_RULES.md` §7.1 calls for splits. Documented as deferred to Phase L2.C — pay the cost when there's a forcing function, not before.

### Useful resources
- [PROJECT_RULES.md §7.1](PROJECT_RULES.md) — the file layout convention this entry implements.
- [Cohesion (computer science) — Wikipedia](https://en.wikipedia.org/wiki/Cohesion_(computer_science)) — the canonical writeup of LCOM and the cohesion/coupling tradeoff.
- [DDD: Bounded Contexts](https://martinfowler.com/bliki/BoundedContext.html) — a heavier-weight version of the same idea (when feature-grouping starts to pay off at scale).

---

## [Phase R1, Task R1.04] — Folder reorganization with git mv + cross-module import path updates
**Date:** 2026-05-26
**Contributor:** Claude

### Technology / Library Introduced
- **`git mv`** — Git command that combines a filesystem move (or rename) with `git rm` + `git add` in one atomic operation, so Git tracks the change as a *rename* (status `R`) rather than as an unrelated delete + add pair. Preserves blame history across the move.
- **ES module import paths with cache-buster query strings** — pattern we use in the vanilla-JS app: `import { x } from './path/file.js?v=20260526a'`. The `?v=...` defeats GitHub Pages' aggressive HTTP caching on file change while still letting browsers cache when the query is stable.

### What it actually does (plain language)
We had 10 JavaScript files sitting flat in `js/`. Per `PROJECT_RULES.md` §7.1 we wanted them grouped into subdirectories by role (`core/`, `config/`, `data/`, `games/`, `audio/`). The challenge: every file imports from other files using relative paths like `./core.js`, and after moving them those paths break — a file now in `js/games/duel.js` can't import `./core.js` anymore (the file is at `../core/core.js` from its new perspective).

The solution had two stages:

1. **Atomic moves with `git mv`** — instead of moving files via the filesystem and then `git add`ing the new locations, we use `git mv` so the rename is captured as a single operation. The benefit: `git log --follow` keeps working, blame stays meaningful across the move, and the diff shown in code review reads as "renamed file with N% similarity" instead of "deleted N lines + added N similar lines elsewhere."

2. **Import path updates** — for every moved file, every cross-module import needed its relative path recomputed for the new location. A file now in `js/games/X.js` importing from `js/core/core.js` becomes `../core/core.js`; importing from a sibling in the same subdir (e.g., `js/games/coop.js` from `js/games/duel.js`) stays `./coop.js`.

We did 12 import path updates across 8 files. The cache buster was bumped on every changed import (`?v=20260525` → `?v=20260526a`) — even when the destination file's content hadn't conceptually changed, the import line itself was new, and bumping the cache buster aligns the version across all module imports for a release.

### Alternatives considered
- **Don't reorganize; keep flat layout.** Rejected: `PROJECT_RULES.md` §7.1 prescribes the subdirectory structure as the project grows past ~25-40 files. Reorganizing now (10 files) costs ~1 hour; reorganizing later (40+ files with active development) costs days plus migration risk.
- **Reorganize + decompose each file simultaneously.** PROJECT_RULES.md §7.1 also calls for splitting `core.js` into 4 files, `audio.js` into 2, and `engine.js` into 3 (engine/zen/survival). Rejected for R1: the simultaneous decomposition multiplies risk and review burden. Splits deferred to Phase L2.C when new modules need to import from them anyway — pay the cost when it's justified, not before.
- **Use a build step (esbuild/Vite/Rollup) so imports don't need explicit paths.** Rejected: the project is vanilla JS, no build step. Adding one is a significant infrastructure change that conflicts with the "minimal stack" decisions in `Commercialization_Plan.md`. The cost of explicit relative paths is small at this scale.
- **`mv` (filesystem) + `git add` afterward.** Rejected: loses the rename detection in Git. Treats the move as delete+add, which clutters history and breaks `git log --follow`.

### Concepts to understand
- **Git rename detection** — Git doesn't actually store renames as a first-class concept. Internally, every file is stored by hash, and a "rename" is inferred at diff time when Git sees a delete + add pair where the content is sufficiently similar (default threshold: 50% similarity). `git mv` doesn't change this — what makes the rename visible in `git status` is the *content match*, not the `mv` command. If you move a file AND substantially rewrite it in the same commit, Git may fail to detect the rename and show it as delete+add even with `git mv`. This is why R1's move-first-then-edit approach worked: each file's content was largely preserved during the move, with edits happening in subsequent steps.
- **Relative import paths in ES modules** — `'./foo.js'` means "in the same directory as the importing file"; `'../foo.js'` means "one directory up". These resolve at module load time in the browser. There's no centralized import map (unless we add one), so every move requires updating the importing side.
- **Cache busters vs HTTP cache headers** — GitHub Pages serves with aggressive caching. The cleanest way to force a fresh fetch is a unique URL — changing the query string is enough because the URL hash differs. We use a date-stamped suffix (`20260526a`) for traceability: opening a file in dev tools and seeing the query lets you immediately know which release the resource is from.

### Tradeoffs accepted
- **Bigger diff at commit time** — 8 files touched for path updates alone, plus the actual moves. A reviewer (or you, in a year) needs to see the diff structure to understand the move. Mitigated by the descriptive commit message and Progress Log entry.
- **Two phases of refactoring** (move now, split later) — leaves the structure briefly inconsistent with `PROJECT_RULES.md` §7.1 (which calls for split files). Mitigated by the explicit "deferred" note in the Progress Log and a tracked future task.

### Useful resources
- [git-mv docs](https://git-scm.com/docs/git-mv) — official spec.
- [MDN: import statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) — relative path resolution rules.
- [Stack Overflow: How does git detect renames?](https://stackoverflow.com/q/433111) — explains the similarity-threshold logic.

---

## [Phase R1, Task R1.05a] — localStorage migration on brand rename
**Date:** 2026-05-26
**Contributor:** Claude

### Technology / Library Introduced
- **`localStorage` migration pattern** — pre-existing browser API used in a one-shot copy-then-delete pattern at module load. The code at the top of `js/core/core.js` (lines 7-23) reads any value stored under an old `hiraquest-*` key, copies it to the new `tomodachi-*` key if the new key doesn't already exist, then removes the old key. Idempotent — harmless after the first run.

### What it actually does (plain language)
When we renamed the brand from HiraQuest to Tomodachi, we also renamed the localStorage keys the app uses to remember user preferences (`hiraquest-theme`, `hiraquest-audio`, `hiraquest-practice`, etc.) to `tomodachi-*`. Without a migration, existing users would lose their saved preferences on first load post-rename — their theme would reset to default, their audio toggle would reset to on, their last-bracket would reset, etc. Small inconvenience individually, but it's a reputation hit at scale (and a needless one).

The migration runs on every page load (not gated behind a flag) but is safe to run repeatedly: on the second load, the old keys don't exist anymore, so the migration silently does nothing. After every existing user has loaded the app once post-rename, the code becomes inert.

### Alternatives considered
- **Accept the reset.** Users (at this stage of the project, n ≈ 2-5 active accounts) would lose UI preferences once. ~30 seconds of clicking to restore. Rejected: shows lack of craft. The migration is ~15 lines of code; the cost of writing it is less than the cost of the user mentally noting "their app loses my settings."
- **Run migration once and store a marker.** Add a `tomodachi-migrated` flag to localStorage; only run if the flag is missing. Rejected: more complex than idempotent-on-each-load. The cost of running 9 missed reads on each load is microseconds.
- **Server-side flag** — migrate the keys in Firestore. Rejected: localStorage keys are per-device, not per-account. Cross-device sync isn't the goal; preserving per-device settings is.
- **Just rename the new keys to match the old keys** (i.e., keep the `hiraquest-*` prefix in code forever). Rejected: leaves an inconsistent brand prefix in code that future contributors would have to understand. The migration is one-shot; the wrong-prefix consequence is forever.

### Concepts to understand
- **Idempotency** — an operation is idempotent if running it twice has the same effect as running it once. The migration is idempotent because each iteration checks "is old key present AND new key absent?" before acting. After the first run, the old key is removed, so the second run's check fails and nothing happens.
- **localStorage** — browser-provided key-value store, per-origin. Synchronous API (`localStorage.getItem`, `setItem`, `removeItem`). Survives page reloads and browser restarts but is wiped if the user clears browser data. NOT shared across devices.
- **Module load timing** — code at the top of an ES module runs once when the module is first imported, in import order. Our migration sits at the top of `js/core/core.js`. Since `core.js` is imported by virtually every other module (state + UI helpers), the migration runs early in the app's startup, before any code that reads the new keys.

### Tradeoffs accepted
- **Migration code becomes dead weight after every existing user has loaded the app once** — we'd need to ship a follow-up release to remove it. Mitigated: it's small (~15 lines) and tagged with a comment referencing R1.05a so it's findable. We can remove it during Phase L2 when we touch `core.js` for the file split.
- **Won't help users who never load the app post-rename** — they'll see fresh state, but they're inactive anyway. Acceptable.

### Useful resources
- [MDN: Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) — full API.
- [MDN: Idempotent operations](https://developer.mozilla.org/en-US/docs/Glossary/Idempotent) — formal definition.

---

---

## Future Considerations & Deferred Improvements

> Ideas, optimizations, and improvements that are intentionally deferred to a later version. Items belong here when:
> - The improvement is real and worth doing eventually, but is out of scope for the current task or phase
> - A constraint (time, resources, available data, missing dependency) prevented the better solution
> - A simpler approach was chosen now with awareness that something more sophisticated may be needed later
>
> When implemented, mark resolved in place (do not delete) and reference the task entry where it was addressed.

### Item template

```markdown
- **Tag:** `[Phase X, Task Y]` or `[General]`
  **Date added:** YYYY-MM-DD
  **Description:** Plain-language description of the improvement.
  **Why deferred:** Time / resources / scope / dependency / other.
  **Impact if done:** What gets better when this is eventually addressed.
  **Status:** OPEN
```

### Open items

*(None yet.)*
