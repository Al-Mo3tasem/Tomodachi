// tests/e2e/dock.spec.mjs — batch 3: dock, top bar, router (v2 shell).
import { test, expect, boot, show, signIn } from './fixtures.mjs';

test.use({ shell: 'v2' });

async function nav(page, fn) {
  const v = await page.evaluate(() => (document.querySelector('script[src*="js/app.js"]')?.getAttribute('src') || '').split('v=')[1]);
  return page.evaluate(async ([v, src]) => {
    const nav = await import(`/js/core/nav.js?v=${v}`);
    return (new Function('nav', `return (${src})(nav)`))(nav);
  }, [v, fn.toString()]);
}

test.describe('dock + top bar', () => {
  test('dock is visible on Home, hidden on immersive screens, and tabs switch screens', async ({ page }) => {
    await signIn(page);
    const dock = page.locator('#dock');
    await expect(dock).toBeVisible();
    await expect(page.locator('.dock-tab')).toHaveCount(5);
    await expect(page.locator('.dock-tab[data-tab="home"]')).toHaveAttribute('aria-selected', 'true');
    // legacy chrome hidden under v2, topbar present with the account cluster
    await expect(page.locator('nav.nav')).toBeHidden();
    await expect(page.locator('#screen-dashboard .topbar')).toBeVisible();
    await expect(page.locator('#screen-dashboard .topbar-actions #btn-settings')).toBeVisible();
    // Me tab → settings (root, no back button)
    await page.click('.dock-tab[data-tab="me"]');
    await expect(page.locator('#screen-settings.active')).toBeVisible();
    await expect(page.locator('.dock-tab[data-tab="me"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#screen-settings .topbar-back')).toBeHidden();
    // Home tab → dashboard; lesson → immersive → dock hidden; exit → dock back
    await page.click('.dock-tab[data-tab="home"]');
    await expect(page.locator('#screen-dashboard.active')).toBeVisible();
    await page.click('#lesson-cta-btn');
    await page.waitForSelector('#screen-lesson.active, #screen-meta.active', { timeout: 30_000 });
    await expect(dock).toBeHidden();
    expect(await page.evaluate(() => document.body.hasAttribute('data-immersive'))).toBe(true);
    if (await page.locator('#screen-lesson.active').count()) await page.click('#lesson-btn-exit');
    else await page.click('#meta-continue').then(() => page.waitForSelector('#screen-lesson.active')).then(() => page.click('#lesson-btn-exit'));
    await expect(page.locator('#screen-dashboard.active')).toBeVisible();
    await expect(dock).toBeVisible();
  });

  test('settings pushed from Practice returns to Practice; browser back works', async ({ page }) => {
    await signIn(page);
    await page.click('.dock-tab[data-tab="practice"]');
    await expect(page.locator('#screen-select.active')).toBeVisible();
    await page.click('.dock-tab[data-tab="home"]');
    await page.click('#btn-settings');
    await expect(page.locator('#screen-settings.active')).toBeVisible();
    expect(await nav(page, (n) => n.currentTab())).toBe('home');
    await expect(page.locator('#screen-settings .topbar-back')).toBeVisible();
    await page.goBack();                                   // browser/hardware back → router pop
    await expect(page.locator('#screen-dashboard.active')).toBeVisible();
    expect(await nav(page, (n) => n.stackOf())).toEqual(['screen-dashboard']);
  });

  test('top bar collapses to glass on scroll and the glass budget holds', async ({ page }) => {
    await signIn(page);
    await page.evaluate(() => { document.body.style.minHeight = '3000px'; window.scrollTo(0, 400); });
    await page.waitForTimeout(400);
    await expect(page.locator('#screen-dashboard .topbar')).toHaveClass(/is-collapsed/);
    const glass = await page.evaluate(() => [...document.querySelectorAll('*')].filter(el => { const b = getComputedStyle(el).backdropFilter; return b && b !== 'none' && el.getBoundingClientRect().height > 0; }).length);
    expect(glass).toBeLessThanOrEqual(2);                  // dock + collapsed top bar
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await expect(page.locator('#screen-dashboard .topbar')).not.toHaveClass(/is-collapsed/);
  });

  test('Arabic: dock order is mirrored by direction only, labels ≥ 13px / 600', async ({ page }, testInfo) => {
    test.skip(testInfo.project.metadata?.lang !== 'ar', 'AR projects only');
    await signIn(page);
    const xs = await page.$$eval('.dock-tab', els => els.map(e => e.getBoundingClientRect().left));
    expect(xs[0]).toBeGreaterThan(xs[4]);                  // Home is at the inline-start = right edge in RTL
    const label = await page.$eval('.dock-tab[data-tab="home"] .dock-label', el => ({ size: parseFloat(getComputedStyle(el).fontSize), weight: getComputedStyle(el).fontWeight, text: el.textContent }));
    expect(label.size).toBeGreaterThanOrEqual(13);
    expect(Number(label.weight)).toBeGreaterThanOrEqual(600);
    expect(label.text).toBe('الرئيسية');
  });
});
