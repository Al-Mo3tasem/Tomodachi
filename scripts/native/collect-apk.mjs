// scripts/native/collect-apk.mjs — copy the latest debug APK into dist/ with a
// dated, tester-friendly name and print its size. dist/ is git-ignored.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const src = join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!existsSync(src)) { console.error('No debug APK found — run: npm run android:debug'); process.exit(1); }
const d = new Date();
const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const outDir = join(ROOT, 'dist');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `Tomodachi-debug-${stamp}.apk`);
copyFileSync(src, out);
console.log(`${out}  (${(statSync(out).size / 1048576).toFixed(1)} MB)`);
