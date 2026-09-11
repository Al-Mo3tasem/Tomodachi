// tests/e2e/practice.spec.mjs — batch 9: the Practice tab under the v2 shell —
// due-count hero (rose when overdue), 7-day forecast, session-cap line, Zen /
// Survival tiles, the Survival leaderboard entry, and the game setup whose
// Start CTA lives in the dock shelf. Nothing here starts a review or a game,
// so the QA account's progress and stats are untouched.
import { test, expect, show } from './fixtures.mjs';

test.use({ shell: 'v2' });

const FIXTURE = ':root { --safe-area-inset-top: 47px; --safe-area-inset-bottom: 34px; }';

async function ver(page) {
  return page.evaluate(() => (document.querySelector('script[src*="js/app.js"]')?.getAttribute('src') || '').split('v=')[1]);
}
async function countGlass(page) {
  return page.evaluate(() => {
    let n = 0;
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const bf = cs.backdropFilter || cs.webkitBackdropFilter;
      if (!bf || bf === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height && cs.visibility !== 'hidden' && cs.display !== 'none') n++;
    }
    return n;
  });
}
/**
 * Tap a dock tab and land on its ROOT. Switching away first guarantees a real
 * tab change: after a direct show() the router still believes it is on the tab
 * it last routed to, and tapping that same tab would only scroll. A second tap
 * pops any child the tab still holds.
 */
async function gotoTab(page, tab, rootId) {
  await page.click(`.dock-tab[data-tab="${tab === 'me' ? 'home' : 'me'}"]`);
  await page.waitForTimeout(250);
  await page.click(`.dock-tab[data-tab="${tab}"]`);
  await page.waitForTimeout(400);
  if (!(await page.locator(`#${rootId}.active`).count())) {
    await page.click(`.dock-tab[data-tab="${tab}"]`);
    await page.waitForTimeout(400);
  }
  await expect(page.locator(`#${rootId}.active`)).toBeVisible();
  await page.waitForTimeout(300);
}

