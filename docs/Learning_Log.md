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

- **[Phase L1, Task L1.02]** — CSS logical properties, the `data-i18n`-vs-runtime-state bug class, and three patterns for "translatable strings the user might read"
- **[Phase L1, Task L1.19]** — In-process listener races vs cross-window races (cleanup-after-failure is fine here, but cleanup-after-race wasn't in L1.20)
- **[Phase L1, Task L1.01]** — i18next + buildless CDN ES modules + data-i18n attribute substitution pattern
- **[Phase R2, Task R2.11 wrap-up]** — Firebase web API keys, GitHub secret-scanning false positives, and the three-layer access model
- **[Phase L1, Task L1.20]** — Self-heal logic and the invariants it can quietly violate (landed during R2 escalation)
- **[Phase R2, Task R2.06]** — Cloudflare Workers vs Pages: when to use which (and how to tell what you created)
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

## [Phase L1, Task L1.02] — CSS logical properties, the data-i18n-vs-runtime-state bug class, and three patterns for "translatable strings the user might read"
**Date:** 2026-05-28
**Contributor:** Claude

### Technology / Library Introduced
- **CSS logical properties** — modern CSS shorthand (`margin-inline-start`, `padding-inline-end`, `border-inline-start`, `inset-inline-start`, `text-align: start/end`, `padding-inline` for symmetric shorthand) that resolves direction at render time based on `<html dir>`. The "leading edge" / "trailing edge" abstraction replaces the physical "left" / "right" axis. Shipped in all major browsers by ~2021; effectively universal today.
- **`:lang(X)` CSS pseudo-class** — selector that matches elements whose effective language is `X`. Inheritance follows the `<html lang>` attribute we sync from `js/i18n/rtl.js`. Lets us scope AR-specific font + line-height to AR content without selector cruft.
- **The `data-i18n`-vs-runtime-state bug class** — not a "library", but a category of bug that emerges when L1.01's static attribute-driven i18n meets JS that writes dynamic values into the same DOM nodes. Worth a name because it'll recur in other languages, other code bases, anywhere "static markup + dynamic JS" cohabit on the same elements.

### What it actually does (plain language)

#### CSS logical properties — the model
In LTR, "left margin" usually means "margin on the side closest to the start of the text" (because you read left-to-right). In RTL, the same intent — "margin near the text start" — needs to be on the RIGHT, because reading goes right-to-left. Physical CSS properties (`margin-left`) hardcode the side; logical properties (`margin-inline-start`) hardcode the *intent*. The browser resolves "which physical side is the start?" based on `<html dir>`.

For our 11 conversions, the rule was: **if the property exists to express a relationship to text flow (margin near reading start, accent stripe on the leading edge, status text aligned to where values naturally end up), use logical**. If it exists to express a fixed geometric position regardless of language (the OFF state of a toggle slider — knobs ALWAYS sit on the left even in Arabic UIs), keep physical.

The two physical-by-intent exceptions stay as `left: 2px` (toggle knob) and `.duel-player-opp` (in-game opponent block; will get its own bilingual audit at L2.C).

#### The `data-i18n`-vs-runtime-state bug class

L1.01 wired most of `index.html`'s static text via `data-i18n="key"` attributes that `js/i18n/apply.js` walks on init and on every `languageChanged` event. Clean for static content. But several elements in `index.html` carry `data-i18n` attributes that JS later overwrites with runtime values:

- `friend-name` has `data-i18n="dashboard.friend.waiting"` for the empty state, but `renderFriend()` writes the friend's actual name into it when a friend is present.
- `friend-status .status-text` has `data-i18n="dashboard.friend.status_offline"`, but `renderFriend()` rebuilds the span with the current online/in_game/offline state.
- `select-subtitle`, `select-options-info`, `btn-start` have `data-i18n` defaults but `goToSelect()` rewrites them per-mode (zen / survival / duel / coop).

The bug: on every locale toggle, `apply.js` walks the DOM and resets all these elements back to their static `data-i18n` defaults — clobbering the runtime state. User sees their friend's name flip to "Waiting for friend…", their select-screen subtitle flip back to the default placeholder, etc.

Three patterns now in use to resolve this (depending on the kind of dynamic content):

**Pattern A — static translatable text.** HTML has `data-i18n="key"`. JS never touches it. `apply.js` owns it on every languageChanged. *Example:* "Sign In" button.

**Pattern B — dynamic translatable text** (value comes from state but the value IS a translation key). JS sets BOTH `data-i18n` to the current-state's key AND `textContent` via `t()`. On locale toggle, `apply.js` walks the DOM, sees the current `data-i18n` value, re-translates correctly. *Example:* friend-bar status text (Online / Offline / In a game keys vary by presence state); select-screen subtitle (zen vs survival vs duel vs coop keys vary by selected mode).

**Pattern C — dynamic untranslatable text** (the value is a person's actual name, a username, a number — doesn't translate). JS removes `data-i18n` entirely and writes raw `textContent`. `apply.js` skips the node on locale toggle. *Example:* friend-bar friend-name when a friend is present; profile card display name; dashboard nav username.

**Pattern D — parametric translatable text** (template with vars from JS state, e.g., `Welcome back, {{name}}`). `apply.js` can't update it on its own because the var values live in JS state, not in the markup. The fix is a new `onLocaleChange(handler)` hook from `i18n/index.js` that lets app code re-run the parametric render when locale changes. *Example:* `dashboard.subtitle_named` line in the dashboard header.

### Why this taxonomy matters
Each pattern has a different "who owns this DOM node" answer. The L1.01 v1 wiring assumed Pattern A everywhere, which broke patterns B, C, D. L1.02 makes the patterns explicit and uses each where appropriate. The cost is one extra line of code per dynamic-render site (set/remove `data-i18n`); the benefit is that locale toggle now works correctly across the entire surface regardless of whether content is static or dynamic.

A reasonable refinement for later: build a small wrapper helper in `app.js` or `i18n/apply.js` like `setI18nDynamic(el, key, vars?)` that handles set-attribute + set-textContent in one call, so the pattern is harder to forget. For now, the inline pattern is short enough that explicit beats abstracted.

### Alternatives considered
- **Make `apply.js` skip elements that JS has touched** (e.g., tag them with `data-i18n-frozen`). Rejected: relies on JS to remember to tag; same forget-prone shape as the original bug. Pattern C's explicit `removeAttribute` is more honest.
- **Move all i18n into JS** — drop `data-i18n` attributes entirely, have every translatable string rendered by `t()` at element-creation time, re-render on `languageChanged`. Rejected because L1.01's `data-i18n` approach has two big wins: (a) EN fallback content in the HTML so the page renders even if i18next CDN fails, (b) declarative locale wiring that a future contributor can grep for. The data-i18n approach is correct for static text; the fix is to handle the dynamic-text overlay properly.
- **Use a real DOM observer (MutationObserver)** in `apply.js` so locale-toggle replays after every JS mutation. Rejected: overkill, fires constantly, has its own race conditions, doesn't actually solve the bug (it would still clobber values).

For directional CSS:
- **Keep physical properties everywhere, use `[dir="rtl"]` overrides for every directional rule.** Rejected: doubles the CSS surface for every directional rule. Logical properties handle it for free.
- **Use `[dir="rtl"]` overrides only.** Rejected: same doubling cost, plus brittle when adding new rules.
- **Logical properties for everything possible, `[dir="rtl"]` overrides only where logical can't reach** (icon mirroring like the back-button arrow which needs a different glyph in RTL). This is what we did.

### Concepts to understand
- **Inline axis vs block axis.** "Inline" = the direction text flows (horizontal for Latin/Arabic; could be vertical for languages like vertical-Japanese-text). "Block" = the direction lines stack. Logical properties operate on these axes, not on horizontal/vertical. For our use case (Latin + AR, both horizontal-text), inline = horizontal and block = vertical. Logical property `margin-inline-start` resolves to `margin-left` in LTR and `margin-right` in RTL.
- **`text-align: start/end`** — the logical version of `text-align: left/right`. `start` means "the side where text begins" (left in LTR, right in RTL); `end` is the opposite. Catches `text-align: right` on `.history-meta` (the scores column should hug the trailing edge regardless of direction).
- **`:lang(ar)` matches `<html lang="ar">` even when applied to nested elements.** It walks the language inheritance up the DOM. So `:lang(ar) p` matches any `<p>` inside `<html lang="ar">`. We use it to scope `--font-ar` and the increased line-height to AR content only, without selector noise.
- **`<html dir>` vs `<html lang>`.** Both are HTML attributes. `lang` is for screen readers, hyphenation rules, spell-check, `:lang()` CSS matching; `dir` is for text flow direction (LTR / RTL). They're orthogonal — you could have `lang="ar" dir="ltr"` (Arabic content rendered LTR for some specialized reason), though we don't. We sync both off the i18next locale.
- **CSS pseudo-element for direction-dependent glyphs.** The back-button arrow needs to point in the "back" direction — ← in LTR, → in RTL. Rather than baking the arrow into translation strings (where the AR translator might forget to flip it), we use `::before { content: "← "; }` with a `[dir="rtl"] ::before { content: "→ "; }` override. Decouples direction from content; the translation strings carry just "Back to Dashboard" / "Back to Dashboard" in AR (with no arrow), and CSS provides the arrow.
- **`transform: scaleX(-1)` for glyph mirroring** — flips the visual rendering of an element horizontally. We use it for `.mode-arrow` (the `→` on game-mode cards) in RTL so it visually becomes ← without changing the underlying text character. Cheaper than two pseudo-element rules; works because we just want to mirror the GLYPH, not change it.

### Tradeoffs accepted
- **Two intentional physical-property exceptions** (`.toggle-slider`, `.duel-player-opp`). The toggle exception is durable — toggle UIs are conventionally LTR even in RTL apps. The duel-player-opp exception is L2.C debt — when in-game screens get a bilingual audit, this rule and the related JS strings in `duel.js` get the full pass.
- **Cairo as the AR font.** Per `CONTENT_GUIDELINES.md` §13.4 — chosen for screen rendering quality + free OFL license + variety of weights. Tajawal as fallback. If Cairo ships with a missing glyph for technical content (e.g., a specific kanji-context need), we'd revisit. Unlikely.
- **AR line-height: 1.7 vs Latin 1.5.** Per §13.5. Adds vertical air to AR pages compared to Latin. Some Latin readers might find AR pages "loose"; native AR readers expect it. Sticking with the project's standing rule.
- **The `data-i18n` attribute-management pattern requires JS authors to remember.** When adding a new dynamic-text render site, the author has to remember to `setAttribute('data-i18n', key)` or `removeAttribute('data-i18n')` depending on whether the value translates. Forgettable. Mitigation: the three Patterns (A/B/C/D) are documented here and in the Progress Log; we'll add the `setI18nDynamic(el, key)` helper when it appears in 3+ places.
- **Cairo font adds ~80 KB to the Google Fonts CSS request** (4 weights × Cairo subset). Cached after first load. Acceptable for the MENA target audience.

### Useful resources
- [MDN: CSS logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) — the canonical reference.
- [CSS Tricks: Logical Properties for direction-aware CSS](https://css-tricks.com/css-logical-properties/) — accessible walkthrough with examples.
- [The CSS `:lang()` pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/:lang) — matching language inheritance.
- [Cairo font on Google Fonts](https://fonts.google.com/specimen/Cairo) — the font we picked for AR.
- [PROJECT_RULES.md §12 (RTL / LTR Parity)](PROJECT_RULES.md) — our project's standing rules this work implements.
- [PROJECT_RULES.md §13.4 + §13.5](PROJECT_RULES.md) — the Cairo + line-height decisions.

---

## [Phase L1, Task L1.19] — In-process listener races vs cross-window races, and why cleanup-after-failure works here when cleanup-after-race didn't in L1.20
**Date:** 2026-05-28
**Contributor:** Claude

### Technology / Library Introduced
No new tech. The interesting bit is the **decision rule** for picking between "prevent the race" (L1.20's `_registrationInFlight` flag) and "let the failure happen, then clean up" (L1.19's `claimedNewUsername` rollback). Both look like race-handling code; only one of them works for each scenario, and the deciding factor is structural — not stylistic.

### What it actually does (plain language)
L1.20 closed a race between `handleRegister` (mainline) and `ensureUserProfile` (an `onAuthStateChanged` listener), both running in the same browser tab, both potentially writing to `users/{uid}` and `usernames/{uid}`. L1.19 closed a race between two different browsers (or tabs, or devices) both trying to claim the same available username via Settings.

Both are "races." Both code paths write to `usernames/`. But the structurally-correct fixes are different — and the L1.20 v1 attempt (cleanup-after-race) failing taught us why.

### The two race shapes

**L1.20: same-process listener race.**
- Actor 1: `handleRegister` (procedural, runs to completion or throws)
- Actor 2: `onAuthStateChanged` listener (fires async, registered globally, runs `ensureUserProfile` which writes to `users/`)
- Both share `state.user` and the same Firestore `users/` collection in the same browser.
- The listener fires AS SOON as Firebase Auth's `createUserWithEmailAndPassword` resolves (step 1 of handleRegister) — BEFORE step 2 (the `usernames/` write) decides if registration should succeed or roll back.
- v1 fix: when step 2 fails, try to delete the docs `ensureUserProfile` may have written. **Doesn't work** — at the moment cleanup runs, the listener's writes may be in-flight (queued, traveling to Firestore, or about-to-be-issued). Cleanup deletes "nothing" and no-ops; the writes land afterward; orphan persists.
- v2 fix (the one that landed): a module-level flag `_registrationInFlight` that the mainline sets at the start and clears in `finally`. The listener checks the flag at its entry and skips its post-auth flow during registration. Eliminates the race window entirely.

**L1.19: cross-window race.**
- Actor 1: window A's `saveProfileSettings` (procedural, in window A's JS process)
- Actor 2: window B's `saveProfileSettings` (procedural, in window B's JS process, a completely separate browser context)
- Shared state: only Firestore. No in-process state. No JS event listeners triggered by Actor A that Actor B sees.
- The race is resolved by Firestore itself: of the two `setDoc(usernames/{X}, ...)` calls, exactly one is a "create" (no doc yet → succeeds per the R2.05 `allow create` rule) and the other is "create against an existing doc" → Firestore reinterprets as update → no `allow update` rule → permission-denied.
- The losing window catches `permission-denied` synchronously in its own flow and shows "Username already taken." No cleanup needed; no orphan possible because the failing write never landed.
- **Rollback only handles the unrelated case** where actor A successfully claims `usernames/{X}` but then `users/{uid}` update throws (network blip, transient error). That cleanup is synchronous to actor A's mainline — actor A explicitly knows it claimed the new doc (`claimedNewUsername = true`) and explicitly deletes it in the catch. **No race exists at this point**: no other actor is competing for `usernames/{X}` because actor A holds it (and any other concurrent attempt to claim the same name is already failing with permission-denied via the atomicity gate). Cleanup-after-failure reliably wins because there's no concurrent writer to outrace.

### Why the L1.20 lesson doesn't generalize as "cleanup-after-X is always wrong"
The lesson from L1.20 is narrower than it first sounded: **cleanup can't reliably close a race window where the racing actor is an asynchronous in-process event listener you don't synchronize with.** L1.20's `ensureUserProfile` was racing in the same JS process as `handleRegister`'s cleanup; the cleanup ran but the racing writes were still in flight.

L1.19's "cleanup" is not closing a race at all. It's a deterministic rollback of a single-actor's own partial state in the synchronous failure path. The atomicity gate (Firestore create-semantics) already resolved the actual race in `usernames/{X}`; the rollback only matters for actor A's own subsequent failures, which are not concurrent with anyone else's writes to the same paths.

### Decision rule (for future similar bugs)
When you see a race, ask: **what are the actors, and do they share an in-process event-driven channel?**

- **Actors share an in-process listener** (e.g., `onSnapshot`, `onAuthStateChanged`, custom event emitters) → prevent the race with shared in-process state (a flag, a queue, a mutex). Cleanup is unreliable because race windows here are inherently undefined-width.
- **Actors share only the database** (no JS listener triggered by the other actor's writes mid-flow) → use the database's own atomicity primitives (create-semantics, transactions, optimistic locking). Cleanup is fine for an actor's own synchronous-failure path because no other actor is competing at that moment.

### Concepts to understand
- **"Race window"** — the time gap between "decision is made based on state X" and "state X is committed." If during that gap another actor can read the same X and make the same decision, both actors win. Closing the race means either (a) shrinking the gap to zero (atomic operation) or (b) ensuring no concurrent actor can run during the gap.
- **`allow create` in Firestore rules as an atomicity primitive** — the rule's "doc-doesn't-exist semantics" gives you the gap-of-zero property for free, with no transaction overhead. R2.05 chose this over Cloud Functions transactions specifically because we were Spark-tier at the time. Still the right call now that we're Blaze: the lock-pattern is simpler than a transactional read-then-write would be.
- **Best-effort cleanup that ISN'T about races** — releasing the old `usernames/{oldLower}` doc in L1.19 is best-effort because (a) it may not exist (graceful-degradation scenarios from L1.20), (b) failure to delete it doesn't leave the system incorrect (the new reservation is the source of truth; the leftover is benign), and (c) the failure mode is uncorrelated with the race. Different reason for the try/catch than the v1 L1.20 cleanup — same syntax but a fundamentally different role.
- **`claimedNewUsername` flag pattern** — a single-actor "I did this, must undo on later failure" marker. Distinct from L1.20's `_registrationInFlight` which is a multi-actor "another part of me is busy, don't intrude" marker. Both are module-level mutable state; both express coordination. The first is intra-actor (single thread of execution); the second is inter-actor (mainline + listener).

### Tradeoffs accepted
- **Hypothetical orphan: `users/` doc with username X but no `usernames/{X}` reservation, then a new user claims `usernames/{X}` legitimately, leaving two `users/` docs sharing the name.** Possible only if L1.20's `reserveFallbackUsername` graceful-degradation hit 10 collisions on a previous self-heal — vanishingly rare at our scale. The L1 Cloud Function gateway will own longer-term invariant maintenance. Documented in the Progress Log entry's "what did NOT change" section.
- **Cross-window rollback latency.** If actor A successfully claims `usernames/{newLower}` but the `users/` update fails, actor A's cleanup runs the delete asynchronously. During that ~hundred-millisecond window, the name is "owned by A but A's `users/` doc still has the old name." Acceptable: no other actor sees this transient state as confusing (they just see name X as taken, which they would after rollback too if A retries immediately). Self-resolves once rollback completes.

### Useful resources
- [docs/Firestore_Rules.md R2.05 ruleset](Firestore_Rules.md) — the `allow create` / no `allow update` pattern on `usernames/` that L1.19 relies on.
- L1.20 Learning Log entry above — for the contrast.
- Commit history: L1.20 v1 (`6384526`, cleanup-after-race, superseded) vs L1.20 v2 (`cb48b64`, prevent-the-race, landed) vs L1.19 (this commit, cleanup-after-failure-not-race, landed) — three patterns side-by-side in the same week.

---

## [Phase L1, Task L1.01] — i18next + buildless CDN ES modules + data-i18n attribute substitution
**Date:** 2026-05-28
**Contributor:** Claude

### Technology / Library Introduced
- **i18next** — JavaScript internationalization framework. Solves three problems together: (1) looking up the right string for the current language given a hierarchical key (`auth.field.email`), (2) interpolating values into translated strings (`Welcome back, {{name}}`), (3) firing an event (`languageChanged`) so the UI can react when the user switches locale. In our stack it owns every user-facing string.
  - **Version locked at:** `i18next@26.3.0` (current stable on npm as of 2026-05-28, verified via `https://registry.npmjs.org/i18next/latest`).
- **i18next-browser-languagedetector** — companion plugin that picks the initial locale on first load by checking, in order: URL query (`?lang=ar`), `localStorage('tomodachi-lang')`, `navigator.language`, `<html lang>`. Solves the "what language should we start in?" problem without us writing detection logic by hand.
  - **Version locked at:** `i18next-browser-languagedetector@8.2.1` (current stable; same verification).
- **The `data-i18n` attribute substitution pattern** — instead of writing translated strings into templates, we mark DOM nodes with `data-i18n="auth.brand.title"` (or `data-i18n-attr="title:nav.settings_title"` for attributes, `data-i18n-placeholder="auth.placeholder.email"` for inputs). A DOM walker (`js/i18n/apply.js`) reads those markers and writes the looked-up value via `textContent` or `setAttribute`. Re-runs on `languageChanged`.

### What it actually does (plain language)
We're shipping the same app to two languages on day one (EN + AR) with full RTL coming in L1.02. That means every visible string needs two versions — and "every" is roughly 124 in HTML plus ~54 in JS toasts/errors today, more as Phase L2's lesson screens land. Doing this by hand (`if (locale === 'ar') string = 'X'; else string = 'Y'`) collapses fast.

i18next handles the lookup mechanics: keys are dot-notation paths into a nested JSON, the current locale is a property on the i18next instance, and `t('key', { vars })` returns the right string with interpolations filled in. We give it two JSON resource bundles (`en.json`, `ar.json`), tell it the supported locales, and it manages the rest.

The buildless ESM-via-CDN path keeps it consistent with the Firebase SDK pattern that's already in the project. Pinning the version in the URL (`@26.3.0`) means the exact same code loads every time — no surprise upgrades on Cloudflare-side cache changes.

The `data-i18n` attribute approach over template-literal `t()` calls inside HTML means the EN text stays visible in the DOM as a fallback. If i18next fails to load (CDN outage, content-blocker extension, slow network), the page still renders something sensible. Once `apply.js` runs on init + on every locale switch, every wired node is overwritten with the looked-up value.

### Alternatives considered
- **Hand-rolled `t()` over a JSON file** — write a function that does `t = (key) => keys.reduce(...) || key;` and load JSON via `fetch`. Considered seriously: would avoid a runtime dependency, ~30 lines of code. Rejected because: (1) no language detector — we'd have to write the URL-param + localStorage + navigator.language stack ourselves, (2) no `languageChanged` event — we'd need our own pub/sub, (3) no interpolation pluralization (`count_one` / `count_other`) — we'd have to handle that ourselves, (4) zero ecosystem leverage — if Phase L2 wants context-sensitive lookups or namespaces, we'd reinvent them. The 50 KB i18next bundle is worth not writing those.
- **FormatJS / `react-intl`** — industry standard for React apps. Rejected because we don't use React. FormatJS's `intl-messageformat` runtime could be used standalone, but its ICU MessageFormat syntax (`{count, plural, one{# item} other{# items}}`) is heavier-weight than we need for ~200 keys, and its primary value (compile-time extraction) requires a build step we don't have.
- **Polyglot.js** — Airbnb's lightweight runtime. Smaller (~3 KB) and works without a build step. Rejected because: (1) no built-in language detector; (2) no `languageChanged` event for re-rendering; (3) maintenance has slowed (no major release since 2021); (4) i18next's ESM CDN distribution is better-supported than Polyglot's.
- **Native `Intl` API only** — modern browsers ship `Intl.DateTimeFormat`, `Intl.NumberFormat`, etc. But they handle FORMATTING (dates, numbers, plurals) not the lookup problem (which string for this locale?). We'll layer `Intl` on top of i18next for date/number/currency formatting; it's complementary, not an alternative.
- **Option chosen** — i18next via `jsdelivr/+esm` CDN. Best fit because: matches our buildless stack, has the language-detector plugin we need, has a community-maintained ESM distribution, version-pins cleanly in the import URL.

### Concepts to understand
- **"Buildless ES modules via CDN"** — modern browsers can `import` directly from any URL that serves an ES module. `https://cdn.jsdelivr.net/npm/<pkg>@<version>/+esm` is jsdelivr's ESM-transform endpoint: it takes any npm package and serves it as an ES module. Same shape as Firebase's `https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js` that's already in the project. No build step, no node_modules, no bundler config — just a URL with a version pin.
- **`/+esm` suffix on jsdelivr URLs** — tells jsdelivr to serve an ES module build of the package (auto-converting CJS if needed). Without it you get the package's default entry point, which for some packages is CJS and won't `import` cleanly.
- **`textContent` vs `innerHTML` for translated strings** — always `textContent`. If a translation value ever contains HTML (e.g., from a future Codex pass that slips in `<strong>` for emphasis), `textContent` renders it as literal text; `innerHTML` would execute it as markup. The trust boundary for translations is "data, not code" — keep it that way structurally.
- **`new URL('./locales/en.json', import.meta.url)`** — resolves a relative path against the URL of the importing module, not against the page URL. Lets the i18n module sit at `js/i18n/index.js` and ask for `./locales/en.json` and get the right path (`/js/i18n/locales/en.json`) regardless of where the document base is. Without this, `fetch('./locales/en.json')` would resolve against the page URL and look in the wrong place.
- **The "fallback locale" in i18next** — if a key is missing in the active locale, i18next falls back to `fallbackLng` (we set it to `'en'`). If the key is missing in EN too, `t()` returns the key string itself. This is actually a useful convention: in `formatAuthError`, we check `if (translated !== key) return translated` to detect "found vs missing" cleanly. No try/catch needed.
- **Hierarchical key namespaces by **purpose**, not UI section** — `auth.field.email` (anywhere an email field is shown) is more reusable than `auth.login.email_label` (only the login screen). Cuts duplication when the same string appears in multiple screens.
- **The `data-i18n*` attribute walker as a DOM-MutationObserver lite** — `apply.js` walks `document` on init and on every `languageChanged`. It does NOT observe DOM mutations — if app.js dynamically appends new nodes (e.g., the toast container or a future lesson card), those nodes' static i18n keys won't be picked up unless we call `applyTranslations(i18n, newRoot)` after the append. Acceptable: dynamic content in our app is either (a) JS-driven content where we use `t()` at append time, or (b) Firestore data (vocab cards, etc.) which is content not chrome.
- **`<html lang>` vs `<html dir>`** — `lang` tells screen readers and the browser what language the content is in; `dir` controls text direction (LTR/RTL). They're separate concerns. L1.01 syncs `lang`; L1.02 syncs `dir`. We can have `lang="ar"` with `dir="ltr"` mid-development without breaking; it's just suboptimal for AR readers until L1.02.

### Tradeoffs accepted
- **~52 KB of JS (i18next + language-detector) over the wire on every page load.** Cached after the first load. Could be smaller if we shipped Polyglot or hand-rolled, but the dev velocity of i18next's `{{count, plural}}` interpolation and the language-detector plugin is worth the bytes. Revisit only if bundle size becomes a real CWV concern (won't at our scale).
- **Two CDN dependencies in the critical path of every page load** (i18next + language-detector). If `cdn.jsdelivr.net` is down, the EN fallback text in HTML still renders (the page is usable). But the locale toggle won't work and the i18next runtime never loads. Acceptable: jsdelivr's uptime is excellent; Cloudflare is the backbone; the EN fallback covers the failure mode.
- **`ar.json` ships with `[AR] ` placeholder values in L1.01.** Means AR mode shows `[AR] Sign In` etc. until L1.03 lands. Deliberate: makes the wiring visibly testable on day one without blocking on translation work. The cost is "AR mode looks broken until L1.03"; the benefit is "L1.01 closure isn't gated on Codex availability."
- **DOM substitution via `data-i18n` attributes means index.html grows in size.** Every visible string has both the EN fallback content AND a `data-i18n="key"` attribute. The HTML file went from ~621 lines to ~692 lines as a result. Cost: slightly more HTML to scan. Benefit: page renders if i18next fails to load.
- **Module-relative locale paths require `new URL('./locales/X.json', import.meta.url)`.** Slightly verbose syntax but the standard way to make module-relative `fetch` calls work in ES modules. Will recur if we add more JSON-loaded resources later.
- **Cache buster strategy** — JSON files have their own `?v=YYYYMMDDl` query string just like JS files. Same strict §14.3 rule applies: bump on every changed import where the consumer references the changed file. We pay this attention cost on every translation update; pays back as guaranteed-fresh fetches on GitHub Pages' aggressive cache.

### Useful resources
- [i18next official docs](https://www.i18next.com/) — start at "Getting Started" then "API" → `init` options.
- [i18next-browser-languagedetector docs](https://github.com/i18next/i18next-browser-languageDetector) — the `detection.order` array is the key knob.
- [jsdelivr `/+esm` documentation](https://www.jsdelivr.com/esm) — how the ESM transform endpoint works.
- [MDN: `import.meta.url`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta) — required reading for module-relative resource paths.
- [PROJECT_RULES.md §11 (Bilingual Content Discipline)](PROJECT_RULES.md) + [§13.4 (i18n key naming)](PROJECT_RULES.md) — the project's standing rules this work implements.
- [CONTENT_GUIDELINES.md §2 + §4 + §5](CONTENT_GUIDELINES.md) — the AR-side discipline the L1.03 Codex pass will enforce on top of the key skeleton L1.01 lands.

---

## [Phase R2, Task R2.11 wrap-up] — Firebase web API keys, GitHub secret-scanning false positives, and the three-layer access model
**Date:** 2026-05-28
**Contributor:** Claude (with project lead's hands-on GCP Console work)

### Technology / Library Introduced
- **GitHub Secret Scanning** — automated scanner that runs on every push to public repos, flagging strings matching known credential patterns (Google API keys, AWS keys, Stripe keys, etc.). Sends email alerts to repo owners. Useful for catching real leaks but doesn't know about vendor-specific exceptions like Firebase's public-by-design API keys.
- **GCP API Key restrictions (two-axis)** — restriction system applied to any Google API key from GCP Console → APIs & Services → Credentials:
  - **Application restrictions:** WHICH clients can use the key. Options: HTTP referrers (websites by URL pattern), IP addresses, Android apps, iOS apps, or None.
  - **API restrictions:** WHICH Google APIs the key can invoke. Lets you allowlist specific APIs (e.g., "Cloud Firestore + Identity Toolkit + Token Service only") so even a leaked key can't invoke Cloud Storage or other services.

### What it actually does (plain language)
Firebase web API keys (the `AIzaSy...` strings in your firebase config) are intentionally public — they identify the project but don't grant access. Access comes from three other layers:

1. **Firebase Security Rules** — the R2.05 ruleset on `tomodachi-prod` that controls which Firestore docs which authenticated UIDs can read/write. The actual security boundary.
2. **Firebase Auth authorized domains** — the list under Authentication → Settings that controls which page domains can run sign-in flows. We added `al-mo3tasem.github.io` for prod just before R2.11.
3. **GCP API Key restrictions** — the HTTP referrer + API allowlist set in GCP Console. The third defense layer; if you haven't set restrictions, an attacker with the key could potentially invoke un-allowlisted Google APIs that the project has access to.

Firebase docs explicitly state the web key can be public, and `PROJECT_RULES.md` §5.3 documents this. But the GCP restrictions layer needs explicit setup — it doesn't default to anything useful. The three new projects (dev/staging/prod) hadn't had this done during R2.01-R2.03 setup (we skipped past it). R2.11 surfaced the gap when GitHub's scanner ran on the cutover commit and emailed us.

The R2.11 wrap-up set HTTP referrer restrictions on `tomodachi-prod` (al-mo3tasem.github.io + future tomodachi.com domains) and `tomodachi-staging` (tomodachi-staging.pages.dev + future staging.tomodachi.com), plus API restrictions on all three projects (Identity Toolkit + Token Service + Firestore + Firebase Installations only). Dev got API restrictions only because GCP rejects `localhost` and `127.0.0.1` as valid HTTP referrer domains — accepted because dev has no production data and is only ever accessed from local machines.

### Alternatives considered
- **Move the API key out of the repo entirely (server-side proxy or env injection)** — would silence the GitHub alert but breaks the static-site model we built around. Rejected: massive over-engineering for a Firebase-as-intended use case.
- **Make `js/config/firebase.js` gitignored and inject at deploy time** — possible but adds CI/CD complexity, and we don't have a build step today. Also doesn't actually help: the key still ends up public in the deployed JS bundle on GitHub Pages. Rejected.
- **Apply GCP API Key restrictions** (the chosen path) — multi-layered defense in depth, matches Firebase's recommended model. Done in three Firebase consoles + three GCP consoles.
- **Disable the GitHub secret-scanning alert globally** — wrong: we want the alerts for genuine leaks (e.g., if someone accidentally commits a Cloud Functions secret in Phase L2). Dismiss this specific alert; keep the system on.

### Concepts to understand
- **"Public by design" vs "secret"** — most API keys (Stripe secret keys, AWS credentials, OpenAI keys) ARE secrets and need to stay server-side. Firebase web keys explicitly aren't; they're vendor-designed for client-side embedding. Knowing the difference per provider is the actual skill — don't apply universal "API keys are secrets" reasoning when the vendor has explicitly carved out the opposite.
- **HTTP referrer restriction caveats:** only works for browser-originated requests with a Referer header. Direct REST API calls (curl, Postman, custom scripts) can bypass it by setting or omitting the header. Useful as a deterrent for casual abuse, but not a cryptographic boundary. Real defense is Security Rules.
- **`localhost` cannot be a GCP referrer.** GCP rejects `localhost` and `127.0.0.1` as Application Restriction values because they're not public hostnames. For dev keys, set Application restrictions to "None" and rely on API restrictions only. Accepted because dev projects have no production data.
- **"Used in tests" dismissal reason on GitHub** is a close-but-not-quite fit for Firebase web keys; there's no "Vendor-recommended public key" option. The Firebase community generally picks "Used in tests" or "Won't fix" with an explanatory comment.

### Tradeoffs accepted
- **API key restrictions take ~5 minutes to propagate** globally after a Save. During R2.11 wrap-up, we set restrictions before pushing main to minimize the unrestricted-prod-key window. If we ever rotate a key (e.g., it's actually compromised), legitimate requests fail for 5 minutes until propagation catches up.
- **Dev key has weaker restrictions** than prod/staging (no referrer restriction, only API restriction). Localhost limitation; accepted because the dev project has no production data and breaches there are low-impact.
- **HTTP referrer restrictions can be spoofed** by malicious clients setting their own Referer header. UI-level deterrent, not a guarantee. The Security Rules layer is the real defense; restrictions are defense-in-depth.
- **The GitHub alert system will keep firing on future Firebase-related commits** (e.g., if we ever rotate a key and commit the new one). Each alert has to be reviewed and dismissed. Acceptable cost — alternative is global disablement which loses the system's value for actual leaks.

### Useful resources
- [Firebase: API keys best practices](https://firebase.google.com/docs/projects/api-keys) — official "API keys are public by design" doc.
- [GCP: Restricting API keys](https://cloud.google.com/docs/authentication/api-keys#restricting_an_api_key) — official restriction setup.
- [GitHub secret scanning docs](https://docs.github.com/en/code-security/secret-scanning) — how the alert system works and how to dismiss alerts.
- [docs/PROJECT_RULES.md §5.3](PROJECT_RULES.md) — our project's pre-existing position on Firebase config files being tracked + domain-restricted.

---

## [Phase L1, Task L1.20] — Self-heal logic, invariant drift, and "cleanup-after-race vs prevent-the-race" (v1 attempt + v2 fix in one day)
**Date:** 2026-05-28 (v1 and v2 both landed same day during Phase R2 escalation — see Progress Log)
**Contributor:** Claude (with project lead's "do the cleaner solution" approval after the bug bit us a third time, and then again when v1 didn't actually fix it)

### Technology / Library Introduced
- **The "self-heal" pattern for partially-completed flows** — client-side code that runs on auth-state changes (or page loads) and reconciles inconsistent state into a known-good shape. Common shape: "if the user has Auth but no Firestore profile, create one." Tomodachi's `ensureUserProfile` is the canonical example, originally written pre-R2.05 to recover from signups that succeeded at the Auth step but dropped before the Firestore writes.
- **The inflight-flag pattern for preventing listener-vs-mainline races** — a module-level `let _registrationInFlight = false;` that a mainline procedure sets at the start of a critical sequence and clears in `finally`. Event listeners that would normally fire on side effects of the mainline check the flag and defer their work. The mainline manually triggers the listener's normal post-action flow when it finishes successfully. v2 of the L1.20 fix.

### What it actually does (plain language)
Pre-R2.05, the invariant Tomodachi tried to maintain was "every user has both an Auth account AND a `users/{uid}` Firestore profile." `ensureUserProfile` worked by creating the profile if missing — straightforward recovery.

R2.05 added a third part to the invariant: "...AND a `usernames/{lower}` reservation that locks the username." The R2.05 signup flow honors this invariant by writing the usernames doc as the atomic gate step. But `ensureUserProfile` wasn't updated. When a signup failed mid-flow, two things would go wrong:

1. The `onAuthStateChanged` listener fired the moment Auth succeeded — before the usernames step had a chance to fail. `ensureUserProfile` saw "no users/ doc" and created a fallback profile with an email-derived username. No `usernames/` reservation. **The new invariant was silently broken** — a users/ doc with a username that nothing in usernames/ guarded.
2. The `handleRegister` cleanup, when the usernames step failed with permission-denied, deleted the Auth account but left the orphan users/ doc behind (because the cleanup only knew about Auth). **Real orphan in production data.**

### v1 attempt: clean up the orphan in `handleRegister`'s catch
The first fix (commit `6384526`) tried to make `handleRegister`'s cleanup smarter: when the usernames write fails, ALSO delete `users/{uid}` and `stats/{uid}` (best-effort, ignore-not-exist) before deleting the Auth account. Order matters because Firestore rules need auth.uid context, so Firestore-deletes have to run before Auth-delete. A new `reserveFallbackUsername` helper was added so `ensureUserProfile`'s self-heal would ALSO write a usernames/ doc when creating a fallback profile.

**This didn't work for the race itself.** Empirically confirmed on `tomodachi-dev` during R2.07 verification: the user attempted a collision signup, saw a flash of the dashboard for less than a second (proving the init flow had run to completion through `ensureUserProfile`), saw the "Username already taken" toast, but the orphan `users/` doc was still present after the dust settled. The cleanup's `deleteDoc(users/{uid})` ran BEFORE `ensureUserProfile`'s `setDoc(users/{uid})` had completed. The deletes were no-ops at the moment they fired; the racing writes landed afterward. Orphan persisted.

### v2 fix: prevent the race entirely with an inflight flag
The second fix (commit `cb48b64`) added `let _registrationInFlight = false;` at module level in `js/app.js`. `handleRegister` sets it `true` at the start of the registration sequence and clears it in `finally`. The `onAuthStateChanged` listener checks the flag at the top of its "if user" branch — if true, returns early without running the post-auth UI flow (which is what would trigger `ensureUserProfile`).

Since the listener is now skipped during registration, the race can't happen. `ensureUserProfile` doesn't run in this window, so it can't write orphan docs.

To handle the success case (where the user IS authed and should see the dashboard), we extracted the listener's "if user" body into `enterAppAsUser(user, isFreshRegistration)`. The listener calls it when not in registration; `handleRegister` calls it directly on success. The flag is the gate; the helper is the bridge.

### Why v2 is the right design (and v1 is the lesson)
- **Cleanup-after-race assumes the cleanup can win the race.** It can't always — the racing writes may be in-flight when cleanup runs, and there's no synchronization to wait for them. The deleteDocs see "no doc" and no-op; then the writes land. Orphan with no further cleanup scheduled. The race window between "listener decides to write" and "write lands" is invisible to cleanup-based code.
- **Preventing the race needs shared state.** The mainline has to signal to the listener that it's mid-operation. A module-level flag is the simplest cross-function signal in vanilla JS — no framework, no event emitter, just a `let`. Cost: one shared variable. Benefit: total elimination of the race window.
- **v2 also fixes the "flash of dashboard" UX.** Pre-v2, the init flow ran to completion during the brief Auth-then-failure window — the user saw the dashboard render briefly before snapping back to the register form. With v2, the listener skips during registration, so the dashboard doesn't appear until registration actually succeeds.
- **The lesson generalizes beyond this bug.** Anywhere an event listener can fire in response to side effects of a mainline procedure, and where both want to touch the same state, the inflight-flag pattern is more robust than after-the-fact cleanup. The flag costs one variable and a guard; cleanup costs you indefinite reasoning about race window widths.

### Alternatives considered (and why we ended up where we did)
- **(v1) Cleanup-after-race in `handleRegister`** — chose initially because it didn't require cross-function state. Shipped, then verified it didn't work (race-window narrower than cleanup-execution-time). Lesson learned.
- **(v2) Inflight flag preventing race** — chose ultimately because it actually works. Cost: module-level shared state + a small refactor extracting `enterAppAsUser`. Was originally listed as the "considered but deferred" alternative in v1's Learning Log entry — the deferral didn't survive contact with the failing v1 fix.
- **Server-side enforcement via Cloud Function** — write users + stats + usernames atomically in a Function on the server. Best correctness but requires Blaze tier and Functions deployment — same blocker that pushed us toward the doc-as-key pattern in R2.05. Future option for the Phase L1 registration gateway.
- **Drop `ensureUserProfile` entirely** — remove the self-heal, trust signup to complete or fail atomically. Rejected: there's a real recovery use case (a previously-broken signup can be retried by re-login). Keep the self-heal, just don't let it race.

### Concepts to understand
- **Invariant drift** — when a refactor changes WHAT INVARIANTS a system maintains, every piece of code that touches those invariants needs review. R2.05 changed the user-state invariant from 2-part to 3-part; `ensureUserProfile` was the piece I forgot to audit. Future refactors: list the invariants before/after explicitly; grep for every code path that creates or modifies any piece of them.
- **Listener-vs-mainline race** — `onAuthStateChanged` is event-driven; `handleRegister` is procedural. They run "in parallel" from the mainline's perspective. The listener doesn't know whether the mainline is mid-operation. Either (a) the mainline must defend against the listener (cleanup approach we tried in v1 and found wanting), or (b) the listener must defer to the mainline (flag approach in v2). Listener-deferral wins because race windows are inherently undefined-width; cleanup can't reliably close one it doesn't synchronize with.
- **Why cleanup-after-race is seductive but wrong** — it FEELS right because you're undoing the bad state. But the bad state hasn't been WRITTEN yet when your cleanup runs. The writes are queued, in flight, or about-to-be-issued; the cleanup sees the pre-write state and no-ops; the writes land afterward; you have the bad state with no further cleanup scheduled.
- **Best-effort cleanup with per-operation `try/catch`** — when cleaning up after a failure (in any context), each cleanup step can itself fail. Wrap each step in its own try/catch so one failure doesn't abort the others. Verbose but correct. Still used in v2 as defensive code even though the race is prevented.
- **Graceful degradation under rule-deny** — the v1+v2 `reserveFallbackUsername` helper retries the username write up to 10 times and degrades to "no reservation" if all fail. Makes the code robust against running on projects with different rules (R2.05 ruleset vs the legacy hardened ruleset on `hiraquest0`). The degraded user still gets a profile and can play — just without the uniqueness lock.

### Tradeoffs accepted (v2)
- **Module-level mutable state** (`_registrationInFlight`). Vanilla JS pattern, no framework. If the codebase grows to use a state library (Zustand, etc.) this could move there. For now, a `let` at module top is the simplest signal that crosses function boundaries.
- **`enterAppAsUser` refactor adds an indirection.** The original init's "if user" body is now a separate function. Net: ~30 LOC more, but the function is reusable (both the listener and `handleRegister` call it) and the responsibility is clearer.
- **The cleanup logic in `handleRegister`'s catch is now mostly redundant.** With v2, `ensureUserProfile` doesn't race in, so the users/stats deletes are no-ops in the common case. Kept as defensive code for edge cases (e.g., future code paths that might write `users/` before the usernames step, or recovering from pre-v2 orphan states that linger in browser-cache scenarios).
- **`reserveFallbackUsername`'s 10-attempt retry can take ~10 seconds on a slow connection** — each attempt is a round-trip to Firestore. In practice it succeeds on the first try in real usage. The retries only matter on legacy rule-deny projects (`hiraquest0`) and on actual collisions (which are rare for fallback names since fallback names are email-local-parts).

### Useful resources
- `js/app.js` `_registrationInFlight` + `enterAppAsUser` + `handleRegister` + `ensureUserProfile` + `reserveFallbackUsername` — the v2 L1.20 fix as landed.
- `docs/Firestore_Rules.md` `hiraquest0` carve-out section — explains why `reserveFallbackUsername` needs the graceful-degradation path.
- [Firebase Auth onAuthStateChanged docs](https://firebase.google.com/docs/auth/web/manage-users#get_the_currently_signed-in_user) — when the listener fires and what state it sees.
- Commits `6384526` (v1, superseded) and `cb48b64` (v2, landed) — the diff between them is a compact case study of "cleanup-after-race vs prevent-the-race" as a recurring design choice.

---

## [Phase R2, Task R2.06] — Cloudflare Workers vs Pages: when to use which (and how to tell what you created)
**Date:** 2026-05-28
**Contributor:** Claude (with project lead's hands-on discovery of the difference)

### Technology / Library Introduced
- **Cloudflare Workers** — Cloudflare's serverless runtime for executing JavaScript / TypeScript code at the edge. Workers are *programs*: you deploy code that runs in response to requests, can call upstream services, transform data, route requests, etc. Default URL: `<worker-name>.<account-subdomain>.workers.dev` (e.g., `tomodachi-staging.moutasem-hamdi14.workers.dev`).
- **Cloudflare Pages** — Cloudflare's static site hosting product. Pages projects connect to a Git repo and auto-deploy a designated branch's contents as static files. No code execution involved (unless you add Pages Functions, which are Workers-under-the-hood). Default URL: `<project-name>.pages.dev` (no account subdomain).
- **The unified "Workers & Pages" dashboard** — as of 2024-2025 Cloudflare merged the two products' admin UIs, which means the Create flow may not visually distinguish them well. The URL pattern after creation is the unambiguous tell of which product you actually got.

### What it actually does (plain language)
We wanted Cloudflare Pages: a no-code static site host that auto-deploys our `staging` branch every time we push to it. The setup steps should be: create a Pages project → connect to GitHub → pick the branch → set build config (none for vanilla static) → save and deploy. Cloudflare provisions a `tomodachi-staging.pages.dev` URL, and every push to the `staging` branch triggers an auto-rebuild.

What actually happened on first attempt: the dashboard's "Create application" flow steered toward Workers instead of Pages. Workers also has a Git-connect option ("Workers Assets" or similar), so the flow looks superficially similar — but the result is a worker that serves static files, deployed under a `<worker>.<account>.workers.dev` URL. Functionally it could host our site, but the URL pattern matters for us because our hostname-based environment selector in `js/config/firebase.js` only recognizes `.pages.dev` as staging. A `.workers.dev` URL falls through to the default `prod` branch, which silently routes the app to `hiraquest0` (live production) instead of `tomodachi-staging`. The misdirection was invisible at the URL bar but visible in `[firebase-init]` console output once we knew to look.

The fix: delete the Worker, find the Pages-specific entry point in the Create flow (which may be a small badge / tab / link, not the prominent button), and recreate as a Pages project. The URL after Save and Deploy is the unambiguous verification — `.pages.dev` means Pages, `.workers.dev` means Worker.

### Alternatives considered
- **Use Workers instead and update the selector to recognize `.workers.dev`** — would have technically worked. Rejected because (a) it normalizes the wrong setup choice for future Pages projects we might create, (b) Pages is purpose-built for our use case (static site, no server-side logic), (c) the URL `tomodachi-staging.pages.dev` is more brand-aligned for the eventual `staging.tomodachi.com` swap in R3.
- **Move to a different static host (Netlify, Vercel)** — both work, both have similar GitHub-integrated auto-deploy. Rejected: we're already in the Cloudflare ecosystem for the future `tomodachi.com` purchase + the Pages-to-tomodachi.com cutover; no reason to add another vendor.
- **Run our own static-file server somewhere** — extreme overkill for a 200KB static site.

### Concepts to understand
- **URL pattern as architectural signal.** `<project>.<account>.workers.dev` and `<project>.pages.dev` aren't just cosmetic — they encode what the URL is actually serving. Workers always include the account subdomain because each account has its own worker namespace; Pages project URLs are globally unique by project name (claimed first-come-first-served). When debugging "why isn't my deploy working as expected," the URL pattern tells you most of what you need to know.
- **Hostname-based env selection × deploy-target URLs.** The hostname-based selector pattern (introduced in R2.04) makes assumptions about what hosts will serve what environments. Those assumptions are baked into the selector code. Any change to the deploy URL (different host, different subdomain pattern, new custom domain) requires a corresponding selector update. R2.06's misstep was a deploy URL that the selector didn't recognize, silently falling through to the default — a category of bug worth being alert to for future infrastructure changes.
- **Cloudflare Pages "production branch" terminology.** Cloudflare uses this term for the branch they auto-deploy to the canonical URL. For us, that branch is `staging`, not `main` — Cloudflare's "production" ≠ our "production." Naming collision worth holding in your head when configuring the project.
- **Worker self-served URL vs Pages self-served URL.** A Worker can serve at `*.workers.dev` (default), at a Worker Route on a custom domain, or behind a Cloudflare WAF rule. A Pages project serves at `*.pages.dev` (default) and at custom domains added in the Pages project settings. The R3 phase will add `staging.tomodachi.com` to the Pages project specifically.

### Tradeoffs accepted
- **Cloudflare may evolve their UI further.** Today's distinguishing entry points may shift over the next ~6 months. The check "is the URL `.pages.dev` or `.workers.dev`?" is the durable signal regardless of UI changes. If a future migration changes the URL pattern entirely, both the deploy and the selector need an update.
- **No build step on this Pages project.** Vanilla JS, no transpilation, no bundling. Cloudflare runs through the Pages build pipeline in <30 seconds because there's literally nothing to build. If we ever add a build step (esbuild, Vite, etc.), the Pages build config will need a `build command` and possibly an output directory other than `/`.
- **Two separate auto-deploy pipelines for the same repo.** `main` → GitHub Pages (prod URL); `staging` → Cloudflare Pages (staging URL). Each requires its own monitoring, its own DNS, its own auth domain whitelist in Firebase. The complexity buys us a real staging environment, which is worth it — but it's complexity worth holding in your head.

### Useful resources
- [Cloudflare Pages docs](https://developers.cloudflare.com/pages/) — official.
- [Workers vs Pages comparison](https://developers.cloudflare.com/pages/migrations/migrating-from-workers/) — Cloudflare's own writeup of when to use which.
- [docs/Firestore_Rules.md hiraquest0 carve-out](Firestore_Rules.md) — the R2.05 ruleset's note on why hiraquest0 stays on its old catch-all; relevant because R2.06's failed first attempt accidentally wrote to hiraquest0, which the carve-out's catch-all silently permitted.

---

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
