// tests/e2e/game.spec.mjs — batch 8: Zen/Survival under the v2 shell — one
// glass HUD chip over an opaque stage, inline flash, results sheet with
// tiered celebration, pause sheet, keyboard-safe typed mode.
// A finished solo game writes stats/{uid} AND users/{uid}.activity (the heatmap
// counter, js/data/users.js writeActivity), so each test snapshots both and
// restores them in `finally` through the app's own Firestore module.
import { test, expect, show } from './fixtures.mjs';

test.use({ shell: 'v2' });

async function ver(page) {
  return page.evaluate(() => (document.querySelector('script[src*="js/app.js"]')?.getAttribute('src') || '').split('v=')[1]);
}
async function snapshotStats(page) {
  const v = await ver(page);
  return page.evaluate(async (v) => {
    const c = await import(`/js/core/core.js?v=${v}`);
    const f = await import(`/js/data/firebase.js?v=${v}`);
    const snap = await f.getDoc(f.doc(f.db, 'stats', c.state.user.uid));
    return snap.exists() ? JSON.parse(JSON.stringify(snap.data())) : null;
  }, v);
}
async function restoreStats(page, snap) {
  // the engine writes stats (totalGames etc.) shortly after the results sheet
  // opens; let that write land first, otherwise it overtakes the restore
  await page.waitForTimeout(3000);
  const v = await ver(page);
  await page.evaluate(async ([v, snap]) => {
    const c = await import(`/js/core/core.js?v=${v}`);
    const f = await import(`/js/data/firebase.js?v=${v}`);
    const ref = f.doc(f.db, 'stats', c.state.user.uid);
    if (snap) await f.setDoc(ref, snap); else await f.deleteDoc(ref);
  }, [v, snap]);
}
const PROGRESS_FIELDS = ['completedLessons', 'srs', 'activity', 'activityKinds', 'seenMeta'];
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

