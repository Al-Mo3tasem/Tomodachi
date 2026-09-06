// ============================================
// Tomodachi — Core State & UI Helpers
// Shared, dependency-free building blocks used by every feature module.
// ============================================

import { APP_CONFIG } from '../config/firebase.js?v=20260906d';

// ----- One-shot localStorage migration: hiraquest-* → tomodachi-* (R1.05a).
// Runs on module load; harmless after the first time. Removed once we're
// confident every user's browser has migrated (Phase L3 or so).
const _MIGRATE_KEYS = [
  'audio', 'practice', 'input', 'duration', 'wincon',
  'duelinput', 'coopinput', 'theme', 'last-bracket'
];
for (const k of _MIGRATE_KEYS) {
  const oldK = 'hiraquest-' + k;
  const newK = 'tomodachi-' + k;
  const oldV = localStorage.getItem(oldK);
  if (oldV !== null && localStorage.getItem(newK) === null) {
    localStorage.setItem(newK, oldV);
    localStorage.removeItem(oldK);
  }
}

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
  audioEnabled: localStorage.getItem('tomodachi-audio') !== 'false',

  // Zen practice options (solo mode — options are appropriate here).
  practiceType: localStorage.getItem('tomodachi-practice') || 'read', // 'read' | 'listen'
  inputMethod: localStorage.getItem('tomodachi-input') || 'typing',   // 'typing' | 'multiple'
  zenDuration: Number(localStorage.getItem('tomodachi-duration')) || 60, // seconds

  // Duel / Co-op options (host picks these for both players — fixed for fairness).
  winCondition: localStorage.getItem('tomodachi-wincon') || 'first_to_10', // 'first_to_10' | 'rounds_20'
  duelInput: localStorage.getItem('tomodachi-duelinput') || 'multiple',    // 'multiple' | 'typing'
  coopInput: localStorage.getItem('tomodachi-coopinput') || 'multiple',    // 'multiple' | 'typing'

  // Stored choice wins; first-visit falls back to the system preference
  // (mirrors the pre-paint script in each page's <head>), then the config default.
  theme: localStorage.getItem('tomodachi-theme') ||
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
export function toast(message, type = 'info', duration = 3000) {
  const container = $('toast-container');
  if (!container) return;

  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${type}`;
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
  container.appendChild(toastEl);

  setTimeout(() => {
    toastEl.classList.add('leaving');
    setTimeout(() => toastEl.remove(), 300);
  }, duration);
}

// ----- Theme -----
// persist=false applies without writing localStorage — used at boot so a
// first-visit system-preference fallback isn't frozen as an explicit choice
// (the OS theme keeps steering until the user actually touches a toggle).
export function setTheme(theme, persist = true) {
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) localStorage.setItem('tomodachi-theme', theme);
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

export function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
