// tests/e2e/prod-shell-unchanged.spec.mjs — v1 baselines.
// Records how every screen looks TODAY (EN/AR × light/dark × 2 phones) and
// fails when a later batch changes it. Prod-visible changes that a batch
// deliberately ships must update the baseline in the same commit
// (`npm run test:e2e:update`) and be listed in the batch notes.
import { test, expect, boot, show, volatile } from './fixtures.mjs';

test.describe('v1 shell baselines', () => {
  test('landing (signed out)', async ({ page }) => {
    await boot(page);
    await expect(page).toHaveScreenshot('landing.png', { mask: volatile(page), fullPage: false });
  });

  test('auth', async ({ page }) => {
    await boot(page);
    await show(page, 'screen-auth');
    await expect(page).toHaveScreenshot('auth.png', { mask: volatile(page) });
  });

  for (const id of ['screen-dashboard', 'screen-select', 'screen-settings', 'screen-leaderboard', 'screen-lessons-list']) {
    test(`${id} (signed in)`, async ({ appPage: page }) => {
      if (!(await page.locator(`#${id}`).count())) test.skip(true, `${id} not in markup`);
      await show(page, id);
      await expect(page).toHaveScreenshot(`${id}.png`, { mask: volatile(page) });
    });
  }

  test('lesson intro (signed in)', async ({ appPage: page }) => {
    await show(page, 'screen-dashboard');
    await page.click('#lesson-cta-btn');
    // orientation meta may precede lesson 1 for a fresh account; the QA account has seen it
    await page.waitForSelector('#screen-lesson.active, #screen-meta.active', { timeout: 30_000 });
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot('lesson-intro.png', { mask: volatile(page) });
    if (await page.locator('#screen-lesson.active').count()) await page.click('#lesson-btn-exit');
    else await show(page, 'screen-dashboard');
  });

  test('review card (signed in)', async ({ appPage: page }) => {
    await show(page, 'screen-dashboard');
    const cta = page.locator('#review-cta');
    if (await cta.isHidden()) test.skip(true, 'no reviews due for the QA account right now');
    await expect(cta).toHaveScreenshot('review-cta.png');
  });
});
