// scripts/dev/lint-gates.mjs — "one primitive per pattern" grep gates.
// Each gate names a pattern that may appear ONLY in its owning module(s).
// Batches add gates as their primitives land (showScreen → nav.js, confirm()
// → sheet.js, localStorage → prefs.js, backdrop-filter → glass.css).
// Comments never count: sources are stripped of // and /* */ before matching,
// so prose that merely mentions a forbidden name does not fail the build.
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
  {
    name: 'showScreen() only in the router',
    scope: 'js', ext: '.js',
    pattern: /\bshowScreen\(/,
    allow: ['js/core/nav.js', 'js/core/core.js'],
  },
  {
    name: 'localStorage only in the prefs facade (+ the flag reader)',
    scope: 'js', ext: '.js',
    pattern: /\blocalStorage\b/,
    allow: ['js/core/prefs.js', 'js/config/features.js'],
  },
  {
    name: 'confirm() only in the sheet/dialog module',
    scope: 'js', ext: '.js',
    pattern: /\bconfirm\(/,
    allow: ['js/ui/sheet.js'],
  },
];

function walk(dir, ext, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (e.endsWith(ext)) out.push(p);
  }
  return out;
}

// Replace comment bodies with spaces (line count preserved); strings are left
// intact so a quoted "//" inside code does not start a comment.
export function stripComments(src) {
  let out = '';
  let i = 0;
  let inBlock = false;
  let inLine = false;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (inBlock) {
      if (c === '*' && n === '/') { inBlock = false; i += 2; out += '  '; continue; }
      out += c === '\n' ? '\n' : ' ';
      i++;
      continue;
    }
    if (inLine) {
      if (c === '\n') { inLine = false; out += '\n'; } else out += ' ';
      i++;
      continue;
    }
    if (quote) {
      out += c;
      if (c === '\\') { out += n === undefined ? '' : n; i += 2; continue; }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '/' && n === '*') { inBlock = true; out += '  '; i += 2; continue; }
    if (c === '/' && n === '/') { inLine = true; out += '  '; i += 2; continue; }
    if (c === '\'' || c === '"' || c === '`') quote = c;
    out += c;
    i++;
  }
  return out;
}

let problems = 0;
for (const g of GATES) {
  const files = walk(join(ROOT, g.scope), g.ext);
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    if (g.allow.includes(rel)) continue;
    const lines = stripComments(readFileSync(f, 'utf8')).split(/\r?\n/);
    lines.forEach((line, i) => {
      if (g.pattern.test(line)) { problems++; console.log(`[${g.name}] ${rel}:${i + 1}: ${line.trim().slice(0, 90)}`); }
    });
  }
}
console.log(`lint-gates: ${GATES.length} gate(s), ${problems} violation(s)`);
process.exit(problems ? 1 : 0);
