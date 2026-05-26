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

*(Entries listed newest first. None yet — this log begins populating when Phase R1 starts.)*

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
