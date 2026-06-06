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

## 2026-06-06 — L2.04 — Interactive content authoring CLI shipped
**Status:** ✅ DONE
**Scope:** Code | Docs
**Summary:** Built `scripts/author_content.js` — the L2.04 interactive content-authoring CLI that walks one item at a time and gates every Firestore write on the L2.03 validators. Architecture per the upfront plan: Codex paste-in mode (the CLI prints a per-content-type prompt with all CONTENT_GUIDELINES style rules baked in; the lead runs Codex elsewhere and pastes JSON back — no API integration in the CLI), hybrid input (short fields inline via readline, long fields shell out to `$EDITOR`), manifest-driven work queue (`scripts/manifests/<jlpt>_<type>.json`), per-env progress JSON for resume after Ctrl-C (`scripts/progress/author_progress.<env>.json`, gitignored). Per-type form definitions cover all seven content types (hiragana, katakana, vocab, kanji, grammar, listening, radicals). Production writes require explicit `y` confirmation per item in addition to `[a]ccept`. Dialect markers from `detectArabicDialectMarkers` were demoted from blocking to warning-only in the CLI consistent with the user's voice rule (common conversational AR, not strict فصحى) — the lead decides per item.

Two notable implementation calls during the build:
1. Switched the readline wrapper from `readline/promises` to the plain `readline` + `Symbol.asyncIterator` pattern after the promises API was found to hang on the second sequential read with piped stdin. The AsyncIterator pattern handles both TTY and piped input cleanly.
2. Partitioned validator errors in the CLI: errors with messages starting "dialect markers detected" are routed to the warning channel; everything else is blocking. This is a CLI-layer choice that doesn't change the L2.03 validator API.

**Files / Areas:** `scripts/author_content.js` (new), `scripts/lib/admin.js` (new — Admin SDK + env routing), `scripts/lib/codex.js` (new — paste-in prompt templates per content type), `scripts/lib/manifest.js` (new — manifest loader + progress tracking), `scripts/lib/prompts.js` (new — readline + `$EDITOR` + per-type form definitions), `scripts/manifests/README.md` + `scripts/manifests/_sample_vocab.json` (tracked), `scripts/README.md` (numbered setup instructions for service accounts + `$EDITOR`), `scripts/package.json` + `scripts/package-lock.json` (firebase-admin@^13), `.gitignore` (adds `scripts/{node_modules,progress,secrets,tmp}/`), `docs/Phases_and_Tasks.md` (L2.04 marked DONE).
**Verification:** End-to-end dry-run smoke tests on the 5-item sample manifest, with three scenarios — (a) clean valid vocab item: Codex paste accepted → validators pass → dry-run write to `dev:content_sets/vocab/items/n5_v_001_eat` → progress entry written; (b) item with only dialect markers (e.g., يلّا): validators pass, dialect warning shown but non-blocking, accept succeeds; (c) structurally invalid item (12 missing fields): validator surfaces all 12 errors, `[a]ccept` rejected with "cannot accept — fix validation errors first", item skipped. Resume verified: second run with same manifest correctly shows `1 authored, 0 skipped, 4 pending` and starts at item 2.
**Open Follow-up:**
- L2.05 — hiragana mnemonics. Workflow corrected on 2026-06-06 after the project lead reminded that content drafting is Codex's job, not the lead's keystrokes. Flow: (a) Claude wrote `docs/codex-spec-l2-05-hiragana-2026-06-06.md` framing brand stakes, requiring web research, and ending with "write result to scripts/output/codex-l2-05-hiragana.json"; (b) project lead runs Codex against the spec; (c) Claude reviews the output for translationese / dialect / cultural fit; (d) project lead runs CLI with new `--prefill=<path>` flag to walk all 104 items with Codex drafts pre-loaded, tweaking + committing one at a time. Service account is now in place at scripts/secrets/service-account.dev.json.
- L2.07+ vocab/kanji/grammar manifests need to be authored — manifest pattern + format docs are at `scripts/manifests/README.md`. Same Codex-spec-then-prefill workflow.

---

## 2026-06-05 — L2.01 + L2.02 + L2.03 — Phase L2.A design gate locked
**Status:** ✅ DONE
**Scope:** Docs | Code
**Summary:** Phase L2.A design-docs gate satisfied. Wrote `docs/LEARNING_EXPERIENCE.md` v1.6 (learner journey — onboarding, linear path, mastery, SM-2 algorithm with `reps ≥ 5` mastery threshold, retry budget, in_progress doc with `userAnswer` + `questionType` per item, exitReason-gated session-exit commit) + `docs/GAMIFICATION_DESIGN.md` v1.6 (flat XP per action, flatter `120 * N^1.8` 100-level curve, 22 badges as hybrid 16-visible + 6-surprise, soft streak with 1/3-per-month freezes + 48h grace + shared settleStreakIfNeeded transaction, unified XP-based weekly/monthly/all-time leaderboards, server-authoritative game sessions with honest threat model, optimistic UI vs server-re-grade commit rule). Both docs hardened through 5 external-agent code-review passes; ~40 findings across both addressing real architectural issues (xpEventLog forgery, game_sessions answer leak, streak settlement race, unconditional completion writes, missing userAnswer field, etc.). L2.03 then locked Firestore schemas: `docs/Tomodachi_Master_Plan.md` §4 rewritten as v2.0 covering 13 collections including new `content_sets/lessons/{lessonKey}`, `users/{uid}/in_progress/{sessionKey}`, `users/{uid}/committed_events/{eventId}`, `users/{uid}/quests/{date}`, `users/{uid}/content_feedback/*`, plus the rewritten server-only `game_sessions/{sessionId}` (read-denied + write-denied) and unified `leaderboards/{period}/{periodKey}/*`. Validators in `js/validators/content.js` (new, tracked) cover all 7 content types with key-format regexes, field-shape checks, JLPT/enum validation, kanji two-mnemonic structure, and AR dialect detection per CONTENT_GUIDELINES §5.
**Files / Areas:** `docs/LEARNING_EXPERIENCE.md` (new, v1.6), `docs/GAMIFICATION_DESIGN.md` (new, v1.6), `docs/Tomodachi_Master_Plan.md` §4 (v1.0 → v2.0), `docs/Phases_and_Tasks.md` (L2.03 marked DONE), `js/validators/content.js` (new), `js/validators/` (new directory).
**Verification:** `node --check js/validators/content.js` passes; smoke tests confirm valid items pass, invalid items surface all field errors, AR dialect detection catches forbidden markers, kanji two-mnemonic structure enforces `mnemonic.{en,ar}.{meaning_story,reading_story}` shape, lesson validator enforces `lessonKey` + `globalOrder` + ≤12 items.
**Open Follow-up:**
- L2.04 — interactive content authoring CLI (`scripts/author_content.js`) — next task. Will consume `validateContentItem(type, item)` from the new validators module.
- L2.05+ content authoring marathon (kana mnemonics, N5 vocab, N5 kanji, N5 grammar, listening drills) gated on L2.04.
- L2.13 lesson screen + the migration script (`scripts/migrate_v1_to_v2.js`) for v1.0→v2.0 Firestore migration both blocked on L2.04 + L2.05+ producing real content.
- `firestore.rules` full ruleset implementation deferred to L2.13 (per Master Plan §4.16 — the access matrix is canonical, the rule file gets written when implementation begins).

---

## 2026-06-01 — Phase L1 — CLOSED (L1.21)
**Status:** ✅ PHASE COMPLETE
**Scope:** Phase closure
**Summary:** Phase L1 (Commercialization — Landing + Waitlist + Bilingual SEO + Brand Identity) is officially closed. Started 2026-05-28 immediately after Phase R2 (Firebase 3-environment topology). All in-scope tasks shipped to code, ten of them already verified live; the remaining three (L1.09 deploy, L1.17 git push, L1.18 outreach) are mechanical wraps awaiting the project lead's hands. Phase L2 (Content authoring — kana, vocab, kanji) begins next.

**Task completion (L1.01-L1.21):**

| ID    | Task                                                        | Status |
|-------|-------------------------------------------------------------|--------|
| L1.01 | i18next setup + en/ar JSON skeleton + locale toggle         | ✅ DONE |
| L1.02 | RTL infrastructure + Cairo AR font                          | ✅ DONE |
| L1.03 | AR translations for every key (Codex Spec C + Claude review)| ✅ DONE |
| L1.04 | Landing-page hero (bilingual) + waitlist UI shell           | ✅ DONE |
| L1.05 | Three feature cards (Codex Spec D copy + animated borders)  | ✅ DONE |
| L1.06 | Screenshots section frame + premium phone-frame placeholders| 🔵 FRAME DONE (real captures pending L2 content reseed) |
| L1.07 | FAQ section with native one-at-a-time accordion             | ✅ DONE |
| L1.08 | Brevo waitlist integration (Cloud Function + client)        | ✅ DONE + LIVE |
| L1.09 | Visible counter (real Brevo count + 350 baseline, 1000 cap) | ✅ CODE DONE / ⏳ functions deploy pending |
| L1.10 | Cookie consent banner + customize modal (Consent Mode v2)   | ✅ DONE |
| L1.11 | GA4 + Consent Mode v2 (Measurement ID `G-W98QV657BE`)       | ✅ DONE (post-deploy real-time dashboard verification awaited) |
| L1.12 | SEO baseline (meta + JSON-LD + sitemap + hreflang)          | ✅ DONE |
| L1.13 | ToS + Privacy + Cookies (in-house EN draft + Codex Spec G AR)| ✅ DONE |
| L1.14 | Sentry integration (DSN in `.de` region, EU data residency) | ✅ DONE (post-deploy verification awaited) |
| L1.15 | Logo + brand identity (scarf-motif Direction C + palette)   | ✅ DONE |
| L1.16 | PWA install manifest + deferred-prompt UX                   | ✅ DONE |
| L1.17 | Staging → prod deploy                                       | ⏳ Awaiting `git push` + `firebase deploy --only functions` |
| L1.18 | Seed first 50 waitlist signups                              | ⏳ Project lead — 5 personal contacts first wave |
| L1.19 | `saveProfileSettings` atomic refactor                       | ✅ DONE (closed in R2 carry-over) |
| L1.20 | `ensureUserProfile` honor `usernames/` invariant            | ✅ DONE (closed in R2 escalation) |
| L1.21 | Phase L1 closure (this entry)                               | ✅ THIS ENTRY |

**Key phase outcomes:**

- **Bilingual EN+AR landing page** with full RTL, locale toggle persistent across visits via localStorage, Cairo font for AR, JSON-LD structured data in both languages. ~410 i18n leaf keys, parity-balanced.
- **Live waitlist** capturing real email signups into Brevo list ID 2 with `LANG` / `SOURCE` / `SIGNUP_DATE` custom attributes — domain blocklist (30 disposable providers) + structured-error responses + premium-modern loading + inline success state.
- **GA4 + Sentry** with Consent Mode v2 gating, both lazy-loaded, both consent-aware. GA4 fires `page_view` + `waitlist_signup` events; Sentry attaches user context only when consent + sign-in both true.
- **Three policy pages** (Privacy / Terms / Cookies) drafted in Tomodachi voice, naming the actual stack (Firebase / Brevo / GA4 / Sentry) instead of generic boilerplate. Bilingual via Codex Spec G + Claude review.
- **Premium brand identity** locked: scarf-motif logo (Direction C — the embrace), warm scarf-crimson palette retiring generic-startup indigo, full SVG asset set (logo, favicon, OG card PNG-converted for OG-scraper reliability), wired through manifest + meta tags + Twitter `summary_large_image` upgrade.
- **Three-environment Firebase + GCP topology** in production: `tomodachi-prod` on Blaze with $1/mo budget cap, Secret Manager holds Brevo API key, environment-specific Cloud Functions URL switching via `js/config/functions.js`.

**Lessons worth carrying forward:**
1. **External-tool walkthroughs go in chat with numbered steps + verify pricing claims before recommending.** The PrivacyPolicies.com pricing flap cost us ~30 min of rework. Going forward: any "free tier" claim gets verified by checking the actual signup flow before recommending.
2. **Cloud Functions + IP-based vendor allow-lists don't mix.** Brevo's "Authorized IPs" feature blocked the first live call (Google Cloud egress IPs rotate). Solution: disable per-API-key IP restrictions for any vendor we hit from serverless platforms. Document this in `PROJECT_RULES.md` §6 as a precondition for any future vendor integration.
3. **SVG OG images break on social-media scrapers without Japanese fonts.** Facebook rendered the 友 character as its Unicode codepoint "53CB". Solution: convert OG images to PNG via online tool (cloudconvert.com worked, 5-min effort). For favicon stays SVG — browsers load system Japanese fonts. **PNG for OG, SVG for everything else** is the rule going forward.
4. **Locked the Codex-direct-file-output pattern.** Codex writes outputs directly to file paths instead of returning copy-paste in chat. Saves project lead the manual integration step. Specs A/B/C/D/G all used this pattern successfully.
5. **The 5-friend pre-launch test BEFORE the LinkedIn post is the right move.** 2500 LinkedIn connections is one-shot social capital — burning it before L2 content ships would dent the brand. The 5-friend wave is the QA pass; LinkedIn waits for Phase L3 or beyond.

**What remains open (carried to future phases):**

- **L1.06 — Real screen captures** for the screenshots section. Awaits L2 content reseed so the captured screens have meaningful Japanese content visible. Re-capture in EN + AR locales, optimize to WebP ~150KB each, swap into the existing placeholder slots. Small content-only commit.
- **L1.09 — Live verification post-deploy.** The function code is in place; the deploy is one `firebase deploy --only functions` away from going live.
- **L1.11/L1.14 — Real-data verification.** GA4 Real-Time dashboard + Sentry Issues page should both show traffic / events after first 24 hours of live usage. If anything misfires (CSP issues, consent-banner regression, etc.), surfaces here.
- **OG card PNG re-render** at higher quality if any platform shows artifacts. Current PNG was a one-shot cloudconvert.com export at 1200×630. If we want font-tighter rendering or want to add platform-specific variants (Twitter @ 1200×600, LinkedIn @ 1200×627), defer to a future "brand polish" round.
- **Phase R3 housekeeping** items deferred from R2 still pending — the dated `hiraquest0` carve-out cleanup in `docs/Firestore_Rules.md` is scheduled for on/after 2026-06-27 (Firebase 30-day grace expires).
- **`firebase-functions` + Node runtime upgrade** — current `functions/package.json` pins `firebase-functions@^6.0.0` + `"node": "20"`. Node 20 is deprecated 2026-04-30, decommissioned 2026-10-30. Schedule the upgrade pass for July-August 2026 — bump to Node 22 + `firebase-functions@latest`.
- **ESLint 9 flat-config migration** for `functions/` — currently the predeploy lint hook is disabled because `.eslintrc.json` is incompatible with ESLint 9. ~10-min cleanup: add `eslint.config.js` + `@eslint/js` devDep + re-enable predeploy. Defer to next maintenance window.

**Phase L2 begins next:** content authoring per `CONTENT_GUIDELINES.md` — kana cards, JLPT N5 vocab, kanji with two-mnemonic structure (meaning story + reading story, AR-parallel-authored). See `docs/Phases_and_Tasks.md` Phase L2 for the task spine.

---

## 2026-06-01 — Phase L1.15: scarf-motif logo locked in + full brand-palette migration
**Status:** ✅ DONE (code, assets, palette migration)
**Scope:** Brand | Assets | HTML | CSS | Manifest | OG/Twitter
**Summary:** Direction C (The Embrace) from the second concepts round, with knit-stitch texture as the only polish on top, locked in as the production mark. Inspired by Mikasa's red scarf from Attack on Titan as a friendship motif — the form itself is in the visual commons; we use it without naming the IP. To viewers who know, it lands instantly; to anyone who doesn't, it reads as a warm protective garment cradling the 友 character. Brand palette migrated from generic-startup indigo + sakura-rose to scarf-crimson + warm tan — fully cascaded through CSS variables and the small handful of raw rgba() values that bypassed them.

**Files (cache busters cascade `?v=20260601c` for changed-target consumers):**
- **NEW:** `assets/brand/logo.svg` — primary mark, 240×280 viewBox. Two-layer scarf cradle (deep `#7F1D1D` shadow + `#B91C1C` knit-textured front), top-fold highlight in `#DC2626`, two trailing tails (crimson on left, deeper on right for depth), 友 character above in Noto Sans JP 900. Includes `<pattern id="knit">` for cable-knit ribbing + `<filter id="fabric-noise">` for the organic fabric break-up. Texture is visible at primary-mark size, gracefully fades to solid red at favicon size due to subpixel rendering.
- **REPLACED:** `favicon.svg` (root) — same composition as logo.svg but on a rounded warm-paper `#FAF8F2` background so the mark stays visible on browser tab bars regardless of background color. 100×100 viewBox.
- **NEW:** `assets/brand/og-card.svg` — 1200×630 social-preview card. Soft warm-paper radial-gradient background, scaled-up logo on the left (with stronger knit pattern since canvas is huge), three-line text block on the right ("Tomodachi" 84pt + "Learn Japanese with friends." 34pt + descriptor 26pt × 2 lines), subtle URL stamp at the bottom-right. This closes the L1.12 follow-up #1 ("real og:image — deferred from L1.12 until L1.15 ships").
- `index.html` — four 🏯 emoji replaced with `<img src="assets/brand/logo.svg?v=...">` (landing nav line 93, landing footer line 268, auth-screen brand line 295, dashboard nav line 368). New `<meta property="og:image">` + `og:image:width/height/alt`. Twitter card upgraded from `summary` to `summary_large_image` with matching `twitter:image` + alt. New `<meta name="theme-color" content="#B91C1C">` for mobile-browser chrome.
- `privacy.html`, `terms.html`, `cookies.html` — favicon link cache-buster bumped to match.
- `manifest.json` — `theme_color: #4F46E5` → `#B91C1C`, `background_color: #F5F5F7` → `#FAF8F2`. PWA icon path stays at `favicon.svg` (the new file).
- `css/style.css` — palette migration. The five brand tokens at `:root` rewritten:
  - `--brand-primary` indigo `#4F46E5` → scarf crimson `#B91C1C`
  - `--brand-primary-deep` indigo `#4338CA` → scarf deep `#7F1D1D`
  - `--brand-primary-soft` indigo wash → scarf wash `rgba(185, 28, 28, 0.10)`
  - `--brand-accent` sakura `#EC4899` → warm tan `#C8A975`
  - `--brand-accent-soft` rose wash → tan wash `rgba(200, 169, 117, 0.10)`
  - `--brand-amber` unchanged
  - **NEW:** `--brand-paper #FAF8F2` for explicit warm-cream references
  Five raw rgba() values that bypassed the variables also migrated: hero mesh gradient (lines 2509-2512), card-shadow stack (lines 2862-2863), policy-page background gradient (lines 3321-3322). New CSS rules for `.brand-icon img`, `.landing-brand-icon img`, `.nav-icon img` so the new SVG mark sits at the right size in each context.

**Design decisions:**
- **Knit texture as the only polish on C.** User explicitly said "i like it already" — so no compositional changes. Texture added because it elevates the scarf from a flat shape to a believable object, and it degrades gracefully at small sizes (the pattern just becomes solid color, no broken micro-detail).
- **AoT signal handled by visual cues only.** No name, no logo, no character. The shape of the scarf + the crimson color do the work for viewers who recognize them. For viewers who don't, the mark reads as "scarf cradling 友" — still on-brand for a friendship-themed app.
- **Texture applied only to the scarf, not the 友.** The character stays clean black ink, anchoring the composition and remaining legible at every size.
- **One favicon, used everywhere.** Rather than maintain separate favicon / header / app-icon files, the favicon.svg serves all three contexts via different `<img>` sizings. SVG scales perfectly; one source of truth, less drift over time.
- **Theme-color metadata everywhere.** Both `<meta name="theme-color">` (browser chrome) AND manifest `theme_color` (PWA on Android), both set to the scarf crimson. Means the address bar color, status bar, and the Chrome "install app" UI all match the brand now.

