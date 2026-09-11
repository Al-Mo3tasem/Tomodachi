// ============================================
// Tomodachi — game HUD chip (pick 20: ONE glass chip over an opaque stage)
//
//   mountHud(screenId, { host, lead })        → el  (v2 only; once per screen)
//   updateHud(screenId, { primary, stats, danger })
//   unmountHud(screenId)
//
// The chip is the only glass surface on a game screen (the dock is hidden on
// immersive screens), so the budget holds at 1. Layout (logical): a leading
// slot (exit / self avatar), the primary number with its caption, a run of
// small stats, and an optional trailing slot (opponent avatar). Numbers are
// ink: the primary number uses the hero digit face at the HUD size and a
// fixed min-width so 9 → 10 never shifts the layout.
// ============================================

import { $ } from '../core/core.js?v=20260911b';

const v2 = () => document.documentElement.dataset.shell === 'v2';
const huds = new Map();   // screenId → { el, primary, caption, stats, lead, trail }

/**
 * @param {string} screenId       e.g. 'screen-game'
 * @param {{ host?: string, lead?: HTMLElement|null }} [opts]
 *   host: selector inside the screen that receives the chip (prepended)
 *   lead: an existing control to adopt into the leading slot (ids intact)
 */
export function mountHud(screenId, { host = '.game-shell, .duel-shell, .coop-shell', lead = null } = {}) {
  if (!v2()) return null;
  if (huds.has(screenId)) return huds.get(screenId).el;
  const screen = $(screenId);
  const tpl = $('tpl-hud-chip');
  const target = screen && screen.querySelector(host);
  if (!screen || !tpl || !target) return null;
  const el = tpl.content.firstElementChild.cloneNode(true);
  el.dataset.for = screenId;
  const rec = {
    el,
    lead: el.querySelector('.hud-lead'),
    primary: el.querySelector('.hud-primary'),
    caption: el.querySelector('.hud-primary-caption'),
    stats: el.querySelector('.hud-stats'),
    trail: el.querySelector('.hud-trail'),
  };
  if (lead) rec.lead.appendChild(lead);
  target.prepend(el);
  huds.set(screenId, rec);
  return el;
}

/**
 * @param {string} screenId
 * @param {object} m
 * @param {{ value: string, caption?: string, tone?: 'danger'|'good'|'' }} [m.primary]
 * @param {Array<{ key: string, value: string, icon?: string, tone?: 'danger'|'good'|'' }>} [m.stats]
 * @param {boolean} [m.danger]   last-seconds state on the whole chip
 */
export function updateHud(screenId, { primary = null, stats = null, danger = null } = {}) {
  const rec = huds.get(screenId);
  if (!rec) return false;
  if (primary) {
    rec.primary.textContent = primary.value == null ? '' : String(primary.value);
    rec.caption.textContent = primary.caption || '';
    rec.primary.dataset.tone = primary.tone || '';
  }
  if (stats) {
    // reuse nodes by key so the text updates in place (no per-tick DOM churn)
    const keep = new Set();
    for (const s of stats) {
      keep.add(s.key);
      let node = rec.stats.querySelector(`[data-key="${s.key}"]`);
      if (!node) {
        node = document.createElement('span');
        node.className = 'hud-stat';
        node.dataset.key = s.key;
        node.innerHTML = '<span class="hud-stat-icon" aria-hidden="true"></span><span class="hud-stat-value"></span>';
        rec.stats.appendChild(node);
      }
      node.querySelector('.hud-stat-icon').textContent = s.icon || '';
      node.querySelector('.hud-stat-value').textContent = s.value == null ? '' : String(s.value);
      node.dataset.tone = s.tone || '';
    }
    for (const node of [...rec.stats.children]) if (!keep.has(node.dataset.key)) node.remove();
  }
  if (danger !== null) rec.el.classList.toggle('is-danger', !!danger);
  return true;
}

export function unmountHud(screenId) {
  const rec = huds.get(screenId);
  if (!rec) return;
  rec.el.remove();
  huds.delete(screenId);
}

/** Test/support hook. */
export function hudElement(screenId) { const rec = huds.get(screenId); return rec ? rec.el : null; }
