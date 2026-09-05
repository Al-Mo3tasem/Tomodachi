// scripts/dev/lint-gates.mjs — "one primitive per pattern" grep gates.
// Each gate names a pattern that may appear ONLY in its owning module(s).
// Batches add gates as their primitives land (showScreen → nav.js, confirm()
// → sheet.js, localStorage → prefs.js, backdrop-filter → glass.css).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

const GATES = [
  {
    name: 'window.Native only in the shell adapter',
    scope: 'js', ext: '.js',
    pattern: /window\.Native\b/,
    allow: ['js/native/shell.js'],
  },
  // Batch 3 adds: { name: 'showScreen only in nav.js', pattern: /\bshowScreen\(/, allow: ['js/core/nav.js', 'js/core/core.js'] }
  // Batch 4 adds: { name: 'localStorage only in prefs.js', pattern: /\blocalStorage\b/, allow: ['js/core/prefs.js', 'js/config/features.js'] }
  // Batch 5 adds: { name: 'confirm() only in sheet.js', pattern: /\bconfirm\(/, allow: ['js/ui/sheet.js'] }
];

function walk(dir, ext, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (e.endsWith(ext)) out.push(p);
  }
  return out;
}

let problems = 0;
for (const g of GATES) {
  const files = walk(join(ROOT, g.scope), g.ext);
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    if (g.allow.includes(rel)) continue;
    const lines = readFileSync(f, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (g.pattern.test(line)) { problems++; console.log(`[${g.name}] ${rel}:${i + 1}: ${line.trim().slice(0, 90)}`); }
    });
  }
}
console.log(`lint-gates: ${GATES.length} gate(s), ${problems} violation(s)`);
process.exit(problems ? 1 : 0);