**Automated checks (all green):**
- All three SVG assets serve 200 on the local http.server smoke test.
- `index.html` references `assets/brand/logo.svg` exactly 4 times (matching the 4 emoji replacements).
- `manifest.json` parses as valid JSON.
- CSS migration verified: **5 rgba(185, 28, 28, ...) scarf references** present (gradient stops + shadow); **0 rgba(79, 70, 229, ...) indigo references** remaining; **0 #4F46E5 hardcoded indigo references** remaining.
- Favicon cache-buster bumped consistently across `index.html` + `privacy.html` + `terms.html` + `cookies.html`.

**Open Follow-up:**
1. **`firebase deploy --only functions`** still pending from L1.09 — that ships the live `getWaitlistCount` so the hero counter starts ticking up.
2. **`git push` to main** to ship everything else (logo, palette, policies, GA4/Sentry config) live via GitHub Pages auto-deploy. Order doesn't matter — functions and static deploy independently.
3. **OG card PNG fallback** — `og-card.svg` is SVG, which most modern platforms (Slack, Discord, modern WhatsApp) render correctly. **Twitter and Facebook still prefer PNG/JPG**, though they degrade gracefully. If the OG card looks broken on Twitter/Facebook previews after deploy, follow-up to convert SVG → PNG via an online tool (sharp / inkscape / squoosh.app) and update the `og:image` URL to the PNG version. Acceptable as a sub-hour follow-up; not blocking the L1 close.
4. **Smoke-test the live mark** — after `git push`, open the live landing in a few browsers (Chrome, Safari, Firefox, mobile Safari) and confirm the SVG renders crisply. Check the OG preview in Twitter card validator and Facebook OG debugger.
5. **Locked palette → AR aesthetic check** — the Cairo font on the AR landing will look different against scarf-crimson than it did against indigo. Visual review post-deploy; if anything reads off, a per-locale CSS tweak is easy.

---

## 2026-06-01 — L1.09 (counter) + L1.15 (logo concepts) shipped
**Status:** ✅ CODE DONE for both / ⏳ WAITING (project lead deploys L1.09 functions + picks A/B/C for L1.15)
**Scope:** Cloud Functions | Client | Brand
**Summary:** L1.08 verified end-to-end on prod (fresh email with `LOCALE=AR` round-tripped to Brevo with all three custom attributes populated). Moving to the parallel L1.09 + L1.15 round. L1.09 adds the `getWaitlistCount` HTTPS function and wires the hero counter to display real Brevo count + 350 baseline capped at 1000. L1.15 produces three distinct visual logo directions ("Calligraphy" / "Geometric" / "Bond") as a single side-by-side preview HTML for project-lead pick.

**L1.09 files:**
- `functions/index.js` — new exported `getWaitlistCount` HTTPS function. GET endpoint, same CORS allow-list + secrets binding as `submitWaitlist`. Calls Brevo `GET /v3/contacts/lists/{listId}` and surfaces `body.totalSubscribers` only (blacklisted contacts excluded from the social-proof number). Returns `{ ok: true, count }` on success or a structured error code on failure. No in-function caching — pre-launch traffic doesn't justify it.
- `js/app.js` — new `WAITLIST_DISPLAY_CAP = 1000` constant + `cachedWaitlistRealCount` module-level cache + `computeDisplayCount()` helper. `renderHeroCounter()` now uses `computeDisplayCount()` instead of the bare baseline. New async `fetchAndApplyWaitlistCount()` fires once at landing-page boot — silently upgrades the displayed number from baseline-only to real + baseline once Brevo returns. Silent failure on error (counter is decorative; no toast / error UI).
- `index.html` — `app.js` cache buster → `?v=20260601b`.

**L1.09 design decisions:**
- **Render baseline first, then upgrade.** The page never shows a blank counter or a "loading…" placeholder. Visitor always sees `350+` (or higher) immediately; the number quietly shifts up by 5-50 once Brevo responds.
- **350 baseline + 1000 cap, both in the client.** Server returns raw count from Brevo; client owns the display math. Keeps the function pure and the display logic with the rest of the landing copy.
- **Silent fallback to baseline-only on error.** A counter is social proof, not load-bearing UI. A "Couldn't reach the server" error here would be uglier than a slightly-stale "350+".

**L1.15 deliverable:** `assets/brand/concepts.html` — self-contained preview file. Three concepts:
- **A — Calligraphy.** Bold 友 in Noto Sans JP weight 900 on warm paper, sakura-rose dot in upper-right (ink-seal feel). Cormorant Garamond serif wordmark. Vibe: editorial premium, Muji + Murakami.
- **B — Geometric.** 友 in solid indigo rounded square, sakura-rose accent dot. Tight Inter Bold wordmark. Vibe: Linear/Notion/Vercel — but with a heart.
- **C — Bond.** Two overlapping circles (indigo + sakura, mix-blend-mode multiply) with 友 in the intersection. Inter Bold wordmark. Vibe: the multiplayer/co-op promise pictured literally.

Each concept shows: large primary mark, header lockup (light + dark backgrounds), 32px + 16px favicon sizes, plus a strengths/tradeoffs panel. Decision bar at bottom prompts A/B/C pick.

**Automated checks (all green):**
- `node --check` clean on `app.js`, `functions/index.js`.
- `assets/brand/concepts.html` serves (HTTP 200 via local http.server) with all 3 concepts rendering.

**Open Follow-up (project lead actions):**

1. **Pick a logo direction** — open `assets/brand/concepts.html` in your browser (double-click the file, or via the local http.server you may already have running). Open the live landing alongside it. Pick A, B, or C. Tell me the choice; I produce the final SVG + favicon.svg + icon-192.png + icon-512.png + og-card.png, wire them into the manifest + index.html + sitemap.

2. **Deploy L1.09** — same flow as the L1.08 deploy:
   ```powershell
   cd "d:\MO3 LAP\MyProjects\Tomodachi"
   firebase deploy --only functions
   ```
   This time deployment is fast (~30 sec) because Cloud Build has already provisioned. The CLI will detect that `submitWaitlist` is unchanged and that `getWaitlistCount` is new, deploy only the new one. After deploy, the live landing's counter will quietly tick up to `<real> + 350` on the next page load.

3. **Static-site push** can happen anytime after these two steps — `git push` to `main`, GitHub Pages auto-deploys. Will pick up: L1.09 client changes + L1.13b policies + L1.11/L1.14 config + cache-buster bumps. (No specific order needed; the static side and the functions side deploy independently.)

---

## 2026-06-01 — L1.11 + L1.14: GA4 Measurement ID + Sentry DSN filled in (project lead setup complete; deploys awaited)
**Status:** ✅ DONE (config in place) / ⏳ WAITING (push to live + smoke-test on prod)
**Scope:** Config | Cache-busters
**Summary:** Project lead completed the GA4 property + Sentry project setup walkthroughs (2026-06-01). Pasted the resulting credentials into the per-env config files: GA4 `G-W98QV657BE` into `js/config/analytics.js` prod slot; Sentry DSN (Germany region, EU data residency — `o4511486659919872.ingest.de.sentry.io/4511486683250768`) into `js/config/sentry.js` prod slot. Dev and staging slots stay blank by design — we don't want localhost / Cloudflare-staging traffic polluting prod analytics or error reports. Cache-buster cascade: `analytics.js` + `sentry.js` content changed → `analytics/ga4.js` + `analytics/sentry.js` import URLs bump → `app.js` import URLs bump → `index.html` script-tag bumps. Bumped to `?v=20260601a`.

**Files:**
- `js/config/analytics.js` — line 24 `prod:    'G-W98QV657BE'` + comment trail noting create-date.
- `js/config/sentry.js` — line 26 `prod:    'https://...@o4511486659919872.ingest.de.sentry.io/...'` + comment noting `.de` region for EU data residency.
- `js/analytics/ga4.js` line 19 — `analytics.js` import URL → `?v=20260601a`.
- `js/analytics/sentry.js` line 16 — `sentry.js` import URL → `?v=20260601a`.
- `js/app.js` lines 37-38 — `analytics/ga4.js` + `analytics/sentry.js` import URLs → `?v=20260601a`.
- `index.html` — `js/app.js` script tag → `?v=20260601a`.

**Notes on the Sentry region:**
- DSN host is `.ingest.de.sentry.io` — Sentry's German data center. Project lead picked this during signup, likely the default for EU-region signups. Means error reports are stored in Frankfurt rather than US-East. Good for GDPR (data-residency requirements) + matches the `/privacy.html` clause about "data may be processed in the European Union" — accurate.
- No code change needed — `@sentry/browser` SDK auto-routes to whichever ingest region the DSN points at.

**Notes on the GA4 ID:**
- `G-W98QV657BE` is the production property. The GA4 Real-Time Dashboard will start showing events the moment a live user accepts the consent banner (Consent Mode v2 keeps `analytics_storage` denied until then; without consent, GA4 still sends anonymized "ping" signals for aggregate measurement only).

**Automated checks (all green):**
- `node --check` clean on `analytics.js`, `sentry.js`, `analytics/ga4.js`, `analytics/sentry.js`, `app.js`.
- Grep confirms both values landed in the correct slot of their respective config files.

**Acceptance (verifiable post-deploy of static site):**
- GA4 Real-Time dashboard at `analytics.google.com` → Tomodachi property → Real-Time → shows landing-page hits when traffic flows.
- Sentry Issues tab at `sentry.io/issues/?project=4511486683250768` → captures the first error from prod.
- L1.10 consent banner gates both: deny analytics → no GA4 events fire; deny error-monitoring → Sentry captures errors but with no user context attached.

**Open Follow-up:**
1. **Static-site deploy** required to make these live — `git push` to `main` triggers GitHub Pages auto-deploy (per `[[tomodachi-deploy-workflow]]` memory).
2. **L1.08 Brevo deploy** still pending — project lead has API key + list ID 2 captured but postponed the Firebase Functions deploy round.
3. **Source-map upload to Sentry** for L3+ when error volume justifies. Adds ~5 min to each release cycle via `sentry-cli`.

---

## 2026-06-01 — L1.08 status update: Brevo credentials captured, deploy postponed
**Status:** 🟡 PARTIAL (API key + list ID 2 captured; Firebase Functions deploy deferred to a later session)
**Scope:** Coordination note
**Summary:** Project lead has the Brevo API key (stored in their password manager, NOT in the repo, NOT in chat) and confirmed Brevo list ID = `2`. The Firebase Functions deploy round (`firebase functions:secrets:set BREVO_API_KEY` + `.env.tomodachi-prod` with `BREVO_LIST_ID=2` + `firebase deploy --only functions`) is deferred. Until that deploy completes, the live waitlist form will hit a Cloud Function URL that returns 404 — `handleWaitlistSubmit` catches that as the `network` branch and shows the localized "Couldn't reach the server" error. Pre-deploy users on the live landing see the form behave gracefully, just without persistence.

**What to remember when resuming:**
- Brevo API key lives in the project lead's password manager. NEVER paste it into chat — paste straight into `firebase functions:secrets:set BREVO_API_KEY` when prompted.
- `BREVO_LIST_ID=2` goes into `functions/.env.tomodachi-prod` (gitignored).
- Single opt-in is the locked decision — no DOI template setup needed (see corrected step 6 in the L1.08 entry).
- After deploy: smoke-test with the `curl` command in the L1.08 entry's step 14.

**Open Follow-up:** Resume L1.08 deploy in the next session, or batch it with the L1.17 staging→prod deploy round.

---

## 2026-05-31 — Phase L1.08: Brevo waitlist integration (Cloud Function + client) ✅ CODE DONE / ⏳ WAITING (project lead Brevo + Firebase deploy)
**Status:** ✅ DONE (code, config, i18n) / ⏳ WAITING (project lead: Brevo account → API key → list ID → list-level DOI → Firebase Functions deploy)
**Scope:** Code | Cloud Functions | Config | i18n | Firebase | Brevo
**Summary:** Replaced the L1.04 `handleWaitlistSubmit` stub (which just showed the success card without persisting anything) with a real Cloud Function-backed integration. New `functions/` directory scaffolds Firebase Cloud Functions v2 on Node 20 (CommonJS). The `submitWaitlist` HTTPS function validates email + checks a disposable-domain blocklist + POSTs to Brevo's `/v3/contacts` endpoint with locale + source metadata + a SIGNUP_DATE attribute. CORS is allow-listed to the three Tomodachi front-end origins (github.io, Cloudflare Pages staging, localhost). The Brevo API key uses `defineSecret` so it lives in GCP Secret Manager — never in plain env or any committed file per `PROJECT_RULES.md` §5.3. The list ID, which is non-sensitive, uses `defineString` from a per-project `.env.<projectId>` file. On the client, `handleWaitlistSubmit` now disables the submit button + swaps the label to `t('hero.submitting')` during the fetch, maps 6 server-side error codes onto 5 user-friendly i18n strings, and preserves the premium-modern in-place success-card transformation from L1.04.

**Files (cache busters cascade `?v=20260531b` for changed-target consumers):**
- **NEW:** `functions/package.json` — Node 20 engine, `firebase-functions ^6.0.0`, `firebase-admin ^13.0.0`, `eslint ^9.0.0` dev. Predeploy hook runs `npm run lint`.
- **NEW:** `functions/.gitignore` — `node_modules/`, `.env*`, `firebase-debug.log`, `.runtimeconfig.json`. Anything that could leak secrets stays out of git.
- **NEW:** `functions/.eslintrc.json` — flat `eslint:recommended` + `no-unused-vars` with `_`-prefix ignore. Keeps the predeploy lint hook honest without being noisy.
- **NEW:** `functions/index.js` — the `submitWaitlist` `onRequest` function. Highlights: `defineSecret('BREVO_API_KEY')` + `defineString('BREVO_LIST_ID')` for credentials, `cors:` allow-list of the three Tomodachi origins, `maxInstances: 10` cap, hard-coded 30-disposable-domain blocklist (mailinator, guerrillamail, 10minutemail, yopmail, etc.), structured-error response map (`invalid_email` / `disposable_email` / `brevo_not_configured` / `brevo_misconfigured` / `brevo_unreachable` / `brevo_auth` / `brevo_error`), special-case 200 OK on Brevo's `duplicate_parameter` 400 (already-subscribed users see the success card with a `alreadySubscribed: true` flag forwarded to GA4). ~165 lines.
- **NEW:** `firebase.json` — repo-root Firebase project config. `functions` codebase points at `functions/`. Emulators block defines port 5001 for the Functions emulator + port 4000 for the Emulator UI.
- **NEW:** `.firebaserc` — three project aliases (`dev` → tomodachi-dev, `staging` → tomodachi-staging, `prod` → tomodachi-prod). `default` aliased to `dev`. `firebase use prod` etc. switches deploy targets.
- **NEW:** `js/config/functions.js` — `getFunctionsBaseUrl()` + `getFunctionUrl(name)` helpers. Returns `http://localhost:5001/tomodachi-dev/us-central1` for dev (Functions emulator), and `https://us-central1-tomodachi-{staging,prod}.cloudfunctions.net` for the two cloud envs. Uses the same `getEnv()` hostname switcher as `js/config/firebase.js`.
- `js/app.js` — new `getFunctionUrl` import + new `WAITLIST_ERROR_KEYS` map + fully rewritten `handleWaitlistSubmit`. Server-side error codes map onto these user-facing i18n keys:
  - `invalid_email` → `error.waitlist.invalid_email`
  - `disposable_email` → `error.waitlist.disposable_email`
  - `brevo_not_configured` / `_misconfigured` / `_auth` → `error.waitlist.not_ready` (deploy not complete yet)
  - `brevo_unreachable` / `brevo_error` → `error.waitlist.network`
  - `method_not_allowed` / unknown → `error.waitlist.unknown`
  - Network-layer (fetch rejected) → `error.waitlist.network`
  Loading state: disable the submit button + swap text to `t('hero.submitting')` during the round-trip; restore on either branch in a `finally{}`.
- `js/i18n/locales/en.json` — new `hero.submitting` + new `error.waitlist.*` subtree (5 keys: invalid_email, disposable_email, not_ready, network, unknown).
- `js/i18n/locales/ar.json` — matching MSA translations for the same 6 new keys. Pure MSA per CONTENT_GUIDELINES.md §5; no Egyptian markers.
- `js/i18n/index.js` — `loadLocale` URL bumped to `?v=20260531b` (locale JSON content changed again on top of L1.13b).
- `js/policy-init.js` — `i18n/index.js` import URL bumped to `?v=20260531b` (target content changed).
- `index.html` — `js/app.js` script-tag cache buster bumped to `?v=20260531b`.
- `privacy.html`, `terms.html`, `cookies.html` — `js/policy-init.js` script-tag cache busters bumped to `?v=20260531b`.

**Architecture decisions:**
- **HTTPS request, not callable.** The waitlist form is on the LANDING page, before any Firebase Auth. Dragging the `firebase/functions` SDK module into the landing critical-path just to call one public endpoint is bundle-bloat. Plain `fetch()` + CORS in the function is simpler, fewer moving parts, easier to debug.
- **`defineSecret` for the API key, `defineString` for the list ID.** Per `PROJECT_RULES.md` §5.3 + §19, the Brevo API key must live in Secret Manager — it can authorize calls against the Brevo account. The list ID is just a number that names a list inside the account; not sensitive.
- **CORS allow-list, not `cors: true`.** Lock down to `al-mo3tasem.github.io` + `*.pages.dev` + `localhost`. Reduces the surface for cross-site abuse of the public endpoint, doesn't impact legitimate traffic.
- **`updateEnabled: false` on the Brevo POST.** Makes a second submit of the same email return 400 `duplicate_parameter`, which we surface as a friendly "already on the list" (200 OK with `alreadySubscribed: true`) instead of silently re-adding them. Tracks as a normal `waitlist_signup` GA4 event with `already_subscribed: true` for funnel analysis.
- **Double opt-in at the list level, not via the DOI endpoint.** Brevo lets you enable DOI on a list — when enabled, the basic `/v3/contacts` add triggers Brevo to send the confirmation email automatically. This is simpler than the `/v3/contacts/doubleOptinConfirmation` endpoint (which needs a templateId + redirect URL passed explicitly). The Brevo setup steps below cover enabling DOI on the list.
- **30 hardcoded disposable domains, not the disposable-email-domains npm package.** Conservative — we'd rather let through a few mailinator users than block legitimate addresses on a long heuristic list. If signup quality becomes a real problem, swap to the maintained list.
- **No per-IP rate limiting in the function.** Waitlist phase doesn't need it; `maxInstances: 10` is a soft cap and Brevo's own rate limits protect downstream. Add Firestore/Redis-backed rate limiting at Phase L4 if abuse becomes real.
- **Static EN fallback in HTML markup, AR via data-i18n** — same as the rest of the app. The CTA button gets the localized "Submitting…" label via `t()` because button text changes at runtime; the i18n key for the localized label is the standard pattern.

**Premium-modern UX preserved:**
- The L1.04 inline success-card transformation (form + counter hide, success card fades in vertically in place) survives untouched.
- Loading-state button feedback ("Submitting…" label + disabled state) is new. Beats the bare-fetch with no feedback during 200-800ms round-trips.
- Error messages are conversational, not legalistic ("Couldn't reach the server. Check your connection and try again." beats "fetch failed with status 502").
- `already_subscribed` users see the same success card as first-time joiners — no embarrassing "you already signed up" error. They get a green-check celebration just like everyone else. GA4 differentiates via the event property for funnel analysis.

**Automated checks (all green):**
- `node --check` clean on every touched JS file: `app.js`, `config/functions.js`, `i18n/index.js`, `policy-init.js`, `functions/index.js`.
- Both locale JSON files parse, 376 leaves each, parity balanced (+6 new keys both sides since L1.13b).
- `firebase.json` + `.firebaserc` + `functions/package.json` all parse as valid JSON.
- Six new i18n keys all resolve in both en.json and ar.json: `hero.submitting`, `error.waitlist.{invalid_email,disposable_email,not_ready,network,unknown}`.

**Open Follow-up — Project Lead actions (numbered, in order):**

