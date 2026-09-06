// ============================================
// Tomodachi — status chip (pick 22)
// Small in-context EVENTS (friend online, saved, signed in, opponent left)
// show in the tonal chip under the status bar and collapse on their own.
// Errors and undo keep using toast() (core.js), which sits above the dock.
// The chip is v2 chrome: on v1 the call degrades to a plain toast so prod
// behaviour is unchanged until the flip.
// ============================================

import { $, toast } from '../core/core.js?v=20260906f';

const DEFAULT_MS = 1800;
const ICONS = {
  info:    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  ok:      '<path d="M20 6 9 17l-5-5"/>',
  friend:  '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
  offline: '<path d="m2 2 20 20"/><path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193"/><path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07"/>',
  saved:   '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
};

let hideTimer = null;
const v2 = () => document.documentElement.dataset.shell === 'v2';

/**
 * @param {string} message
 * @param {{ icon?: 'info'|'ok'|'friend'|'offline'|'saved', duration?: number }} [opts]
 */
export function statusChip(message, { icon = 'info', duration = DEFAULT_MS } = {}) {
  if (!v2()) { toast(message, icon === 'ok' || icon === 'saved' ? 'success' : 'info'); return; }
  const el = $('status-chip');
  if (!el) return;
  el.hidden = false;
  el.querySelector('.status-chip-icon').innerHTML =
    `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[icon] || ICONS.info}</svg>`;
  el.querySelector('.status-chip-text').textContent = message;
  clearTimeout(hideTimer);
  // restart the entrance when a chip is already showing (new event = new pop)
  el.classList.remove('is-in');
  void el.offsetWidth;
  el.classList.add('is-in');
  hideTimer = setTimeout(() => el.classList.remove('is-in'), duration);
}

/** Test/support hook. */
export function hideStatusChip() {
  clearTimeout(hideTimer);
  const el = $('status-chip');
  if (el) el.classList.remove('is-in');
}
