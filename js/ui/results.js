// ============================================
// Tomodachi — results sheet (lesson / review variant; games arrive in batch 8)
//
//   showResultsSheet({ tier, title, value, caption, lines, actions, onClose }) → true (v2) | false (v1)
//
// One hero number that ticks up (numbers are ink), a tiered title
// ('normal' | 'perfect'), optional secondary lines (forecast, caps) and up to
// two actions. Sits on the sheet primitive; v1 keeps its done cards.
// ============================================

import { openSheet, closeSheet } from './sheet.js?v=20260911a';
import { countUp } from './numbers.js?v=20260911a';
import { haptic } from '../core/haptics.js?v=20260911a';

const v2 = () => document.documentElement.dataset.shell === 'v2';
const ART = { normal: '🎉', perfect: '🌸' };

/**
 * @param {object} o
 * @param {'normal'|'perfect'} [o.tier]
 * @param {string} o.title
 * @param {number} [o.value]        hero number
 * @param {string} [o.caption]      under the number
 * @param {string[]} [o.lines]      secondary lines (forecast, caps…)
 * @param {{ label: string, primary?: boolean, onClick?: Function }[]} [o.actions]  first primary
 * @param {(reason: string) => void} [o.onClose]
 */
export function showResultsSheet({ tier = 'normal', art: artOverride = null, title = '', value = 0, caption = '', lines = [], stats = [], note = false, versus = null, actions = [], onClose = null } = {}) {
  if (!v2()) return false;
  let numEl = null;
  let noteEl = null;
  openSheet({
    className: `sheet--results is-${tier === 'perfect' ? 'perfect' : 'normal'}`,
    detent: 'half',
    content: (body) => {
      const art = document.createElement('div');
      art.className = 'results-art';
      art.setAttribute('aria-hidden', 'true');
      art.textContent = artOverride || ART[tier] || ART.normal;
      const h = document.createElement('h2');
      h.className = 'results-title';
      h.textContent = title;
      numEl = document.createElement('div');
      numEl.className = 'num-hero is-results';
      numEl.textContent = '0';
      const cap = document.createElement('div');
      cap.className = 'num-caption';
      cap.textContent = caption;
      body.append(art, h, numEl, cap);
      if (versus) {
        const wrap = document.createElement('div');
        wrap.className = 'dr-scores';
        for (const side of [versus.self, versus.opp]) {
          const box = document.createElement('div');
          box.className = 'dr-side' + (side.win ? ' dr-win' : '');
          box.innerHTML = '<div class="dr-name"></div><div class="dr-score"></div><div class="dr-sub"></div>';
          box.querySelector('.dr-name').textContent = side.name || '';
          box.querySelector('.dr-score').textContent = side.score == null ? '' : String(side.score);
          box.querySelector('.dr-sub').textContent = side.sub || '';
          if (wrap.children.length === 1) { const vs = document.createElement('div'); vs.className = 'dr-vs'; vs.textContent = versus.vs || 'VS'; wrap.appendChild(vs); }
          wrap.appendChild(box);
        }
        body.appendChild(wrap);
      }
      if (stats.length) {
        const grid = document.createElement('div');
        grid.className = 'results-stats';
        stats.slice(0, 6).forEach((st, i) => {
          const cell = document.createElement('div');
          cell.className = 'rstat';
          cell.style.setProperty('--i', String(i));
          cell.innerHTML = '<div class="rstat-value"></div><div class="rstat-label"></div>';
          cell.querySelector('.rstat-value').textContent = st.value == null ? '' : String(st.value);
          cell.querySelector('.rstat-label').textContent = st.label || '';
          grid.appendChild(cell);
        });
        body.appendChild(grid);
      }
      if (note) {
        noteEl = document.createElement('div');
        noteEl.className = 'results-note';
        noteEl.setAttribute('aria-live', 'polite');
        body.appendChild(noteEl);
      }
      for (const text of lines.filter(Boolean)) {
        const p = document.createElement('p');
        p.className = 'results-line';
        p.textContent = text;
        body.appendChild(p);
      }
      if (actions.length) {
        const wrap = document.createElement('div');
        wrap.className = 'sheet-actions';
        actions.forEach((a, i) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `btn ${a.primary || i === 0 ? 'btn-primary' : 'btn-secondary'}`;
          btn.textContent = a.label;
          if (i === 0) btn.setAttribute('autofocus', '');
          btn.addEventListener('click', async () => { await closeSheet({ reason: 'action' }); if (a.onClick) a.onClick(); });
          wrap.appendChild(btn);
        });
        body.appendChild(wrap);
      }
    },
    onClose,
  });
  haptic('ok');
  requestAnimationFrame(() => { if (numEl) countUp(numEl, value, { duration: 700 }); });
  return { note: noteEl };
}

/** Close the results sheet if one is open (play again / new match). */
export function hideResultsSheet() {
  if (document.querySelector('#sheet-root .sheet--results')) return closeSheet({ reason: 'program' });
  return Promise.resolve(false);
}