***Brevo setup (one-time, ~10 min):***
1. Go to `https://www.brevo.com/`. Sign up for a free account if you don't have one — Brevo's free tier covers up to 300 emails/day and unlimited contacts, more than enough for waitlist phase.
2. Verify your account via the email Brevo sends. Complete the brief profile prompts (company info — "Tomodachi" / personal project is fine).
3. Top-right menu → click your initial → **SMTP & API** → **API Keys** tab → **Generate a new API key**. Name it `tomodachi-prod-functions`. Copy the key immediately (Brevo shows it only once).
4. Left sidebar → **Contacts** → **Lists** → **Create a new list**. Name: `Tomodachi Waitlist`. Save.
5. Click the list you just created. The URL now contains the list ID: `https://app.brevo.com/contact/list/{ID}`. Note the numeric ID.
6. **Skip DOI for waitlist phase — recommended.** Brevo configures DOI per sign-up *form* (Marketing > Forms), not per *list* — and since we POST to `/v3/contacts` from our own Cloud Function instead of using Brevo's hosted form, list-level DOI does not apply. Pre-launch industry standard is single opt-in (Notion, Linear, Cal.com all use it for waitlists) — the user explicitly clicked our CTA, so consent is implicit. If we later want true DOI, the API endpoint is `/v3/contacts/doubleOptinConfirmation` with a template ID + redirect URL — that's a Phase L4 upgrade, not L1.

***Firebase Functions deploy (one-time, ~10 min):***
7. **Upgrade tomodachi-prod to Blaze (already done per R2.11).** If staging or dev also need Functions, upgrade those too. `https://console.firebase.google.com/project/tomodachi-prod/usage/details` → Modify plan → Blaze with the existing $1/mo budget cap (already configured per R2.11).
8. If you don't have it: `npm install -g firebase-tools`. Login: `firebase login`. From the repo root: `firebase use prod` (uses .firebaserc).
9. Install function deps: `cd functions && npm install` (run from the `functions/` directory, NOT repo root).
10. Set the Brevo API key as a Secret Manager secret: from `functions/`, run `firebase functions:secrets:set BREVO_API_KEY`. When prompted, paste the API key from step 3. (This stores it in GCP Secret Manager, encrypted at rest, never visible in plain text again.)
11. Set the Brevo list ID as a param: still in `functions/`, create a file `.env.tomodachi-prod` with one line: `BREVO_LIST_ID=<id_from_step_5>`. (No quotes. The `.env.*` file is gitignored — never commit it.)
12. From the repo root, deploy: `firebase deploy --only functions`. First deploy takes ~3-5 min while Cloud Build provisions the function.
13. Verify in the Firebase Console: `https://console.firebase.google.com/project/tomodachi-prod/functions` should now show `submitWaitlist` with a URL like `https://us-central1-tomodachi-prod.cloudfunctions.net/submitWaitlist`.
14. Smoke-test from a shell (curl), substituting a real email:
    ```
    curl -X POST https://us-central1-tomodachi-prod.cloudfunctions.net/submitWaitlist \
      -H "Content-Type: application/json" \
      -d '{"email":"<your_email>@gmail.com","locale":"en","source":"landing_hero"}'
    ```
    Expected: `{"ok":true}`. Check your inbox — Brevo's DOI email should arrive within a minute. Confirm via the link. Then check the Brevo list in the dashboard: the contact should show as confirmed (not "unsubscribed").
15. Once smoke-test passes, the live waitlist form on `https://al-mo3tasem.github.io/Tomodachi/` will start writing real signups.

***Staging-environment setup (optional, recommended before prod):***
16. Repeat steps 7-14 with `firebase use staging` and a separate `.env.tomodachi-staging` file pointing at a SEPARATE Brevo list (e.g., "Tomodachi Waitlist — Staging") so staging tests don't pollute the real waitlist. Same Brevo API key is fine — Brevo doesn't separate by environment.

***Local-emulator testing (any time):***
17. From `functions/`, run `firebase emulators:start --only functions`. The function is reachable at `http://localhost:5001/tomodachi-dev/us-central1/submitWaitlist`. The client's `getFunctionUrl()` automatically points at the emulator when accessed via `localhost`. NOTE: the emulator doesn't read GCP Secret Manager — to test the Brevo POST locally, you need to either (a) export `BREVO_API_KEY` in the shell before starting the emulator, or (b) accept that the emulator will return `brevo_not_configured` (good for testing UI error paths).

**Acceptance criteria (verifiable after step 14):**
- Form submission on the live landing creates a contact in the Brevo list.
- Brevo DOI confirmation email is sent and the link works.
- Confirmed contacts show in the Brevo list dashboard.
- Already-subscribed users see the success card again (no embarrassing error).
- Disposable-domain emails (try `test@mailinator.com`) are blocked with a clear error message.
- Invalid-format emails are blocked.

**Defer to later:**
- **L1.09 — visible counter** depends on this task. Once Brevo is live + the list is collecting, L1.09 wires the real Brevo count (via a second Cloud Function that queries `/v3/contacts/lists/{listId}/contacts` for a count + caches) + adds the WAITLIST_BASELINE on top.
- **Source-maps + Sentry release tagging** for the function — defer until error volume justifies the setup work.
- **L4 rate limiting** — if abuse becomes real (>50 signups/min from a single IP, etc.), add a per-IP token-bucket via Firestore.

---

## 2026-05-31 — Phase L1.13b: ToS + Privacy + Cookie Policy drafts (in-house, EN authored; AR pending Codex Spec G)
**Status:** ✅ DONE (EN content + i18n scaffolding) / ⏳ WAITING (Codex Spec G fills AR translations)
**Scope:** Content | HTML | Code | CSS | i18n
**Summary:** Pivoted off external generators (PrivacyPolicies.com paywalls every relevant question — $24 for GA4 support, $34 for GDPR, $14 for email tools = ~$72 just for Privacy alone, plus separate fees for Terms + Cookies). Drafted all three policies in-house in Tomodachi voice — calm, direct, naming our actual stack (Firebase, Brevo, GA4, Sentry) instead of generic boilerplate. Each policy is wired with `data-i18n` per the same pattern as the rest of the app: EN values inline as fallback, AR placeholders empty so i18next's `returnEmptyString: false` + `fallbackLng: 'en'` makes AR users see EN content until Codex Spec G fills the AR. Locale toggle works on each policy page via a tiny new `js/policy-init.js` bootstrap that mirrors `app.js:bindLocaleToggles()` without dragging Firebase / GA4 / Sentry into the policy-page bundle.

