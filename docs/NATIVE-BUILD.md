# Native shell (Capacitor 8) — build guide

The native apps are the **same static web app** loaded inside a Capacitor shell.
Nothing is bundled except one small bridge; GitHub Pages keeps deploying the web
version exactly as before.

## Layout
| Path | Purpose |
|---|---|
| `package.json` | project-local deps: `@capacitor/*` 8.x, plugins, esbuild (dev). `"type":"module"` — the whole app is ES modules. |
| `capacitor.config.json` | appId `com.bytepluslife.tomodachi`, `webDir: www`, splash/keyboard config. **Change the appId before the first store upload if the lead wants another; it must match the bundle ID the Apple-account holder registers.** |
| `native/bridge.js` | the ONLY file that imports `@capacitor/*`. Bundled to `www/native-bridge.js`; exposes `window.Native` (haptics vocabulary, tts, app, keyboard, prefs, notify, share, splash). |
| `js/native/shell.js` | the ONLY web module that talks to `window.Native` (back button, background → stop speech). No-op on the web. |
| `scripts/native/build-www.mjs` | copies the site allowlist into `www/`, writes `www/native-env.js` (forces the Firebase env — `localhost` would otherwise map to DEV), bundles the bridge, patches `viewport-fit=cover` + the two scripts into `www/index.html`. |
| `scripts/native/build-bridge.mjs` | esbuild step for the bridge (IIFE, minified). |
| `scripts/native/collect-apk.mjs` | copies the built APK to `dist/` with a dated name. |
| `android/` | generated Android project (committed; `build/`, `.gradle/`, `local.properties` ignored). |
| `www/`, `dist/`, `node_modules/` | generated, git-ignored. |

## Machine setup (done 2026-09-06 on the lead's laptop)
- JDK 21 (Temurin) → `JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot`
- Android SDK at `C:\Android\Sdk` (cmdline-tools, platform-tools/adb, platforms;android-36, build-tools;36.0.0) → `ANDROID_HOME=C:\Android\Sdk`
- Both are user-level env vars; new terminals see them. No Android Studio needed for APKs.

## Commands
```
npm run build:www              # → www/  (env=prod by default; --env=dev|staging via node scripts/native/build-www.mjs --env=dev)
npx cap sync android           # copy www → android + register plugins
npm run android:debug          # build:www + sync + gradlew assembleDebug
node scripts/native/collect-apk.mjs   # → dist/Tomodachi-debug-YYYYMMDD.apk
```
Debug APK path: `android/app/build/outputs/apk/debug/app-debug.apk`.

### Guard rails (batch 1) — run before every push
```
npm test                 # lint:css (logical properties in css/app) + lint:gates (window.Native / showScreen / localStorage owners) + unit tests
node scripts/dev/leftovers.mjs   # migrated patterns that crept back (toLocaleString, toLocaleDateString, formatTime, localStorage)
npm run test:e2e         # Playwright: 2 phones × EN/AR × light/dark — v1 baselines (maxDiffPixels 0), glass budget, axe baseline, v2 specs (needs the dev QA account + network)
npm run test:e2e:update  # re-record baselines ONLY for a batch that deliberately changes prod-visible pixels; list them in the batch notes
```
One Playwright process at a time (they share `tests/e2e/.results`).
Baselines live in `tests/e2e/__baselines__/` (committed). The feature flag `nativeShell`
(`js/config/features.js`) is ON for dev/staging hosts and the app shell, OFF on prod;
`?ff_native_shell=true|false` works on non-prod hosts only and persists per device.

### Sending to testers
Send the `dist/*.apk` file (WhatsApp/Drive). On the phone: open it → allow
"install unknown apps" for that source → install. Debug builds are signed with the
debug key and expire never; updates install over the previous build.

### Live-reload against this laptop (UI work)
Add to `capacitor.config.json`: `"server": { "url": "http://<LAN-IP>:8744", "cleartext": true }`,
then `npx cap copy android` and run the app. **Remove the `server` block before any
release build; never commit it.**

## Environment rules
- The shell forces `window.__TOMODACHI_ENV__` (default `prod`) so the app never
  hits the dev Firebase project from `localhost` origins.
- Firebase Auth inside the WebView: if sign-in ever fails with
  `requests-from-capacitor://localhost-are-blocked`, add `capacitor://localhost/*`,
  `http://localhost/*`, `https://localhost/*` to the web API key's HTTP-referrer
  restrictions in Google Cloud → Credentials (not the Firebase authorized-domains list).
