// tests/unit/prefs.test.mjs — the preferences facade + native mirror/restore.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
store.set('hiraquest-audio', 'false');   // legacy key present before the module loads

const prefs = await import('../../js/core/prefs.js');

test('legacy hiraquest-* keys migrate once on load', () => {
  assert.equal(store.get('tomodachi-audio'), 'false');
  assert.equal(store.has('hiraquest-audio'), false);
});

test('get/set/remove with the short names', () => {
  assert.equal(prefs.getPref('theme'), null);
  prefs.setPref('theme', 'dark');
  assert.equal(prefs.getPref('theme'), 'dark');
  assert.equal(store.get('tomodachi-theme'), 'dark');
  prefs.removePref('theme');
  assert.equal(prefs.getPref('theme'), null);
  assert.throws(() => prefs.getPref('nope'), /unknown preference/);
});

test('native adapter mirrors writes and restores missing keys', async () => {
  const native = new Map([['tomodachi-practice', 'listen']]);
  prefs.setNativePrefsAdapter({
    get: async (k) => (native.has(k) ? native.get(k) : null),
    set: async (k, v) => { native.set(k, v); },
    remove: async (k) => { native.delete(k); },
  });
  prefs.setPref('input', 'multiple');
  await new Promise(r => setTimeout(r, 0));
  assert.equal(native.get('tomodachi-input'), 'multiple', 'write-through');
  prefs._resetPrefCache();
  const restored = await prefs.restoreFromNative();
  assert.deepEqual(restored, ['practice']);
  assert.equal(prefs.getPref('practice'), 'listen');
  assert.equal(store.get('tomodachi-practice'), 'listen', 'copied back into localStorage');
  prefs.setNativePrefsAdapter(null);
});
