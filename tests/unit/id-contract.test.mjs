// tests/unit/id-contract.test.mjs — every element id the JS queries statically
// must exist in index.html. Markup can move between v1/v2 templates only if
// the ids survive (the redesign stamps <template>s over v1 sections).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Ids that are created at runtime (never in the static markup).
const DYNAMIC = new Set([
  'answer-input', 'choice-grid',            // built by engine.js renderInput()
  'duel-answer-input', 'coop-answer-input',  // built by duel.js / coop.js
]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out); else if (e.endsWith('.js')) out.push(p);
  }
  return out;
}

test('static element ids referenced from js/ resolve in index.html', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const present = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const refs = new Map();   // id → first file:line
  for (const f of walk(join(ROOT, 'js'))) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
      for (const re of [/\$\(\s*'([^'${}]+)'\s*\)/g, /getElementById\(\s*'([^'${}]+)'\s*\)/g, /querySelector\(\s*'#([\w-]+)'\s*\)/g]) {
        for (const m of line.matchAll(re)) if (!refs.has(m[1])) refs.set(m[1], `${rel}:${i + 1}`);
      }
    });
  }
  const missing = [...refs].filter(([id]) => !present.has(id) && !DYNAMIC.has(id));
  assert.ok(refs.size > 50, `sanity: found ${refs.size} id references`);
  assert.deepEqual(missing, [], `ids queried but absent from index.html:\n${missing.map(([id, at]) => `  ${id}  (${at})`).join('\n')}`);
});
