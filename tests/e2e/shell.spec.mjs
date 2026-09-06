// tests/e2e/shell.spec.mjs — safe areas + cascade proof (batch 2).
// Chromium reports env(safe-area-inset-*) as 0, so the fixture injects the
// Capacitor-style custom properties (47px notch / 34px home indicator) and
// checks that chrome moves out of the way. Applies to v1 AND v2: the safe-area
// rules ship to everyone (mask list).
import { test, expect, boot, show, signIn } from './fixtures.mjs';

const FIXTURE = ':root { --safe-area-inset-top: 47px; --safe-area-inset-bottom: 34px; }';

test.use({ shell: 'v2' });   // this file exercises the new shell

async function px(page, selector, prop) {
  return page.evaluate(([s, p]) => {
    const el = document.querySelector(s);
    return el ? parseFloat(getComputedStyle(el)[p]) : null;
  }, [selector, prop]);
}

test.describe('safe areas', () => {
  test('nav, toasts and consent banner respect the insets (signed out)', async ({ page }) => {
    await boot(page);
    await page.addStyleTag({ content: FIXTURE });
    expect(await px(page, '.nav', 'paddingTop')).toBeGreaterThanOrEqual(47 + 12);
    expect(await px(page, '.toast-container', 'top')).toBeGreaterThanOrEqual(47 + 20);
    expect(await px(page, '#consent-banner', 'bottom')).toBeGreaterThanOrEqual(34 + 16);
  });

  test('select footer clears the gesture bar (signed in)', async ({ appPage: page }) => {
    await show(page, 'screen-select');
    await page.addStyleTag({ content: FIXTURE });
    expect(await px(page, '.select-footer', 'paddingBottom')).toBeGreaterThanOrEqual(34 + 20);
  });

  test('overlays are unmounted at rest', async ({ appPage: page }) => {
    await show(page, 'screen-dashboard');
    const displays = await page.evaluate(() =>
      ['.results-overlay', '.pause-overlay', '.duel-overlay', '.invite-overlay']
        .map(s => { const el = document.querySelector(s); return el ? getComputedStyle(el).display : 'absent'; }));
    for (const d of displays) expect(['none', 'absent']).toContain(d);
  });
});

test.describe('cascade layers', () => {
  test('legacy sheet is layered so app layers win without !important', async ({ page }) => {
    await boot(page);
    const layered = await page.evaluate(() => {
      const sheet = [...document.styleSheets].find(s => (s.href || '').includes('css/style.css'));
      if (!sheet) return 'no-sheet';
      const first = sheet.cssRules[0];
      const second = sheet.cssRules[1];
      return `${first.constructor.name}:${first.cssText.slice(0, 60)} | ${second.constructor.name}`;
    });
    expect(layered).toMatch(/^CSSLayerStatementRule:@layer legacy, tokens, base, components, screens, overrides; \| CSSLayerBlockRule$/);
    // a later, lower-specificity layer must beat legacy
    // transition: none — .btn-primary animates background over 150ms, which would make the read mid-transition
    await page.addStyleTag({ content: '@layer overrides { .btn-primary { background-color: rgb(0, 255, 0); transition: none } }' });
    await page.waitForTimeout(100);
    const bg = await page.evaluate(() => { const b = document.querySelector('.btn-primary'); return b ? getComputedStyle(b).backgroundColor : null; });
    expect(bg).toBe('rgb(0, 255, 0)');
  });

  test('platform + glass attributes are stamped', async ({ page }) => {
    await boot(page);
    const attrs = await page.evaluate(() => ({ platform: document.documentElement.dataset.platform, glass: document.documentElement.dataset.glass, shell: document.documentElement.dataset.shell }));
    expect(['ios', 'android', 'web']).toContain(attrs.platform);
    expect(['full', 'reduced']).toContain(attrs.glass);
    expect(attrs.shell).toBe('v2');   // test.use({ shell: 'v2' }) above
  });
});
