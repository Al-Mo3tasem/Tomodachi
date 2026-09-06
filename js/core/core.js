// ============================================
// Tomodachi — Core State & UI Helpers
// Shared, dependency-free building blocks used by every feature module.
// ============================================

import { APP_CONFIG } from '../config/firebase.js?v=20260906g';
import { getPref, setPref } from './prefs.js?v=20260906g';
// (the hiraquest-* → tomodachi-* key migration now lives in prefs.js)

// ----- Global App State -----
export const state = {
  user: null,
  userData: null,
  friend: null,
  friendPresence: null,
  contentSets: [],
  selectedSets: new Set(),
  selectedChars: new Set(),
  currentGameType: null,
  returnScreen: null,                 // where Settings should return to

  // audioEnabled controls game sound EFFECTS only. Japanese pronunciation
  // is functional (not a preference) and is governed by game design.
  audioEnabled: getPref('audio') !== 'false',

  // Zen practice options (solo mode — options are appropriate here).
  practiceType: getPref('practice') || 'read', // 'read' | 'listen'
  inputMethod: getPref('input') || 'typing',   // 'typing' | 'multiple'
  zenDuration: Number(getPref('duration')) || 60, // seconds

  // Duel / Co-op options (host picks these for both players — fixed for fairness).
  winCondition: getPref('wincon') || 'first_to_10', // 'first_to_10' | 'rounds_20'
  duelInput: getPref('duelinput') || 'multiple',    // 'multiple' | 'typing'
  coopInput: getPref('coopinput') || 'multiple',    // 'multiple' | 'typing'

  // Stored choice wins; first-visit falls back to the system preference
  // (mirrors the pre-paint script in each page's <head>), then the config default.
  theme: getPref('theme') ||
    (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : APP_CONFIG.defaultTheme)
};

// ----- DOM Helpers -----
export const $ = (id) => document.getElementById(id);

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

export function currentScreen() {
  const el = document.querySelector('.screen.active');
  return el ? el.id : null;
}

export function showLoading(show) {
  const overlay = $('loading-overlay');
  if (overlay) overlay.classList.toggle('active', show);
}

// ----- Toasts -----
// toast(message, type, duration) or toast(message, type, { duration, action: { label, onClick } }).
// Errors and undo only under the v2 shell (events go to the status chip,
// js/ui/status.js); v2 shows one toast at a time, above the dock.
export function toast(message, type = 'info', durationOrOpts = 3000) {
  const container = $('toast-container');
  if (!container) return;
  const opts = durationOrOpts && typeof durationOrOpts === 'object' ? durationOrOpts : { duration: durationOrOpts };
  const duration = Number.isFinite(opts.duration) ? opts.duration : 3000;
  if (document.documentElement.dataset.shell === 'v2') container.querySelectorAll('.toast').forEach((el) => el.remove());

  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${type}`;
  toastEl.setAttribute('role', type === 'error' ? 'alert' : 'status');
  // Status icons: monochrome Lucide line glyphs, tinted per severity by CSS
  // (.toast-icon color). These are trusted literals, so innerHTML is safe
  // here; the user-supplied message still goes through textContent below.
  const icons = {
    success: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    error:   '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    warning: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
  };
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[type] || icons.info}</svg>`;
  const text = document.createElement('span');
  text.textContent = message;
  toastEl.append(icon, text);
  let timer = null;
  const dismiss = () => {
    clearTimeout(timer);
    toastEl.classList.add('leaving');
    setTimeout(() => toastEl.remove(), 300);
  };
  if (opts.action && opts.action.label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = opts.action.label;
    btn.addEventListener('click', () => { try { if (opts.action.onClick) opts.action.onClick(); } finally { dismiss(); } });
    toastEl.appendChild(btn);
  }
  container.appendChild(toastEl);
  timer = setTimeout(dismiss, duration);
}

// ----- Theme -----
// persist=false applies without writing the preference — used at boot so a
// first-visit system-preference fallback isn't frozen as an explicit choice
// (the OS theme keeps steering until the user actually touches a toggle).
export function setTheme(theme, persist = true) {
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) setPref('theme', theme);
  state.theme = theme;
  const toggle = $('toggle-theme');
  if (toggle) toggle.checked = theme === 'dark';
  // Nav quick-toggles (landing + app chrome): pressed state = dark active.
  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
  });
  // Values match --bg-base in css/style.css (urushi charcoal / washi paper).
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#161311' : '#F6F3EB');
}

// ----- Async Helpers -----
export function withTimeout(promise, label, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)} seconds.`)),
        ms
      );
    })
  ]);
}

// ----- Misc Utilities -----
export function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
