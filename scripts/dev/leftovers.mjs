// scripts/dev/leftovers.mjs — code-only scan (comments stripped) for patterns a
// batch is supposed to have migrated. Usage: node scripts/dev/leftovers.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './lint-gates.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PATTERNS = [
  [/\.toLocaleString\(/, 'toLocaleString → fmtNumber'],
  // policy pages keep their own date rule (CONTENT_GUIDELINES §13) on purpose
  [/\.toLocaleDateString\(/, 'toLocaleDateString → fmtDate', null, ['js/policy-init.js']],
  [/\bformatTime\(/, 'formatTime → fmtTime'],
  [/\blocalStorage\b/, 'localStorage → prefs', null, ['js/core/prefs.js', 'js/config/features.js']],
];
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) { const p = join(dir, e); if (statSync(p).isDirectory()) walk(p, out); else if (e.endsWith('.js')) out.push(p); }
  return out;
}
let hits = 0;
for (const f of walk(join(ROOT, 'js'))) {
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  const lines = stripComments(readFileSync(f, 'utf8')).split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [re, label, except, allow] of PATTERNS) {
      if (allow && allow.includes(rel)) continue;
      if (re.test(line) && !(except && except.test(line))) { hits++; console.log(`${rel}:${i + 1} [${label}] ${line.trim().slice(0, 90)}`); }
    }
  });
}
console.log(`leftovers: ${hits}`);