**Files (cache busters cascade `?v=20260531a` for changed-target consumers):**
- `privacy.html` — fully rewritten. Lead paragraph + 11 sections (Who we are / Information we collect [4 sub-categories] / How we use it [5-bullet list] / Third-party services we use [Firebase / Brevo / GA4 / Sentry sub-sections] / Cookies / Your rights [5-bullet list] / How long we keep data [5-bullet list] / Children / International users / Changes / Contact). 59 unique `data-i18n` keys.
- `terms.html` — fully rewritten. 13 sections (Accepting these terms / What Tomodachi is / Eligibility / Your account / Acceptable use [6-bullet list] / Content & IP / Beta status / Account termination / Disclaimers / Limitation of liability / Changes / Governing law [Egypt + EU consumer-protection carveout] / Contact).
- `cookies.html` — fully rewritten. 9 sections (What cookies are / Essential cookies [4-bullet list including `tomodachi-lang`, `tomodachi-theme`, `tomodachi-consent` named explicitly] / Analytics cookies [GA4 `_ga` / `_ga_*` named] / Error-monitoring cookies [Sentry session id named] / How to control your choices / Third parties / Changes / Contact).
- **NEW:** `js/policy-init.js` — ~30 lines. Bootstraps `initI18n()` from the shared i18n module and binds the locale-toggle buttons. No Firebase, no GA4, no Sentry — policy pages are legal pages, not app surfaces.
- `css/style.css` — replaced the old `.policy-placeholder*` rules (3 stubs) with proper policy article typography: `.policy-content h2/h3/p/ul/li/a`, the lede paragraph, `.policy-nav-actions` for the right-side cluster (locale toggle + back pill), `.policy-back::before` + `[dir="rtl"] .policy-back::before` for the direction-aware back arrow (matching the existing `.back-btn::before` pattern). Plus `:lang(ar) .policy-content` Cairo font binding + `line-height: 1.85` per `CONTENT_GUIDELINES.md` §13.5.
- `js/i18n/locales/en.json` — three new nested key trees `policy.privacy.*`, `policy.terms.*`, `policy.cookies.*` (111 new leaves total). Removed the placeholder `policy.coming_soon_title` + `policy.coming_soon_body` keys (their host stubs are gone). Tweaked `policy.back_home` from `← Back home` to `Back home` (arrow moved to CSS pseudo-element).
- `js/i18n/locales/ar.json` — matching empty-string scaffolds for all 111 new leaves. Removed the AR placeholder coming-soon keys. Fixed `policy.back_home` similarly + dropped the directional arrow character.
- `js/i18n/index.js` — `loadLocale` URL bumped to `?v=20260531a` (locale JSON content changed).
- `js/app.js` — i18n import URL bumped (i18n/index.js content changed).
- `index.html` — `css/style.css` + `js/app.js` cache busters bumped (both targets' content changed).

**Why not a generator (PrivacyPolicies.com walkthrough findings):**
- I initially recommended PrivacyPolicies.com's free tier. User went through the wizard and found the realistic cost for Tomodachi's stack would be ~$72 just for Privacy (GA4 + GDPR + email-tool selectors all carry $14-$34 paywalls), with similar fees on the separate Terms + Cookies wizards. Total realistic outlay $150-200.
- Also: the wizard's email-tool dropdown lists GetResponse, Mailchimp, Mailerlite, etc., but **NOT Brevo** (formerly Sendinblue), which is what Tomodachi actually uses per `Commercialization_Plan.md` + L1.08 task. User had selected GetResponse by mistake — would have produced a policy with the wrong vendor named.
- Generator output for a stack this small (4 user-data fields, 1 collection, 3 third parties) needs heavy customization anyway. In-house drafting:
  1. Costs $0
  2. Voices each clause in Tomodachi-tone (calm, direct, no legalese-bloat)
  3. Names our actual stack: Firebase + Brevo + GA4 + Sentry
  4. Is honest about pre-launch state ("we are in waitlist phase", "Pro tier pricing is not final, you will see it before being asked to pay")
  5. Drafted as plain prose with i18n keys ready for Codex Spec G AR translation
  6. Equally lawyer-reviewable later — when revenue justifies (~Phase L4 Pro launch), a lawyer reviews ANY baseline at the same per-hour cost

**Premium-modern design notes:**
- **textContent over innerHTML** in apply.js is a security stance — I initially included inline `<strong>` / `<a>` / `<code>` in translation values, hit the wall that `textContent` clobbers them, and rephrased the affected paragraphs so cross-policy navigation happens via the landing footer instead of inline links. Cleaner i18n, no innerHTML injection vector. Five JSON values rephrased + matching HTML simplified.
- **`policy-back::before` content-swap** for the direction-aware back arrow matches the existing `.back-btn::before` pattern (CSS lines 2463-2468). Single source of truth for the arrow direction; the i18n string carries only the text, not the glyph.
- **EN-fallback for AR until Spec G** is the right interim state — an AR user clicking `/privacy` today sees the polished EN policy (acceptable for a pre-launch waitlist page) rather than a `[AR pending]` placeholder. The empty-string scaffolds in `ar.json` give Codex a clean target shape to fill.
- **`:lang(ar) .policy-content` typography binding** applies Cairo font + 1.85 line-height to AR policy pages per CONTENT_GUIDELINES.md §13.5. Long-form legal text needs the extra vertical breathing room more than short UI labels do.
- **No analytics or Sentry on policy pages** is the right call — legal pages are low-traffic, and loading the full app bundle just to render a 600-word document is bloat. `policy-init.js` is ~30 lines and only loads i18next + the locale JSON.

**Automated checks (all green):**
- `node --check` clean on `policy-init.js`, `i18n/index.js`, `app.js`.
- Both locale JSON files parse via `require()`.
- All 115 unique `data-i18n` keys across the three policy pages resolve in en.json (0 missing).
- All 115 resolve in ar.json (0 missing) — 111 are intentional empty-string scaffolds for Spec G; the other 4 (`locale.label_en`, `locale.label_ar`, `policy.back_home`, `policy.last_updated`) carry real AR values.
- Localhost smoke test: `python -m http.server` serves all 3 policy pages (200), `policy-init.js` (200), both locale JSONs (200).

**Open Follow-up:**
1. **Codex Spec G — AR translation of all 3 policies.** Spec prompt drafted at `scripts/prompts/spec-g-policy-ar.md` (next step). Codex fills the 111 empty AR strings + writes output back to `js/i18n/locales/ar.json`. Claude reviews per `PROJECT_RULES.md` §17.3 — same flow as Spec C / Spec D. Expected to land in the next session.
2. **Lawyer review before public free launch (L3 / L4).** Tomodachi will go from waitlist → closed beta → free public → Pro. The shift from closed beta to free public is when paying counsel becomes worth it. The in-house draft is the baseline a lawyer reviews; the cost is the same whether the baseline came from a generator or from this PR.
3. **`/privacy`, `/terms`, `/cookies` in sitemap.xml** — currently sitemap.xml only lists the landing URL with hreflang variants. Add three more `<url>` blocks for the policy pages (with hreflang `en` / `ar` / `x-default` for each) when AR is complete via Spec G.
4. **Consent banner "Cookie Settings" link wiring.** The Cookie Policy mentions a Cookie Settings link in the homepage footer. That link already exists (`footer.cookie_settings_link`) and opens the L1.10 consent modal. No change needed — just confirming the cross-reference is accurate.
5. **Real domain at R3 cutover.** Same as the L1.12 follow-up: when `tomodachi.com` ships, update the `canonical` URL in each policy page.

---

## 2026-05-28 — Phase L1.12: SEO baseline (meta tags + JSON-LD + sitemap + robots + hreflang + locale-aware title)
**Status:** ✅ DONE
**Scope:** HTML | Code | Content | Discoverability
**Summary:** Full SEO baseline per `Commercialization_Plan.md` §9 and the L1.12 task spec. Static EN meta tags in HTML head serve search engines + social crawlers (most don't run JS). JavaScript dynamically updates `document.title` + the description meta on locale toggle for browser-tab UX while leaving the SEO-authoritative HTML versions intact. Two JSON-LD structured-data blocks (`EducationalOrganization` + `Course`) feed Google Rich Results. Sitemap + robots.txt + hreflang link tags wire up search-engine discovery. AR users get a properly-localized `<html lang>` from L1.01 + locale-aware tab title from this commit.

**SEO additions (all in HTML `<head>`):**
- **`<title>` + `<meta name="description">` + `<meta name="keywords">`** — premium-modern descriptive title ("Tomodachi — Learn Japanese with Friends, Arabic-First"). Description authored to hit the brand promise + differentiation (Arabic-first, multiplayer, calm pace) in ~280 chars (under Google's snippet cap).
- **`<link rel="canonical">`** — points at the github.io URL. Will update to `tomodachi.com` at R3 cutover.
- **3 × `<link rel="alternate" hreflang="...">`** — `en` / `ar` / `x-default`. Tells search engines about the bilingual variants accessed via `?lang=` query param.
- **Open Graph tags** (`og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:locale`, `og:locale:alternate`) — for Facebook / LinkedIn / generic social previews. `og:image` deliberately skipped here — lands at L1.15 with the real brand logo / OG card. Until then, social previews fall back gracefully to the page title + description.
- **Twitter Card tags** (`twitter:card`, `twitter:title`, `twitter:description`) — `summary` card type (small image). Will upgrade to `summary_large_image` when og:image lands at L1.15.
- **JSON-LD `EducationalOrganization`** — schema.org markup for org-level knowledge panel. Includes `name`, `alternateName` (Arabic brand spelling), `description`, `url`, `logo`, `inLanguage`.
- **JSON-LD `Course`** — schema.org markup for the JLPT N5 learning offering. Includes `name`, `description`, `provider`, `educationalLevel`, `inLanguage`, `teaches`.

**Files:**
- `index.html` — large `<head>` expansion (~50 new lines) for the SEO block. Cache buster bumped on the app.js script tag.
- `sitemap.xml` — **NEW**, repo root. Single `<url>` for the landing with hreflang xhtml:link variants. Updated date 2026-05-28.
- `robots.txt` — **NEW**, repo root. Allow-all + Sitemap directive pointing at sitemap.xml.
- `js/i18n/locales/en.json` + `ar.json` — new `seo.*` namespace with `page_title` + `meta_description`. AR authored inline in pure MSA.
- `js/app.js` — new `updateLocaleAwareSeo()` function. Called from `init()` after `renderHeroCounter()` and from the existing `onLocaleChange` subscriber. Updates `document.title` and the description meta-tag's `content` attribute from `t('seo.page_title')` / `t('seo.meta_description')`.
- `js/i18n/index.js` — `loadLocale` URL bumped (locale JSON content changed).

**Premium-modern design notes:**
- **Static EN + dynamic JS title** is the right split — crawlers see EN (best SEO snippets), browser-tab title respects locale toggle (best UX). Search engines that DO run JS also see the locale-aware version since they execute the page through Chrome rendering.
- **`og:image` deferred to L1.15** is honest — better to have NO og:image than a 404-link og:image. Social previews fall back to title + description.
- **Two JSON-LD blocks** (Org + Course) is the canonical premium-marketing pattern. Educational-product sites typically include both (Coursera, Khan Academy, Memrise).
- **AR brand name `«تومودَاتشي»`** appears in the JSON-LD `alternateName` — Google indexes brand variants from this field.
- **AR title in Arabic-script** ("تومودَاتشي — تعلّم اليابانية مع أصدقائك، بشرح عربي من الأصل") is what AR users see in their browser tab once the locale switches.

**Automated checks (all green):**
- `node --check` clean on `app.js` + `i18n/index.js`.
- Both locale JSON files parse.
- `sitemap.xml` parses as valid XML (xml.etree.ElementTree).
- `robots.txt` contains the `Sitemap:` directive.
- 2 JSON-LD blocks parse as valid JSON with the expected `@type` values (`EducationalOrganization` + `Course`).
- All 10 expected SEO meta-tag attributes present in HTML (description, keywords, canonical, 3 × hreflang, 3 × og:*, twitter:card).
- `updateLocaleAwareSeo()` defined + called from `init()` + wired into `onLocaleChange`.
- **250 leaf keys balanced** between en.json and ar.json (+2 from 248 — the new seo.* keys), zero parity diff.

**Open Follow-up:**
1. **Real og:image** — L1.15 produces a 1200×630 OG card with the brand logo. Once that file exists at `og-card.png` (or similar), add `<meta property="og:image" content="...">` + upgrade `twitter:card` from `summary` to `summary_large_image`.
2. **Canonical + sitemap URL changes at R3 cutover** — when `tomodachi.com` ships, update `<link rel="canonical">`, all hreflang `href`s, `og:url`, sitemap.xml `<loc>`, robots.txt `Sitemap:` directive. Single sweep with the cutover commit.
3. **Per-page metadata** when ToS / Privacy / Cookies pages ship at L1.13 — each gets its own `<title>` + description, plus their own `<url>` in sitemap.xml.
4. **Acceptance criterion verification** (Google Rich Results Test passes; OG debugger preview works) — needs to be done after deploy. Standard tools: `https://search.google.com/test/rich-results`, `https://developers.facebook.com/tools/debug/`, `https://cards-dev.twitter.com/validator` (now deprecated but works for current OG validation).

---

## 2026-05-28 — Phase L1.14: Sentry framework with consent-gated user context (DSN pending project lead setup)
**Status:** ✅ DONE (code) / ⏳ WAITING (project lead creates Sentry project + fills DSN)
**Scope:** Code | Docs
**Summary:** Sentry error reporting wired with consent-gated user context per `PROJECT_RULES.md` §19.1: errors capture anonymously the moment Sentry initializes; the user's `uid` + `email` only attach when both the L1.10 consent banner has granted `errorContext` AND the user is signed in. `@sentry/browser@8.40.0` is lazy-loaded via dynamic import — zero bytes ship in dev / staging / any prod where the DSN isn't configured. `setUserContext()` is called on `enterAppAsUser` (attach), `logout` (clear), and `saveConsent` (attach-or-clear based on the new toggle state). A defensive `beforeSend` hook in the Sentry init also re-checks the consent flag on every event, in case a later code path tries to attach context without going through `setUserContext()` — belt-and-suspenders.

**Files (cache busters cascade `?v=20260528r` for changed-target consumers):**
- **NEW:** `js/config/sentry.js` — per-env DSNs (`dev` / `staging` / `prod`, all empty by default) + `getSentryDsn()` lookup. ~28 lines including extensive header documentation.
- **NEW:** `js/analytics/sentry.js` — `initSentry()` lazy-imports `@sentry/browser@8.40.0` from jsdelivr ESM CDN when a DSN is configured. `setUserContext(user|null)` attaches/clears (internally re-checks consent). `captureException(err, context)` + `captureMessage(msg, level)` wrappers. `_consentGranted()` private helper reads `tomodachi-consent` localStorage directly (avoids a circular import with app.js's `loadConsent`). ~120 lines including the Consent Mode-equivalent `beforeSend` scrub. SDK pinned to v8.40.0 — version intentionally bumped per upgrade cycle, never via "latest".
- `js/app.js` — new `initSentry` + `setUserContext as sentrySetUserContext` imports. `init()` calls `initSentry()` after `initGA4()`. `enterAppAsUser()` calls `sentrySetUserContext({ uid, email })` after the user profile loads (or fallback). `logout()` calls `sentrySetUserContext(null)` before `signOut` so subsequent errors during/after sign-out don't carry the previous user's id. `saveConsent()` attaches-or-clears user context based on the new `errorContext` flag + current `state.user`.
- `index.html` — script src for `app.js` bumped to `?v=20260528r`.

**Consent integration matrix:**
| User state | consent.errorContext | Sentry user context | What happens |
|---|---|---|---|
| Signed out | denied (or unset) | (none) | Errors capture anonymously |
| Signed out | granted | (none) | Errors capture anonymously (no user to attach yet) |
| Signed in | denied | (none) | Errors capture anonymously (consent gates context) |
| Signed in | granted | uid + email attached | Errors carry full user context |
| Toggles consent while signed in | denied → granted | attached after Save | `saveConsent` propagates to Sentry immediately |
| Toggles consent while signed in | granted → denied | cleared after Save | `saveConsent` clears the context immediately |

**Premium-engineering details:**
- **Lazy-loaded SDK** — `await import('https://cdn.jsdelivr.net/npm/@sentry/browser@8.40.0/+esm')` only runs when initSentry() is called WITH a valid DSN. dev / staging / no-DSN-prod = zero SDK download. Keeps initial-page weight light per the premium-modern feedback memory's "performance counts" implication.
- **Init promise cached** in `_initInFlight` so concurrent `initSentry()` calls don't re-trigger the dynamic import. Subsequent calls await the same promise.
- **No tracing, no replays, no auto-instrumentation** — `integrations: []` + `tracesSampleRate: 0`. Tomodachi just wants error reporting; performance monitoring would be a separate (Blaze-tier) cost.
- **Defensive `beforeSend` scrub** — even if some future code path calls `Sentry.setUser()` directly without going through our `setUserContext()` helper, the `beforeSend` hook re-validates consent on every outgoing event and strips `event.user` if consent is denied. Two layers of consent enforcement.
- **`_consentGranted()` reads localStorage directly** instead of importing `loadConsent` from app.js — avoids a circular import that would prevent the Sentry module from loading independently.

**Automated checks (all green):**
- `node --check` clean on `app.js`, `analytics/sentry.js`, `config/sentry.js`, `analytics/ga4.js`, `config/analytics.js`.
- All 13 expected JS markers present: Sentry imports in app.js, `initSentry()` in init, user-context attach in `enterAppAsUser`, clear in `logout`, conditional attach in `saveConsent`, version-pinned SDK, `beforeSend` consent scrub, `_consentGranted` helper, direct-localStorage-read pattern, `tracesSampleRate: 0`, empty `integrations`, empty default DSN, `getSentryDsn` exported.

**Project lead external action (FOLLOW-UP — not blocking this commit):** detailed numbered instructions to create a Sentry project + paste the DSN — handed off in the chat reply.

**Open Follow-up:**
1. **Project lead creates Sentry project + paste DSN** into `js/config/sentry.js`'s `prod` slot. Instructions in chat reply. After that step, errors on prod will report.
2. **Source maps upload on deploy** (per Phases_and_Tasks.md L1.14 acceptance criterion). Sentry's `sentry-cli` can be wired into the GitHub Actions deploy step OR a manual `sentry-cli releases files <version> upload-sourcemaps <dir>` invocation. Deferred until project lead confirms Sentry property is created.
3. **Real error capture verification** (L1.14 acceptance criterion) — only testable after the DSN is in place. Trigger a deliberate error on prod after signing in with errorContext granted; verify the event appears in Sentry dashboard with `user.id` + `user.email` attached.

---

## 2026-05-28 — Phase L1.11: GA4 + Consent Mode v2 framework (Measurement ID pending project lead setup)
**Status:** ✅ DONE (code) / ⏳ WAITING (project lead creates GA4 property + fills Measurement ID)
**Scope:** Code | Docs
**Summary:** GA4 wired with Consent Mode v2 default-denied per the L1.10 consent contract. `js/analytics/ga4.js` boots gtag.js when a Measurement ID is configured for the current environment; `js/config/analytics.js` holds the per-env IDs (all empty by default — GA4 silently no-ops until project lead pastes their real `G-XXXXXXXXXX` ID in). When user grants analytics via the L1.10 consent banner, `saveConsent()` propagates the decision to `gtag('consent', 'update', ...)`, flipping `analytics_storage` to `'granted'`. Two events documented per `PROJECT_RULES.md` §22.7: `page_view` (auto) + `waitlist_signup` (fired from `handleWaitlistSubmit`). Per `PROJECT_RULES.md` §19, Tomodachi does NOT run ads — `ad_storage`, `ad_user_data`, `ad_personalization` all stay `'denied'` permanently in the gtag consent calls.

**Files (cache busters cascade `?v=20260528q` for the changed-target consumers):**
- **NEW:** `js/config/analytics.js` — per-env Measurement IDs (`dev` / `staging` / `prod`, all empty by default) + `getMeasurementId()` lookup that imports `getEnv()` from `firebase.js`. ~25 lines including extensive header documentation.
- **NEW:** `js/analytics/ga4.js` — `initGA4()` boots gtag.js + dataLayer + Consent Mode v2 defaults. `updateConsent(allowed)` flips `analytics_storage` between `granted` and `denied`. `trackEvent(name, params)` fires custom events. All three no-op cleanly when `getMeasurementId()` returns `''` (no-Measurement-ID env). ~95 lines including extensive comments + the Consent Mode v2 spec details inline.
- `js/app.js` — added `initGA4` / `updateConsent as ga4UpdateConsent` / `trackEvent as ga4TrackEvent` imports. `init()` calls `initGA4()` after `renderHeroCounter()` (so the script tag injection happens once, asynchronously). After `initGA4()`, reads any existing localStorage consent and propagates via `ga4UpdateConsent()` — so a returning visitor with `analytics: true` saved doesn't see a momentarily-denied state. `saveConsent()` now also calls `ga4UpdateConsent(decision.analytics)` so live banner-button clicks flip the gtag consent state without page reload. `handleWaitlistSubmit()` calls `ga4TrackEvent('waitlist_signup', { source: 'landing_hero' })` on the success-card path.
- `index.html` — script src for `app.js` bumped to `?v=20260528q`.

**Premium UX integration:**
- **Zero visual change** from L1.11 alone — the GA4 framework is invisible to users. Consent banner UX, animations, copy — all unchanged.
- **Performance:** `gtag.js` is `async`, doesn't block render. Only loads when a Measurement ID is configured (so dev/staging never load it under default config).
- **Default-denied is GDPR-compliant** — until user grants analytics in the L1.10 banner, gtag sends only the anonymized "consent-mode ping" with no PII.
- **`wait_for_update: 500`** in the `consent default` call gives our localStorage decision time to propagate before the first `page_view` fires. Past 500ms, gtag proceeds with default-denied (no PII).

**Documented events (per `PROJECT_RULES.md` §22.7):**
| Event name | When it fires | Parameters | Stage |
|---|---|---|---|
| `page_view` | Auto-fired by `gtag('config', ...)` on init | `page_location`, `page_title` (auto-collected by GA4) | L1.11 |
| `waitlist_signup` | After client-side email-shape validation passes in `handleWaitlistSubmit` (currently fires on success-card render — L1.04 stub. L1.08 will move this to fire on Brevo POST success) | `source: 'landing_hero'` | L1.11 (stub-tied) |

**Automated checks (all green):**
- `node --check` clean on `app.js`, `analytics/ga4.js`, `config/analytics.js`, `i18n/index.js`.
- Both locale JSON files parse (no JSON changes this commit; running for completeness).
- All expected JS markers present: GA4 imports in app.js, `saveConsent → ga4UpdateConsent` propagation, `waitlist_signup` event call, `init() → initGA4()`, startup consent propagation, `wait_for_update`, default `analytics_storage: 'denied'`, `ad_storage` permanently denied, `dev/prod measurement IDs empty by default`, `getMeasurementId` exported.

**Project lead external action (FOLLOW-UP — not blocking this commit):** detailed numbered instructions to create a GA4 property + paste the Measurement ID — handed off in the chat reply.

**Open Follow-up:**
1. **Project lead creates GA4 property + paste Measurement ID** into `js/config/analytics.js`'s `prod` slot (and `staging` slot if you want separate staging analytics). Instructions in chat reply.
2. **L1.14 Sentry** is next — reads `loadConsent().errorContext` like L1.11 reads `loadConsent().analytics`.
3. **L1.08 Brevo integration** — when it lands, `waitlist_signup` event will move from firing on success-card render to firing on Brevo POST success. Same event name, same param shape, just better-tied to actual conversion.
4. **Real-time GA4 dashboard verification** (L1.11 acceptance criterion) can only be done after step 1 above + at least one consent-granted page load on the prod URL.

---

## 2026-05-28 — Phase L1.10: cookie consent banner + customize modal
**Status:** ✅ DONE
**Scope:** Code | CSS | Content
**Summary:** Premium-modern cookie consent surface per `PROJECT_RULES.md` §19. Slide-up bottom banner with three buttons (Reject Non-Essential / Customize / Accept All) — non-blocking so the landing stays scrollable while the decision is pending, but the user has to choose one of the three to dismiss (no X close button — GDPR-compliant). Customize button opens a centered modal with backdrop blur, three rows (Essential always-on / Analytics toggle / Error monitoring toggle), Cancel + Save Preferences. Decision persists to `localStorage` with a 1-year TTL; the gate is read by L1.11 (GA4) + L1.14 (Sentry user-context) when those land.

**Premium-modern design choices:**
- **Banner is non-blocking** — page stays scrollable while the banner is on screen. Most landings block; we don't. Premium feels less aggressive. The banner does NOT have an X close button — three actions ARE the dismissal paths.
- **Slide-up entrance** — 0.4s cubic-bezier, gentle. The banner pops in once `init()` confirms no valid decision is on file.
- **RTL-aware animation** — separate `consent-slide-up-rtl` keyframe handles the inverted X-translation for AR locale (the `translateX(-50%)` vs `translateX(50%)` centering trick).
- **Brand-primary primary action** — Accept All uses `--brand-primary` (the new indigo from the polish round). Ghost-style secondary buttons for Reject + Customize.
- **Customize modal** is standard premium-overlay shape: backdrop blur (6px), scale+fade entrance (0.97 → 1), max-height with scroll, ESC + backdrop-click both close. Modal closing does NOT save; the banner reappears underneath unless the user saved.
- **Two toggles in Customize** — Analytics + Error monitoring. Essential is hard-coded "Always on" (no toggle, just a label) — GDPR pattern.
- **Mobile**: banner stacks vertically with full-width buttons. Modal padding tightens.
- **`prefers-reduced-motion` opt-out** for all consent animations.

**State persistence:**
- localStorage key: `tomodachi-consent`
- Shape: `{ v: 1, decidedAt, expiresAt, analytics: bool, errorContext: bool }`
- TTL: 365 days (then banner re-shows per §19.2)
- Versioned (`v: 1`) so a future schema change can invalidate older decisions cleanly
- `loadConsent()` returns `null` on missing / malformed / expired / wrong-version
- `saveConsent({ analytics, errorContext })` writes with computed expiry

**Files (cache busters cascade `?v=20260528o`):**
- `index.html` — new `#consent-banner` (slide-up card with title + body + 3 buttons) and `#consent-modal` (overlay + backdrop + card with 3 rows + cancel/save). Both placed after the toast container, outside any `<section class="screen">` so they overlay all screens. 28 `data-i18n` attributes on consent strings + 1 on `common.cancel`.
- `css/style.css` — `.consent-banner` (fixed-bottom, RTL-aware center + slide-up keyframes), `.consent-card` (flex layout with text + actions, wraps on mobile), `.btn-consent` + `-primary` / `-secondary` variants, `.consent-modal` + backdrop + card with fade/scale entrance, `.consent-row` (label + toggle), mobile breakpoint stacking, `prefers-reduced-motion` opt-out. Net +~190 lines.
- `js/app.js` — `loadConsent` / `saveConsent` / `showConsentBannerIfNeeded` / `openConsentModal` / `closeConsentModal` / `handleConsentAccept` / `handleConsentReject` / `handleConsentModalSave` / `onConsentModalKeydown`. Two new constants: `CONSENT_STORAGE_KEY`, `CONSENT_VERSION`, `CONSENT_TTL_MS`. `attachListeners` wires the 6 click handlers + 1 keydown listener. `init()` calls `showConsentBannerIfNeeded()` after `bindLocaleToggles()`.
- `js/i18n/locales/en.json` + `ar.json` — new `consent.*` namespace (15 keys). AR authored inline in frozen MSA: "تفضيلات ملفات تعريف الارتباط", "رفض غير الأساسي", "قبول الكل", etc. Standard MENA-app phrasing.
- `js/i18n/index.js` — `loadLocale` URL bumped.

**Automated checks (all green):**
- `node --check` clean on `app.js` + `i18n/index.js`.
- Both locale JSON files parse.
- CSS brace count: 563 open / 563 close — balanced.
- **248 leaf keys balanced** between en.json and ar.json (+15 from 233 — consent.* namespace), zero parity diff.
- 175 `data-i18n*` keys in `index.html`, all resolve in both locales.
- All 15 consent.* keys confirmed in both locales.
- All 9 consent JS functions confirmed defined.
- `showConsentBannerIfNeeded()` confirmed wired in `init()`.

**Project lead visual verification (hand off):** at the bottom of the chat reply.

**Open Follow-up:**
1. **L1.11 (GA4 + Consent Mode v2)** — reads `loadConsent().analytics` to gate analytics_storage. The default-deny consent-mode pattern.
2. **L1.14 (Sentry)** — reads `loadConsent().errorContext` to gate user-context attachment. Errors are still captured without it (anonymously); the toggle controls whether the user's `uid` + `email` are attached to error events.
3. **Re-open from Settings** — `PROJECT_RULES.md` §19 mentions a "Cookie Settings" link in the footer. Not yet built (no footer yet). Will land alongside the L1.17 staging deploy when the footer ships with ToS / Privacy links per L1.13.
4. **In-app emoji UI** in nav / friend bar / mode buttons — still emoji-based. Not on the L1 landing-page critical path; defer review until L2.C.

---

## 2026-05-28 — L1 polish round: brand identity + animated card borders + premium SVG icons + richer background + hero peek
**Status:** ✅ DONE
**Scope:** CSS | HTML | Content (visual identity)
**Summary:** Five visual-polish items from project lead's L1.07 review, bundled into one commit. (1) Brand color identity — indigo + sakura-rose + amber palette replacing the generic Apple-blue accent across both light + dark themes. (2) Multi-gradient mesh background on `screen-landing` in brand colors — non-solid premium feel (Stripe / Linear surface convention). (3) Hero shortened from `calc(100vh - 64px)` to `85vh` so the top of the features section peeks above the fold — Option A from the earlier scroll-cue discussion. (4) Animated rotating conic-gradient border on `.feature-card` hover — Vercel / Linear / Anthropic-tier card-interaction polish, pure CSS via `@property` and `@keyframes`. (5) Premium inline-SVG icons (Lucide MIT — `languages`, `users`, `waves`) replacing the L1.05 emoji icons; each card has its own brand-color tint (indigo / rose / amber) for visual rhythm.

**Brand palette tokens (added to `:root`):**
- `--brand-primary: #4F46E5` (Indigo 600) — primary actions, links, identity
- `--brand-primary-deep: #4338CA` (Indigo 700) — hover / active
- `--brand-primary-soft: rgba(79, 70, 229, 0.10)` — indigo wash surfaces
- `--brand-accent: #EC4899` (Sakura rose / Pink 500) — warmth, second accent
- `--brand-accent-soft: rgba(236, 72, 153, 0.08)` — rose wash surfaces
- `--brand-amber: #F59E0B` (Amber 500) — third color for variety
- `--brand-amber-soft: rgba(245, 158, 11, 0.08)` — amber wash surfaces

Existing `--accent`, `--accent-hover`, `--accent-light` redirected to brand tokens in both `[data-theme="light"]` and `[data-theme="dark"]` blocks — the whole UI now picks up brand indigo without per-element overrides. Reference set: Stripe indigo, Linear violet, Notion subtle warmth, Japanese 藍 traditional indigo + sakura nod.

**Visual changes by surface:**
- **Landing background:** four soft radial gradients (indigo top-left, rose bottom-right, amber mid-right, diffuse indigo center) layered over `--bg-base`. Premium non-solid feel without busy noise.
- **Hero:** `min-height: 85vh` (was full viewport). Top of `<section class="features">` now peeks above the fold, signaling there's more content below.
- **Feature cards:** premium animated border on hover. `::before` pseudo-element with conic gradient (`from var(--angle)`) rotates 360° over 4s. `@property --angle` declaration makes the angle animatable. `prefers-reduced-motion` opt-out included. Card itself lifts -4px with a soft brand-tinted glow shadow (indigo + rose at low opacity).
- **Feature icons:** 44×44 rounded tiles. Each tile has brand-color-tinted background + matching stroke icon (1.5px stroke, line-style). Per-card variation via `:nth-child` so each card has its own identity: card-1 indigo, card-2 sakura-rose, card-3 amber.
- **Screenshot placeholders:** the three gradients in `.placeholder-dashboard` / `.placeholder-duel` / `.placeholder-leaderboard` now use the brand-soft tokens — visually ties the section into the same identity as the feature-card icons (indigo / rose / amber threading through both surfaces).

**Files (only HTML + CSS this round — no JS/JSON changes):**
- `css/style.css` — brand palette tokens added to `:root` (~10 new variables). `--accent` redirected in both theme blocks. `#screen-landing.active` background replaced with the 4-layer mesh. `.hero` min-height adjusted. `.feature-card` rewrites the hover state (new shadow, transparent border for the gradient peek-through). New `.feature-card::before` with conic gradient. New `@property --angle` + `@keyframes rotate-conic-border` + `prefers-reduced-motion` opt-out. `.feature-icon` rewritten for SVG container styling (44×44 tile). New `:nth-child` rules for per-card icon color. `.placeholder-*` gradients use brand-soft tokens. Net +~70 lines across the polish.
- `index.html` — three `<div class="feature-icon">` blocks replaced their emoji with inline `<svg>` markup (Lucide MIT-licensed paths inline). Cache buster bumped on the CSS link.

**Automated checks (all green):**
- `node --check` clean on `app.js` + `i18n/index.js` (no JS changes; running anyway).
- Both locale JSON files parse.
- CSS brace count: 515 open / 515 close — balanced.
- 159 `data-i18n*` keys in `index.html`, all resolve in both locales.
- Brand tokens confirmed present: `--brand-primary` / `--brand-accent` / `--brand-amber` + the soft variants. `--accent: var(--brand-primary)` redirect confirmed in light theme.
- `@property --angle` + `@keyframes rotate-conic-border` confirmed present.
- All three feature-card emoji removed; replaced by 3 inline SVG markup blocks confirmed.
- Cache busters: CSS `?v=20260528n` (changed); app.js + i18n `?v=20260528m` (unchanged this round — strict §14.3).

**Note from project lead (deferred follow-up):** content review on screenshots + FAQ sections can come later — they liked both for now. Specifically tagged: "my comments can be later after we excel content if you want." Will revisit after Codex content rounds for L2.

**Open Follow-up:**
1. **L1.10 cookie consent banner** is next — premium-modern banner with Accept All / Reject Non-Essential / Customize, gating GA4 + Sentry user-context per `PROJECT_RULES.md` §19.
2. **In-app emoji** (game-mode buttons 🧘/🔥/⚔️/🤝, friend bar 🎮/🌸, etc.) NOT replaced this round — they're inside the authed app surface, not the landing. Can revisit if user wants those upgraded too.
3. **Browser support for `@property`** — Chrome 85+, Firefox 128+, Safari 16.4+. All shipped 18+ months. Pre-2024 browsers (<1% of MENA traffic) would see the static conic gradient (no rotation animation) — graceful degradation, not blocking.

---

## 2026-05-28 — Phase L1.07: FAQ section with premium one-at-a-time accordion
**Status:** ✅ DONE
**Scope:** Code | CSS | Content
**Summary:** L1.07 landed. Eight Q&A pairs from the Codex Spec A run (reviewed and held in `scripts/output/codex-a-faq.json` since 2026-05-28 earlier today) integrated under a `faq.*` namespace in both locales. The accordion uses native `<details name="faq-group">` so opening one question auto-closes any other that's open — premium-modern pattern with **zero JS** (modern browsers honor the `name` attribute as a grouping signal). Plus / minus marker swaps via the `[open]` attribute selector — no animation library, no JS, pure CSS state.

**Premium-modern design choices (per `feedback-premium-modern-ux`):**
- **Native `<details>` over a JS-driven accordion** — accessibility + keyboard support for free, no library, smaller bundle. The `name="faq-group"` attribute gives one-at-a-time auto-close (Chrome 120+ / Firefox 130+ / Safari 17.2+ — all shipped 18+ months by now).
- **+/− marker over rotating chevron** — used by Stripe and Linear's FAQs. Clearer state signal than rotated chevrons; works with no animation library.
- **Subtle bordered rows** (1px top + per-item bottom) instead of card-shaped items with backgrounds — Linear-style. Less visual noise, cleaner read.
- **Active state coloring** — when an item is `[open]`, the question + marker pick up the accent color. Subtle but premium signal.
- **Generous spacing** — var(--space-4) vertical padding per row; `letter-spacing: -0.005em` on questions for that tightened-display-font feel.
- **Container constrained to 720px** — readable line-length for FAQ answers. FAQ-sections shouldn't sprawl as wide as feature grids.
- **No subtitle** under the section heading — premium FAQ sections (Apple, Stripe) often drop the subtitle. Just the "Common questions" heading and the items themselves.

**Codex Spec A quality (re-confirmed):** ~95% — already reviewed earlier today before saving to T4. Integration is mostly a structural lift. AR side is real authored MSA (not literal translation), uses the brand voice ("نحن نكتب الشرح العربي من داخله…"), no Egyptian dialect markers, Arabic punctuation throughout.

**Files (cache busters cascade `?v=20260528m`):**
- `index.html` — new `<section class="faq">` after the screenshots section. Eight `<details class="faq-item" name="faq-group">` blocks, each with a `<summary class="faq-question">` + `<div class="faq-answer">`. New `faq.section_title` key + 8 × `{ question, answer }` pairs.
- `css/style.css` — new `.faq` section (~80 lines). Includes the `summary::-webkit-details-marker { display: none }` reset for Webkit's default disclosure triangle + `::marker { content: '' }` for Firefox/modern engines. Custom `::after` marker on `.faq-question` for the `+` → `−` swap. Hover color shift + open-state accent. Mobile breakpoint tightens padding + question font-size.
- `js/i18n/locales/en.json` — new `faq.*` namespace: `section_title` + 8 × `{ question, answer }`. Reviewed copy from Spec A.
- `js/i18n/locales/ar.json` — matching namespace with the Spec A reviewed AR translations. `faq.section_title: "أسئلة شائعة"` authored inline (frozen MSA idiom). All 17 faq.* keys present in both locales.
- `js/i18n/index.js` + `js/app.js` — cache buster bumps only.

**Automated checks (all green):**
- `node --check` clean on `app.js` + `i18n/index.js`.
- Both locale JSON files parse.
- **233 leaf keys balanced** between en.json and ar.json (+17 from 216 — `faq.section_title` + 8 questions + 8 answers), zero parity diff.
- 159 `data-i18n*` keys in `index.html`, all resolve in both locales.
- All 17 faq.* keys confirmed present in both locales.

**Project lead visual verification (hand off):** at the bottom of the chat reply.

**Open Follow-up:**
1. **L1.08 — Brevo integration** (real waitlist POST). Replaces `handleWaitlistSubmit`'s success-card stub with a `/v3/contacts` POST + double opt-in handling + disposable-email blocklist per `Commercialization_Plan.md` §5. Pre-req: project lead creates a Brevo account + contact list + API key + stores the key in a Cloud Function env var (Brevo API keys are server-only per `PROJECT_RULES.md` §5.3).
2. **L1.09 — counter with baseline inflation.** Reads real Brevo count via the Cloud Function, adds the 350 baseline, replaces the `WAITLIST_BASELINE` hardcoded const + moves it to `js/config/limits.js`.
3. **L1.10 — Cookie consent banner.** Per `PROJECT_RULES.md` §19. Lightweight homemade banner with Accept All / Reject Non-Essential / Customize.
4. **Real screenshot captures** (L1.06 follow-up) still awaiting L2 content reseed.

---

## 2026-05-28 — Phase L1.06 (frame): screenshots section with premium phone-frame placeholders
**Status:** ✅ FRAME DONE (real screen captures swap in post-L2 content reseed)
**Scope:** Code | CSS | Content
**Summary:** Built the L1.06 screenshots section as a stub-vs-full pattern: HTML + CSS + i18n shipped now with elegant phone-frame placeholders; real screen captures swap in via a small content-only commit when L2.A-L2.B content reseed makes the screens visually meaningful (the app currently can't render content cards because `content_sets/` is empty on `tomodachi-prod`). Three cards — Dashboard / Duel Mode / Leaderboard — in a 3-column grid on desktop, 1-column on tablet/mobile with constrained max-width (280px) so phone frames don't stretch full-viewport (a premium aesthetic decision per [[feedback-premium-modern-ux]]). New section heading "Inside Tomodachi" / «نظرة على «تومودَاتشي»» + subtitle, both languages authored inline (short strings, frozen MSA idioms — no Codex round needed).

**Premium-modern design notes (per `feedback-premium-modern-ux`):**
- **Phone-frame styling** instead of bare image cards: 8px dark bezel (#1c1c1e — actual phone-hardware color, works in both light + dark themes), 32px corner radius, faint notch hint at top (56×14px), aspect-ratio 9/19.5 (modern phone proportion).
- **Soft elevation** — 0 24px 48px primary shadow + 0 8px 16px ambient shadow. On hover: translateY(-4px) + amplified shadow. Subtle 0.3s ease transition.
- **Three distinct soft gradients** per placeholder — neutral-gray for Dashboard, soft-pink for Duel, soft-amber for Leaderboard — so the cards differentiate at a glance even when the content is placeholder. Each gradient is light → very light (no busy patterns), keeping the premium-clean feel.
- **Brand-kanji watermark** 友 at 5rem in 5% opacity, dead center of each placeholder. Signals "screen content coming" without faking UI elements that would look half-baked. More felt than seen.
- **Section heading** "Inside Tomodachi" (magazine-style, short, doesn't overpromise) — `clamp(1.5rem, 3vw, 2rem)` responsive typography, -0.02em letter-spacing for premium tightness.
- **No section background** — section sits in screen-landing's existing soft-gradient background, no panel/box around it (Stripe/Linear pattern; the cards themselves provide the visual anchor).

**Files (cache busters cascade `?v=20260528l`):**
- `index.html` — new `<section class="screenshots">` after the features section, inside `screen-landing`. Three `<figure class="screenshot-card">` blocks with header + grid. Existing i18n keys reused for captions (`common.dashboard`, `modes.duel.name`, `leaderboard.title`) — no duplication. Two new keys: `screenshots.section_title` + `screenshots.section_subtitle`.
- `css/style.css` — new `.screenshots` section (~110 lines). Phone-frame CSS includes `::before` pseudo-element for the notch, `::after` pseudo-element on `.screenshot-placeholder` for the 友 watermark, three `.placeholder-*` variants for the gradient distinction, responsive breakpoints (≤900px stacks to 280px-max single column; ≤480px tightens padding).
- `js/i18n/locales/en.json` — `screenshots.*` namespace added: `section_title: "Inside Tomodachi"`, `section_subtitle: "A peek at the dashboard, gameplay, and leaderboard."`.
- `js/i18n/locales/ar.json` — matching keys: `section_title: "نظرة على «تومودَاتشي»"` (parallel-authored — "A look at Tomodachi" reads more naturally in AR than literal "Inside"), `section_subtitle: "لمحة عن لوحة التحكم، واللعب، ولوحة الترتيب."` (frozen MSA, Arabic comma).
- `js/i18n/index.js` — `loadLocale` URL bumped to `?v=20260528l`.
- `js/app.js` — bump import of `i18n/index.js` to `?v=20260528l`.

**Automated checks (all green):**
- `node --check` clean on `app.js` + `i18n/index.js`.
- Both locale JSON files parse.
- **216 leaf keys balanced** between en.json and ar.json (+2 from the 214 of the previous commit), zero parity diff.
- 142 `data-i18n*` keys in `index.html`, all resolve in both locales.
- `screenshots.*` keys confirmed in both locales.
- Cache buster audit: all locale-touching consumers at `?v=20260528l`.

**Project lead visual verification (hand off):** at the bottom of the chat reply.

**Open Follow-up:**
1. **Real screen captures**, EN + AR, mobile + desktop. After L2 content reseed makes the screens visually meaningful (vocab cards rendering, leaderboard with names, duel UI with actual content), you capture the 6 screens (Dashboard / Duel / Leaderboard × EN / AR). I optimize to WebP at ~150KB each per the task description, swap them into the `.screenshot-placeholder` slots, and remove the gradient + watermark styling. Small content-only commit.
2. **L1.07 — FAQ section** is next. Codex output already reviewed and held in `scripts/output/codex-a-faq.json`. Integration is a structural lift: build the accordion HTML + CSS below the screenshots, wire keys, swap in the reviewed copy.
3. **`prefers-reduced-motion`** opt-out for the hover lifts (currently the 4px translate is gentle enough to not warrant gating; revisit during the broader accessibility audit at L1.14+).

---

## 2026-05-28 — Phase L1.03 + L1.05 integration: Codex Spec C (full AR) + Spec D (feature cards) reviewed & merged
**Status:** ✅ DONE (L1.03 fully closed; L1.05 fully closed)
**Scope:** Content | Memory | Docs
**Summary:** Two Codex outputs landed and integrated in one pass. **Spec C** translated the entire EN key set (~140 keys) into Modern Standard Arabic — `ar.json` now ships zero `[AR] ` placeholders for the first time since L1.01. **Spec D** authored bilingual copy for the three L1.05 feature cards at premium production quality; v1 picks (consistent across all three cards) replaced both my Claude-authored EN placeholders and the `[AR] ` placeholders. Saved a new `feedback-codex-direct-file-output` memory capturing the user's workflow change: every future Codex spec ends with "write your result to <path>" so the user is no longer the copy-paste pipe.

**§17.3 quality review summary:**
- **Spec D (feature cards):** ~95% — high quality across the board. AR is parallel-authored, not literal translation. EN avoids every word on the forbidden list. Specific phrasing throughout ("memory hooks", "guilt loops", "Miss a day? Your streak survives"). Picked v1 across all three cards for consistency + directness; v2 alternates retained in `scripts/output/codex-d-feature-cards.json` for future reference if any single card needs a swap.
- **Spec C (full AR translation):** ~85% — majority high quality MSA. Four issues identified requiring Claude surgical fixes (chosen over a Codex revision round given the issues were small and targeted):
  1. `hero.counter_line.ar` — Codex re-introduced the `شخصًا` tamyiz noun previously fixed during Spec B review (grammatically wrong outside the 11-99 count range). Override: kept the noun-dropped version `{{count}}+ على القائمة بالفعل` (robust at any count).
  2. `hero.promise.ar` — Codex's output read more like a literal translation than a parallel-author. Override: kept the Spec-B-v2 sentence "صُمّم «تومودَاتشي» للناطقين بالعربية منذ البداية…" which captures the brand promise more directly.
  3. `hero.success_title.ar` — Codex output "أصبحت على القائمة" reads slightly stiff. Override: replaced with "أنت الآن على القائمة" (warmer + more direct).
  4. `dashboard.friend.duel_btn` — Codex output "بارز" is the wrong meaning ("prominent/featured" as adjective, not a duel verb). Override: replaced with the noun "مبارزة" — the common pattern for AR action buttons.

**Files (cache busters cascade `?v=20260528k` for the locale-touching consumers):**
- `js/i18n/locales/en.json` — `features.*` block updated to Spec D v1 EN (replaces my Claude-authored L1.05 placeholders).
- `js/i18n/locales/ar.json` — **whole-file rewrite from Spec C output** with the 4 surgical overrides applied + Spec D v1 AR for `features.*`. Goes from ~30 `[AR] ` placeholders to zero. Net `+105 ar lines, -75 placeholder lines`.
- `js/i18n/index.js` — `loadLocale` URL bumped to `?v=20260528k`.
- `js/app.js` — only change: bump import of `i18n/index.js` to `?v=20260528k`.
- `index.html` — script tag bumped (CSS unchanged this round).

**Codex prompt cleanup per user request:** `scripts/prompts/spec-c-ar-translation.txt` and `scripts/prompts/spec-d-feature-cards.txt` deleted from disk (Codex done with both). `scripts/prompts/` is now empty. Raw Codex outputs preserved in `scripts/output/codex-c-ar-translation.json` and `scripts/output/codex-d-feature-cards.json` (T4-gitignored) for audit + future v2-alternates reference.

**New feedback memory:** `feedback-codex-direct-file-output` saved. Every future Codex spec will end with "Write your output directly to `<exact path>`" so the user doesn't have to copy/paste big JSON blobs into chat. Quality assessment is required-not-optional: I run §17.3 review BEFORE integrating and flag specific AR-side issues so the user can choose between Claude surgical fixes vs Codex revision rounds.

**Automated checks (all green):**
- `node --check` clean on `app.js` + `i18n/index.js`.
- Both locale JSON files parse.
- **Key parity**: 214 leaf keys in both `en.json` and `ar.json`; zero in-EN-but-not-AR, zero in-AR-but-not-EN.
- **Zero `[AR] ` placeholders** remaining in `ar.json` (was ~30 before this commit — first time since L1.01 that AR is fully translated).
- **Zero forbidden Egyptian markers** detected via the §5.3 scan list (يلّا, خلّاص, كده, دلوقتي, etc.).
- All 4 Claude overrides confirmed applied at their target key paths.
- Cache buster audit: `index.html` script + `app.js` import + `i18n/index.js` fetch URL all at `?v=20260528k`. CSS stays at `?v=20260528j` (unchanged this round).

**Project lead visual verification (hand off):**
1. Hard refresh `http://localhost:8000/`. Toggle `العربية`.
2. The entire app should now render in real Arabic — no `[AR] ` prefixes anywhere. Verify the hero (tagline + promise + counter + CTA), the three feature cards (Arabic-first / Multiplayer / Calm pace), the sign-in pill, the auth-screen forms, the dashboard, the settings panel, the danger zone.
3. Specifically check the 4 Claude-corrected keys:
   - The under-input counter should read `350+ على القائمة بالفعل` (no `شخصًا` noun).
   - The hero promise reads `صُمّم «تومودَاتشي» للناطقين بالعربية منذ البداية، مع دراسة هادئة وتدريب جماعي بين الأصدقاء.` (the Spec B v2 retained sentence).
   - Submit a valid email → success card title reads `أنت الآن على القائمة`.
   - On the dashboard (after sign-in), the friend bar's Duel button reads `مبارزة` (not `بارز`).
4. Visual layout still mirrors correctly in RTL; Cairo font is rendering AR text.

**Open Follow-up:**
1. **L1.06 — screenshots section** is next on the L1 spine. Frame-first per the stub-vs-full pattern; real screen captures land when L2 content reseed makes the screens visually meaningful.
2. **L1.07 — FAQ section.** Codex output already reviewed and held in `scripts/output/codex-a-faq.json`. Integration is mostly a structural lift below the feature cards.
3. **Optional revisions to Spec C output.** Two minor stylistic notes (acceptable but not perfect):
   - `select.footer.count_one` / `count_other` both use `حرف` — Arabic plurals have more forms (2 → `حرفان`; 3-10 → `أحرف`) but i18next exposes only `_one` / `_other`. Codex's compromise is structurally limited, not a Codex mistake. Acceptable.
   - `modes.survival.name` translated as `تحدي البقاء السريع` rather than keeping Latin "Survival Rush" as a brand-side feature name. Reads naturally in AR; loses some of the EN punch. Acceptable.

---

## 2026-05-28 — Phase L1.05 (frame): three feature cards below hero — placeholder EN copy, Codex Spec D in flight
**Status:** ✅ FRAME DONE (Codex copy swap-in pending Spec D return)
**Scope:** Code | CSS | Content
**Summary:** Built the L1.05 feature-cards section as the L1.04-style stub-vs-full pattern: structure + i18n keys + premium styling shipped now, the final reviewed copy swaps in when Codex returns Spec D's output. Three cards below the hero — `Arabic-first pedagogy` (the moat-claim), `Practice with friends` (social differentiator), `A pace that fits your life` (anti-Duolingo angle). Each card: emoji icon (🌍 / 👥 / 🌿) + 3-5 word title + 1-2 sentence body. Emoji icons match the brand's existing visual language (🏯 / 🧘 / 🔥 / 🤝 elsewhere) — consistent design language is itself a premium signal. Cards render in a 3-column grid on desktop, collapse to a 480px-max single-column on tablet+mobile. Subtle hover lift (translateY(-2px) + soft shadow + border-strong) per the premium-modern memory.

**Side-fix bundled with this commit:** the hero's `flex: 1` would have collapsed to zero height the moment any sibling section was added under it inside `screen-landing` (flex-grow distributes remaining space; with features below taking finite space and nav+features < 100vh, hero's flex:1 would have stayed small). Replaced with `min-height: calc(100vh - 64px)` — hero always reserves a full viewport (minus nav). When features render below, screen-landing grows past 100vh and user scrolls. Premium-modern landing pattern (Linear / Stripe / Vercel all do this).

**Files (cache busters → `?v=20260528j` for changed-target consumers):**
- `index.html` — new `<section class="features">` after the hero, with `.features-grid` containing three `<article class="feature-card">` blocks. Each card has an `aria-hidden="true"` icon div + `data-i18n` title + body. Cache busters bumped on CSS link + app.js script.
- `css/style.css` — `.hero { flex: 1 }` → `min-height: calc(100vh - 64px)` (with explanatory comment). New `.features` section + `.features-grid` (3-col desktop) + `.feature-card` (soft surface, subtle border, hover lift) + `.feature-icon` / `.feature-title` / `.feature-body` typography. Two responsive breakpoints: ≤900px stacks to 1-column with 520px max-width (premium feel — doesn't stretch cards full-viewport); ≤480px tightens padding.
- `js/i18n/locales/en.json` — new `features.*` namespace: `arabic_first` + `multiplayer` + `calm_pace`, each with `title` + `body`. **Placeholder copy** authored by Claude as the L1.05 frame's stub-content; Codex Spec D will refine + the swap commit replaces these values with the §17.3-reviewed premium copy.
- `js/i18n/locales/ar.json` — matching namespace with `[AR] ` placeholders (will be filled by Codex Spec C + Spec D outputs).
- `js/i18n/index.js` — `loadLocale` URL bumped to `?v=20260528j`.
- `js/app.js` — only change: bump `i18n/index.js` import to `?v=20260528j`.

**Codex Spec D in flight:** `scripts/prompts/spec-d-feature-cards.txt` drafted with explicit **premium production-level standard** framing — copy needs to read like Linear / Notion / Stripe marketing, NOT generic SaaS. Includes a forbidden-words list (powerful, seamless, intuitive, revolutionary, unleash, leverage, elevate, etc.) Codex must avoid. Each of the 3 cards gets a primary + alternate version so the project lead can pick. After Spec D returns and §17.3 review completes, the integration commit swaps placeholder copy for reviewed copy and deletes `spec-d-feature-cards.txt` per the user's cleanup rule.

**Verification (Claude-run automated checks):**
- `node --check` clean on `app.js` + `i18n/index.js`.
- Both locale JSON files parse.
- 139 unique `data-i18n*` keys in `index.html` (up from 133, +6 for the three cards × title + body), **all resolve in both locales**.
- `features.*` keys all confirmed present in both `en.json` and `ar.json`.
- Cache buster audit: `index.html` script + style → `?v=20260528j`; `app.js` import of `i18n/index.js` → `?v=20260528j`; `i18n/index.js` fetch URL → `?v=20260528j`. Unchanged-target imports stay at their prior busters.

**Project lead visual verification (hand-off):** at the bottom of the chat reply.

**Codex prompt cleanup (per user request 2026-05-28):** `scripts/prompts/spec-a-faq.txt` and `scripts/prompts/spec-b-hero.txt` deleted from disk now that Codex returned outputs and they're integrated/held. Only `spec-c-ar-translation.txt` (not yet run) and the new `spec-d-feature-cards.txt` (in flight) remain. After each spec's Codex output is integrated, the corresponding prompt file gets deleted in the same commit.

**Open Follow-up:**
1. **Spec D integration commit** — swap placeholder copy for Codex Spec D output (after §17.3 review). Same shape as the Spec B L1.04 hero integration. Will also delete `spec-d-feature-cards.txt`.
2. **Spec C integration commit** — when project lead runs Spec C, the returned full `ar.json` replaces every `[AR] …` placeholder across the whole key set (including all the L1.04 + L1.05 ones added today). Will also delete `spec-c-ar-translation.txt`.
3. **L1.06 screenshots** — next L1 surface task. The screenshots below the feature cards.
4. **L1.07 FAQ** — already has Codex output reviewed and held in `scripts/output/codex-a-faq.json`; integration is mostly a structural lift.

---

## 2026-05-28 — Phase L1.04 polish: premium back-button pill + CTA disabled-until-valid + mobile form stack
**Status:** ✅ DONE (second L1.04 follow-up, after `81d6b59`)
**Scope:** Code | CSS
**Summary:** Three polish items from re-verification: (1) the auth-screen `← Back to landing` looked disconnected from the centered card area — restyled as a small pill matching the landing's Sign In pill, absolute-positioned in the top-leading corner with consistent design language across both surfaces; (2) the Join Waitlist CTA now starts disabled and only enables on a valid-shaped email — premium-modern affordance vs. the previous always-clickable form; (3) the form was wrapping awkwardly on phone viewports with a left-aligned CTA beneath a full-width input — now stacks vertically with both elements full-width at ≤600px, matching widths feel intentional and the CTA is centered relative to the input it sits below.

**Files (cache busters: `style.css` + `app.js` → `?v=20260528i` in `index.html`):**
- `css/style.css` — `.auth-back-btn` rewritten as a pill (border, 6/12 padding, 999px radius, transparent bg, secondary text color, hover → accent border + text). `position: absolute` top + inset-inline-start, with `#screen-auth .auth-container { position: relative }` establishing the positioning context. New `@media (max-width: 600px)` block: `.hero-form { flex-direction: column }` + `.hero-cta { width: 100% }` so both elements stack and stretch.
- `index.html` — Join Waitlist button gained `id="waitlist-submit"` + `disabled` attribute (ships disabled by default).
- `js/app.js` — new `WAITLIST_EMAIL_RE` constant + `updateWaitlistSubmitState()` function. Input event on `#waitlist-email` re-evaluates the gate and toggles `disabled` on the submit button. `handleWaitlistSubmit`'s own format check now reuses the shared regex (single source of truth between the input-gate and the submit-validation).

**Verification:** `node --check` clean, 133 data-i18n keys still resolve in both locales, `#waitlist-submit` id confirmed present in HTML with `disabled` attribute. The `.btn:disabled` rule (`opacity: 0.45; cursor: not-allowed`) already in place from prior work picks up the new gating automatically.

**Project lead re-verification:** test plan in the chat reply.

---

## 2026-05-28 — Phase L1.04 follow-up: fix screen-landing display bug + premium inline success card + tighter mobile nav
**Status:** ✅ DONE (immediate follow-up to `76fbedd`)
**Scope:** Code | CSS | Content | Memory
**Summary:** L1.04 verification surfaced three issues — one real bug, one UX upgrade, one mobile-layout tighten. All three resolved in this commit. Saved a new feedback memory ([[feedback-premium-modern-ux]]) for the standing principle the user articulated: every design + UX decision defaults to the Linear/Notion/Stripe-tier pattern, not the conservative one.

**Issues resolved:**

1. **`#screen-landing` CSS specificity bug.** The L1.04 rule `#screen-landing { display: flex }` had ID-level specificity (0,1,0,0) that overrode the base `.screen { display: none }` rule (0,0,1,0), so screen-landing was ALWAYS visible — even when `showScreen()` flipped its `.active` class to switch to screen-auth or screen-dashboard. **Consequence:** the landing-nav "Sign in" button appeared dead (screen-auth was being activated correctly underneath, but the landing's `min-height: 100vh` covered it). Same root cause for the "welcome toast appears on top of landing on refresh" — `enterAppAsUser` correctly switched to screen-dashboard, but screen-landing kept painting. **Fix:** moved the layout properties to `#screen-landing.active` (specificity 0,1,1,0) so they apply only when the active class is present. Base `.screen { display: none }` is the unconditional hide rule for non-active screens.

2. **Top-corner toast for waitlist success was the wrong feedback pattern.** Per user feedback: "i think a more modern ux will be that a pop up appears in middle rather than on top corner!". Premium-modern landing pages (Linear / Notion / Stripe) use inline state transformation — the form area becomes a success card in the same vertical position. **Fix:** added `<div id="waitlist-success">` with a green check-icon circle + title + body. On submit success, `handleWaitlistSubmit` hides `#form-waitlist` + `#hero-counter` and reveals the success card. Same `hero-fade-in` animation, no layout shift. The toast call removed. Stale `toast.waitlist_stub` key dropped from both locale files.

3. **Mobile nav layout wrapping.** At ≤480px the brand + locale-toggle + "Already have an account? Sign in" wrapped across 3 rows, pushing the hero content far below the fold. Per the premium-modern feedback memory, the nav should NOT wrap into stacked rows. **Fix:** shortened the sign-in label from "Already have an account? Sign in" → just "Sign in" (the page state — visitor on a waitlist landing — already implies the rest). Added a `data-i18n-attr="aria-label:hero.sign_in_aria"` carrying the full "Sign in to existing account" text for screen readers. Styled `#btn-landing-signin` as a discreet pill with border + hover state instead of the previous text-button look. Added a `@media (max-width: 480px)` block that shrinks nav padding + sign-in button size so brand + EN/AR toggle + Sign-in pill all sit on one row down to 320px width. Removed `flex-wrap: wrap` from `.landing-nav`.

**Files / Areas (cache busters cascade `?v=20260528g → ?v=20260528h`):**
- `css/style.css` — `#screen-landing` → `#screen-landing.active` scoping for layout properties. Removed `flex-wrap` from `.landing-nav`. New `#btn-landing-signin` pill styling + hover. New `.waitlist-success` block (centered card, green check icon, title, body) + its `[hidden]` rule. New `@keyframes` already in place; success card uses the existing `hero-fade-in`. New `@media (max-width: 480px)` mobile-tightening rules.
- `index.html` — `#btn-landing-signin` lost the `btn btn-ghost btn-sm` classes (its own dedicated styling now), gained `aria-label` + `data-i18n-attr` for accessibility. Added `<div id="waitlist-success" hidden>` immediately after the error slot. Cache busters bumped.
- `js/app.js` — `handleWaitlistSubmit` no longer calls `toast()`; hides the form + counter elements, reveals the success card. Inline comments updated to point at the feedback memory.
- `js/i18n/locales/en.json` — `hero.sign_in_link` shortened to "Sign in". New `hero.sign_in_aria` ("Sign in to existing account"). New `hero.success_title` ("You're on the list"). New `hero.success_body` ("We'll let you know when Tomodachi launches."). Removed unused `toast.waitlist_stub`.
- `js/i18n/locales/ar.json` — matching changes. `hero.sign_in_link` filled with the universal Arabic "تسجيل الدخول" + `hero.sign_in_aria` "تسجيل الدخول إلى حساب موجود" (both are frozen MSA idioms that don't need Codex review — every major MENA-targeted app uses these). `hero.success_title` + `hero.success_body` ship with `[AR] ` placeholders pending Spec C.
- `js/i18n/index.js` — `loadLocale` URL bumped.

**New feedback memory:** `feedback-premium-modern-ux` saved at `C:\Users\mouta\.claude\projects\d--MO3-LAP-MyProjects-Tomodachi\memory\` — captures the standing principle that every design + UX decision should default to premium-modern, not safe-conservative. Applies to every future task that touches user-visible UI.

**Verification (Claude-run from the harness, per the [[feedback-test-locally-when-possible]] discipline):**
- `node --check` clean on `js/app.js` + `js/i18n/index.js`.
- Both locale JSON files parse.
- 133 unique `data-i18n*` keys in `index.html` (up from 130, +3 for `hero.sign_in_aria` + `hero.success_title` + `hero.success_body`), all resolve in both locales.
- 42 static `t()` keys in app.js (down 1 from 43 — `toast.waitlist_stub` removed), all resolve.
- Cache buster cascade: `index.html` script + style → `?v=20260528h`; `app.js` import of `i18n/index.js` → `?v=20260528h`; `i18n/index.js` fetch URL → `?v=20260528h`. Unchanged-target imports stayed at their prior busters.

**Project lead re-verification (visual-only, hand off):**
1. Hard refresh `http://localhost:8000/` while signed out (incognito or after sign-out).
2. Landing renders. Click `Sign in` (now a small pill in the top-right, not a wrapped-text link) → **lands on the auth-screen** (the bug is dead). Click `← Back to landing` → returns to hero.
3. Type a valid email → click `Join Waitlist` → **the form area inline-transforms into the centered success card** (green check icon, "You're on the list", "We'll let you know when Tomodachi launches"). No top-corner toast.
4. Refresh while signed in to a `tomodachi-dev` account → **lands on the dashboard, NOT the landing page** (the bug is dead). The welcome toast appears over the dashboard, which is the expected behavior.
5. Mobile responsive (Chrome DevTools, 365×811): landing-nav fits on ONE row (brand on left, EN/AR + Sign-in pill on right), hero content closer to the visible area, no horizontal scroll.

---

## 2026-05-28 — Phase L1.04: landing-page hero section (bilingual) + waitlist stub
**Status:** ✅ DONE
**Scope:** Code | CSS | Content | Docs
**Summary:** Built the landing-page hero as the new unauthenticated default. Replaces the auth-screen as the first thing visitors see; auth-screen still reachable via "Sign in" link in the landing nav (and the auth-screen now has a "Back to landing" button for the reverse direction). The hero ships with bilingual copy approved in the Codex Spec B review (`scripts/output/codex-b-hero.merged.json`): tagline, promise (EN v1 + AR v2 picks), email placeholder, CTA label, counter line, locale toggle. Email-submit and counter both stubbed at this layer — full Brevo `/v3/contacts` POST is L1.08, real waitlist count is L1.09. Hero animates in with a single 0.6s fade so the calm/soft brand voice doesn't get undercut by motion.

**Files / Areas (cache busters: everything cascading to `?v=20260528g` — `style.css` + `app.js` in `index.html`; `i18n/index.js` in `app.js`; locale JSON in `i18n/index.js`; unchanged-target imports stay at their old busters per strict §14.3):**
- `index.html` — new `<section id="screen-landing" class="screen active">` BEFORE `<section id="screen-auth">`. Landing-nav with brand on one side and locale-toggle + sign-in CTA on the other. Hero block with tagline, promise, email form, big CTA, counter line, and form-error slot. Auth-screen lost its `active` class (now reachable via the landing's "Sign in" link); gained a `← Back to landing` button at the top using the existing `.back-btn` class for the arrow + RTL behavior.
- `css/style.css` — `#screen-landing` flex column with a soft radial-gradient background (two faint accent washes), `.landing-nav` (responsive flex with wrapping), `.hero-inner` with `clamp()` typography for the tagline + promise so they scale across viewports, `.hero-form` (flex with min-width-0 input + nowrap CTA), `.hero-counter`/`.hero-error` for the under-input lines, plus a `@keyframes hero-fade-in` one-shot translate+opacity on `.hero-inner`. Reuses existing tokens (`--accent`, `--bg-base`, `--border`, `--text-secondary`, `--radius-md`, `--space-*`).
- `js/i18n/locales/en.json` — new top-level `hero.*` block (tagline, promise, email_placeholder, cta_label, counter_line, sign_in_link); new `auth.back_to_landing`; new `toast.waitlist_stub`. All real values, English.
- `js/i18n/locales/ar.json` — matching `hero.*` block with the **Codex Spec B picks**: `hero.tagline`, `hero.promise` (AR v2 — the "designed for Arabic speakers from the start" framing), `hero.email_placeholder`, `hero.cta_label`, `hero.counter_line` (Claude-corrected, dropped the grammatically-wrong `شخصًا` tamyiz noun). New `hero.sign_in_link`, `auth.back_to_landing`, `toast.waitlist_stub` ship with `[AR] ` placeholders — they'll be filled by the Spec C Codex run.
- `js/app.js` — new `WAITLIST_BASELINE = 350` constant (will move to `js/config/limits.js` when L1.09 lands its full counter wiring). New `renderHeroCounter()` (Pattern D — parametric render). New `showAuthScreen()` / `showLandingScreen()` thin nav helpers. New `handleWaitlistSubmit()` stub: basic email regex check, then a success toast (real Brevo integration is L1.08). `attachListeners()` wires the 3 new elements (`btn-landing-signin`, `btn-auth-back`, `form-waitlist`). `init()`'s `onAuthStateChanged` unauthed branch now `showScreen('screen-landing')` instead of `showScreen('screen-auth')`. `init()` calls `renderHeroCounter()` once after `initI18n()` and re-runs it inside the `onLocaleChange` subscription (so the counter line translates on locale toggle alongside the dashboard's `Welcome back, {{name}}`). `enterAppAsUser` also strips `active` off `screen-landing` when transitioning to the dashboard.
- `js/i18n/index.js` — only change: `loadLocale` URL bumped to `?v=20260528g` (locale JSON content changed).

**Architectural decisions:**
- **Landing replaces auth-screen as the unauthenticated default.** Per Phases_and_Tasks.md L1.04. The auth-screen still exists and is fully functional for beta invitees + existing users; access is one click away via "Sign in" in the landing nav.
- **Stub-vs-full pattern.** The waitlist form lives, the email is locally validated, and the user sees a success toast — but the actual Brevo POST is L1.08. The counter shows the inflated baseline only — the real Brevo count overlay is L1.09. Both stubs let the rest of L1 (feature cards L1.05, screenshots L1.06, FAQ L1.07, SEO L1.12, cookie consent L1.10) ship and visually verify against a complete-looking hero, while leaving the integration work for their dedicated tasks.
- **No PWA-blocking animation choices.** The single hero-fade-in respects `prefers-reduced-motion: no-preference` by default (CSS `@keyframes` honors the user's reduced-motion setting if we add the `@media (prefers-reduced-motion)` opt-out later; for L1.04 the animation is gentle enough — 0.6s linear-ease, 8px translate — that the opt-out can wait).
- **Hero `<input>` width.** `flex: 1 1 240px` with `min-width: 0` so the input can shrink to the available space without overflowing on narrow viewports (the long Latin placeholder `you@example.com` would otherwise force horizontal scroll on phones ≤320px).

**Verification (Claude-run, no project lead time consumed):**
- `node --check` clean on `js/app.js` + `js/i18n/index.js`.
- `JSON.parse` clean on both locale files.
- 130 unique `data-i18n*` keys in `index.html` (up from 124 in L1.02 — 6 new for hero + auth back-button) — **all resolve in both `en.json` and `ar.json`**. 43 static `t()` keys in `js/app.js`, all resolve.
- Hero key audit confirmed: every `hero.*` key present in both locales (`tagline`, `promise`, `email_placeholder`, `cta_label`, `counter_line`, `sign_in_link`).
- Cache buster audit: changed-target consumers all at `?v=20260528g`; unchanged-target imports stayed at their prior busters (`?v=20260528c` for the games/core/data imports, `?v=20260528d` for `config/i18n.js` + `apply.js`, `?v=20260528f` for `rtl.js`, `?v=20260526a` for `audio.js`).

**Project lead verification (the only part I can't test — visual + behavior on `tomodachi-dev`):** 9-step plan handed off in the chat reply.

**Spec C / L1.03 timing — important note for project lead:**
L1.04 added 3 new keys to the locale JSON: `hero.sign_in_link`, `auth.back_to_landing`, `toast.waitlist_stub` (`[AR] ` placeholders in `ar.json` pending Codex). If Spec C is run **after** this commit, Codex sees the complete current `en.json` and fills in everything. If Spec C was already running with the pre-L1.04 `en.json`, those 3 new keys will need a small follow-up Codex round. Recommended path: hold Spec C until L1.04 lands.

**Open Follow-up:**
1. **L1.03 Codex AR pass** — Spec C draft at `scripts/prompts/spec-c-ar-translation.txt`. Run after L1.04 commits so Codex sees the complete key set.
2. **L1.05 feature cards** — three cards below the hero (Arabic-first pedagogy / multiplayer with friends / calm pace, soft streaks) with bilingual copy. Codex draft + Claude review + project-lead approval per §17.3.
3. **L1.08 Brevo integration** — replaces the `handleWaitlistSubmit` stub with the real `/v3/contacts` POST + disposable-email blocklist.
4. **L1.09 counter** — replaces `WAITLIST_BASELINE = 350` const with `js/config/limits.js` entry; reads real Brevo count + adds baseline; updates `renderHeroCounter` to take a real number.
5. **`prefers-reduced-motion` opt-out** for the hero fade-in animation when accessibility audit lands (per `PROJECT_RULES.md` §12 — currently the fade is gentle enough that it's not blocking).

---

## 2026-05-28 — Phase L1.02: RTL infrastructure + Cairo AR font + locale-toggle-vs-runtime-state fix
**Status:** ✅ DONE
**Scope:** Code | CSS | Content | Docs
**Summary:** Second L1 task lands. Three threads of work bundled because they're interlocked: (1) RTL direction switching via new `js/i18n/rtl.js` wired into `i18n/index.js`'s `languageChanged` event; (2) Cairo font + AR line-height (1.7 vs Latin 1.5) per `CONTENT_GUIDELINES.md` §13.4 + §13.5; (3) fix for the data-i18n-clobbers-runtime-state bug I flagged at the end of L1.19 — `renderFriend` and `goToSelect` were writing dynamic strings into DOM nodes that still had `data-i18n` attributes from L1.01's HTML wiring, so the next locale toggle's `apply.js` walk would clobber the runtime value (friend name → "Waiting for friend…", select-screen subtitle → "Choose which Hiragana…", etc.). Resolved by having both functions explicitly manage the `data-i18n` attribute on their target nodes — set it to the current state's key when writing translatable values, remove it when writing untranslatable values (a person's actual name). Plus a new `onLocaleChange()` hook from `i18n/index.js` that app.js uses to re-run parametric `t()` calls that `apply.js` can't update on its own (the `Welcome back, {{name}}` line whose var lives in JS state).

**Files / Areas (cache busters: `app.js`/`style.css` → `?v=20260528f` in `index.html`; `i18n/index.js` → `?v=20260528f` in `app.js`; locale JSON + new `rtl.js` → `?v=20260528f` in `i18n/index.js`; unchanged-target imports kept their old busters per strict §14.3):**
- **NEW:** `js/i18n/rtl.js` — single export `applyDirection(locale)` that sets `<html dir>` based on `I18N_CONFIG.rtlLocales` membership. Idempotent.
- **`js/i18n/index.js`** — imports `applyDirection`; calls it in `initI18n()` after `applyTranslations()` and again on every `i18next` `languageChanged` event. New `onLocaleChange(handler)` export for external `languageChanged` subscribers.
- **`js/app.js`** — `renderFriend` rewritten to manage `data-i18n` attributes on `friend-name` (with-friend → `removeAttribute`; no-friend → `setAttribute` back to `dashboard.friend.waiting`) and on the dynamically-rebuilt `.status-text` span (each render sets `data-i18n` to the current online/offline/in_game key). `goToSelect` uses a `setI18n(el, key)` helper that sets both `data-i18n` AND `textContent` so locale toggle's `apply.js` re-translates per-mode subtitle/info/start-button text automatically. `init()` subscribes to `onLocaleChange` to re-run `renderUserIdentity()` (needed for the parametric `Welcome back, {{name}}` line).
- **`css/style.css`** — `--font-ar` variable (`Cairo, Tajawal, Inter, …`) added at top alongside `--font-sans` and `--font-jp`. New `:lang(ar)` rule applies `--font-ar` + `line-height: 1.7`. 11 of 16 directional properties converted to logical (`margin-inline-start`, `padding-inline-start`, `inset-inline-start/end`, `text-align: start/end`, `border-inline-start`, `padding-inline` shorthand). The 2 intentional physical exceptions kept: `.toggle-slider::before { left: 2px }` (knob OFF state — toggle UIs are conventionally LTR even in RTL apps) and `.duel-player-opp { flex-direction: row-reverse; text-align: right; }` (in-game duel screen — deferred to L2.C alongside the other in-game module i18n migrations). Back-button arrow moved from i18n strings to CSS pseudo (`.back-btn::before { content: "← "; }` LTR; `[dir="rtl"] .back-btn::before { content: "→ "; }` RTL) so the glyph mirrors with direction without coupling to translation values. Mode-card "go in" arrow flipped via `[dir="rtl"] .mode-arrow { transform: scaleX(-1); }`.
- **`index.html`** — Cairo added to Google Fonts URL (`&family=Cairo:wght@400;500;600;700`). Back-button fallback content stripped of literal `←` (now provided by CSS pseudo; doubling would render `← ←` if the i18n string ever shipped one).
- **`js/i18n/locales/en.json`** — `common.back_to_dashboard` lost the leading `← `, now just "Back to Dashboard". `common.back` unchanged.
- **`js/i18n/locales/ar.json`** — matching change to the `[AR] Back to Dashboard` placeholder.

**Pattern notes:**
- **The locale-toggle-vs-runtime-state bug class.** L1.01's `data-i18n` attribute approach is great for static text, but conflicts with any JS that writes dynamic values into the same nodes. Two patterns now in use side-by-side: (a) for **static** translatable text — `data-i18n` in HTML, `apply.js` owns it on every languageChanged; (b) for **dynamic** translatable text — JS sets `data-i18n` to the current-state's key AND `textContent`, so `apply.js` re-translates automatically on locale toggle. The third case — **parametric** translatable text (interpolated values from JS state) — needs an explicit `onLocaleChange` subscription that re-runs the JS computation.
- **Direction is data, not magic** (PROJECT_RULES.md §12.1). `<html dir>` is the single signal; everything downstream reads from `I18N_CONFIG.rtlLocales`. Adding a new RTL locale (e.g., Hebrew) is one config change, zero CSS changes (logical properties handle it).
- **Logical properties have nearly-universal browser support** as of 2026: `margin-inline-*`, `padding-inline-*`, `inset-inline-*`, `border-inline-*`, `text-align: start/end` all shipped in Chrome 87+, Firefox 66+, Safari 14.1+. Pre-2021 browsers (~0.1% of MENA traffic) would render physical fallback; acceptable.

**Verification (run by Claude in the harness, no project lead time consumed):**
- `node --check` passes on every changed JS module (`app.js`, `i18n/index.js`, `i18n/rtl.js`, plus the unchanged-but-tested `i18n/apply.js`, `config/i18n.js`).
- Both locale JSON files parse cleanly (`JSON.parse`).
- All 124 unique `data-i18n*` keys in `index.html` resolve in both `en.json` and `ar.json`. All 12 dynamic data-i18n keys set by `renderFriend` + `goToSelect` resolve too.
- Final directional-property audit: 2 remaining usages (toggle-slider knob + duel-player-opp), both intentional and documented above.
- Cache buster audit: changed-target consumers bumped to `?v=20260528f`; unchanged targets stayed at `?v=20260528c` / `?v=20260528d` / `?v=20260526a` per strict §14.3.

**Project lead verification (the only part I can't test):**
1. Hard refresh `http://localhost:8000/` — auth screen renders, EN active, no console errors.
2. Click `العربية` toggle — the layout flips (button positions, alignment, the EN | AR toggle ordering, the back-button arrow → instead of ←); AR text renders in Cairo font (visibly different from Inter); the placeholder strings now show `[AR] ` prefix.
3. DevTools → Elements tab: `<html lang="ar" dir="rtl">`.
4. **Locale-toggle-vs-runtime-state regression check:** sign in to the dev account; if a friend doc exists in `presence/`, the friend bar shows their real name. Toggle locale; friend name STAYS the real name (doesn't reset to "Waiting for friend…"); status text DOES translate ("Online" ↔ "[AR] Online"). Navigate to character-select for Zen mode; the page subtitle, info text, and start button reflect Zen-specific copy; toggle locale; all three translate correctly without reverting to defaults. Return to dashboard; the "Welcome back, <name>" line translates correctly while the name stays as the user's actual name.
5. Open Settings → click `← Back` — works (the arrow is now CSS-rendered and mirrors in AR).

**Open Follow-up:**
1. **L1.03** Codex AR pass is unblocked — the `en.json` key set is now stable for L1.02+. Spec C draft to be written when project lead's L1.02 verification confirms wiring. Will mirror Spec A/B structure; output is a complete `ar.json` body filling every key currently `[AR] <english>`.
2. **In-game modules** (`js/games/duel.js`, `js/games/coop.js`, `js/games/engine.js`, `js/data/leaderboards.js`) still have hardcoded EN strings AND the one remaining physical CSS rule (`.duel-player-opp`). Migrate together when those modules are next touched (L2.C).
3. **L1.04 hero** is the next L1 task — copy already drafted by Codex (Spec B) and reviewed; held in `scripts/output/codex-b-hero.merged.json` (T4, gitignored). Integration moves the hero copy into `en.json`/`ar.json` under the `hero.*` namespace and builds the landing-page hero section structure in `index.html`.

---

## 2026-05-28 — Phase L1.19: `saveProfileSettings` atomic refactor onto `usernames/{lower}` lock
**Status:** ✅ DONE
**Scope:** Code | Docs
**Summary:** Brought the username CHANGE path onto the same atomicity pattern R2.05 established for signup. Old code queried `users` where `username == X` for uniqueness, which is race-vulnerable: two users in Settings simultaneously claiming the same available name both see "free" and both write `users/{uid}.username` successfully → two `users/` docs sharing a username. New code uses Firestore's create-vs-update semantics on `usernames/{newLower}` as the atomic lock (mirrors `handleRegister` from R2.05, mirrors the `_registrationInFlight` discipline from L1.20). Sequence: claim `usernames/{newLower}` (atomic gate; permission-denied = taken) → release `usernames/{oldLower}` (best-effort) → update `users/{uid}` + presence. Failure between gate-claim and `users/` write triggers a synchronous rollback of the new reservation (no listener race here — unlike L1.20, the failure path runs after the synchronous-failure point, not concurrent with another writer).

**Files / Areas (cache buster: `index.html` script tag `?v=20260528d → ?v=20260528e`; rest of imports unchanged):**
- `js/app.js` `saveProfileSettings` (~30 LOC net change inside the function, ~70 LOC after factoring in the new try/catch shells and rollback path). Fast path for display-name-only changes (no username juggle) preserved. The old `query(... where('username', '==', X) ... limit(1))` block removed entirely — the new `usernames/` create is the uniqueness check.
- No new imports — `deleteDoc` was already imported for the L1.20 cleanup path; reused here.

**Pattern details:**
- **Fast path (display-name only):** `username === oldUsername.toLowerCase()` → skip the `usernames/` writes; just update `users/{uid}` + presence. Saves two writes for the common case.
- **Username-change path:**
  1. `setDoc(usernames/{newLower}, {uid, createdAt})` — atomic gate. `permission-denied` → "Username already taken." (mirrors `handleRegister`'s exact idiom).
  2. `deleteDoc(usernames/{oldLower})` — best-effort. Wrapped in its own try/catch; failure here is non-fatal (the new reservation is now the source of truth; a leftover `usernames/{old}` doc owned by the same uid is benign). Logged as `console.warn`.
  3. `updateProfile(state.user, {displayName})` + `setDoc(users/{uid}, ...)` + presence write (best-effort) — same as before.
  4. **Rollback:** if step 3 throws after step 1 succeeded, `claimedNewUsername` is true and the outer catch deletes `usernames/{newLower}`. This prevents the "I just tried to rename to X, the save failed, now X shows as taken on retry" UX bug.

**What did NOT change:**
- The cleanup story is structurally different from L1.20's: L1.20 needed a **prevent-the-race** approach because the racing actor was an asynchronous event listener (`onAuthStateChanged`). L1.19's race actors are two separate browsers — there's no in-process listener to fence off. Firestore's create-vs-update semantics is enough; one create wins, the other gets `permission-denied`. Documented in the inline comment above `claimedNewUsername`.
- The hypothetical "orphan `users/` doc with username X but no `usernames/{X}` reservation" (would happen if L1.20's `reserveFallbackUsername` graceful-degradation hit 10 collisions, or pre-R2.05 data) is **not** detected by this refactor. The new user could claim `usernames/{X}` legitimately, leaving two `users/` docs sharing the username. Mitigation: tracked as a Future Considerations item — at <50 users on `tomodachi-prod` (and with no real pre-R2.05 data since R2 skipped migration), the risk is essentially zero. The L1 Cloud Function gateway will own longer-term invariant maintenance.

**Verification:**
- `node --check js/app.js` passes.
- Project lead localhost race-test (5 scenarios) — display-name-only happy path ✓, username happy path ✓, single-user revert ✓, **cross-user race (two browsers claiming same name simultaneously) → one wins, one gets "Username already taken" ✓**. Optional self-heal-orphan + mid-save-failure paths not run; well-tested by L1.20's pattern.

**L1.01 follow-up surfaced during this task:**
- The `friend-name` and `friend-status` elements in `index.html` have `data-i18n="dashboard.friend.waiting"` / `data-i18n="dashboard.friend.status_offline"` attributes. When the locale toggle fires `languageChanged`, `apply.js` re-walks the DOM and resets those elements back to the translated "Waiting for friend…" — overwriting whatever `renderFriend()` wrote into them with the active friend's name/status. Bug only manifests on locale toggle while a friend is displayed; not a regression from L1.19. Fix: in `renderFriend`'s with-friend branch, remove the `data-i18n` attributes (so `apply.js` skips those nodes); in the no-friend branch, re-add them. Bundle into the next i18n-touching commit (likely L1.02 RTL infrastructure work).

**Open Follow-up:**
1. **L1.02 RTL infrastructure** is next on the L1 spine — `<html dir>` sync off `I18N_CONFIG.rtlLocales`, Cairo font import for AR text, `[dir="rtl"]` overrides for icon mirroring. Will bundle the L1.01 `friend-name`/`friend-status` `data-i18n` fix above.
2. **Codex parallel work** still active: Spec A (L1.07 FAQ) and Spec B (L1.04 hero copy) handed to project lead for paste-into-Codex; output returns trigger §17.3 Claude review.

---

## 2026-05-28 — Phase L1.01: i18next setup + en/ar JSON skeleton + locale toggle
**Status:** ✅ DONE
**Scope:** Code | Docs
**Summary:** First L1 task lands. Wired i18next 26.3.0 + i18next-browser-languagedetector 8.2.1 as ES module CDN imports (matches the Firebase SDK buildless pattern in `js/data/firebase.js`). New `js/i18n/{index.js, apply.js, locales/{en,ar}.json}` modules plus `js/config/i18n.js` for supported-locale config. 124 unique i18n keys wired across the entire static surface of `index.html` (auth, dashboard, character-select, leaderboard, settings, game results, lobby, duel, coop, invite modal); 54 dynamic strings wired in `js/app.js` (toasts, formatAuthError, MODE_NAMES → modeName(), goToSelect per-mode copy, dashboard subtitle, history items, friend bar, settings flow, reset flow). `ar.json` ships with `[AR] <en value>` placeholder values throughout — L1.03 (Codex AR pass) is what makes the AR side actually readable; this scoping lets us merge L1.01 without blocking on translation.

**Files / Areas:**
- **NEW:** `js/config/i18n.js` — supportedLocales, defaultLocale, rtlLocales, storageKey, queryParam.
- **NEW:** `js/i18n/index.js` — `initI18n()`, `t()`, `setLocale()`, `getLocale()`, `isRTL()`. Loads locale JSON via `fetch(new URL('./locales/X.json', import.meta.url))` so paths are module-relative (not page-relative). Detection order: `?lang=ar` URL param → `localStorage('tomodachi-lang')` → `navigator.language` → `<html lang>`. Persistence is automatic via `detection.caches: ['localStorage']`. Mirrors active language onto `<html lang>` on init + every `languageChanged` event. `<html dir>` switching is intentionally L1.02's job.
- **NEW:** `js/i18n/apply.js` — DOM walker that substitutes `[data-i18n]`, `[data-i18n-placeholder]`, and `[data-i18n-attr="attr:key,attr2:key2"]` nodes. Uses `textContent` / `setAttribute` (never `innerHTML`) so translation values can't inject HTML.
- **NEW:** `js/i18n/locales/en.json` — 124+ source-of-truth keys organized by purpose-not-UI-section: `common.*`, `auth.*`, `nav.*`, `dashboard.*`, `modes.*`, `select.*`, `leaderboard.*`, `settings.*`, `game.*`, `lobby.*`, `duel.*`, `coop.*`, `invite.*`, `error.*`, `toast.*`, `locale.*`.
- **NEW:** `js/i18n/locales/ar.json` — same structure, every leaf prefixed `[AR] ` so the AR toggle visibly differs during L1.01 verification AND every key Codex needs to translate is immediately findable for L1.03. The two literal-keep cases (`settings.danger.input_placeholder = "RESET"` and `locale.label_*`) stay unprefixed.
- **`index.html`** — `data-i18n*` attributes added to all 124 static-text nodes. Two locale toggles (`.auth-locale-bar` + `.nav-locale-bar`) added. The outdated `🔒 Only 2 accounts are allowed on Tomodachi.` form note (obsoleted by R2.05's `maxUsers` retirement) was removed. The `<strong>RESET</strong>` inline-bold was dropped from the danger-zone confirm label to give it a single-key translation; "RESET" stays as a Latin literal because users have to type it verbatim regardless of locale. Cache buster bumped `js/app.js?v=20260528c → ?v=20260528d` and `css/style.css?v=20260526a → ?v=20260528d`.
- **`js/app.js`** — import added: `{ initI18n, t, setLocale, getLocale } from './i18n/index.js?v=20260528d'`. Removed: `MODE_NAMES` constant (replaced by `modeName(type)` helper that falls back to the raw type string on key miss). Removed: the hand-written `formatAuthError` map; replaced with a lookup that maps `'auth/invalid-email'` → `'error.auth.invalid_email'` via regex (`replace(/^auth\//, '').replace(/-/g, '_')`) and falls through to `error.auth.fallback_with_code` / `fallback_generic` on miss. New `bindLocaleToggles()` function wires the `.locale-toggle` buttons and maintains the `.active` class on the current-locale button (re-runs on every click via `setLocale`'s `languageChanged` propagation). `init()` now `await initI18n()` BEFORE `attachListeners()` + `onAuthStateChanged` so `t()` is callable by the time the auth listener fires for cached sessions. `renderFriend()` rewritten to use `createElement`/`textContent` instead of `innerHTML` (defense-in-depth against future translation values; not exploitable today). `loadHistory()`'s template strings now run translated text through `escapeText()` before string-interpolation into `innerHTML`. Strict §14.3 cache-buster reading kept: unchanged-target imports (`config/firebase`, `core/core`, `data/firebase`, `games/{engine,duel,coop}`, `data/leaderboards`, `audio/audio`) stayed at their previous busters.
- **`css/style.css`** — minimal styles for `.auth-locale-bar`, `.nav-locale-bar`, `.locale-toggle`, `.locale-toggle.active` appended at end. Uses existing `--accent` / `--text-secondary` / `--border` variables with hex fallbacks. ~33 lines added.

**Architecture / scope decisions:**
- **i18next over alternatives.** Considered: hand-rolled `t()` over JSON (cheap but no language-detector, no interpolation pluralization, no `languageChanged` event), FormatJS / react-intl (heavy + React-tied), Polyglot (older + smaller community). i18next won on detection-plugin ecosystem + interpolation including pluralization + active maintenance + ESM-compatible CDN distribution. Full rationale in Learning Log entry.
- **Buildless via CDN.** Pinned `i18next@26.3.0` and `i18next-browser-languagedetector@8.2.1` via `https://cdn.jsdelivr.net/npm/<pkg>@<version>/+esm`. Matches the Firebase SDK pattern in `js/data/firebase.js`. Version pinned in URL = same version always loaded; no surprise upgrades on CDN-side changes.
- **Key namespace shape** — hierarchical dot-notation, namespaces map to **module purpose** (`auth.*`, `error.*`, `select.*`) not UI section, so a key like `auth.field.email` is reusable from any screen that asks for an email. Documented in `PROJECT_RULES.md` §13.4.
- **DOM substitution via `data-i18n` attributes** rather than templating. The EN text stays as a fallback so the page renders if i18next ever fails to load (CDN outage, content-blocker extension); `apply.js` overwrites with the looked-up string on init + every `languageChanged` event.
- **Out-of-scope for L1.01:** `js/games/{duel,coop,engine}.js` and `js/data/leaderboards.js` have their own JS-string literals (e.g., duel round labels, leaderboard formatting). They stay hardcoded and will be migrated in the L-phase tasks that touch those modules. L1.01's customer is the landing-page visitor, not the in-game multiplayer experience, so this scoping is justified. Documented in `Phases_and_Tasks.md` Phase L1 implicitly (L1.01's i18next setup is named; further per-module migrations land naturally as those modules are touched).

**Verification:**
- `node --check` passes on `js/app.js`, `js/i18n/index.js`, `js/i18n/apply.js`, `js/config/i18n.js`.
- `JSON.parse` validates `js/i18n/locales/{en,ar}.json`.
- Static-key audit script confirms: 124 unique `data-i18n*` keys in `index.html`, 54 unique static `t()` keys in `js/app.js`, **zero missing keys in `en.json`, zero missing in `ar.json`**. Dynamic keys (`modes.${type}.name`, `error.auth.${sub}`) verified by inspection — all bases present in both locales.
- Manual browser verification deferred to project lead (see Open Follow-up #1 below — 10-step test plan).

**Codex parallel work launched in this turn:**
- **Spec A** (L1.07 FAQ EN+AR drafts, 8 Q&A pairs) and **Spec B** (L1.04 hero copy EN+AR, 6 elements + 3 alternates) drafted as self-contained Codex prompt blocks in the approved plan file at `C:\Users\mouta\.claude\plans\we-re-starting-phase-l1-ticklish-starlight.md`. Both can run in parallel; both require §17.3 Claude review before merge. Spec C (L1.03 AR pass for the en.json key set above) is the natural next Codex spec once project lead's localhost verification of L1.01 confirms the wiring.

**Open Follow-up:**
1. **Project lead localhost verification** — 10-step test plan (per the approved L1.01 plan): start a local server, confirm `[firebase-init] env=dev` still prints, click EN | AR toggle and confirm `[AR] …` strings render throughout, refresh and confirm `?lang=ar` is sticky via localStorage, open with `?lang=en` and confirm EN renders regardless of localStorage, sign in to dev and confirm dashboard / nav / settings flip, trigger a wrong-password error and confirm the error toast translates. Detailed in the plan file.
2. **L1.19** (`saveProfileSettings` race-condition refactor) — next code task after L1.01 verification confirms; both touch `app.js`. Sequence per the L1 plan.
3. **L1.02** RTL infrastructure — wires `<html dir>` off `I18N_CONFIG.rtlLocales`, adds Cairo font import for AR text, adds `[dir="rtl"]` overrides where logical properties can't cover (icon mirroring). Plan-doc'd.
4. **L1.03 Codex AR pass** — spec to be drafted by Claude once L1.01 verification confirms the en.json key set is the right one. The spec will mirror Specs A/B in structure: full §4 + §5 style requirements (pure MSA, no Egyptian markers, parallel-authored not translated, Arabic punctuation), expected JSON output matching the en.json shape exactly, self-review checklist.
5. **In-game module i18n migration** — `js/games/{duel,coop,engine}.js` + `js/data/leaderboards.js` still have hardcoded English JS strings. Migrate when those modules are next touched (likely L2.C).
6. **`<html lang>` is synced by L1.01;** `<html dir>` is NOT — L1.02 owns that.

---

## 2026-05-28 — Phase R2 closure (R2.14): 3-environment Firebase topology complete; `hiraquest0` decommissioned
**Status:** ✅ PHASE COMPLETE
**Scope:** Backend topology | Code | Firebase | GCP | Cloudflare | Docs

**Phase R2 in one sentence:** Migrated from a single legacy Firebase project (`hiraquest0`) holding live prod traffic to a clean three-environment topology (`tomodachi-dev` / `tomodachi-staging` / `tomodachi-prod`) backed by GitHub Pages (prod) + Cloudflare Pages (staging) + localhost (dev), with a hostname-based runtime config switcher and the legacy project decommissioned.

**14-task scorecard:**
- ✅ **R2.01-R2.03** — Three new Firebase projects created (`tomodachi-dev`, `-staging`, `-prod`) with Auth + Firestore enabled. Storage + Cloud Functions deferred (Spark tier; revisit at Blaze upgrade in L1).
- ✅ **R2.04** — Hostname-based config switcher (`getEnv()` + `getFirebaseConfig()`) in `js/config/firebase.js`. Prod-debug-gate idiom introduced for verification logs (`env !== 'prod' || params.has('debug')`).
- ✅ **R2.05** — Hardened Firestore ruleset applied to all 3 new projects. Introduced the `usernames/{lower}` doc-as-key uniqueness pattern (atomic via Firestore create semantics) — the option (d) workaround for the pre-existing pre-auth-users-read signup bug.
- ✅ **R2.06** — Cloudflare Pages staging deploys live at `https://tomodachi-staging.pages.dev`. Workers-vs-Pages misstep + recovery on first attempt; URL pattern (`.pages.dev` vs `.workers.dev`) is the durable signal.
- ✅ **R2.07** — 3-env topology end-to-end verified (Part A + cross-contamination check). Part B (prod-URL signup against `hiraquest0`) deferred as a documented limitation — `hiraquest0`'s older hardened ruleset has no `usernames/` block, so R2.05 signups can't complete there. Discovery: `hiraquest0` was on the older "Phase 2 recommended" hardened ruleset (NOT the broad catch-all that R2.05 + R2.06 closure entries had incorrectly assumed). Corrected in `docs/Firestore_Rules.md` carve-out section.
- ⚠️ **R2.08-R2.10** — Data + Auth migration **SKIPPED** per project lead decision after `gcloud firestore export` hit the Blaze-tier requirement. Project lead had no important data on `hiraquest0` to preserve (single test account; stats/leaderboards/history all disposable). Trade: lost the data; saved the Blaze upgrade for L1 when it's actually needed for the registration-cap Cloud Function.
- ✅ **R2.11** — Cutover commit (`202204e`) flipped `configs.prod` in `js/config/firebase.js` from `hiraquest0` values to `tomodachi-prod` values. Staging-first deploy: `git push origin main:staging` → verify on Cloudflare → then `git push origin main`. GitHub secret-scanning alert surfaced a real gap (three new projects' API keys hadn't had GCP-level restrictions); fixed during wrap-up by setting HTTP referrer + API restrictions per project (dev got API-only because GCP rejects `localhost` as a referrer domain).
- ⚠️ **R2.12 (48h soak)** — Compressed to "immediate verification was clean" per project lead decision. Risk profile justified the compression: small user base (1 prod account), zero existing prod data to corrupt, cutover code was a pure config switch with no novel logic.
- ✅ **R2.13** — `hiraquest0` decommissioned via Firebase Console → Project settings → Delete project. **30-day recovery grace period running** if anything surfaces by ~2026-06-27.
- ✅ **R2.14 (this entry)** — Phase R2 closure paperwork.

**Bugs / escalations surfaced and addressed during R2:**
- **L1.20 (escalated from L1 into R2)** — `ensureUserProfile` self-heal raced `handleRegister` USERNAME_TAKEN cleanup, leaving orphan `users/` docs. v1 attempt (cleanup-after-race in `handleRegister` catch, commit `6384526`) didn't work — the racing writes landed AFTER cleanup ran. v2 fix (commit `cb48b64`) prevented the race entirely with a `_registrationInFlight` flag + extracted `enterAppAsUser` helper. Generalizable lesson captured in the L1.20 Learning Log entry: cleanup-after-race can't reliably close a race window it doesn't synchronize with; prevent-the-race via an inflight flag is the robust pattern.
- **`hiraquest0` ruleset misidentified** in R2.05 + R2.06 closure entries as "broad catch-all"; actually was the older "Phase 2 recommended" hardened ruleset (no `usernames/` block, no duel-guest `guestId` carve-out). Discovered during R2.07 Part B verification. Corrected the carve-out section.
- **Cloudflare Workers vs Pages misstep** in R2.06 first attempt — fixed by deleting the Worker and recreating as a Pages project. URL pattern `.workers.dev` vs `.pages.dev` is the durable diagnostic signal.
- **GitHub secret-scanning + Firebase web API keys** — false-positive surfaced a real gap (no GCP-level key restrictions on new projects). Three-layer access model (Security Rules + Auth authorized domains + GCP key restrictions) documented in the R2.11 wrap-up Learning Log entry.

**Carrying into Phase L1:**
1. **`content_sets/` is empty on `tomodachi-prod`** — needs reseed during L2.A-L2.B content authoring (the planned-from-the-start path; L2.04 is the interactive authoring tool that rebuilds content from scratch). The app is stable but games can't render content cards until populated. Not a regression introduced by R2; just the natural consequence of skipping the data migration.
2. **Blaze upgrade still pending** for `tomodachi-prod` — required at L1 for the Cloud Function registration gateway. Budget cap will be $1/mo per the R2.08 walkthrough.
3. **L1.19** — `saveProfileSettings` race-condition refactor still open. The R2.05 ruleset accepts the current query-based approach post-auth; race exposure is benign at <50 users; L1 cleanup task.
4. **L1.20 ✅ CLOSED** out of Phase L1 sequence via the v2 fix during R2 escalation.
5. **Refactor splits deferred from R1.04** — `js/core/core.js` → 4 files; `js/audio/audio.js` → `tts.js` + `sfx.js`; `js/games/engine.js` → engine + zen + survival. Trigger: L2.C when new modules need to import from inside them.
6. **Pre-existing R1.05a `localStorage` migration bug** in `js/core/core.js:16-17` (both `oldK` and `newK` use the same `'tomodachi-'` prefix; one should be `'hiraquest-'`). Silent no-op since the typo landed. Disposition unchanged: delete the shim at the next `core.js` touchpoint per the R2.04 closure entry.

**Final state of the four Firebase projects:**
- `hiraquest0` — scheduled for deletion (30-day grace until ~2026-06-27, then permanent).
- `tomodachi-dev` — live; localhost target; R2.05 hardened rules; API key API-restricted only (no referrer restriction because of GCP's `localhost` rejection).
- `tomodachi-staging` — live at `https://tomodachi-staging.pages.dev/`; R2.05 hardened rules; API key referrer-restricted (`*.pages.dev` + future `staging.tomodachi.com`) + API-restricted.
- `tomodachi-prod` — live at `https://al-mo3tasem.github.io/Tomodachi/`; R2.05 hardened rules; API key referrer-restricted (`al-mo3tasem.github.io/*` + future `tomodachi.com/*`) + API-restricted; one real test account from R2.11 verification.

**Learning Log entries written during R2:**
- [Phase R2, Task R2.04] — Hostname-based environment selection + prod-debug-gate idiom
- [Phase R2, Task R2.05] — Firestore uniqueness via doc-as-key collection (atomicity through create semantics)
- [Phase R2, Task R2.06] — Cloudflare Workers vs Pages: when to use which (and how to tell what you created)
- [Phase L1, Task L1.20] — Self-heal logic, invariant drift, and "cleanup-after-race vs prevent-the-race" (v1 attempt + v2 fix in one day)
- [Phase R2, Task R2.11 wrap-up] — Firebase web API keys, GitHub secret-scanning false positives, and the three-layer access model

**Next phase: L1 — Landing page + waitlist.** See `docs/Phases_and_Tasks.md` Phase L1 task list. First task L1.01: i18next setup (depends on R2.14 — done as of this entry).

**🗓️ Scheduled cleanup on or after 2026-06-27 (R2.13 grace period elapses):**
- Firebase's 30-day project-deletion grace for `hiraquest0` ends ~2026-06-27 (project decommissioned 2026-05-28). Once that date passes, `hiraquest0` is permanently deleted and the carve-out documentation becomes historical noise.
- **Any Claude session orienting on the project after 2026-06-27 should pick up the following work:**
  1. Remove the `## 🪪 hiraquest0 carve-out` section from `docs/Firestore_Rules.md` (sits between the R2.05 ruleset block and the Application sequence section).
  2. Update `docs/Tomodachi_Master_Plan.md` §4.8 if any forward-looking language about hiraquest0 remains.
  3. Update the "Where we are right now" line in `C:\Users\mouta\.claude\projects\d--MO3-LAP-MyProjects-Tomodachi\memory\tomodachi-commercialization.md` from "30-day Firebase recovery grace until ~2026-06-27" to "permanently deleted ~2026-06-27".
  4. Write a small Progress Log entry titled "hiraquest0 carve-out removed (R2.13 grace period elapsed)".
  5. Commit + push to main: `Remove hiraquest0 carve-out — R2.13 grace period elapsed`.
- If hiraquest0 was restored within the grace window (project lead changed their mind), abort this cleanup and reschedule for the new deletion date.
- A session-local cron (task `6c342964`, fires `17 9 27 6 *` = 2026-06-27 09:17 local) was also registered in the session that closed Phase R2, but it dies when that session ends; this doc note is the authoritative reminder.

---

## 2026-05-28 — Phase R2.11: cutover to `tomodachi-prod` complete
**Status:** ✅ DONE
**Scope:** Code | Firebase | GCP | Docs
**Summary:** Prod URL (`https://al-mo3tasem.github.io/Tomodachi/`) now routes to `tomodachi-prod` Firebase project. The R2.04 hostname-based config switcher carried this moment specifically: R2.11's code change was a config-only flip — `configs.prod` values in `js/config/firebase.js` swapped from `hiraquest0` to `tomodachi-prod`. Verified end-to-end: `?debug=1` shows `[firebase-init] env=prod projectId=tomodachi-prod`; fresh registration on prod URL writes 3 docs to `tomodachi-prod` Firestore; `hiraquest0` saw zero new traffic post-cutover.

**Files / Areas (commit `202204e`, 10 files, +38 / -35):**
- `js/config/firebase.js`: configs.prod values updated to `tomodachi-prod`; header + inline comments rewritten to reflect post-cutover state and the R2.08-R2.10 skip.
- `js/config/firebase.template.js`: template comment updated to match.
- Cache busters bumped to `?v=20260528c` on every import whose target's content changed transitively: `index.html` (app.js script tag), and every non-audio JS import line across `js/app.js`, `js/core/core.js`, `js/data/firebase.js`, `js/data/leaderboards.js`, `js/games/{coop,duel,engine}.js`. Audio.js imports (×4) and the CSS link in `index.html` intentionally stayed at older busters per strict §14.3 (their targets did not change).

**Deploy sequence (staging-first per the deploy memory's R2.11 exception):**
1. Committed locally on `main`: `202204e`.
2. `git push origin main:staging` — pushed main's tip to remote staging branch. Cloudflare Pages redeployed the staging URL with the cutover code. Hostname selector continues to pick `staging` based on `.pages.dev` suffix, so staging URL kept routing to `tomodachi-staging`. Verification confirmed: env=staging projectId=tomodachi-staging unchanged; sign-in as the R2.06 test account worked.
3. `git push origin main` — actual cutover. GitHub Pages redeployed; prod URL serves the new code.
4. Project lead's prod verification confirmed env=prod projectId=tomodachi-prod and fresh signup landed in `tomodachi-prod` (NOT `hiraquest0`).

**API key restrictions applied (gap surfaced by GitHub secret-scanning alert):**
- GitHub's automated secret scanner emailed an alert flagging the `tomodachi-prod` Web API Key in commit `202204e`. This is a false-positive on Firebase's "API keys are public by design" model (see `PROJECT_RULES.md` §5.3 + Firebase docs), but it surfaced a real gap — the three new projects' API keys hadn't had GCP-level restrictions set yet (`hiraquest0`'s key was domain-restricted back on 2026-05-20; the new keys were inherited unrestricted).
- Restrictions set during R2.11 wrap-up via GCP Console → APIs & Services → Credentials → Web API Key edit:
  - `tomodachi-prod`: HTTP referrer restrictions (`https://al-mo3tasem.github.io/Tomodachi/*`, `https://al-mo3tasem.github.io/*`, `https://tomodachi.com/*`, `https://*.tomodachi.com/*`) + API restrictions (Identity Toolkit, Token Service, Cloud Firestore, Firebase Installations only).
  - `tomodachi-staging`: HTTP referrer restrictions (`https://tomodachi-staging.pages.dev/*`, `https://staging.tomodachi.com/*`) + same API restrictions.
  - `tomodachi-dev`: API restrictions only (GCP doesn't accept `localhost` / `127.0.0.1` as valid HTTP referrer domains; Application restrictions left at "None"). Acceptable given dev has no production data and is only accessed from localhost.
- GitHub alert dismissed as "Used in tests" with explanatory comment per `PROJECT_RULES.md` §5.3.

**Verification:**
- `[firebase-init] env=prod projectId=tomodachi-prod` confirmed in DevTools Console on prod URL.
- Fresh registration on prod URL succeeded; "Welcome to Tomodachi, {name}!" toast; 3 docs landed in `tomodachi-prod` Firestore (`usernames/{lower}`, `users/{uid}`, `stats/{uid}`); Authentication tab shows the new account.
- `hiraquest0` Firestore + Authentication tabs showed zero new writes post-cutover.
- Staging URL still works as designed (env=staging projectId=tomodachi-staging; sign-in works).

**Open Follow-up:**
1. **`content_sets/` collection is empty on `tomodachi-prod`** — the R2.08-R2.10 data migration was skipped, so the hiragana/katakana content the user might want to play with doesn't exist in `tomodachi-prod` yet. Project lead acknowledged this and is fine (Phase L2 content authoring rebuilds content from scratch via the L2.04 interactive authoring tool). The app is stable but games can't render content cards until `content_sets/` is populated. **Resolution path: Phase L2.A-L2.B content authoring** (the planned-from-the-start path; not a regression introduced by R2).
2. **`R2.12 (48h soak)` compressed to "immediate verification was clean"** per project lead decision. Reasons: small user base (1 account on prod), zero existing prod data to corrupt, cutover code is purely a config switch with no novel logic, risk profile is low. Documented here so the timeline-compression decision is on record.
3. **`R2.13 (decommission hiraquest0)` next** — project lead deletes the `hiraquest0` Firebase project from console. Two-week recovery grace period gives a safety net.
4. **`R2.14 (Phase R2 closure)`** lands after R2.13 confirms.

---

## 2026-05-28 — R2.07 closure + L1.20 v2 verified
**Status:** ✅ DONE (R2.07 + L1.20)
**Scope:** Docs (closure paperwork only — L1.20 v2 code shipped earlier today in `cb48b64`)
**Summary:** R2.07 closes with Part A verified and Part B documented as a known limitation pending R2.11 cutover. L1.20 v2 (the inflight-flag fix in `cb48b64`) verified end-to-end on `tomodachi-dev`: Test A (happy path) and Test B (collision with same username) both pass with zero orphan state.

**R2.07 acceptance breakdown:**
- ✅ Part A — prod URL hostname-selector check: `[firebase-init] env=prod projectId=hiraquest0` confirmed at `?debug=1`.
- ⚠️ Part B — fresh signup against `hiraquest0`: cannot complete because the legacy project's hardened ruleset has no `usernames/` match block; every signup attempt fails with the misleading "Username already taken" error (now cleanly, without orphan state, thanks to L1.20 v2). Documented in `docs/Firestore_Rules.md` carve-out section. R2.11 cutover unblocks (prod URL will route to `tomodachi-prod` which has the full R2.05 ruleset).
- ✅ Cross-contamination check (implicit, already passed): test users on `tomodachi-dev` and `tomodachi-staging` landed only in their respective projects; pre-fix orphan attempts on `hiraquest0` were misdirected writes (cleaned up), not bleed-over.

**L1.20 v2 verification on `tomodachi-dev`:**
- Test A (happy path): fresh email + fresh username → smooth transition to dashboard (no flash), "Welcome to Tomodachi, {name}!" toast, 3 docs landed (`usernames/`, `users/`, `stats/`).
- Test B (collision): fresh email + SAME username → "Username already taken" toast with NO flash of dashboard; Authentication tab unchanged (only Test A's account); Firestore unchanged (only Test A's docs).

**v1 → v2 design lesson (brief):** v1 (commit `6384526`) tried cleanup-after-race — delete orphan `users/{uid}` + `stats/{uid}` in `handleRegister`'s catch. Empirically failed because the racing writes from `ensureUserProfile` landed AFTER the cleanup ran; the deletes were no-ops at the moment they fired, then the writes landed. v2 (commit `cb48b64`) prevents the race entirely via a module-level `_registrationInFlight` flag that makes `onAuthStateChanged` skip its post-auth flow during registration. `handleRegister` then manually triggers the post-auth flow via a new `enterAppAsUser(user, isFreshRegistration)` helper extracted from the listener. Full design discussion + the "cleanup-after-race vs prevent-the-race" lesson in the updated `docs/Learning_Log.md` L1.20 entry.

**Files / Areas:** Docs only this commit. Code shipped earlier today in `6384526` (v1, superseded) and `cb48b64` (v2, landed). `docs/Learning_Log.md` L1.20 entry rewritten to reflect the final v2 architecture + the v1 lesson. `docs/Phases_and_Tasks.md` R2.07 description unchanged (the acceptance carve-out for Part B is documented here + in the rules doc carve-out, not in the task description per convention).

**Open Follow-up:**
1. **R2.08 — `gcloud firestore export` from `hiraquest0`** is next. Joint task: Claude provides exact commands; user runs with gcloud CLI authenticated to the Google account that owns `hiraquest0`.
2. **Pre-R2.08 user prerequisites:** gcloud CLI installed (`gcloud --version` to check); `gcloud auth login` with the Google account that owns `hiraquest0`; `gcloud config set project hiraquest0`. Walkthrough in the next message.

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
