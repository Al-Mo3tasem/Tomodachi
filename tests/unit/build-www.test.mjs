// tests/unit/build-www.test.mjs — the native bundle assembler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCRIPT = join(ROOT, 'scripts', 'native', 'build-www.mjs');

function build(env, out) {
  execFileSync(process.execPath, [SCRIPT, `--env=${env}`, `--out=${out}`], { cwd: ROOT, stdio: 'pipe' });
}

test('build-www writes the env marker, injects the bridge and patches the viewport (idempotently)', () => {
  const out = mkdtempSync(join(tmpdir(), 'tomo-www-'));
  try {
    build('staging', out);
    const envJs = readFileSync(join(out, 'native-env.js'), 'utf8');
    assert.match(envJs, /__TOMODACHI_ENV__ = "staging"/);
    assert.match(envJs, /__TOMODACHI_NATIVE__ = true/);
    assert.ok(statSync(join(out, 'native-bridge.js')).size > 5000, 'bridge bundle present');

    const html = readFileSync(join(out, 'index.html'), 'utf8');
    assert.equal((html.match(/viewport-fit=cover/g) || []).length, 1, 'viewport-fit=cover exactly once');
    assert.ok(html.indexOf('native-env.js') < html.indexOf('native-bridge.js'), 'env marker loads before the bridge');
    assert.ok(html.indexOf('native-env.js') < html.indexOf('shell:start'), 'env marker precedes the pre-paint shell script');
    const stamps = new Set([...html.matchAll(/\?v=(\d{8}[a-z])/g)].map(m => m[1]));
    assert.equal(stamps.size, 1, `cache-buster must be uniform, found: ${[...stamps].join(',')}`);

    build('prod', out);   // second run over the same dir (script wipes and rebuilds)
    const html2 = readFileSync(join(out, 'index.html'), 'utf8');
    assert.equal((html2.match(/viewport-fit=cover/g) || []).length, 1, 'still exactly one after a rebuild');
    assert.match(readFileSync(join(out, 'native-env.js'), 'utf8'), /"prod"/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('build-www rejects an unknown env', () => {
  const out = mkdtempSync(join(tmpdir(), 'tomo-www-'));
  try {
    assert.throws(() => build('nope', out));
  } finally { rmSync(out, { recursive: true, force: true }); }
});
