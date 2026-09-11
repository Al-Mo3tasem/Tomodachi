// tests/e2e/lesson-quiz.spec.mjs — batch 7: lesson player and review session
// under the v2 shell: paper card (kana font, JP islands), 300 ms progress,
// verdict sheets, tiered results sheet with next/home; review forecast; the
// orientation pages from Me › Help.
//
// Completing a lesson or a review WRITES progress for the QA account, so each
// writing test snapshots users/{uid} first and restores it in `finally`
// through the app's own Firestore module (blocking the network does not work:
// the write channel is already open when a test starts).
import { test, expect, show, signIn } from './fixtures.mjs';

test.use({ shell: 'v2' });

const PROGRESS_FIELDS = ['completedLessons', 'srs', 'activity', 'activityKinds'];

async function ver(page) {
  return page.evaluate(() => (document.querySelector('script[src*="js/app.js"]')?.getAttribute('src') || '').split('v=')[1]);
}
async function snapshotUser(page) {
  const v = await ver(page);
  return page.evaluate(async ([v, fields]) => {
    const c = await import(`/js/core/core.js?v=${v}`);
    const f = await import(`/js/data/firebase.js?v=${v}`);
    const snap = await f.getDoc(f.doc(f.db, 'users', c.state.user.uid));
    const d = snap.data() || {};
    const out = {};
    for (const k of fields) out[k] = k in d ? d[k] : undefined;
    return JSON.parse(JSON.stringify(out));
  }, [v, PROGRESS_FIELDS]);
}
async function restoreUser(page, snap) {
  const v = await ver(page);
  await page.evaluate(async ([v, snap, fields]) => {
    const c = await import(`/js/core/core.js?v=${v}`);
    const f = await import(`/js/data/firebase.js?v=${v}`);
    const patch = {};
    for (const k of fields) patch[k] = snap[k] === undefined ? f.deleteField() : snap[k];
    await f.updateDoc(f.doc(f.db, 'users', c.state.user.uid), patch);
  }, [v, snap, PROGRESS_FIELDS]);
}

async function answerUntil(page, doneSel, max = 40) {
  for (let i = 0; i < max; i++) {
    if (await page.locator(doneSel).count()) return true;
    const tile = page.locator('.quiz-grid .quiz-tile:not([disabled])').first();
    if (!(await tile.count())) { await page.waitForTimeout(200); continue; }
    await tile.click();
    const sheet = page.locator('#sheet-root .sheet--feedback');
    await expect(sheet).toBeVisible({ timeout: 3000 });
    await sheet.locator('.btn-primary').click();
    await expect(sheet).toBeHidden({ timeout: 3000 });
    await page.waitForTimeout(150);
  }
  return false;
}

test.describe('lesson player', () => {
  test('kana card, JP islands, 300 ms progress, verdict sheets, results sheet', async ({ page }, testInfo) => {
    await signIn(page);
    const snap = await snapshotUser(page);
    try {
      await page.click('#lesson-cta-btn');
      await page.waitForSelector('#screen-lesson.active, #screen-meta.active', { timeout: 30_000 });
      if (await page.locator('#screen-meta.active').count()) { await page.click('#meta-continue'); await page.waitForSelector('#screen-lesson.active'); }
      // immersive bar: progress fill animates over --dur-progress (300 ms)
      const dur = await page.locator('#lesson-progress-fill').evaluate((el) => getComputedStyle(el).transitionDuration);
      expect(dur).toBe('0.3s');
      await page.click('#lesson-btn-begin');
      await expect(page.locator('#lesson-teach')).toBeVisible();
      const big = page.locator('#lesson-card-big');
      const info = await big.evaluate((el) => ({ kana: el.classList.contains('is-kana'), family: getComputedStyle(el).fontFamily, bdi: el.querySelectorAll('bdi[lang="ja"]').length }));
      if (info.kana) expect(info.family).toMatch(/Zen Maru Gothic/);
      expect(info.bdi).toBe(1);
      // through the teach cards to the quiz
      for (let i = 0; i < 40 && !(await page.locator('#lesson-quiz:not([hidden])').count()); i++) { await page.click('#lesson-btn-next'); await page.waitForTimeout(100); }
      await expect(page.locator('#lesson-quiz')).toBeVisible();
      expect(await answerUntil(page, '#lesson-done:not([hidden])')).toBe(true);
      // results sheet: tier, hero number, two actions
      const results = page.locator('#sheet-root .sheet--results');
      await expect(results).toBeVisible();
      await expect(results.locator('.num-hero')).toHaveCount(1);
      await expect(results.locator('.sheet-actions .btn')).toHaveCount(2);
      const tier = await results.evaluate((el) => el.classList.contains('is-perfect') ? 'perfect' : el.classList.contains('is-normal') ? 'normal' : 'none');
      expect(['perfect', 'normal']).toContain(tier);
      if (testInfo.project.metadata?.lang === 'ar') expect(await results.locator('.results-title').evaluate((el) => getComputedStyle(el).letterSpacing)).toBe('normal');
      await results.locator('.sheet-actions .btn').nth(1).click();   // Home
      await expect(page.locator('#screen-dashboard.active')).toBeVisible({ timeout: 10_000 });
    } finally {
      await restoreUser(page, snap);
    }
  });

  test('review session ends in a results sheet with the forecast', async ({ page }) => {
    await signIn(page);
    const cta = page.locator('#review-cta');
    // the CTA renders after the SRS backfill; give it a moment before deciding there is nothing due
    const due = await cta.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
    test.skip(!due, 'no reviews due for the QA account right now');
    const snap = await snapshotUser(page);
    try {
      await page.click('#review-cta-btn');
      await expect(page.locator('#screen-review.active')).toBeVisible({ timeout: 20_000 });
      const count = await page.locator('#review-count').textContent();
      expect(count.trim().length).toBeGreaterThan(0);
      expect(await answerUntil(page, '#review-done:not([hidden])', 60)).toBe(true);
      const results = page.locator('#sheet-root .sheet--results');
      await expect(results).toBeVisible();
      await expect(results.locator('.results-line').first()).not.toBeEmpty();
      await results.locator('.sheet-actions .btn').first().click();
      await expect(page.locator('#screen-dashboard.active')).toBeVisible({ timeout: 10_000 });
    } finally {
      await restoreUser(page, snap);
    }
  });

  test('Me › Help re-opens the orientation with seven pages and returns', async ({ appPageV2: page }) => {
    // reach Me through the router (a direct showScreen would leave the back stack unaware of it)
    await show(page, 'screen-dashboard');
    await page.click('.dock-tab[data-tab="me"]');
    await expect(page.locator('#screen-settings.active')).toBeVisible();
    await expect(page.locator('#btn-help-orientation')).toBeVisible();
    await page.click('#btn-help-orientation');
    await expect(page.locator('#screen-meta.active')).toBeVisible();
    await expect(page.locator('#meta-body p')).toHaveCount(7);
    await expect(page.locator('#meta-body p').nth(6)).not.toBeEmpty();
    await page.click('#meta-continue');
    await expect(page.locator('#screen-settings.active')).toBeVisible();
    await page.click('.dock-tab[data-tab="home"]');
    await expect(page.locator('#screen-dashboard.active')).toBeVisible();
  });
});
