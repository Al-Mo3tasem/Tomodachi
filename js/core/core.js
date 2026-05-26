// ============================================
// Tomodachi — Core State & UI Helpers
// Shared, dependency-free building blocks used by every feature module.
// ============================================

import { APP_CONFIG } from '../config/firebase.js?v=20260526a';

// ----- One-shot localStorage migration: hiraquest-* → tomodachi-* (R1.05a).
// Runs on module load; harmless after the first time. Removed once we're
// confident every user's browser has migrated (Phase L3 or so).
const _MIGRATE_KEYS = [
  'audio', 'practice', 'input', 'duration', 'wincon',
  'duelinput', 'coopinput', 'theme', 'last-bracket'
];
for (const k of _MIGRATE_KEYS) {
  const oldK = 'tomodachi-' + k;
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

  theme: localStorage.getItem('tomodachi-theme') || APP_CONFIG.defaultTheme
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
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = icons[type] || icons.info;
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
export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('tomodachi-theme', theme);
  state.theme = theme;
  const toggle = $('toggle-theme');
  if (toggle) toggle.checked = theme === 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#000000' : '#F5F5F7');
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
