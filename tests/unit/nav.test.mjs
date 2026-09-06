// tests/unit/nav.test.mjs — router stack logic (pure; DOM stubbed).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// --- minimal DOM/browser stubs so core.js + nav.js load under Node ---
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const active = new Set();
const el = (id) => ({ id, classList: { add: () => active.add(id), remove: () => active.delete(id) } });
const history = { state: null, entries: [], pushState(s) { this.state = s; this.entries.push(s); }, back() { this.entries.pop(); this.state = this.entries[this.entries.length - 1] || null; } };
const win = { scrollY: 0, scrollTo() {}, addEventListener() {}, history };
globalThis.window = win;
globalThis.history = history;
globalThis.location = { hostname: 'localhost', search: '' };
globalThis.matchMedia = () => ({ matches: true });   // reduced motion → no view transitions in tests
const body = { attrs: new Set(), toggleAttribute(n, force) { if (force) this.attrs.add(n); else this.attrs.delete(n); } };
const events = [];
globalThis.document = {
  documentElement: { dataset: { shell: 'v2' }, getAttribute: () => null, setAttribute() {} },
  body,
  querySelectorAll: () => [],
  querySelector: () => null,
  getElementById: (id) => el(id),
  dispatchEvent: (e) => { events.push(e.detail); return true; },
  addEventListener() {},
};
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };

const nav = await import('../../js/core/nav.js');

function setup() {
  nav.resetStacks();
  events.length = 0;
  history.entries.length = 0; history.state = null;
  nav.registerScreen('screen-dashboard', { tab: 'home', root: true });
  nav.registerScreen('screen-lessons-list', { tab: 'course', root: true });
  nav.registerScreen('screen-select', { tab: 'practice', root: true });
  nav.registerScreen('screen-settings', { tab: 'me', root: true });
  nav.registerScreen('screen-leaderboard', { tab: 'home' });
  nav.registerScreen('screen-game', { tab: 'practice', immersive: true });
  nav.registerScreen('screen-lesson', { tab: 'course', immersive: true });
}
beforeEach(setup);

test('push / back within a tab, root refuses back', () => {
  nav.navigate('screen-dashboard');
  assert.equal(nav.currentTab(), 'home');
  assert.equal(nav.canGoBack(), false);
  nav.navigate('screen-leaderboard');
  assert.deepEqual(nav.stackOf(), ['screen-dashboard', 'screen-leaderboard']);
  assert.equal(history.entries.length, 1, 'one state-only history entry per push');
  assert.equal(nav.back(), true);
  assert.deepEqual(nav.stackOf(), ['screen-dashboard']);
  assert.equal(nav.back(), false, 'at the root the caller decides (minimize/exit)');
});

test('root screens reset their tab; tab switch keeps the other stack', () => {
  nav.navigate('screen-dashboard');
  nav.navigate('screen-leaderboard');
  nav.navigate('screen-select');                  // root of practice → switches tab
  assert.equal(nav.currentTab(), 'practice');
  assert.deepEqual(nav.stackOf('home'), ['screen-dashboard', 'screen-leaderboard'], 'home stack preserved');
  nav.navigate('screen-game');
  assert.deepEqual(nav.stackOf(), ['screen-select', 'screen-game']);
  assert.ok(body.attrs.has('data-immersive'), 'game is immersive');
  nav.setTab('home');
  assert.equal(nav.currentScreenId(), 'screen-leaderboard', 'returns to the top of the home stack');
  assert.ok(!body.attrs.has('data-immersive'));
});

test('setTab on the active tab pops to its root', () => {
  nav.navigate('screen-dashboard');
  nav.navigate('screen-leaderboard');
  nav.setTab('home');
  assert.deepEqual(nav.stackOf(), ['screen-dashboard']);
});

test('replace swaps the top; reset makes a single entry', () => {
  nav.navigate('screen-dashboard');
  nav.navigate('screen-leaderboard');
  nav.navigate('screen-settings', { replace: true, tab: 'home' });
  assert.deepEqual(nav.stackOf('home'), ['screen-dashboard', 'screen-settings']);
  nav.navigate('screen-leaderboard', { reset: true });
  assert.deepEqual(nav.stackOf('home'), ['screen-leaderboard']);
});

test('onBack can consume back (confirm prompts); onLeave/onEnter fire in order', () => {
  const log = [];
  nav.registerScreen('screen-game', { tab: 'practice', immersive: true, onBack: () => { log.push('back?'); return false; }, onLeave: () => log.push('leave-game'), onEnter: () => log.push('enter-game') });
  nav.navigate('screen-select');
  nav.navigate('screen-game');
  assert.equal(nav.back(), true, 'consumed');
  assert.deepEqual(nav.stackOf(), ['screen-select', 'screen-game'], 'stack untouched');
  assert.deepEqual(log, ['enter-game', 'back?']);
});

test('nav:change carries screen, tab, depth, kind', () => {
  nav.navigate('screen-dashboard');
  nav.navigate('screen-leaderboard');
  const last = events[events.length - 1];
  assert.equal(last.screen, 'screen-leaderboard');
  assert.equal(last.tab, 'home');
  assert.equal(last.depth, 2);
  assert.equal(last.kind, 'push');
});

test('push:true keeps a root screen on the current tab (settings from inside practice)', () => {
  nav.navigate('screen-select');
  nav.navigate('screen-game');
  nav.navigate('screen-settings', { push: true });
  assert.equal(nav.currentTab(), 'practice');
  assert.deepEqual(nav.stackOf(), ['screen-select', 'screen-game', 'screen-settings']);
  assert.equal(nav.back(), true);
  assert.equal(nav.currentScreenId(), 'screen-game', 'back returns to the game');
  nav.setTab('me');
  assert.deepEqual(nav.stackOf(), ['screen-settings'], 'the Me tab still opens settings as its root');
});

test('unregistered screens navigate without breaking the stacks', () => {
  nav.navigate('screen-dashboard');
  nav.navigate('screen-auth');           // not registered → pushed on the current tab
  assert.deepEqual(nav.stackOf(), ['screen-dashboard', 'screen-auth']);
  assert.equal(nav.back(), true);
  assert.equal(nav.currentScreenId(), 'screen-dashboard');
});
