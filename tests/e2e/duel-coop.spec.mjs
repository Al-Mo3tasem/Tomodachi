// tests/e2e/duel-coop.spec.mjs — batch 8b: the duel/co-op HUD chip (avatars at
// the logical ends, tabular score primary), the versus results sheet and the
// locked stall sheet. A live two-player match needs a second account, so these
// exercise the surfaces through the modules on a signed-in v2 page.
import { test, expect, show } from './fixtures.mjs';

test.use({ shell: 'v2' });

async function withModules(page, fn, arg = null) {
  const v = await page.evaluate(() => (document.querySelector('script[src*="js/app.js"]')?.getAttribute('src') || '').split('v=')[1]);
  return page.evaluate(async ([v, src, arg]) => {
    const m = {
      hud: await import(`/js/ui/hud.js?v=${v}`),
      results: await import(`/js/ui/results.js?v=${v}`),
      sheet: await import(`/js/ui/sheet.js?v=${v}`),
      nav: await import(`/js/core/nav.js?v=${v}`),
      core: await import(`/js/core/core.js?v=${v}`),
    };
    return (new Function('m', 'arg', `return (${src})(m, arg)`))(m, arg);
  }, [v, fn.toString(), arg]);
}

test.describe('duel / co-op surfaces (v2)', () => {
  test('duel chip: exit + self avatar at the inline start, opponent at the inline end, tabular score', async ({ appPageV2: page }, testInfo) => {
    await show(page, 'screen-duel');
    const r = await withModules(page, (m) => {
      const el = m.hud.mountHud('screen-duel', { lead: document.getElementById('duel-exit') });
      const mk = (cls, txt) => { const a = document.createElement('span'); a.className = 'hud-avatar ' + cls; a.textContent = txt; return a; };
      el.querySelector('.hud-lead').appendChild(mk('is-self', '🌸'));
      el.querySelector('.hud-trail').appendChild(mk('is-opp', '🎮'));
      m.hud.updateHud('screen-duel', { primary: { value: '12 – 9', caption: 'Round 4' } });
      const chip = el.getBoundingClientRect();
      const self = el.querySelector('.hud-avatar.is-self').getBoundingClientRect();
      const opp = el.querySelector('.hud-avatar.is-opp').getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        dir: getComputedStyle(document.documentElement).direction,
        selfX: self.x - chip.x, oppX: opp.x - chip.x, chipW: chip.width,
        avatarW: self.width,
        primary: el.querySelector('.hud-primary').textContent,
        glass: cs.backdropFilter || cs.webkitBackdropFilter,
        exitInside: !!el.querySelector('#duel-exit'),
        legacyRowHidden: getComputedStyle(document.querySelector('#screen-duel .duel-hud')).display === 'none',
      };
    });
    expect(r.exitInside).toBe(true);
    expect(r.legacyRowHidden).toBe(true);
    expect(r.primary).toBe('12 – 9');
    expect(r.glass).not.toBe('none');
    expect(Math.round(r.avatarW)).toBe(48);
    if (r.dir === 'rtl') expect(r.selfX).toBeGreaterThan(r.oppX); else expect(r.selfX).toBeLessThan(r.oppX);
    if (testInfo.project.metadata?.lang === 'ar') expect(r.dir).toBe('rtl');
    await show(page, 'screen-dashboard');
  });

  test('versus results sheet: two sides, winner highlighted, actions in the given order', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    await withModules(page, (m) => {
      m.results.showResultsSheet({
        tier: 'normal', art: '💪', title: 'Defeat', value: 9, caption: 'You', lines: ['Nabil won this one.'],
        versus: { vs: 'VS', self: { name: 'You', score: '9', sub: '3 rounds', win: false }, opp: { name: 'Nabil', score: '12', sub: '5 rounds', win: true } },
        actions: [{ label: 'Rematch', primary: true }, { label: 'Dashboard' }],
      });
    });
    const sheet = page.locator('#sheet-root .sheet--results');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.dr-side')).toHaveCount(2);
    await expect(sheet.locator('.dr-side.dr-win .dr-name')).toHaveText('Nabil');
    const labels = await sheet.locator('.sheet-actions .btn').allTextContents();
    expect(labels).toEqual(['Rematch', 'Dashboard']);
    await expect(sheet.locator('.sheet-actions .btn').first()).toHaveClass(/btn-primary/);
    await sheet.locator('.sheet-actions .btn').last().click();
    await expect(sheet).toBeHidden({ timeout: 3000 });
  });

  test('stall sheet is locked: no close button, Escape / scrim / back do nothing, the leave action resolves it', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    await withModules(page, (m) => {
      window.__stallLeft = false;
      m.results.showStallSheet({ title: 'Opponent unreachable', desc: 'They seem to have disconnected.', button: 'Claim win & leave', onLeave: () => { window.__stallLeft = true; } });
    });
    const sheet = page.locator('#sheet-root .sheet--stall');
    await expect(sheet).toBeVisible();
    await page.waitForTimeout(450);
    await expect(sheet.locator('.sheet-close')).toBeHidden();
    await page.keyboard.press('Escape');
    await page.mouse.click(10, 10);
    const consumed = await withModules(page, (m) => m.nav.back());
    expect(consumed, 'back is swallowed while locked').toBe(true);
    await page.waitForTimeout(400);
    await expect(sheet).toBeVisible();
    await sheet.locator('.btn-primary').click();
    await expect(sheet).toBeHidden({ timeout: 3000 });
    expect(await page.evaluate(() => window.__stallLeft)).toBe(true);
  });
});
