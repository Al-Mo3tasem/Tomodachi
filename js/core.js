// ============================================
// HiraQuest — Core State & UI Helpers
// Shared, dependency-free building blocks used by every feature module.
// ============================================

import { APP_CONFIG } from './config.js?v=20260522';

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
  audioEnabled: localStorage.getItem('hiraquest-audio') !== 'false',
  inputMethod: localStorage.getItem('hiraquest-input') || 'typing',
  shuffleEnabled: localStorage.getItem('hiraquest-shuffle') !== 'false',
  theme: localStorage.getItem('hiraquest-theme') || APP_CONFIG.defaultTheme
};

// ----- DOM Helpers -----
export const $ = (id) => document.getElementById(id);

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
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
  localStorage.setItem('hiraquest-theme', theme);
  state.theme = theme;
  const toggle = $('toggle-theme');
  if (toggle) toggle.checked = theme === 'dark';
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
