// tests/unit/platform.test.mjs — data-platform / data-glass decisions.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser globals so js/core/core.js (localStorage migration on import)
// and platform.js can load under Node.
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = { __TOMODACHI_NATIVE__: false };
globalThis.location = { hostname: 'localhost', search: '' };
globalThis.document = { documentElement: { dataset: {}, classList: { add() {} }, style: { setProperty() {} } }, addEventListener() {}, querySelectorAll: () => [] };
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7)', maxTouchPoints: 5 }, configurable: true, writable: true });
let reducedTransparency = false;
globalThis.matchMedia = (q) => ({ matches: q.includes('reduced-transparency') ? reducedTransparency : false });
globalThis.performance = { now: () => 0 };
globalThis.requestAnimationFrame = () => 0;

const { detectPlatform, decideGlass, applyPlatformAttrs, setGlass } = await import('../../js/core/platform.js');
const { _resetPrefCache } = await import('../../js/core/prefs.js?v=20260906g');   // same instance platform.js uses

test('platform from the user agent on the web', () => {
  assert.equal(detectPlatform(), 'android');
  globalThis.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)';
  assert.equal(detectPlatform(), 'ios');
  globalThis.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
  assert.equal(detectPlatform(), 'web');
});

test('glass ladder: pref > reduced-transparency > low memory > full', () => {
  store.clear(); _resetPrefCache();
  delete globalThis.navigator.deviceMemory;
  assert.equal(decideGlass(), 'full');
  globalThis.navigator.deviceMemory = 4;
  assert.equal(decideGlass(), 'reduced', '≤4 GB reduces');
  globalThis.navigator.deviceMemory = 8;
  assert.equal(decideGlass(), 'full');
  reducedTransparency = true;
  assert.equal(decideGlass(), 'reduced', 'OS reduced-transparency reduces');
  reducedTransparency = false;
  store.set('tomodachi-glass', 'full'); _resetPrefCache();
  globalThis.navigator.deviceMemory = 2;
  assert.equal(decideGlass(), 'full', 'explicit pref wins over memory');
  store.set('tomodachi-glass', 'reduced'); _resetPrefCache();
  assert.equal(decideGlass(), 'reduced');
});

test('applyPlatformAttrs stamps <html>; setGlass persists', () => {
  store.clear(); _resetPrefCache();
  delete globalThis.navigator.deviceMemory;
  applyPlatformAttrs();
  const ds = globalThis.document.documentElement.dataset;
  assert.equal(ds.platform, 'web');
  assert.equal(ds.glass, 'full');
  setGlass('reduced');
  assert.equal(ds.glass, 'reduced');
  assert.equal(store.get('tomodachi-glass'), 'reduced');
  setGlass('anything-else');
  assert.equal(ds.glass, 'full', 'unknown values normalise to full');
});
