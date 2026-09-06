// ============================================
// Tomodachi — skeletons + empty states (pick 17)
//
//   mountSkeleton(host, kind, count, { delay }) → clear()   (v2 only)
//   clearSkeleton(host)
//   renderEmptyState(host, { image, alt, title, body, cta })
//
// Loading ladder: nothing for the first 300 ms (most loads finish), then a
// geometry-matched skeleton (row | card | tile | friend templates in
// index.html) until the caller clears it. Empty states: one illustration,
// one line, one verb CTA; illustrations are never mirrored.
// ============================================

import { $ } from '../core/core.js?v=20260906g';

const DELAY_MS = 300;
const timers = new WeakMap();
const v2 = () => document.documentElement.dataset.shell === 'v2';

export const EMPTY_ART = {
  friends: 'assets/brand/empty-no-friends.webp',
  lessons: 'assets/brand/empty-no-lessons.webp',
  results: 'assets/brand/empty-no-results.webp',
};

export function clearSkeleton(host) {
  if (!host) return;
  clearTimeout(timers.get(host));
  timers.delete(host);
  host.querySelectorAll(':scope > [data-skeleton]').forEach((n) => n.remove());
  host.removeAttribute('aria-busy');
}

/**
 * @param {HTMLElement} host
 * @param {'row'|'card'|'tile'|'friend'} kind
 * @param {number} count
 * @returns {() => void} clear function
 */
export function mountSkeleton(host, kind = 'row', count = 3, { delay = DELAY_MS } = {}) {
  if (!host || !v2()) return () => {};
  clearSkeleton(host);
  const timer = setTimeout(() => {
    timers.delete(host);
    const tpl = $(`tpl-skel-${kind}`);
    if (!tpl) return;
    const group = document.createElement('div');
    group.className = 'skel-group';
    group.dataset.skeleton = kind;
    group.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < count; i++) group.appendChild(tpl.content.firstElementChild.cloneNode(true));
    host.setAttribute('aria-busy', 'true');
    host.prepend(group);
  }, delay);
  timers.set(host, timer);
  return () => clearSkeleton(host);
}

/**
 * @param {HTMLElement} host   emptied and filled
 * @param {{ image?: string, alt?: string, title?: string, body?: string, cta?: { label: string, onClick?: Function } }} opts
 */
export function renderEmptyState(host, { image = '', alt = '', title = '', body = '', cta = null } = {}) {
  if (!host) return null;
  const el = document.createElement('div');
  el.className = 'empty-view';
  if (image) {
    const img = document.createElement('img');
    img.src = image; img.alt = alt; img.loading = 'lazy'; img.decoding = 'async';
    el.appendChild(img);
  }
  if (title) { const h = document.createElement('h3'); h.className = 'empty-view-title'; h.textContent = title; el.appendChild(h); }
  if (body) { const p = document.createElement('p'); p.className = 'empty-view-body'; p.textContent = body; el.appendChild(p); }
  if (cta && cta.label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-primary';
    b.textContent = cta.label;
    b.addEventListener('click', () => { if (cta.onClick) cta.onClick(); });
    el.appendChild(b);
  }
  host.replaceChildren(el);
  return el;
}
