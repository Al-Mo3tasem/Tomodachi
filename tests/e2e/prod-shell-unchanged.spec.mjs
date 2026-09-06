// tests/e2e/prod-shell-unchanged.spec.mjs — v1 baselines.
// Records how every screen looks TODAY (EN/AR × light/dark × 2 phones) and
// fails when a later batch changes it. Prod-visible changes that a batch
// deliberately ships must update the baseline in the same commit
// (`npm run test:e2e:update`) and be listed in the batch notes.
import { test, expect, boot, show, shot } from './fixtures.mjs';

test.describe('v1 shell baselines', () => {
  test('landing (signed out)', async ({ page }) => {
    await boot(page);
    await shot(page, 'landing.png', { fullPage: false });
  });

  test('auth', async ({ page }) => {
    await boot(page);
    await show(page, 'screen-auth');
    await shot(page, 'auth.png');
  });

  for (const id of ['screen-dashboard', 'screen-select', 'screen-settings', 'screen-leaderboard', 'screen-lessons-list']) {
    test(`${id} (signed in)`, async ({ appPage: page }) => {
      if (!(await page.locator(`#${id}`).count())) test.skip(true, `${id} not in markup`);
      await show(page, id);
      await shot(page, `${id}.png`);
    });
  }

  test('lesson intro (signed in)', async ({ appPage: page }) => {
    await show(page, 'screen-dashboard');
    await page.click('#lesson-cta-btn');
    // orientation meta may precede lesson 1 for a fresh account; the QA account has seen it
    await page.waitForSelector('#screen-lesson.active, #screen-meta.active', { timeout: 30_000 });
    await page.waitForTimeout(600);
    await shot(page, 'lesson-intro.png');
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
