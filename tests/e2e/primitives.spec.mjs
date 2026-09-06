// tests/e2e/primitives.spec.mjs — batch 5: sheet + destructive dialog, quiz
// tiles + feedback sheet, status chip / toast placement, segmented pill,
// skeleton + empty view, numbers. v2 shell only.
import { test, expect, show, signIn } from './fixtures.mjs';

test.use({ shell: 'v2' });

async function ver(page) {
  return page.evaluate(() => (document.querySelector('script[src*="js/app.js"]')?.getAttribute('src') || '').split('v=')[1]);
}
/** Run `fn(mods)` inside the page with the app's own module instances. */
async function withModules(page, fn, arg = null) {
  const v = await ver(page);
  return page.evaluate(async ([v, src, arg]) => {
    const mods = {
      sheet: await import(`/js/ui/sheet.js?v=${v}`),
      status: await import(`/js/ui/status.js?v=${v}`),
      skeleton: await import(`/js/ui/skeleton.js?v=${v}`),
      tiles: await import(`/js/ui/quiz-tiles.js?v=${v}`),
      nav: await import(`/js/core/nav.js?v=${v}`),
      core: await import(`/js/core/core.js?v=${v}`),
    };
    return (new Function('m', 'arg', `return (${src})(m, arg)`))(mods, arg);
  }, [v, fn.toString(), arg]);
}
const rect = (page, sel) => page.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom }; });

async function openLessonQuiz(page) {
  await show(page, 'screen-dashboard');
  await page.click('#lesson-cta-btn');
  await page.waitForSelector('#screen-lesson.active, #screen-meta.active', { timeout: 30_000 });
  if (await page.locator('#screen-meta.active').count()) { await page.click('#meta-continue'); await page.waitForSelector('#screen-lesson.active'); }
  await page.click('#lesson-btn-begin');
  for (let i = 0; i < 40; i++) {
    if (await page.locator('#lesson-quiz:not([hidden])').count()) break;
    await page.click('#lesson-btn-next');
    await page.waitForTimeout(120);
  }
  await expect(page.locator('#lesson-quiz')).toBeVisible();
  await page.waitForTimeout(300);
}

test.describe('sheet + dialog', () => {
  test('sheet opens above the dock, closes on Escape / scrim / drag, returns focus, and owns back', async ({ page }) => {
    await signIn(page);
    await page.focus('#btn-settings');
    await withModules(page, (m) => { m.sheet.openSheet({ title: 'Probe', content: (b) => { b.innerHTML = '<p style="height:300px">body</p><button id="probe-btn">ok</button>'; } }); });
    const sheet = page.locator('#sheet-root .sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('aria-modal', 'true');
    await expect(sheet).toHaveAttribute('role', 'dialog');
    await page.waitForTimeout(450);
    // stacking: the sheet is hit-tested above the dock, a toast above the sheet
    const s = await rect(page, '#sheet-root .sheet');
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.sheet') !== null, [s.x + s.w / 2, s.y + 20]);
    expect(hit).toBe(true);
    expect(await page.evaluate(() => document.body.hasAttribute('data-sheet'))).toBe(true);
    await withModules(page, (m) => { m.core.toast('probe toast', 'error', 4000); });
    await page.waitForTimeout(250);
    const t = await rect(page, '#toast-container .toast');
    const above = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.toast') !== null, [t.x + t.w / 2, t.y + t.h / 2]);
    expect(above, 'toast hit-tests above the open sheet').toBe(true);
    // Escape closes and focus returns to the opener
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden({ timeout: 2000 });
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('btn-settings');
    expect(await page.evaluate(() => document.body.hasAttribute('data-sheet'))).toBe(false);
    // scrim click
    await withModules(page, (m) => { m.sheet.openSheet({ title: 'Probe 2', content: 'x' }); });
    await page.waitForTimeout(450);
    await page.mouse.click(10, 10);
    await expect(page.locator('#sheet-root .sheet')).toBeHidden({ timeout: 2000 });
    // drag > 120 px on the head dismisses (toasts sit above sheets by design: clear the probe toast first)
    await page.evaluate(() => document.querySelectorAll('#toast-container .toast').forEach((n) => n.remove()));
    await withModules(page, (m) => { m.sheet.openSheet({ title: 'Probe 3', content: 'x' }); });
    await page.waitForTimeout(450);
    const h = await rect(page, '#sheet-root .sheet-head');
    await page.mouse.move(h.x + h.w / 2, h.y + h.h / 2);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(h.x + h.w / 2, h.y + h.h / 2 + i * 20);
    await page.mouse.up();
    await expect(page.locator('#sheet-root .sheet')).toBeHidden({ timeout: 2000 });
    // back closes the sheet before the router pops a screen
    await page.click('#btn-settings');
    await expect(page.locator('#screen-settings.active')).toBeVisible();
    await withModules(page, (m) => { m.sheet.openSheet({ title: 'Probe 4', content: 'x' }); });
    await page.waitForTimeout(450);
    const consumed = await withModules(page, (m) => m.nav.back());
    expect(consumed).toBe(true);
    await expect(page.locator('#sheet-root .sheet')).toBeHidden({ timeout: 2000 });
    await expect(page.locator('#screen-settings.active')).toBeVisible();   // still on settings
  });

  test('destructive dialog: labelled, cancel by default, back vetoes', async ({ page }) => {
    await signIn(page);
    const pending = withModules(page, (m) => m.sheet.confirmDestructive({ title: 'Leave?', body: 'Progress is lost.', confirm: 'Leave', cancel: 'Stay' }));
    const dlg = page.locator('#dlg-confirm');
    await expect(dlg).toBeVisible();
    await expect(dlg).toHaveAttribute('aria-labelledby', 'dlg-confirm-title');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('value'))).toBe('cancel');
    // hardware/browser back → cancelled, screen unchanged
    const consumed = await withModules(page, (m) => m.nav.back());
    expect(consumed).toBe(true);
    expect(await pending).toBe(false);
    await expect(dlg).toBeHidden();
    await expect(page.locator('#screen-dashboard.active')).toBeVisible();
    // confirm path
    const p2 = withModules(page, (m) => m.sheet.confirmDestructive({ title: 'Leave?' }));
    await expect(dlg).toBeVisible();
    await page.click('#dlg-confirm button[value="confirm"]');
    expect(await p2).toBe(true);
    expect(await page.evaluate(() => /confirm\(/.test('') )).toBe(false);
  });

  test('survival exit asks through the dialog and cancel resumes the run', async ({ page }) => {
    await signIn(page);
    await show(page, 'screen-select');
    await withModules(page, (m) => { m.core.state.currentGameType = 'survival'; });
    await page.click('#btn-select-all');
    await expect(page.locator('#btn-start')).toBeEnabled();
    await page.click('#btn-start');
    await page.waitForSelector('#screen-game.active', { timeout: 15_000 });
    await page.waitForTimeout(800);
    await page.click('#game-exit');
    const dlg = page.locator('#dlg-confirm');
    await expect(dlg).toBeVisible();
    await page.click('#dlg-confirm button[value="cancel"]');
    await expect(dlg).toBeHidden();
    await expect(page.locator('#screen-game.active')).toBeVisible();
    await page.click('#game-exit');
    await expect(dlg).toBeVisible();
    await page.click('#dlg-confirm button[value="confirm"]');
    await expect(page.locator('#screen-game.active')).toBeHidden({ timeout: 5000 });
  });
});

