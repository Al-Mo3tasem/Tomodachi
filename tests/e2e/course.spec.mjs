// tests/e2e/course.spec.mjs — batch 9: the Course tab under the v2 shell —
// Continue hero, five track rings, the activity heatmap and the lesson
// browser (done ✓ / current ▶ / locked 🔒 rows, track filter pill).
// Opening a lesson can route through an orientation page, and dismissing one
// writes users/{uid}.seenMeta — so the test that does it snapshots the QA
// account's progress fields first and restores them in `finally`.
import { test, expect, show } from './fixtures.mjs';

test.use({ shell: 'v2' });

const PROGRESS_FIELDS = ['completedLessons', 'srs', 'activity', 'activityKinds', 'seenMeta'];

async function ver(page) {
  return page.evaluate(() => (document.querySelector('script[src*="js/app.js"]')?.getAttribute('src') || '').split('v=')[1]);
}
/** Progress fields of the shared QA account, so a test that writes can put them back. */
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

// Exhaustive, like every sibling spec: the legacy sheet still declares
// backdrop-filter outside .glass (css/style.css keeps it on .nav), so counting
// .glass alone would be a weaker check than the budget it is guarding.
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
 * Tap a dock tab and land on its ROOT. Two things make the naive single tap
 * unreliable on the shared worker page: a direct show() leaves the router
 * believing it is still on the tab it last routed to (so tapping that tab only
 * scrolls), and a tab may still hold a child screen. Switching away first
 * guarantees a real tab change, and a second tap pops any child.
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

test.describe('course tab (v2)', () => {
  test('Continue hero, five rings, heatmap and lesson rows; exactly one current row; locked rows are inert', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    await gotoTab(page, 'course', 'screen-course');
    await expect(page.locator('.dock-tab[data-tab="course"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#screen-course .topbar-back')).toBeHidden();          // a root
    await expect(page.locator('#course-hero')).toBeVisible();
    await expect(page.locator('#course-hero-eyebrow')).not.toBeEmpty();
    await expect(page.locator('#course-hero-title')).not.toBeEmpty();
    await expect(page.locator('#course-continue')).toBeVisible();
    await expect(page.locator('#course-rings .track-ring')).toHaveCount(5);
    expect(await page.locator('#course-heatmap .heat-cell').count()).toBeGreaterThanOrEqual(84);
    const rows = page.locator('#course-rows .lesson-row');
    expect(await rows.count()).toBeGreaterThan(5);
    await expect(page.locator('#course-rows .lesson-row.is-current')).toHaveCount(1);
    await expect(page.locator('#course-rows .lesson-row.is-current use')).toHaveAttribute('href', '#ic-play');
    await expect(page.locator('#course-rows .lesson-row.is-done use').first()).toHaveAttribute('href', '#ic-check');
    const locked = page.locator('#course-rows .lesson-row.is-locked');
    expect(await locked.count()).toBeGreaterThan(0);
    expect(await locked.evaluateAll((els) => els.every((el) => el.getAttribute('aria-disabled') === 'true'))).toBe(true);
    await expect(locked.first().locator('use')).toHaveAttribute('href', '#ic-lock');
    // aria-disabled takes the row out of the a11y tree's enabled set, so assistive
    // tech and Playwright both refuse to activate it; a forced tap must be inert too
    await expect(locked.first()).toBeDisabled();
    await locked.first().click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.locator('#screen-course.active')).toBeVisible();
    expect(await page.locator('#screen-lesson.active').count()).toBe(0);
    // numbers are ink: the row numbers use the digit face, tabular
    const num = await rows.first().locator('.lesson-row-num').evaluate((el) => getComputedStyle(el).fontVariantNumeric);
    expect(num).toContain('tabular-nums');
    expect(await countGlass(page), 'glass budget on Course').toBeLessThanOrEqual(2);
  });

  test('track filter: a ring narrows the rows to its script; clear restores; Home rings land here filtered', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    await gotoTab(page, 'course', 'screen-course');
    const all = await page.locator('#course-rows .lesson-row').count();
    await page.click('#course-rings .track-ring[data-track="hiragana"]');
    await expect(page.locator('#course-filter')).toBeVisible();
    const filtered = page.locator('#course-rows .lesson-row');
    expect(await filtered.count()).toBeGreaterThan(0);
    expect(await filtered.count()).toBeLessThan(all);
    expect(await filtered.evaluateAll((els) => els.every((el) => el.querySelector('.lesson-row-type').textContent === 'あ'))).toBe(true);
    await page.click('#course-filter-clear');
    await expect(page.locator('#course-filter')).toBeHidden();
    expect(await page.locator('#course-rows .lesson-row').count()).toBe(all);
    // the "course" ring shows everything
    await page.click('#course-rings .track-ring[data-track="katakana"]');
    await expect(page.locator('#course-filter')).toBeVisible();
    expect(await page.locator('#course-rows .lesson-row').count(), 'katakana track has lessons').toBeGreaterThan(0);
    await page.click('#course-rings .track-ring[data-track="course"]');
    await expect(page.locator('#course-filter')).toBeHidden();
    // Home › Course view › ring → this tab, filtered
    await gotoTab(page, 'home', 'screen-dashboard');
    await page.click('#home-switch .seg-btn[data-view="course"]');
    await page.click('#track-rings .track-ring[data-track="katakana"]');
    await expect(page.locator('#screen-course.active')).toBeVisible();
    await expect(page.locator('#course-filter')).toBeVisible();
    expect(await page.locator('#course-rows .lesson-row').count(), 'the filtered path is not empty').toBeGreaterThan(0);
    expect(await page.locator('#course-rows .lesson-row').evaluateAll((els) => els.every((el) => el.querySelector('.lesson-row-type').textContent === 'ア'))).toBe(true);
    await page.click('#course-filter-clear');
    await gotoTab(page, 'home', 'screen-dashboard');
    await page.click('#home-switch .seg-btn[data-view="today"]');
  });

  test('Continue opens the next lesson (or its orientation page); exit returns here; Home "All lessons" opens this tab', async ({ appPageV2: page }) => {
    const snap = await snapshotUser(page);   // dismissing an orientation page writes seenMeta
    try {
      await show(page, 'screen-dashboard');
      await gotoTab(page, 'course', 'screen-course');
      await page.click('#course-continue');
      await page.waitForSelector('#screen-lesson.active, #screen-meta.active', { timeout: 30_000 });
      expect(await page.locator('#dock').isVisible()).toBe(false);
      for (let i = 0; i < 3 && await page.locator('#screen-meta.active').count(); i++) {
        await page.click('#meta-continue');
        await page.waitForSelector('#screen-lesson.active, #screen-meta.active', { timeout: 30_000 });
      }
      await expect(page.locator('#screen-lesson.active')).toBeVisible();
      await page.click('#lesson-btn-exit');
      await expect(page.locator('#screen-course.active')).toBeVisible();
      await expect(page.locator('#dock')).toBeVisible();
      // Home hero link
      await gotoTab(page, 'home', 'screen-dashboard');
      await page.click('#lesson-cta-browse');
      await expect(page.locator('#screen-course.active')).toBeVisible();
      await expect(page.locator('#course-filter')).toBeHidden();
      await expect(page.locator('.dock-tab[data-tab="course"]')).toHaveAttribute('aria-selected', 'true');
      await gotoTab(page, 'home', 'screen-dashboard');
    } finally {
      await restoreUser(page, snap);
    }
  });
});
