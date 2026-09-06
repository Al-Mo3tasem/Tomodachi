// ============================================
// Tomodachi — bottom sheet + destructive dialog (pick 11)
//
//   openSheet({ title, content, detent, className, onClose }) → handle
//   closeSheet({ reason })                                  → Promise
//   confirmDestructive({ title, body, confirm, cancel })   → Promise<boolean>
//
// One sheet at a time. Detents: 'half' (content-sized up to 50dvh, drag up
// to expand) and 'full' (90dvh). Drag on the head; > 120 px or a downward
// flick dismisses; over-pull is damped. Escape / scrim / ✕ close it. Focus is
// trapped inside and returned to the opener on close. The sheet head is
// opaque on purpose: the glass budget belongs to the dock and the top bar.
//
// History: an open overlay pushes one state-only entry, so the browser or
// Android back gesture closes the overlay first (nav.js back guard) and the
// screen stack stays in sync. The destructive dialog is a native <dialog>
// (showModal) and is the ONLY place window.confirm may appear (fallback for
// WebViews without <dialog>; lint gate).
// ============================================

import { $ } from '../core/core.js?v=20260906g';
import { t } from '../i18n/index.js?v=20260906g';
import { haptic } from '../core/haptics.js?v=20260906g';
import { setBackGuard, suppressNextPop } from '../core/nav.js?v=20260906g';

const DISMISS_PX = 120;        // drag distance that closes
const FLICK_PX_PER_MS = 0.5;   // downward velocity that closes
const DETENT_PX = 40;          // drag distance that changes detent
const OVERPULL_DAMPING = 2.5;
const EXIT_FALLBACK_MS = 400;  // in case transitionend never fires

let current = null;            // { el, body, opener, onClose, closing, pushed, byBack }

const root = () => $('sheet-root');
const reducedMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_e) { return false; } };

// ----- history entry for overlays -----
function pushOverlayEntry() {
  try { window.history.pushState({ tomo: true, overlay: true }, ''); return true; } catch (_e) { return false; }
}
function popOverlayEntry() {
  suppressNextPop();
  try { window.history.back(); } catch (_e) { /* nothing to pop */ }
}

function restoreFocus(el) {
  if (el && el.isConnected && typeof el.focus === 'function') { try { el.focus({ preventScroll: true }); } catch (_e) { /* ignore */ } }
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function isSheetOpen() { return !!current && !current.closing; }

/**
 * @param {object} opts
 * @param {string} [opts.title]           head title (row hidden when empty)
 * @param {Function|Node|string} [opts.content]  fills .sheet-body (function receives the body element)
 * @param {'half'|'full'} [opts.detent]
 * @param {string} [opts.className]      extra classes on .sheet (e.g. 'sheet--feedback is-ok')
 * @param {(reason:string)=>void} [opts.onClose]   reason: button | scrim | drag | escape | back | program | continue
 */
export function openSheet({ title = '', content = null, detent = 'half', className = '', onClose = null } = {}) {
  const host = root();
  const tpl = $('tpl-sheet');
  if (!host || !tpl) return null;
  if (current) closeSheet({ reason: 'program', immediate: true });

  const frag = tpl.content.cloneNode(true);
  const scrim = frag.querySelector('.sheet-scrim');
  const el = frag.querySelector('.sheet');
  const titleRow = el.querySelector('.sheet-title-row');
  const titleEl = el.querySelector('.sheet-title');
  const body = el.querySelector('.sheet-body');
  const closeBtn = el.querySelector('.sheet-close');

  el.dataset.detent = detent === 'full' ? 'full' : 'half';
  el.dataset.detentInitial = el.dataset.detent;
  if (className) el.classList.add(...className.split(/\s+/).filter(Boolean));
  if (title) { titleEl.textContent = title; el.setAttribute('aria-label', title); }
  else titleRow.hidden = true;
  closeBtn.setAttribute('aria-label', t('sheet.close'));

  if (typeof content === 'function') content(body);
  else if (content && typeof content === 'object' && 'nodeType' in content) body.appendChild(content);
  else if (typeof content === 'string') body.textContent = content;

  host.replaceChildren(frag);
  host.classList.add('is-mounted');

  const opener = document.activeElement;
  current = { el, body, opener, onClose, closing: false, pushed: pushOverlayEntry(), byBack: false };
  document.body.setAttribute('data-sheet', el.dataset.detent);

  scrim.addEventListener('click', () => closeSheet({ reason: 'scrim' }));
  closeBtn.addEventListener('click', () => closeSheet({ reason: 'button' }));
  el.addEventListener('keydown', onKeydown);
  wireDrag(el, body);
  setBackGuard(() => { if (!current || current.closing) return false; current.byBack = true; closeSheet({ reason: 'back' }); return true; });

  // two frames: mount, then transition in
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (current && current.el === el) {
      host.classList.add('is-open');
      const auto = body.querySelector('[autofocus]');
      (auto || el).focus({ preventScroll: true });
    }
  }));
  return { el, body, close: (opts) => closeSheet(opts) };
}