test.describe('quiz tiles + feedback', () => {
  test('lesson quiz renders 2×2 tiles ≥ 64px with a press edge, and the verdict sheet gates Continue', async ({ appPageV2: page }, testInfo) => {
    await openLessonQuiz(page);
    const tiles = page.locator('#lesson-quiz-choices .quiz-tile');
    await expect(tiles).toHaveCount(4);
    const rects = await tiles.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
    for (const r of rects) expect(r.h, 'tile height').toBeGreaterThanOrEqual(64);
    expect(Math.abs(rects[0].y - rects[1].y) < 2 && Math.abs(rects[2].y - rects[3].y) < 2, 'two per row').toBe(true);
    expect(rects[2].y - rects[0].y >= 64, 'second row below the first').toBe(true);
    const edge = await tiles.first().evaluate((el) => getComputedStyle(el).boxShadow);
    expect(edge).not.toBe('none');
    if (testInfo.project.metadata?.lang === 'ar') expect(await tiles.first().evaluate((el) => getComputedStyle(el).letterSpacing)).toBe('normal');
    // pressed state: translateY(4px) during pointerdown
    const r0 = rects[0];
    await page.mouse.move(r0.x + r0.w / 2, r0.y + r0.h / 2);
    await page.mouse.down();
    await page.waitForTimeout(150);
    const pressed = await tiles.first().evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.up();
    expect(pressed, 'pressed transform').toMatch(/matrix\(1, 0, 0, 1, 0, 4\)/);
    // the click answered → verdict sheet with Continue; tiles are locked
    const sheet = page.locator('#sheet-root .sheet--feedback');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.btn-primary')).toBeVisible();
    expect(await tiles.evaluateAll((els) => els.every((b) => b.disabled))).toBe(true);
    const state = await sheet.evaluate((el) => el.classList.contains('is-ok') ? 'ok' : el.classList.contains('is-wrong') ? 'wrong' : 'none');
    expect(['ok', 'wrong']).toContain(state);
    await sheet.locator('.btn-primary').click();
    await expect(sheet).toBeHidden({ timeout: 2000 });
    // next question or done
    await page.waitForTimeout(300);
    const next = await page.evaluate(() => ({ quiz: !document.getElementById('lesson-quiz').hidden, done: !document.getElementById('lesson-done').hidden }));
    expect(next.quiz || next.done).toBe(true);
    if (next.quiz) await page.click('#lesson-btn-exit'); else await show(page, 'screen-dashboard');
  });
});

