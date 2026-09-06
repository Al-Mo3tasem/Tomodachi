// tests/e2e/fixtures.mjs — shared Playwright fixtures for the Tomodachi specs.
//
// • Each project's metadata {lang, theme} is applied through localStorage
//   before the app boots (the i18n detector reads 'tomodachi-lang'; the
//   pre-paint script reads 'tomodachi-theme').
// • `appPage` is a WORKER-scoped page signed in as the dev QA account: one
//   login per project instead of one per test (faster, and no auth-quota
//   pressure). Specs navigate it with show(); they must never write game
//   results or course progress for that account.
// • `page` (fresh context per test) stays available for signed-out screens.
import { test as base, expect } from '@playwright/test';

export const QA = { email: 'claude.qa.tomodachi@example.com', password: 'TomoQa-Dev-2026!' };

function initScript([l, t, shell]) {
  try {
    localStorage.setItem('tomodachi-lang', l);
    localStorage.setItem('tomodachi-theme', t);
    localStorage.setItem('tomodachi-glass', 'full');   // headless renders ~2fps: pin glass so the budget spec measures the real thing
    localStorage.setItem('FF_NATIVE_SHELL', shell === 'v2' ? 'true' : 'false');   // dev defaults to v2; baselines must see what prod users see
  } catch (e) { /* ignore */ }
}

export const test = base.extend({
  // Which shell a spec exercises: 'v1' (prod behaviour, default) or 'v2' (the flag on). Set per file with test.use({ shell: 'v2' }).
  shell: ['v1', { option: true }],
  context: async ({ context, shell }, use, testInfo) => {
    const { lang = 'en', theme = 'light' } = testInfo.project.metadata || {};
    await context.addInitScript(initScript, [lang, theme, shell]);
    await use(context);
  },
  appPage: [async ({ browser }, use, workerInfo) => {
    const { lang = 'en', theme = 'light' } = workerInfo.project.metadata || {};
    const u = workerInfo.project.use || {};
    const ctx = await browser.newContext({ viewport: u.viewport, userAgent: u.userAgent, deviceScaleFactor: u.deviceScaleFactor, isMobile: u.isMobile, hasTouch: u.hasTouch, colorScheme: u.colorScheme, locale: u.locale, baseURL: u.baseURL });
    await ctx.addInitScript(initScript, [lang, theme, 'v1']);   // worker page = v1 (prod behaviour)
    const page = await ctx.newPage();
    await signIn(page);
    await use(page);
    await ctx.close();
  }, { scope: 'worker' }],
});
export { expect };

/** The cache-buster stamp the served index.html uses, so page-side imports hit the SAME module instances as the app. */
export async function stamp(page) {
  const html = await page.content();
  const m = html.match(/js\/app\.js\?v=([0-9a-z]+)/);
  if (!m) throw new Error('could not read the ?v= stamp from index.html');
  return m[1];
}

/** Boot the app (signed out) and wait for the first screen. */
export async function boot(page) {
  await page.goto('/index.html');
  await page.waitForSelector('.screen.active', { timeout: 30_000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-shell') !== null);
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  // Cookie banner (fresh context): dismiss through its first button ('Reject non-essential')
  await page.evaluate(() => { const b = document.querySelector('#consent-banner button'); if (b && b.offsetParent) b.click(); }).catch(() => {});
  return stamp(page);
}

/** Switch screens through the app's own showScreen (same module instance). */
export async function show(page, id) {
  const v = await stamp(page);
  await page.evaluate(async ([id, v]) => {
    const core = await import(`/js/core/core.js?v=${v}`);
    core.showScreen(id);
  }, [id, v]);
  await page.waitForSelector(`#${id}.active`);
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(250);   // let fade-in + any sync render settle
}

async function dashboardReady(page, timeout) {
  await page.waitForSelector('#screen-dashboard.active', { timeout });
  // dashboard data (lesson CTA) is the "fully loaded" signal
  await page.waitForFunction(() => { const el = document.getElementById('lesson-cta'); return el && !el.hidden; }, null, { timeout });
  await page.waitForTimeout(400);
}

/** Sign in as the QA account through the real login form; resolves on the dashboard. One retry for slow networks. */
export async function signIn(page) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const v = await boot(page);
    const already = await page.evaluate(async (v) => { const c = await import(`/js/core/core.js?v=${v}`); return !!c.state.user; }, v);
    if (!already) {
      await show(page, 'screen-auth');
      await page.fill('#login-email', QA.email);
      await page.fill('#login-password', QA.password);
      await page.evaluate(() => document.getElementById('form-login').requestSubmit());
    }
    try {
      await dashboardReady(page, 60_000);
      return v;
    } catch (err) {
      if (attempt === 2) throw err;
    }
  }
}

/** Elements whose content changes between runs (dates, transient toasts). */
export function volatile(page) {
  return [page.locator('#history-list'), page.locator('#toast-container'), page.locator('#friend-bar'), page.locator('.hero-counter'), page.locator('.nav-right'), page.locator('#consent-banner'), page.locator('#review-cta')];
}
