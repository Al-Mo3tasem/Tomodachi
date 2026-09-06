// scripts/dev/shots.mjs [--out=dir] — headless review captures of the v2 shell.
// Signs in as the dev QA account and saves phone-sized PNGs (EN/AR × light/dark)
// of the screens under active development. For eyes-on review only; the e2e
// baselines are the contract. Requires the dev server on :8744.
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = (process.argv.find(a => a.startsWith('--out=')) || '--out=shots').slice(6);
mkdirSync(OUT, { recursive: true });
const QA = { email: 'claude.qa.tomodachi@example.com', password: 'TomoQa-Dev-2026!' };
const BASE = 'http://127.0.0.1:8744';

const browser = await chromium.launch();
for (const [lang, theme] of [['en', 'light'], ['ar', 'light'], ['en', 'dark'], ['ar', 'dark']]) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], colorScheme: theme });
  await ctx.addInitScript(([l, t]) => {
    localStorage.setItem('tomodachi-lang', l); localStorage.setItem('tomodachi-theme', t);
    localStorage.setItem('tomodachi-glass', 'full'); localStorage.setItem('FF_NATIVE_SHELL', 'true');
  }, [lang, theme]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/index.html`);
  await page.waitForSelector('.screen.active');
  await page.evaluate(() => { const b = document.querySelector('#consent-banner button'); if (b && b.offsetParent) b.click(); });
  const v = (await page.content()).match(/js\/app\.js\?v=([0-9a-z]+)/)[1];
  await page.evaluate(async (v) => { const c = await import(`/js/core/core.js?v=${v}`); c.showScreen('screen-auth'); }, v);
  await page.fill('#login-email', QA.email);
  await page.fill('#login-password', QA.password);
  await page.evaluate(() => document.getElementById('form-login').requestSubmit());
  await page.waitForSelector('#screen-dashboard.active', { timeout: 60_000 });
  await page.waitForFunction(() => { const el = document.getElementById('lesson-cta'); return el && !el.hidden; }, null, { timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const tag = `${lang}-${theme}`;
  await page.screenshot({ path: join(OUT, `home-${tag}.png`) });
  await page.evaluate(() => window.scrollTo(0, 420));
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `home-scrolled-${tag}.png`) });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('.dock-tab[data-tab="me"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `me-${tag}.png`) });
  await page.click('.dock-tab[data-tab="practice"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `practice-${tag}.png`) });
  await ctx.close();
  console.log(`captured ${tag}`);
}
await browser.close();