async function countGlass(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const bf = cs.backdropFilter || cs.webkitBackdropFilter;
      if (!bf || bf === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height && cs.visibility !== 'hidden' && cs.display !== 'none') out.push(el.className);
    }
    return out;
  });
}
// The real route (batch 9): Practice tab → Zen tile → setup (Start lives in the dock shelf).
async function startZen(page, input = 'multiple') {
  await show(page, 'screen-dashboard');
  // switch away first: after a direct show() the router still believes it is on
  // the tab it last routed to, so tapping that tab would only scroll
  await page.click('.dock-tab[data-tab="me"]');
  await page.waitForTimeout(250);
  await page.click('.dock-tab[data-tab="practice"]');
  await page.waitForTimeout(400);
  if (!(await page.locator('#screen-practice.active').count())) await page.click('.dock-tab[data-tab="practice"]');   // pop to the root
  await expect(page.locator('#screen-practice.active')).toBeVisible();
  await page.click('#practice-tiles .mode-tile[data-mode="zen"]');
  await expect(page.locator('#screen-select.active')).toBeVisible();
  await page.click('#seg-practice .seg-btn[data-practice="read"]');
  await page.click(`#seg-input .seg-btn[data-input="${input}"]`);
  await page.click('#btn-select-all');
  await expect(page.locator('#dock-shelf #btn-start')).toBeEnabled();
  await page.click('#dock-shelf #btn-start');
  await expect(page.locator('#screen-game.active')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(500);
}

test.describe('play (v2)', () => {
  test('Zen: one glass chip, opaque stage, inline flash, results sheet with tabular numbers', async ({ appPageV2: page }) => {
    const snap = await snapshotStats(page);
    const user = await snapshotUser(page);
    try {
      await startZen(page, 'multiple');
      const glass = await countGlass(page);
      expect(glass, 'exactly one glass surface: the HUD chip').toHaveLength(1);
      expect(glass[0]).toMatch(/\bhud\b/);
      await expect(page.locator('#screen-game .hud .hud-primary')).not.toBeEmpty();
      await expect(page.locator('#screen-game .hud #game-exit')).toBeVisible();          // exit adopted into the chip
      await expect(page.locator('#screen-game .game-hud')).toBeHidden();                 // legacy row gone
      expect(await page.locator('#dock').isVisible()).toBe(false);
      const stageGlass = await page.locator('#game-card').evaluate((el) => getComputedStyle(el).backdropFilter);
      expect(stageGlass === 'none' || stageGlass === '').toBe(true);
      // answer a couple of tiles: inline flash (card tint), no verdict sheet
      const tile = page.locator('#choice-grid .quiz-tile:not([disabled])').first();
      await tile.click();
      await expect(page.locator('#game-card')).toHaveClass(/correct|wrong/);
      expect(await page.locator('#sheet-root .sheet--feedback').count()).toBe(0);
      await page.waitForTimeout(1400);
      // exit ends the Zen run → results sheet
      await page.click('#game-exit');
      const results = page.locator('#sheet-root .sheet--results');
      await expect(results).toBeVisible({ timeout: 5000 });
      await expect(results.locator('.rstat')).toHaveCount(4);
      await expect(results.locator('.sheet-actions .btn')).toHaveCount(2);
      const num = await results.locator('.num-hero').evaluate((el) => getComputedStyle(el).fontVariantNumeric);
      expect(num).toContain('tabular-nums');
      expect(await page.locator('#results-overlay.active').count(), 'legacy overlay stays closed under v2').toBe(0);
      // Home action → dashboard, no stray sheet
      await results.locator('.sheet-actions .btn').last().click();
      await expect(page.locator('#screen-dashboard.active')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('#sheet-root .sheet')).toHaveCount(0);
    } finally {
      await restoreStats(page, snap);
      await restoreUser(page, user);
    }
  });

  test('pause is a sheet that resumes; keyboard state hides the dock and keeps the typed input reachable', async ({ appPageV2: page }) => {
    const snap = await snapshotStats(page);
    const user = await snapshotUser(page);
    try {
      await startZen(page, 'typing');
      await expect(page.locator('#answer-input')).toBeVisible();
      const v = await ver(page);
      // pause (what the visibility handler does when the app goes to the background)
      await page.evaluate(async (v) => { const e = await import(`/js/games/engine.js?v=${v}`); e.pauseGame(); e.showPause(); }, v);
      const pause = page.locator('#sheet-root .sheet--pause');
      await expect(pause).toBeVisible();
      expect(await page.locator('#pause-overlay.active').count()).toBe(0);
      await pause.locator('.btn-primary').click();
      await expect(pause).toBeHidden({ timeout: 3000 });
      expect(await page.evaluate(async (v) => { const e = await import(`/js/games/engine.js?v=${v}`); return e.isActive(); }, v)).toBe(true);
      // keyboard: shell.js sets body[data-kb] + --kb-h from the native bridge; simulate that state
      await page.evaluate(() => { document.body.setAttribute('data-kb', '1'); document.documentElement.style.setProperty('--kb-h', '300px'); });
      const inputBox = await page.locator('#answer-input').evaluate((el) => el.getBoundingClientRect().bottom);
      const vh = await page.evaluate(() => window.innerHeight);
      expect(inputBox).toBeLessThanOrEqual(vh);
      await page.evaluate(() => { document.body.removeAttribute('data-kb'); document.documentElement.style.removeProperty('--kb-h'); });
      // leave through the chip exit (Zen ends → results) and go home
      await page.click('#game-exit');
      const results = page.locator('#sheet-root .sheet--results');
      await expect(results).toBeVisible({ timeout: 5000 });
      await results.locator('.sheet-actions .btn').last().click();
      await expect(page.locator('#screen-dashboard.active')).toBeVisible({ timeout: 10_000 });
    } finally {
      await restoreStats(page, snap);
      await restoreUser(page, user);
    }
  });
});