test.describe('practice tab (v2)', () => {
  test('due hero matches review.js, rose only when overdue; 7 forecast bars; cap line; two mode tiles', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    await gotoTab(page, 'practice', 'screen-practice');
    await expect(page.locator('#screen-practice .topbar-back')).toBeHidden();
    const v = await ver(page);
    const expected = await page.evaluate(async (v) => {
      const r = await import(`/js/ui/review.js?v=${v}`);
      const f = await import(`/js/core/format.js?v=${v}`);
      const { due, overdue } = r.dueSummary();
      const forecast0 = r.computeForecast(7)[0];
      return { due, overdue, text: f.fmtCount(due), forecast0, forecastText: f.fmtCount(forecast0), cap: r.SESSION_CAP };
    }, v);
    const hero = page.locator('#practice-due-count');
    await expect(hero).toHaveText(expected.text);
    const rose = await hero.evaluate((el) => el.classList.contains('is-attention'));
    expect(rose).toBe(expected.overdue > 0);
    const heroStyle = await hero.evaluate((el) => { const cs = getComputedStyle(el); return { family: cs.fontFamily, size: parseFloat(cs.fontSize), numeric: cs.fontVariantNumeric }; });
    expect(heroStyle.family).toMatch(/Space Grotesk/);
    expect(heroStyle.size).toBeGreaterThanOrEqual(36);
    expect(heroStyle.numeric).toContain('tabular-nums');
    await expect(page.locator('#practice-due-caption')).not.toBeEmpty();
    await expect(page.locator('#practice-forecast .forecast-day')).toHaveCount(7);
    await expect(page.locator('#practice-forecast .forecast-day.is-today')).toHaveCount(1);
    // The hero counts what is reviewable NOW; the first bar counts everything
    // scheduled for today, which also includes items coming back later in the day
    // (a wrong answer returns in an hour). Assert that relation, not equality.
    const firstCount = await page.locator('#practice-forecast .forecast-day').first().locator('.forecast-count').textContent();
    expect(firstCount.trim()).toBe(expected.forecastText);
    expect(expected.forecast0).toBeGreaterThanOrEqual(expected.due);
    await expect(page.locator('#practice-cap')).not.toBeEmpty();
    if (expected.due > 0) await expect(page.locator('#practice-review-btn')).toBeVisible();
    else await expect(page.locator('#practice-review-btn')).toBeHidden();
    await expect(page.locator('#practice-tiles .mode-tile')).toHaveCount(2);
    await expect(page.locator('#practice-tiles .mode-tile[data-mode="zen"] .mode-tile-name')).not.toBeEmpty();
    await expect(page.locator('#practice-leaderboard')).toBeVisible();
    // the last-run card is data-dependent: when it shows, it must be complete
    if (await page.locator('#practice-last').isVisible()) {
      for (const id of ['practice-last-mode', 'practice-last-when', 'practice-last-score', 'practice-last-acc']) {
        await expect(page.locator(`#${id}`)).not.toBeEmpty();
      }
    }
    expect(await countGlass(page), 'glass budget on Practice').toBeLessThanOrEqual(2);
    // the legacy modes card is gone from Home under v2
    await gotoTab(page, 'home', 'screen-dashboard');
    await expect(page.locator('#screen-dashboard .modes-card')).toBeHidden();
  });

  test('Zen tile → setup: the mode is the title, Start lives in the dock shelf clear of the 34px home indicator; back returns here', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    await gotoTab(page, 'practice', 'screen-practice');
    await page.click('#practice-tiles .mode-tile[data-mode="zen"]');
    await expect(page.locator('#screen-select.active')).toBeVisible();
    await page.waitForTimeout(300);
    const v = await ver(page);
    const modeName = await page.evaluate(async (v) => { const i = await import(`/js/i18n/index.js?v=${v}`); return i.t('modes.zen.name'); }, v);
    expect((await page.locator('#screen-select .topbar-title').textContent()).trim()).toBe(modeName);
    await expect(page.locator('#screen-select .topbar-back')).toBeVisible();              // child of the Practice tab
    await expect(page.locator('.dock-tab[data-tab="practice"]')).toHaveAttribute('aria-selected', 'true');
    const shelf = page.locator('#dock-shelf');
    await expect(shelf).toBeVisible();
    await expect(shelf.locator('#btn-start')).toHaveCount(1);
    await expect(shelf.locator('#selection-count')).toHaveCount(1);
    await expect(page.locator('#screen-select .select-footer')).toBeHidden();
    expect(await countGlass(page), 'the shelf adds no glass surface').toBeLessThanOrEqual(2);
    // gesture bar fixture: the CTA must be fully visible above the 34px inset.
    // The page is shared by the whole worker, so the fixture is removed again.
    const tag = await page.addStyleTag({ content: FIXTURE });
    try {
      await page.waitForTimeout(200);
      const box = await page.locator('#btn-start').boundingBox();
      const vh = await page.evaluate(() => window.innerHeight);
      expect(box).not.toBeNull();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.y + box.height).toBeLessThanOrEqual(vh - 34);
    } finally {
      await tag.evaluate((el) => el.remove());
    }
    // selection enables Start; the meta line updates in the shelf. The setup screen
    // deliberately keeps the last selection (and the worker page is shared), so clear
    // through the app's own Clear button before asserting the empty state.
    await page.click('#btn-clear-custom');
    await expect(page.locator('#btn-start')).toBeDisabled();
    await page.click('#btn-select-all');
    await expect(page.locator('#btn-start')).toBeEnabled();
    await expect(shelf.locator('#selection-count')).not.toBeEmpty();
    // sliding pills are stacked full-width selectors
    const seg = await page.locator('#seg-practice').evaluate((el) => ({ display: getComputedStyle(el).display, width: el.getBoundingClientRect().width, parent: el.parentElement.getBoundingClientRect().width }));
    expect(seg.display).toBe('grid');
    expect(seg.width).toBeGreaterThan(seg.parent * 0.9);
    // back → Practice root, the CTA returns to its footer
    await page.click('#screen-select .topbar-back');
    await expect(page.locator('#screen-practice.active')).toBeVisible();
    await expect(shelf).toBeHidden();
    await expect(page.locator('#screen-select .select-footer #btn-start')).toHaveCount(1);
    await expect(page.locator('#screen-select .select-footer #selection-count')).toHaveCount(1);
  });

  test('leaderboard entry opens the board under the Practice tab; back returns', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    await gotoTab(page, 'practice', 'screen-practice');
    await page.click('#practice-leaderboard');
    await expect(page.locator('#screen-leaderboard.active')).toBeVisible();
    await expect(page.locator('.dock-tab[data-tab="practice"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#screen-leaderboard .topbar-back')).toBeVisible();
    await page.waitForFunction(() => { const l = document.getElementById('lb-list'); return l && (l.querySelector('.lb-row') || l.querySelector('.empty-state')); }, null, { timeout: 20_000 });
    await page.click('#screen-leaderboard .topbar-back');
    await expect(page.locator('#screen-practice.active')).toBeVisible();
    await gotoTab(page, 'home', 'screen-dashboard');
  });

  test('Arabic: weekday labels, captions and the cap line are Arabic; no Latin letters leak', async ({ appPageV2: page }, testInfo) => {
    test.skip(testInfo.project.metadata?.lang !== 'ar', 'AR projects only');
    await show(page, 'screen-dashboard');
    await gotoTab(page, 'practice', 'screen-practice');
    const labels = await page.locator('#practice-forecast .forecast-label').allTextContents();
    expect(labels).toHaveLength(7);
    for (const l of labels) expect(l).toMatch(/^[؀-ۿ]+$/);
    expect(await page.locator('#practice-due-caption').textContent()).toMatch(/[؀-ۿ]/);
    expect(await page.locator('#practice-cap').textContent()).not.toMatch(/[A-Za-z]/);
    expect(await page.locator('#practice-tiles .mode-tile[data-mode="survival"] .mode-tile-name').textContent()).toMatch(/[؀-ۿ]/);
    // the leaderboard row's chevron points along the inline axis (mirrored)
    const mirrored = await page.locator('#practice-leaderboard .row-link-chevron').evaluate((el) => getComputedStyle(el).transform);
    expect(mirrored).not.toBe('none');
    await gotoTab(page, 'home', 'screen-dashboard');
  });
});
