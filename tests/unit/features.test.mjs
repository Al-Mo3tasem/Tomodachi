// tests/unit/features.test.mjs — flag resolution + pre-paint script parity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _map: m };
}
function world({ host = 'localhost', search = '', storage = {}, native = false, envOverride } = {}) {
  const w = { localStorage: fakeStorage(storage), location: { hostname: host, search } };
  if (native) w.__TOMODACHI_NATIVE__ = true;
  if (envOverride) w.__TOMODACHI_ENV__ = envOverride;
  globalThis.window = w;
  globalThis.location = w.location;
  return w;
}

const { isEnabled, shellVersion, FEATURES } = await import('../../js/config/features.js');

test('defaults follow the env table', () => {
  assert.equal(isEnabled('nativeShell', world({ host: 'localhost' })), true);
  assert.equal(isEnabled('nativeShell', world({ host: 'preview.tomodachi-staging.pages.dev' })), true);
  assert.equal(isEnabled('nativeShell', world({ host: 'al-mo3tasem.github.io' })), false);
  assert.equal(FEATURES.nativeShell.prod, false, 'prod default must stay OFF until the batch-14 flip');
  assert.equal(isEnabled('nope', world()), false);
});

test('native marker always wins', () => {
  assert.equal(isEnabled('nativeShell', world({ host: 'al-mo3tasem.github.io', native: true, storage: { FF_NATIVE_SHELL: 'false' } })), true);
});

test('localStorage override is an explicit string parse', () => {
  assert.equal(isEnabled('nativeShell', world({ host: 'al-mo3tasem.github.io', storage: { FF_NATIVE_SHELL: 'true' } })), true);
  assert.equal(isEnabled('nativeShell', world({ host: 'localhost', storage: { FF_NATIVE_SHELL: 'false' } })), false);
  assert.equal(isEnabled('nativeShell', world({ host: 'localhost', storage: { FF_NATIVE_SHELL: '1' } })), true, 'non-boolean strings are ignored → env default');
});

test('URL param is honoured and persisted on non-prod, cleared by =false', () => {
  const w = world({ host: 'localhost', search: '?ff_native_shell=true' });
  assert.equal(isEnabled('nativeShell', w), true);
  assert.equal(w.localStorage.getItem('FF_NATIVE_SHELL'), 'true');
  const w2 = world({ host: 'localhost', search: '?ff_native_shell=false', storage: { FF_NATIVE_SHELL: 'true' } });
  assert.equal(isEnabled('nativeShell', w2), false);
  assert.equal(w2.localStorage.getItem('FF_NATIVE_SHELL'), null, '=false clears the persisted override');
});

test('URL param is IGNORED on a prod hostname (forwarded links are safe)', () => {
  const w = world({ host: 'al-mo3tasem.github.io', search: '?ff_native_shell=true' });
  assert.equal(isEnabled('nativeShell', w), false);
  assert.equal(w.localStorage.getItem('FF_NATIVE_SHELL'), null, 'nothing persisted on prod');
});

test('pre-paint <head> script agrees with features.js on the shared inputs', () => {
  const html = readFileSync(`${ROOT}index.html`, 'utf8');
  const m = html.match(/\/\* shell:start[^*]*\*\/([\s\S]*?)\/\* shell:end \*\//);
  assert.ok(m, 'shell:start/shell:end markers present in index.html');
  const inline = new Function('window', 'localStorage', 'location', 'document', m[1]);
  const cases = [];
  for (const host of ['localhost', '127.0.0.1', 'x.pages.dev', 'staging.tomodachi.com', 'al-mo3tasem.github.io'])
    for (const ff of [null, 'true', 'false'])
      for (const native of [false, true]) cases.push({ host, ff, native });
  for (const c of cases) {
    const w = world({ host: c.host, native: c.native, storage: c.ff === null ? {} : { FF_NATIVE_SHELL: c.ff } });
    const doc = { documentElement: { a: {}, setAttribute(k, v) { this.a[k] = v; } } };
    inline(w, w.localStorage, w.location, doc);
    assert.equal(doc.documentElement.a['data-shell'], shellVersion(w), `parity for ${JSON.stringify(c)}`);
  }
});