- Auth persistence on native should use `initializeAuth(app, { persistence: indexedDBLocalPersistence })`
  (batch: native plumbing) or users may be logged out on restart.

## Batch notes

### Batch 2 — foundation CSS (prod-visible changes, all on the mask list)
- `css/style.css` is now `@layer legacy { … }` behind the order statement
  `@layer legacy, tokens, base, components, screens, overrides;` (no inline
  `<style>` exists in index.html, so nothing unlayered can undercut it).
- New sheets: `css/app/{fonts,tokens,base,glass,shell}.css` (fonts.css has no
  layer; the rest self-wrap). `glass.css` is the only file allowed to use
  `backdrop-filter`.
- Prod-visible: stat digits now use Space Grotesk (the D1/T1 selector splice
  bug), blur removed from every non-nav surface (select footer, results/pause/
  duel/invite overlays, landing footer, policy nav, consent backdrop), overlays
  are `display:none` at rest with a 200 ms fade-in, the background pattern no
  longer drifts, safe-area insets on nav/footer/toasts/consent/overlays,
  `viewport-fit=cover`, `body{min-height:100dvh}`, reduced-motion nuke scoped
  to v1. Screenshot baselines were re-recorded for the affected screens.
- Deferred to later batches: `css/landing.css` extraction (mechanical), the
  `.game-shell` min-height change (batch 8).
- Emulator launch test (Pixel 7 · Android 16): app boots, landing + auth
  render; sign-in fails with `auth/requests-from-referer-https://localhost-are-blocked`
  until the lead completes step 1 below.

### Batch 3 — router, dock, top bar (v2 only; v1 pixels unchanged)
- `js/core/nav.js` is the one way to change screens (`navigate()` / `back()` /
  `setTab()`); `showScreen()` is gated to core.js + nav.js. Per-tab stacks
  (Home · Course · Practice · Friends · Me), scroll restoration, state-only
  history entries (browser back = router back), immersive screens push onto the
  current tab, settings pushes so a paused game resumes on back.
- Android hardware/predictive back → `nav.back()`; at a root the app is
  minimized (never killed).
- `js/ui/dock.js` + `<template id="tpl-dock">`: one glass element (shelf row
  + tabs), measured sliding tan pill (RTL-safe), compact on scroll-down,
  hidden on immersive screens / keyboard. Friends tab temporarily opens Home
  and scrolls to the friend bar (its own screen arrives in batch 11).
- `js/ui/topbar.js`: sticky bar + large in-flow title on every app screen;
  collapses to the second glass surface at 72 px (releases at 24 px). Under v2
  the legacy `<nav>` and `.page-header`s are hidden and the account cluster
  (locale · theme · settings · logout) lives in the Home bar — same nodes/ids.
- Temporary tab roots until their screens exist: Course → lesson browser,
  Practice → game setup, Me → settings.
- Review captures: `node scripts/dev/shots.mjs --out=shots` (dev server on :8744).
- Known (legacy, pre-existing) defect seen in review: the game-setup footer
  ("N characters selected · Difficulty") is untranslated and mis-ordered in
  Arabic; batch 9 replaces that footer with the dock shelf.
- Logout lives at the bottom of the Me (settings) screen under v2; the Home
  bar keeps locale · theme · settings so the compact title never truncates.

### Batch 4 — facades: prefs · haptics · numbers · bidi (v1 pixels unchanged)
- `js/core/prefs.js` is the only module that touches localStorage (lint gate;
  the two documented exceptions are the pre-paint `<head>` script, which is not
  a module, and the flag reader in `js/config/features.js`). Short names
  (`getPref('theme')`, `setPref('digits', 'arab')`), the `hiraquest-*` key
  migration, and the native mirror live there: in the shell every `setPref()`
  is written through to Capacitor Preferences, and `restoreFromNative()`
  copies mirrored values back when the WebView evicted web storage.
- Boot order in `app.js init()`: `await initNativeShell()` (resolves at once on
  the web; a shell build waits for the bridge's `native-ready`, bounded to
  1.5 s so a broken bundle cannot stall boot) → `restoreFromNative()` →
  platform attrs → theme → i18n. Everything that reads a preference therefore
  sees the restored value. The i18n language detector uses a custom `prefs`
  detector (order querystring → prefs → navigator → htmlTag, cache `prefs`)
  instead of its built-in localStorage one; `tomodachi-lang` stays the key.
- `js/core/haptics.js` — `haptic(kind)` with the bridge vocabulary
  tap · snap · tick · ok · no · warn — beside every `playSound()` (engine,
  duel, co-op), lesson/review answers and the dock tab press. Preference
  `haptics` (default on); silent no-op on the web.
