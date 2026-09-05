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

## Release (later)
- Android: `keytool -genkey -v -keystore tomodachi-upload.keystore -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias tomodachi`; git-ignored `keystore.properties`; `gradlew bundleRelease` → AAB → Play internal testing.
- iOS: Codemagic (Xcode 26 image) with the friend's Distribution cert, profile and
  App Store Connect API key → TestFlight. See docs/APP-DESIGN-DECISIONS.md "Build path".