test.describe('status chip, toast, segmented, skeleton, numbers', () => {
  test('events go to the chip, errors to a toast above the dock', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    await withModules(page, (m) => { m.status.statusChip('Friend online', { icon: 'friend' }); });
    const chip = page.locator('#status-chip');
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('aria-live', 'polite');
    const c = await rect(page, '#status-chip');
    expect(c.top).toBeGreaterThanOrEqual(0);
    expect(await page.locator('#toast-container .toast').count(), 'no toast for an event').toBe(0);
    const bf = await chip.evaluate((el) => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter);
    expect(bf === 'none' || bf === '' || bf === undefined, 'chip is tonal, never glass').toBe(true);
    await withModules(page, (m) => { m.core.toast('Could not save', 'error', 4000); });
    await page.waitForTimeout(350);   // let the rise animation settle before measuring
    const t = await rect(page, '#toast-container .toast');
    const d = await rect(page, '#dock');
    expect(t.bottom, 'toast sits above the dock').toBeLessThanOrEqual(d.top - 12 + 1);
    await withModules(page, (m) => { m.core.toast('second', 'error', 4000); });
    expect(await page.locator('#toast-container .toast').count(), 'one toast at a time').toBe(1);
  });

  test('segmented pill follows the active option and is placed by inline-start', async ({ appPageV2: page }, testInfo) => {
    await show(page, 'screen-select');
    const seg = page.locator('#seg-duration');
    // the game-setup flow marks the active option when a mode is chosen; a direct
    // showScreen has none yet, so pick one first (the observer places the pill)
    await seg.locator('.seg-btn').first().click();
    await expect(seg.locator('.seg-pill.is-ready')).toBeVisible();
    await seg.locator('.seg-btn').last().click();
    await page.waitForTimeout(500);
    const placed = await seg.evaluate((c) => {
      const active = c.querySelector('.seg-btn.active').getBoundingClientRect();
      const pill = c.querySelector('.seg-pill').getBoundingClientRect();
      return { dx: Math.abs(active.left - pill.left), dw: Math.abs(active.width - pill.width), rtl: getComputedStyle(c).direction };
    });
    expect(placed.dx, `pill x (${placed.rtl})`).toBeLessThan(2);
    expect(placed.dw).toBeLessThan(2);
    await seg.locator('.seg-btn').first().click();
    if (testInfo.project.metadata?.lang === 'ar') expect(placed.rtl).toBe('rtl');
  });

  test('skeleton respects the 300 ms ladder; empty view renders one CTA', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    const r = await withModules(page, async (m) => {
      const host = document.createElement('div'); host.id = 'probe-host'; document.getElementById('screen-dashboard').appendChild(host);
      const clear = m.skeleton.mountSkeleton(host, 'row', 3);
      const early = host.querySelectorAll('[data-skeleton]').length;
      await new Promise((res) => setTimeout(res, 450));
      const late = host.querySelectorAll('.skeleton').length;
      const busy = host.getAttribute('aria-busy');
      clear();
      const cleared = host.querySelectorAll('[data-skeleton]').length;
      m.skeleton.renderEmptyState(host, { image: m.skeleton.EMPTY_ART.friends, title: 'No friends yet', body: 'Invite one.', cta: { label: 'Invite' } });
      const out = { early, late, busy, cleared, img: !!host.querySelector('.empty-view img'), cta: host.querySelectorAll('.empty-view .btn').length };
      host.remove();
      return out;
    });
    expect(r.early).toBe(0);
    expect(r.late).toBeGreaterThan(0);
    expect(r.busy).toBe('true');
    expect(r.cleared).toBe(0);
    expect(r.img).toBe(true);
    expect(r.cta).toBe(1);
  });

  test('numbers are ink: stat values use the text colour; caption contrast holds', async ({ appPageV2: page }) => {
    await show(page, 'screen-dashboard');
    const same = await page.evaluate(() => {
      const v = document.querySelector('.stat-value'); if (!v) return true;
      return getComputedStyle(v).color === getComputedStyle(document.body).color;
    });
    expect(same).toBe(true);
    const ratio = await page.evaluate(() => {
      const el = document.createElement('span'); el.className = 'num-caption'; el.textContent = 'x'; document.body.appendChild(el);
      const parse = (c) => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
      const lum = ([r, g, b]) => { const f = (u) => { u /= 255; return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const fg = lum(parse(getComputedStyle(el).color));
      const bgEl = document.querySelector('.card') || document.body;
      const bg = lum(parse(getComputedStyle(bgEl).backgroundColor));
      el.remove();
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
