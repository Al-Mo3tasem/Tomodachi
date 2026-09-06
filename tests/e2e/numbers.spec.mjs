// tests/e2e/numbers.spec.mjs — batch 4: digits never mix; Japanese runs are
// bidi islands; preferences survive a reload.
import { test, expect, show, signIn } from './fixtures.mjs';

test.use({ shell: 'v2' });

const LATIN = /[0-9]/;
const ARABIC = /[٠-٩]/;

// Every element whose OWN text has digits must use exactly one system.
async function mixedDigitElements(page) {
  return page.evaluate(() => {
    const bad = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.nodeValue || '';
      if (/[0-9]/.test(t) && /[٠-٩]/.test(t)) bad.push(t.trim().slice(0, 40));
    }
    return bad;
  });
}

test.describe('numbers & bidi', () => {
  test('dashboard never mixes digit systems (Latin default)', async ({ appPage: page }) => {
    await show(page, 'screen-dashboard');
    expect(await mixedDigitElements(page)).toEqual([]);
    const sample = await page.locator('.cp-count').first().textContent();
    expect(LATIN.test(sample) && !ARABIC.test(sample)).toBe(true);
  });

  test('lesson: every Japanese run sits in a <bdi lang="ja"> island', async ({ appPage: page }) => {
    await show(page, 'screen-dashboard');
    await page.click('#lesson-cta-btn');
    await page.waitForSelector('#screen-lesson.active, #screen-meta.active', { timeout: 30_000 });
    if (await page.locator('#screen-meta.active').count()) { await page.click('#meta-continue'); await page.waitForSelector('#screen-lesson.active'); }
    await page.click('#lesson-btn-begin');
    await page.waitForTimeout(400);
    const big = page.locator('#lesson-card-big');
    await expect(big.locator('bdi[lang="ja"][dir="ltr"]')).toHaveCount(1);
    const jpText = await big.textContent();
    expect(jpText.trim().length).toBeGreaterThan(0);
    await page.click('#lesson-btn-exit');
  });

  test('preferences persist across reload through the facade', async ({ page }) => {
    await signIn(page);
    await page.evaluate(async () => {
      const v = (document.querySelector('script[src*="js/app.js"]')?.getAttribute('src') || '').split('v=')[1];
      const p = await import(`/js/core/prefs.js?v=${v}`);
      p.setPref('practice', 'listen');
      p.setPref('digits', 'arab');
    });
    await page.reload();
    await page.waitForSelector('#screen-dashboard.active', { timeout: 60_000 });
    await page.waitForFunction(() => { const el = document.getElementById('lesson-cta'); return el && !el.hidden; }, null, { timeout: 60_000 });
    const state = await page.evaluate(async () => {
      const v = (document.querySelector('script[src*="js/app.js"]')?.getAttribute('src') || '').split('v=')[1];
      const c = await import(`/js/core/core.js?v=${v}`);
      const i18n = await import(`/js/i18n/index.js?v=${v}`);
      return {
        practice: c.state.practiceType,
        digits: document.documentElement.dataset.digits,
        count: document.querySelector('.cp-count')?.textContent,
        counts: [...document.querySelectorAll('.cp-count')].map((el) => el.textContent),
        sample: i18n.t('progress.lesson_n', { n: 12, total: 151 }),
      };
    });
    expect(state.practice).toBe('listen');
    expect(state.digits).toBe('arab');
    expect(state.sample, 'i18next interpolation formats numbers').toMatch(/^[^0-9]*$/);
    expect(state.counts.join(' | '), 'per-track counts').toMatch(/^[^0-9]*$/);
    expect(ARABIC.test(state.count) && !LATIN.test(state.count)).toBe(true);
    expect(await mixedDigitElements(page)).toEqual([]);
    // Under digits=arab no visible Latin digit may survive on any app screen.
    // Escape hatches: Japanese runs, and identifiers marked data-keep-digits
    // (version string, join codes) — everything else is a formatting leak.
    const leaks = [];
    for (const id of ['screen-dashboard', 'screen-lessons-list', 'screen-select', 'screen-settings', 'screen-leaderboard']) {
      await show(page, id);
      const found = await page.evaluate((id) => {
        const root = document.getElementById(id);
        const out = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          if (!/[0-9]/.test(n.nodeValue || '')) continue;
          const el = n.parentElement;
          if (!el || el.closest('[lang="ja"], bdi, [data-keep-digits], script, style, template')) continue;
          if (!el.getClientRects().length) continue;   // not rendered
          const tag = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
          out.push(`${tag}: ${n.nodeValue.trim().slice(0, 50)}`);
        }
        return out;
      }, id);
      for (const f of found) leaks.push(`${id} › ${f}`);
    }
    expect(leaks, 'Latin digits under digits=arab').toEqual([]);
    // restore defaults for the other specs
    await page.evaluate(async () => {
      const v = (document.querySelector('script[src*="js/app.js"]')?.getAttribute('src') || '').split('v=')[1];
      const p = await import(`/js/core/prefs.js?v=${v}`);
      p.setPref('practice', 'read'); p.removePref('digits');
    });
  });
});