export function closeSheet({ reason = 'program', immediate = false } = {}) {
  const c = current;
  if (!c || c.closing) return Promise.resolve(false);
  c.closing = true;
  const host = root();
  setBackGuard(null);
  document.body.removeAttribute('data-sheet');
  if (c.pushed && !c.byBack) popOverlayEntry();
  try { if (c.onClose) c.onClose(reason); } catch (_e) { /* a listener must not break the sheet */ }

  const finish = () => {
    if (current !== c) return;                 // a newer sheet took the host over mid-exit: leave it alone
    if (host && host.contains(c.el)) host.replaceChildren();
    if (host) host.classList.remove('is-mounted', 'is-open');
    current = null;
    restoreFocus(c.opener);
  };
  if (immediate || reducedMotion() || !host) { finish(); return Promise.resolve(true); }

  host.classList.remove('is-open');
  c.el.classList.remove('is-dragging');
  c.el.style.transform = '';
  return new Promise((resolve) => {
    let done = false;
    const end = () => { if (done) return; done = true; c.el.removeEventListener('transitionend', end); finish(); resolve(true); };
    c.el.addEventListener('transitionend', end);
    setTimeout(end, EXIT_FALLBACK_MS);
  });
}

function onKeydown(e) {
  if (!current || current.closing) return;
  if (e.key === 'Escape') { e.preventDefault(); closeSheet({ reason: 'escape' }); return; }
  if (e.key !== 'Tab') return;
  const nodes = [...current.el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
  if (!nodes.length) { e.preventDefault(); current.el.focus(); return; }
  const first = nodes[0], last = nodes[nodes.length - 1];
  if (e.shiftKey && (document.activeElement === first || document.activeElement === current.el)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// ----- drag physics (head always; body only when scrolled to the top) -----
// The pointer is captured only once a drag INTENT is clear (> DRAG_SLOP px),
// so taps on buttons inside the body still produce their click.
const DRAG_SLOP = 6;
function wireDrag(el, body) {
  let pending = false, active = false, fromBody = false, pointerId = null;
  let startY = 0, lastY = 0, lastT = 0, dy = 0, vy = 0;
  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    fromBody = body.contains(e.target);
    if (fromBody && body.scrollTop > 0) return;
    pending = true; active = false; pointerId = e.pointerId;
    startY = lastY = e.clientY; lastT = e.timeStamp; dy = 0; vy = 0;
  };
  const onMove = (e) => {
    if (!pending && !active) return;
    const raw = e.clientY - startY;
    if (!active) {
      if (Math.abs(raw) < DRAG_SLOP) return;
      if (fromBody && raw < 0) { pending = false; return; }   // the body scrolls up on its own
      active = true; pending = false;
      try { el.setPointerCapture(pointerId); } catch (_e) { /* synthetic pointer */ }
      el.classList.add('is-dragging');
    }
    dy = raw > 0 ? raw : raw / OVERPULL_DAMPING;
    const dt = (e.timeStamp - lastT) || 1;
    vy = (e.clientY - lastY) / dt;
    lastY = e.clientY; lastT = e.timeStamp;
    el.style.transform = `translateY(${dy}px)`;
  };
  const onUp = () => {
    pending = false;
    if (!active) return;
    active = false;
    el.classList.remove('is-dragging');
    el.style.transform = '';
    if (dy > DISMISS_PX || vy > FLICK_PX_PER_MS) { closeSheet({ reason: 'drag' }); return; }
    if (dy < -DETENT_PX && el.dataset.detent === 'half') { el.dataset.detent = 'full'; document.body.dataset.sheet = 'full'; haptic('snap'); return; }
    if (dy > DETENT_PX && el.dataset.detent === 'full' && el.dataset.detentInitial === 'half') { el.dataset.detent = 'half'; document.body.dataset.sheet = 'half'; haptic('snap'); }
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
}

// ----- destructive confirmation -----
/**
 * Native <dialog>; resolves true only when the destructive action is chosen.
 * Escape, the scrim-less backdrop, the cancel button and the back gesture all
 * resolve false. One dialog at a time (a second request resolves false).
 */
export function confirmDestructive({ title = '', body = '', confirm: confirmLabel = '', cancel: cancelLabel = '', tone = 'danger' } = {}) {
  const dlg = $('dlg-confirm');
  if (!dlg || typeof dlg.showModal !== 'function') {
    try { return Promise.resolve(window.confirm(body ? `${title}\n\n${body}` : title)); } catch (_e) { return Promise.resolve(false); }
  }
  if (dlg.open) return Promise.resolve(false);

  dlg.querySelector('.dlg-title').textContent = title;
  const bodyEl = dlg.querySelector('.dlg-body');
  bodyEl.textContent = body;
  bodyEl.hidden = !body;
  const okBtn = dlg.querySelector('button[value="confirm"]');
  const noBtn = dlg.querySelector('button[value="cancel"]');
  okBtn.textContent = confirmLabel || t('common.leave');
  noBtn.textContent = cancelLabel || t('common.cancel');
  okBtn.className = `btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`;

  const opener = document.activeElement;
  const pushed = pushOverlayEntry();
  let byBack = false;
  setBackGuard(() => { if (!dlg.open) return false; byBack = true; dlg.close('cancel'); return true; });

  return new Promise((resolve) => {
    dlg.addEventListener('close', () => {
      setBackGuard(null);
      if (pushed && !byBack) popOverlayEntry();
      const ok = dlg.returnValue === 'confirm';
      dlg.returnValue = '';
      restoreFocus(opener);
      resolve(ok);
    }, { once: true });
    dlg.returnValue = '';
    dlg.showModal();
    noBtn.focus();   // the safe choice is the default
  });
}
