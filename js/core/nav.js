// ============================================
// Tomodachi — router (screen stack + tabs)
// One primitive for every screen change (grep gate: showScreen() lives only
// here and in core.js). Works on both shells:
//   • v1: navigate()/back() are a thin layer over showScreen() — no visual
//     change, but Android back and the browser back button gain a real stack.
//   • v2: adds per-tab stacks (Home · Course · Practice · Friends · Me), scroll
//     restoration, view transitions and body[data-immersive] for the dock.
//
// Screens are registered by app.js: registerScreen(id, { tab, root, immersive,
// onEnter, onLeave, onBack }). Unregistered screens (landing, auth) still
// navigate; they simply sit outside the tab stacks.
// History: state-only pushState entries (the URL never changes, so a refresh
// on the GitHub Pages sub-path can never 404); popstate → back().
// ============================================

import { showScreen } from './core.js?v=20260906g';

export const TABS = ['home', 'course', 'practice', 'friends', 'me'];

const screens = new Map();                 // id → meta
const stacks = Object.fromEntries(TABS.map(t => [t, []]));   // tab → [{ id, scrollY }]
const roots = {};                          // tab → root screen id
let tab = 'home';
let currentId = null;
let suppressPop = 0;
let listening = false;
let backGuard = null;                      // an open overlay (sheet / dialog) consumes "back" first

/** Overlays register a guard while open: return true to consume a back press. */
export function setBackGuard(fn) { backGuard = typeof fn === 'function' ? fn : null; }
/** An overlay popped its own history entry: ignore the next popstate. */
export function suppressNextPop() { suppressPop++; }

const hasDoc = () => typeof document !== 'undefined';
const win = () => (typeof window !== 'undefined' ? window : null);

export function registerScreen(id, opts = {}) {
  const meta = {
    tab: opts.tab || null,
    root: !!opts.root,
    immersive: !!opts.immersive,
    onEnter: opts.onEnter || null,
    onLeave: opts.onLeave || null,
    onBack: opts.onBack || null,
  };
  screens.set(id, meta);
  if (meta.root && meta.tab) roots[meta.tab] = id;
}

export function screenMeta(id) { return screens.get(id) || null; }
export function currentTab() { return tab; }
export function currentScreenId() { return currentId; }
export function stackOf(t = tab) { return stacks[t].map(e => e.id); }
export function canGoBack() { return stacks[tab].length > 1; }

// ----- view transitions -----
function reducedMotion() {
  if (!hasDoc()) return true;
  const root = document.documentElement;
  if (root.dataset.shell !== 'v2') return true;      // v1: no transitions
  if (root.dataset.glass === 'reduced') return true;
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_e) { return true; }
}

function transition(kind, fn) {
  if (!hasDoc() || typeof document.startViewTransition !== 'function' || reducedMotion()) { fn(); return; }
  document.documentElement.dataset.vt = kind;        // css: push | pop | tab | replace
  let vt;
  try { vt = document.startViewTransition(fn); } catch (_e) { fn(); delete document.documentElement.dataset.vt; return; }
  vt.finished.finally(() => { delete document.documentElement.dataset.vt; });
}

// ----- core switch -----
function activate(id, kind, scrollY = 0) {
  const prevId = currentId;
  const prev = prevId ? screens.get(prevId) : null;
  if (prev && prev.onLeave) { try { prev.onLeave(id); } catch (err) { console.error('[nav] onLeave', prevId, err); } }
  const next = screens.get(id) || null;
  transition(kind, () => {
    showScreen(id);                                  // toggles .active + scrollTo(0,0)
    if (hasDoc()) document.body.toggleAttribute('data-immersive', !!(next && next.immersive));
    if (scrollY && win()) win().scrollTo(0, scrollY);
  });
  currentId = id;
  if (next && next.onEnter) { try { next.onEnter(prevId); } catch (err) { console.error('[nav] onEnter', id, err); } }
  if (hasDoc()) document.dispatchEvent(new CustomEvent('nav:change', {
    detail: { screen: id, tab, depth: stacks[tab].length, immersive: !!(next && next.immersive), kind },
  }));
}

function rememberScroll() {
  const top = stacks[tab][stacks[tab].length - 1];
  if (top && win()) top.scrollY = win().scrollY || 0;
}

