// scripts/native/collect-apk.mjs — copy the latest debug APK into dist/ with a
// dated, tester-friendly name and print its size. dist/ is git-ignored.
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const src = join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!existsSync(src)) { console.error('No debug APK found — run: npm run android:debug'); process.exit(1); }
const d = new Date();
const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
// Name the backend the bundle actually talks to: a tester must never have to
// guess whether an APK writes to dev or to real users' data.
let env = 'unknown';
try {
  const m = readFileSync(join(ROOT, 'www', 'native-env.js'), 'utf8').match(/__TOMODACHI_ENV__ = "(\w+)"/);
  if (m) env = m[1];
} catch (_e) { /* no www build on disk */ }
const outDir = join(ROOT, 'dist');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `Tomodachi-${env}-debug-${stamp}.apk`);
copyFileSync(src, out);
console.log(`${out}  (${(statSync(out).size / 1048576).toFixed(1)} MB)  → Firebase env: ${env}`);