- `js/core/format.js` — `fmtNumber / fmtCount / fmtPercent / fmtTime /
  fmtDate` through `Intl` with the UI language for grouping and the `digits`
  preference (`latn` default, `arab` = ١٢٣) for the numbering system, so a
  screen never mixes digit systems. `setJa()` / `jaNode()` wrap Japanese runs
  in `<bdi lang="ja" dir="ltr">`. Every `toLocaleString()` / `formatTime()` /
  `toLocaleDateString()` call site is migrated (history + leaderboard dates now
  follow the UI language); `node scripts/dev/leftovers.mjs` scans for stragglers.
- Translated strings: i18next 26 always installs its own formatter module and
  points `interpolation.format` at it, so the number rule is a formatter
  module of our own (`alwaysFormat: true` → every `{{value}}` that is a number
  goes through `fmtNumber`). Literal digits in static copy ("First to 10",
  the duration chips, a version string) are converted by `localizeDigits()`,
  which `t()` and the `[data-i18n]` walker apply to every result. A caller
  that needs a bare number (the copyright year) passes a pre-formatted string.
- Select footer: the count now goes through i18next plurals
  (`select.footer.count` — AR has the full zero/one/two/few/many/other set)
  and is rendered at boot and on locale change, so the Arabic screen no longer
  shows the English placeholder until the first tap; the duration chips are
  i18n keys (AR "1 د"). Prod-visible in AR only.
- Harness lesson: the 1 % pixel-ratio tolerance let that two-line footer
  change pass unnoticed. A zero-tolerance measurement showed every signed-in
  baseline off by ≈4k px for one reason — the masked `#toast-container` box
  is timing-dependent (the 3 s welcome toast) — plus the AR select change.
  `shot()` in `tests/e2e/fixtures.mjs` now removes toasts, parks the pointer
  at 0,0 (an earlier spec's click otherwise leaves a button in its hover
  state — the full matrix caught that on every `screen-select` shot) and the
  comparison runs at `maxDiffPixels: 0`. With the toast gone, re-recording
  reproduced 68 of the 72 baselines byte-for-byte; only the four AR
  `screen-select` shots changed (the deliberate footer/chip fix above), and a
  second zero-tolerance pass was green. Never run two Playwright processes at
  once: they share `tests/e2e/.results`, and the second wipes the first's traces.
- `platform.js` — `html[data-text-size]` + `--text-scale` (s · m · l · xl) and
  `html[data-digits]` from prefs (the Me › Text size / Digits controls arrive
  in batch 10).
- Tests: unit `prefs` / `format` / `shell` (bridge readiness, mirror, restore)
  and `tests/e2e/numbers.spec.mjs` (no mixed digits on the dashboard, exactly
  one bidi island on the lesson card, prefs survive a reload including
  Arabic-Indic digits).

## Lead checklist before wider Android testing (batch 1 · T5)

The app loads from `https://localhost` (Android) / `capacitor://localhost` (iOS).
Firebase Auth rejects sign-in from those origins until the web API keys allow them.

1. **API-key referrers (once per project, ~3 min each — staging and prod):**
   1. Open https://console.cloud.google.com/apis/credentials and pick the project
      (`tomodachi-staging`, then `tomodachi-prod`).
   2. Under **API keys**, open the key named like *Browser key (auto created by Firebase)*.
   3. **Application restrictions → Websites** → add three entries:
      `capacitor://localhost/*` · `http://localhost/*` · `https://localhost/*`
   4. Save. (Leave the existing github.io / pages.dev entries in place.)
   Symptom if skipped: `auth/requests-from-referer-...-are-blocked` in the app's log.
2. **Sideload the APK on a gesture-navigation Android phone** (`dist/Tomodachi-debug-*.apk`;
   for staging data build with `node scripts/native/build-www.mjs --env=staging` first):
   sign in → force-stop the app (Settings → Apps → Tomodachi → Force stop) → reopen →
   **you must still be signed in** (IndexedDB persistence). Play one Zen round.
3. **Report back:** phone model, Android version, and (Settings → Apps → Android System WebView)
   the WebView version — the safe-area CSS variables need WebView ≥ 111.

## Release (later)
- Android: `keytool -genkey -v -keystore tomodachi-upload.keystore -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias tomodachi`; git-ignored `keystore.properties`; `gradlew bundleRelease` → AAB → Play internal testing.
- iOS: Codemagic (Xcode 26 image) with the friend's Distribution cert, profile and
  App Store Connect API key → TestFlight. See docs/APP-DESIGN-DECISIONS.md "Build path".
