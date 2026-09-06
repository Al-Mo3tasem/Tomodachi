// tests/unit/format.test.mjs — numbers/time honour the digits setting and never mix systems.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let htmlLang = 'en';
globalThis.document = { documentElement: { getAttribute: (a) => (a === 'lang' ? htmlLang : null) }, createElement: (tag) => ({ tag, attrs: {}, textContent: '', setAttribute(k, v) { this.attrs[k] = v; } }) };

const { fmtNumber, fmtCount, fmtTime, fmtPercent, jaNode, localizeDigits } = await import('../../js/core/format.js');
// same module instance as format.js (the ?v= query is part of the module identity)
const { setPref, _resetPrefCache } = await import('../../js/core/prefs.js?v=20260906f');

test('Latin digits by default in both languages', () => {
  htmlLang = 'en'; assert.equal(fmtNumber(1240), '1,240');
  htmlLang = 'ar'; assert.equal(fmtNumber(1240), '1,240', 'Arabic UI keeps Latin digits unless the setting says otherwise');
  assert.equal(fmtCount(7.6), '8');
});

test('digits=arab switches every formatter to Arabic-Indic (no mixing)', () => {
  htmlLang = 'ar';
  setPref('digits', 'arab'); _resetPrefCache();
  const n = fmtNumber(1240);
  assert.match(n, /^[٠-٩٫٬]+$/, `all Arabic-Indic: ${n}`);
  const t = fmtTime(83000);
  assert.match(t, /^[٠-٩]+:[٠-٩]{2}$/, `time uses the same digits: ${t}`);
  const p = fmtPercent(0.734);
  assert.ok(/[٠-٩]/.test(p) && !/[0-9]/.test(p), `percent: ${p}`);
  setPref('digits', 'latn'); _resetPrefCache();
});

test('fmtTime pads seconds and never goes negative', () => {
  htmlLang = 'en';
  assert.equal(fmtTime(83000), '1:23');
  assert.equal(fmtTime(5000), '0:05');
  assert.equal(fmtTime(-400), '0:00');
});

test('jaNode builds an LTR island', () => {
  const n = jaNode('きって');
  assert.equal(n.tag, 'bdi');
  assert.equal(n.attrs.lang, 'ja');
  assert.equal(n.attrs.dir, 'ltr');
  assert.equal(n.textContent, 'きって');
});

test('localizeDigits: static text follows the setting, tags are untouched', () => {
  htmlLang = 'ar';
  assert.equal(localizeDigits('First to 10'), 'First to 10', 'no-op under Latin digits');
  setPref('digits', 'arab'); _resetPrefCache();
  assert.equal(localizeDigits('First to 10'), 'First to ١٠');
  assert.equal(localizeDigits('Ranked <strong>#12</strong> · <h2>x</h2>'), 'Ranked <strong>#١٢</strong> · <h2>x</h2>', 'digits inside tags stay');
  assert.equal(localizeDigits(null), '');
  setPref('digits', 'latn'); _resetPrefCache();
});
