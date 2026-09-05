// scripts/dev/lint-css.mjs — Arabic-first CSS gate for the new stylesheets.
// Physical direction properties are forbidden in css/app/** (RTL must come
// for free from logical properties). A line may opt out with the comment
// `/* lint-allow-physical */` when mirroring is wrong on purpose (icons that
// must not flip, progress that fills from the start edge, etc.).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCAN = join(ROOT, 'css', 'app');
const ALLOW = 'lint-allow-physical';

const RULES = [
  [/\b(margin|padding|border)-(left|right)\s*:/, 'use -inline-start / -inline-end'],
  [/(^|[\s;{])(left|right)\s*:/, 'use inset-inline-start / inset-inline-end'],
  [/text-align\s*:\s*(left|right)\b/, 'use text-align: start / end'],
  [/float\s*:\s*(left|right)\b/, 'use float: inline-start / inline-end'],
  [/translateX\(/, 'compute direction-aware transforms from getBoundingClientRect or use logical margins'],
  [/letter-spacing\s*:\s*(?!0\b|normal\b)/, 'letter-spacing breaks Arabic joins — only 0/normal allowed'],
];

function walk(dir, out = []) {
  let entries = [];
  try { entries = readdirSync(dir); } catch (_e) { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.css')) out.push(p);
  }
  return out;
}

const files = walk(SCAN);
let problems = 0;
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes(ALLOW)) return;
    for (const [re, hint] of RULES) {
      if (re.test(line)) { problems++; console.log(`${relative(ROOT, f)}:${i + 1}: ${line.trim().slice(0, 80)}\n    → ${hint}`); }
    }
  });
}
console.log(`lint-css: ${files.length} file(s) in css/app, ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