function pushHistory() {
  const w = win();
  if (!w || !w.history || typeof w.history.pushState !== 'function') return;
  try { w.history.pushState({ tomo: true, depth: stacks[tab].length, tab }, ''); } catch (_e) { /* file:// etc. */ }
}

/**
 * Go to a screen.
 *   navigate('screen-settings')                 push onto the current tab
 *   navigate('screen-dashboard')                root screens reset their tab
 *   navigate(id, { replace: true })             swap the top entry
 *   navigate(id, { reset: true })               make it the only entry of its tab
 *   navigate(id, { push: true })                push even a root screen (settings from inside a game)
 * Immersive screens (lesson, game, review…) always push onto the CURRENT tab:
 * the dock is hidden there and back must return to where the user came from.
 */
export function navigate(id, { replace = false, reset = false, push = false, tab: forceTab = null } = {}) {
  const meta = screens.get(id) || null;
  // push:true keeps the CURRENT tab (settings gear inside a game); immersive screens never switch tabs.
  const targetTab = forceTab || ((push || (meta && meta.immersive)) ? tab : (meta && meta.tab)) || tab;
  rememberScroll();
  const switching = targetTab !== tab;
  let kind;
  if (replace && stacks[targetTab].length) { stacks[targetTab][stacks[targetTab].length - 1] = { id, scrollY: 0 }; kind = 'replace'; }
  else if (!push && ((meta && meta.root) || reset)) { stacks[targetTab] = [{ id, scrollY: 0 }]; kind = switching ? 'tab' : 'replace'; }
  else { stacks[targetTab].push({ id, scrollY: 0 }); kind = switching ? 'tab' : 'push'; }
  tab = targetTab;
  if (kind === 'push') pushHistory();
  activate(id, kind);
  return true;
}

// Stack pop without touching history (used by popstate).
function popInternal() {
  if (backGuard && backGuard() === true) return true;                    // sheet / confirm dialog closed instead
  if (hasDoc() && document.querySelector('dialog[open]')) return true;   // any other dialog owns "back"
  const top = stacks[tab][stacks[tab].length - 1];
  const meta = top ? screens.get(top.id) : null;
  if (meta && meta.onBack && meta.onBack() === false) return true;      // screen consumed it (confirm prompt etc.)
  if (stacks[tab].length <= 1) return false;                            // at a root
  stacks[tab].pop();
  const prev = stacks[tab][stacks[tab].length - 1];
  activate(prev.id, 'pop', prev.scrollY);
  return true;
}

/** Go back one step in the current tab. Returns false at a root (caller decides: exit/minimize). */
export function back() {
  const w = win();
  const ours = w && w.history && w.history.state && w.history.state.tomo;
  const handled = popInternal();
  if (handled && ours) { suppressPop++; try { w.history.back(); } catch (_e) { suppressPop--; } }
  return handled;
}

/** Dock tap: switch tab (restores that tab's top screen), or pop to root / scroll to top when already there. */
export function setTab(name) {
  if (!TABS.includes(name)) return false;
  if (name === tab) {
    if (stacks[tab].length > 1) { const root = stacks[tab][0]; stacks[tab] = [root]; activate(root.id, 'pop', root.scrollY); }
    else if (win()) win().scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    return true;
  }
  rememberScroll();
  if (!stacks[name].length) {
    if (!roots[name]) return false;                 // tab has no root yet
    stacks[name] = [{ id: roots[name], scrollY: 0 }];
  }
  tab = name;
  const top = stacks[tab][stacks[tab].length - 1];
  activate(top.id, 'tab', top.scrollY);
  return true;
}

/** Reset everything (sign-out). */
export function resetStacks() {
  for (const t of TABS) stacks[t] = [];
  tab = 'home';
  currentId = null;
}

export function initNav() {
  const w = win();
  if (listening || !w || typeof w.addEventListener !== 'function') return;
  listening = true;
  w.addEventListener('popstate', () => {
    if (suppressPop > 0) { suppressPop--; return; }
    if (!popInternal()) {
      // Browser back at a root: stay in the app (re-arm one entry) rather than leaving the page.
      pushHistory();
    }
  });
}
