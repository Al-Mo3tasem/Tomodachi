// ============================================
// Tomodachi — quiz tiles + feedback sheet (pick 6)
//
//   renderChoiceTiles(grid, choices, { onPick, jp, kana, hotkeys, tileClass }) → tiles[]
//   showFeedbackSheet({ ok, answer, onContinue })  → true when shown (v2 only)
//
// One renderer for every 2×2 answer grid (lesson quiz, review, Zen/Survival
// multiple choice). Tiles keep the legacy class names (.choice-btn, .choice-key,
// .choice-text, callers add .lesson-choice / .choice-jp) so v1 renders exactly
// as before; the v2 look comes from css/app/components/surfaces.css on
// .quiz-tile. Japanese runs are <bdi lang="ja"> islands.
//
// Feedback: lessons and review show a tinted sheet (right = matcha, wrong =
// rose) with the answer and a Continue button — the learner reads the miss
// instead of being rushed. Timed games keep their inline flash. On v1 the
// sheet is not shown and the caller keeps its auto-advance.
// ============================================

import { $ } from '../core/core.js?v=20260906f';
import { t } from '../i18n/index.js?v=20260906f';
import { haptic } from '../core/haptics.js?v=20260906f';
import { jaNode } from '../core/format.js?v=20260906f';
import { openSheet, closeSheet } from './sheet.js?v=20260906f';

const v2 = () => document.documentElement.dataset.shell === 'v2';

const MARK = {
  ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  no: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
};

const JA_RE = /[぀-ヿ一-鿿]/;
const LATIN_ONLY_RE = /^[\x20-\x7E]+$/;

/**
 * A choice/answer as a DOM node: Japanese → <bdi lang="ja" dir="ltr">;
 * romaji (pure ASCII) → <bdi dir="ltr"> (an island inside Arabic text);
 * anything else (Arabic/English meanings) → plain text.
 */
function answerNode(value, forceJa = false) {
  const text = String(value == null ? '' : value);
  if (forceJa || JA_RE.test(text)) return jaNode(text);
  if (LATIN_ONLY_RE.test(text)) {
    const b = document.createElement('bdi');
    b.setAttribute('dir', 'ltr');
    b.textContent = text;
    return b;
  }
  return document.createTextNode(text);
}

function fallbackTile() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'choice-btn quiz-tile';
  b.innerHTML = '<span class="choice-key quiz-tile-key" aria-hidden="true"></span><span class="choice-text quiz-tile-text"></span>';
  return b;
}

/**
 * @param {HTMLElement} grid       the answer container (emptied)
 * @param {Array<string>} choices
 * @param {object} opts
 * @param {(value:string, tile:HTMLButtonElement, index:number)=>void} opts.onPick
 * @param {boolean} [opts.jp]      choices are Japanese (bdi island, JP font)
 * @param {boolean} [opts.kana]    single kana glyphs (taller tile, kana font)
 * @param {boolean} [opts.hotkeys] show 1–4 hints (hidden on coarse pointers)
 * @param {string}  [opts.tileClass]  extra legacy classes (e.g. 'lesson-choice')
 */
export function renderChoiceTiles(grid, choices, { onPick, jp = false, kana = false, hotkeys = false, tileClass = '' } = {}) {
  if (!grid) return [];
  grid.innerHTML = '';
  grid.classList.add('quiz-grid');
  const tpl = $('tpl-choice-tile');
  return (choices || []).map((value, i) => {
    const tile = tpl ? tpl.content.firstElementChild.cloneNode(true) : fallbackTile();
    if (tileClass) tile.classList.add(...tileClass.split(/\s+/).filter(Boolean));
    if (kana) tile.classList.add('is-kana');
    tile.dataset.value = String(value);
    const key = tile.querySelector('.quiz-tile-key');
    if (key) { if (hotkeys) key.textContent = String(i + 1); else key.remove(); }
    const text = tile.querySelector('.quiz-tile-text');
    text.replaceChildren(answerNode(value, jp || kana));
    tile.addEventListener('pointerdown', () => { if (!tile.disabled) haptic('tap'); }, { passive: true });
    tile.addEventListener('click', () => { if (onPick) onPick(String(value), tile, i); });
    grid.appendChild(tile);
    return tile;
  });
}

/** Freeze a grid after an answer (no second taps, no hover lift). */
export function lockTiles(grid) {
  if (!grid) return;
  grid.querySelectorAll('button').forEach((b) => { b.disabled = true; });
}

/**
 * Lesson/review verdict. Returns true when the sheet was shown (v2); the
 * caller then advances from onContinue. Returns false on v1.
 */
export function showFeedbackSheet({ ok, answer = '', onContinue = null } = {}) {
  if (!v2()) return false;
  let done = false;
  const finish = () => { if (done) return; done = true; if (onContinue) onContinue(); };
  openSheet({
    className: `sheet--feedback ${ok ? 'is-ok' : 'is-wrong'}`,
    detent: 'half',
    content: (body) => {
      const title = document.createElement('p');
      title.className = 'feedback-title';
      title.innerHTML = MARK[ok ? 'ok' : 'no'];
      title.append(document.createTextNode(ok ? t('quiz.correct') : t('quiz.not_quite')));
      body.appendChild(title);
      if (!ok && answer) {
        const p = document.createElement('p');
        p.className = 'feedback-answer';
        p.textContent = `${t('quiz.answer_label')}: `;
        p.appendChild(answerNode(answer));
        body.appendChild(p);
      }
      const actions = document.createElement('div');
      actions.className = 'sheet-actions';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary';
      btn.textContent = t('quiz.continue');
      btn.setAttribute('autofocus', '');
      btn.addEventListener('click', () => closeSheet({ reason: 'continue' }));
      actions.appendChild(btn);
      body.appendChild(actions);
    },
    onClose: finish,
  });
  return true;
}
