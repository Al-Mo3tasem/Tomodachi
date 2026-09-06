// ============================================
// Tomodachi — sliding-pill segmented controls (v2)
// The legacy .segmented / .lb-modes controls toggle .active on a child;
// this adds one measured pill per control that slides to the active child.
// Position is MEASURED (getBoundingClientRect) and written to
// --seg-x / --seg-w as an inline-start offset, so RTL is correct without a
// physical transform (css/app/components/controls.css). Nothing here runs
// on v1.
// ============================================

const CONTAINERS = '.segmented, .lb-modes';
const ACTIVE = '.seg-btn.active, .lb-tab.active';
let started = false;

const v2 = () => document.documentElement.dataset.shell === 'v2';

function place(c) {
  const active = c.querySelector(ACTIVE);
  let pill = c.querySelector(':scope > .seg-pill');
  // Only touch the class when it actually changes: classList.remove() on an
  // absent token still records a mutation, and this runs inside the observer.
  if (!active || !c.offsetParent) { if (pill && pill.classList.contains('is-ready')) pill.classList.remove('is-ready'); return; }
  if (!pill) {
    pill = document.createElement('span');
    pill.className = 'seg-pill';
    pill.setAttribute('aria-hidden', 'true');
    c.prepend(pill);
  }
  const cr = c.getBoundingClientRect();
  const ar = active.getBoundingClientRect();
  const rtl = getComputedStyle(c).direction === 'rtl';
  const x = rtl ? cr.right - ar.right : ar.left - cr.left;
  c.style.setProperty('--seg-x', `${Math.round(x * 100) / 100}px`);
  c.style.setProperty('--seg-w', `${Math.round(ar.width * 100) / 100}px`);
  if (!pill.classList.contains('is-ready')) requestAnimationFrame(() => pill.classList.add('is-ready'));
}

export function placeAll(root = document) {
  root.querySelectorAll(CONTAINERS).forEach(place);
}

export function initSegmented() {
  if (started || !v2() || typeof MutationObserver === 'undefined') return;
  started = true;
  const mo = new MutationObserver((muts) => {
    const seen = new Set();
    const mark = (c) => { if (c && !seen.has(c)) { seen.add(c); place(c); } };
    for (const m of muts) {
      const target = m.target && m.target.nodeType === 1 ? m.target : m.target && m.target.parentElement;
      if (!target) continue;
      const c = target.closest ? target.closest(CONTAINERS) : null;
      if (c) { mark(c); continue; }
      // a class change on an ancestor (a screen becoming .active, a panel unhiding):
      // the controls inside were unmeasurable while hidden — place them now
      if (m.type === 'attributes' && target.querySelectorAll) target.querySelectorAll(CONTAINERS).forEach(mark);
    }
  });
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
  window.addEventListener('resize', () => placeAll());
  document.addEventListener('nav:change', () => requestAnimationFrame(() => placeAll()));   // a screen just became visible
  document.addEventListener('tomo:locale', () => requestAnimationFrame(() => placeAll()));
  placeAll();
}
