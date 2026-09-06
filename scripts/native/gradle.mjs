// scripts/native/gradle.mjs — run the Android Gradle wrapper from any shell.
// `npm run android:debug` used to call `gradlew.bat` directly, which only
// resolves when npm's script shell is cmd.exe; under Git Bash it silently
// failed and the previous APK was collected as if it were new. This picks the
// wrapper for the platform and fails loudly on a non-zero exit.
//   node scripts/native/gradle.mjs assembleDebug
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ANDROID = join(ROOT, 'android');
const args = process.argv.slice(2);
if (!args.length) { console.error('usage: node scripts/native/gradle.mjs <task…>'); process.exit(2); }

const wrapper = process.platform === 'win32' ? join(ANDROID, 'gradlew.bat') : join(ANDROID, 'gradlew');
if (!existsSync(wrapper)) { console.error(`gradle wrapper missing: ${wrapper}`); process.exit(2); }

// A .bat needs a shell; the repo path has a space, so the wrapper is quoted
// (Node passes the line to `cmd /d /s /c` verbatim when shell is true).
const win = process.platform === 'win32';
const res = spawnSync(win ? `"${wrapper}"` : wrapper, [...args, '--console=plain'], { cwd: ANDROID, stdio: 'inherit', shell: win });
if (res.error) { console.error(res.error.message); process.exit(1); }
process.exit(res.status ?? 1);
