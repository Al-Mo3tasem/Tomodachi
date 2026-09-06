// tests/e2e/home.spec.mjs — batch 6: Home = greeting title, 1 hero + 4 ink
// tiles, friends strip, Today | Course switch, track rings + heatmap, filtered
// lesson browser; stats/leaderboard/history moved under Me. v2 shell only.
import { test, expect, show } from './fixtures.mjs';

test.use({ shell: 'v2' });

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

test.describe('home', () => {
  test('one hero, four ink tiles, a greeting title and no streak/XP', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    await expect(page.locator('#screen-dashboard .home-hero')).toHaveCount(1);
    const tiles = page.locator('#screen-dashboard .tile');
    await expect(tiles).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const tile = tiles.nth(i);
      await expect(tile.locator('svg.ic')).toHaveCount(1);
      await expect(tile.locator('.num-hero')).toHaveCount(1);
      await expect(tile.locator('.num-caption')).toHaveCount(1);
      await expect(tile.locator('.num-caption')).not.toBeEmpty();
    }
    const num = await tiles.first().locator('.num-hero').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { family: cs.fontFamily, size: parseFloat(cs.fontSize), color: cs.color, body: getComputedStyle(document.body).color, attention: el.closest('.tile').classList.contains('is-attention') };
    });
    expect(num.family).toMatch(/Space Grotesk/);
    expect(num.size).toBeGreaterThanOrEqual(28);
    expect(num.size).toBeLessThanOrEqual(40);
    if (!num.attention) expect(num.color).toBe(num.body);
    const title = await page.locator('#screen-dashboard .topbar-title').textContent();
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title).not.toMatch(/xp|streak/i);
    // the legacy friend bar is gone from Home; the strip and its "all friends" card are there
    await expect(page.locator('#screen-dashboard .friend-bar')).toBeHidden();
    await expect(page.locator('#friends-strip .friend-card.is-ghost')).toHaveCount(1);
    expect(await countGlass(page), 'glass budget on Home').toBeLessThanOrEqual(2);
  });

  test('Today | Course switch: rings render, the hiragana ring filters the lesson browser', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    await page.click('#home-switch .seg-btn[data-view="course"]');
    await expect(page.locator('#home-course')).toBeVisible();
    await expect(page.locator('#home-today')).toBeHidden();
    await expect(page.locator('#track-rings .track-ring')).toHaveCount(5);
    expect(await page.locator('#home-heatmap .heat-cell').count()).toBeGreaterThanOrEqual(84);
    const ringOff = await page.locator('.track-ring[data-track="course"]').evaluate((el) => el.style.getPropertyValue('--ring-off'));
    expect(ringOff).not.toBe('');
    await page.click('.track-ring[data-track="hiragana"]');
    await expect(page.locator('#screen-lessons-list.active')).toBeVisible();
    await expect(page.locator('#lessons-filter')).toBeVisible();
    const filtered = await page.locator('#lessons-list .lessons-row').count();
    await page.click('#lessons-filter-clear');
    await expect(page.locator('#lessons-filter')).toBeHidden();
    const all = await page.locator('#lessons-list .lessons-row').count();
    expect(all).toBeGreaterThan(filtered);
    await show(page, 'screen-dashboard');
    await page.click('#home-switch .seg-btn[data-view="today"]');
    await expect(page.locator('#home-today')).toBeVisible();
  });

  test('tiles switch tabs; Me holds the stats, leaderboard preview and history', async ({ appPageV2: page }) => {
    // go Home through the router (show() bypasses it and would leave the tab state stale)
    await show(page, 'screen-dashboard');
    await page.click('.dock-tab[data-tab="home"]');
    await expect(page.locator('#screen-dashboard.active')).toBeVisible();
    await page.click('.tile[data-tile="course"]');
    await expect(page.locator('#screen-lessons-list.active')).toBeVisible();
    await page.click('.dock-tab[data-tab="home"]');
    await expect(page.locator('#screen-dashboard.active')).toBeVisible();
    await page.click('.tile[data-tile="practice"]');
    await expect(page.locator('#screen-select.active')).toBeVisible();
    await show(page, 'screen-settings');
    for (const id of ['stat-total', 'lb-preview', 'history-list']) {
      await expect(page.locator(`#screen-settings #${id}`)).toHaveCount(1);
      await expect(page.locator(`#screen-dashboard #${id}`)).toHaveCount(0);
    }
    await show(page, 'screen-dashboard');
  });
});
