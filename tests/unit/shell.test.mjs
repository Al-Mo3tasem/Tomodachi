// tests/unit/shell.test.mjs — native shell adapter: bridge readiness + prefs mirror.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- minimal browser stubs so shell.js → nav.js → core.js → prefs.js load under Node ---
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const listeners = {};
globalThis.document = {
  documentElement: { dataset: {}, classList: { add() {} }, getAttribute: () => null, setAttribute() {} },
  body: { toggleAttribute() {} },
  querySelectorAll: () => [],
  querySelector: () => null,
  getElementById: () => null,
  addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
  dispatchEvent: () => true,
};
const fire = (type) => { const l = listeners[type] || []; listeners[type] = []; l.forEach((fn) => fn({ type })); };
const history = { state: null, pushState() {}, back() {} };
globalThis.window = { scrollY: 0, scrollTo() {}, addEventListener() {}, history };
globalThis.history = history;
globalThis.location = { hostname: 'localhost', search: '' };
globalThis.matchMedia = () => ({ matches: true });
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };

const shell = await import('../../js/native/shell.js?v=20260906e');
const prefs = await import('../../js/core/prefs.js?v=20260906e');   // same instance shell.js installs the adapter into

function fakeBridge(platform) {
  const native = new Map();
  const bridge = {
    isNative: true,
    platform,
    prefs: {
      get: async (k) => (native.has(k) ? native.get(k) : null),
      set: async (k, v) => { native.set(k, v); },
      remove: async (k) => { native.delete(k); },
    },
    app: { onBack() {}, onState() {} },
    haptics: { ok() {} },
  };
  return { native, bridge };
}
const reset = () => { delete window.Native; window.__TOMODACHI_NATIVE__ = undefined; prefs.setNativePrefsAdapter(null); };

test('web: initNativeShell resolves at once and nothing is wired', async () => {
  reset();
  const t0 = Date.now();
  await shell.initNativeShell();
  assert.ok(Date.now() - t0 < 100, 'no wait on the web');
  assert.equal(shell.isNative(), false);
  assert.equal(shell.nativePlatform(), 'web');
  assert.equal(shell.nativeHaptics(), null);
});

test('bridge already loaded: wired immediately, every setPref mirrors natively', async () => {
  reset();
  const { native, bridge } = fakeBridge('ios');
  window.Native = bridge;
  await shell.initNativeShell();
  assert.equal(shell.isNative(), true);
  assert.equal(shell.nativePlatform(), 'ios');
  assert.equal(shell.nativeHaptics(), bridge.haptics);
  prefs.setPref('theme', 'dark');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(native.get('tomodachi-theme'), 'dark', 'write-through to Capacitor Preferences');
  reset();
});

test('shell build with a late bridge: boot waits for native-ready, then the mirror restores', async () => {
  reset();
  window.__TOMODACHI_NATIVE__ = true;
  const { native, bridge } = fakeBridge('android');
  native.set('tomodachi-lang', 'ar');
  let resolved = false;
  const ready = shell.initNativeShell().then(() => { resolved = true; });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(resolved, false, 'still waiting for the bridge');
  window.Native = bridge;
  fire('native-ready');
  await ready;
  assert.equal(shell.nativePlatform(), 'android');
  store.delete('tomodachi-lang');
  prefs._resetPrefCache();
  assert.deepEqual(await prefs.restoreFromNative(), ['lang'], 'evicted key comes back from the mirror');
  assert.equal(prefs.getPref('lang'), 'ar');
  assert.equal(store.get('tomodachi-lang'), 'ar', 'copied back into localStorage');
  reset();
});

test('shell build whose bridge never loads: boot continues after the bounded wait', async () => {
  reset();
  window.__TOMODACHI_NATIVE__ = true;
  const t0 = Date.now();
  await shell.initNativeShell();
  const waited = Date.now() - t0;
  assert.ok(waited >= 1400 && waited < 3000, `waited ${waited}ms`);
  assert.equal(shell.isNative(), false, 'falls back to web behaviour');
  reset();
});
