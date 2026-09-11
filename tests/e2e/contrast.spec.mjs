// tests/e2e/contrast.spec.mjs — axe WCAG 2.1 AA baseline (colour contrast +
// the rest of the automated rules). First run records the violation ids per
// screen; later runs fail on any NEW rule id or a higher count.
// Two suites: the v1 shell (what prod serves) and — from batch 9 — the v2 tab
// roots, which v1 never renders and which no other spec audits.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, boot, show } from './fixtures.mjs';

const FILE = 'tests/e2e/__baselines__/axe.json';
const SCREENS = ['screen-dashboard', 'screen-select', 'screen-settings'];
// v2 roots reachable from the dock, in the order the audit visits them
const V2_TABS = [['home', 'screen-dashboard'], ['course', 'screen-course'], ['practice', 'screen-practice'], ['me', 'screen-settings']];

async function audit(page) {
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const tally = {};
  for (const v of res.violations) tally[v.id] = (tally[v.id] || 0) + v.nodes.length;
  return tally;
}

test('axe: no new WCAG AA violations vs baseline', async ({ page, appPage }, testInfo) => {
  test.setTimeout(300_000);   // four full axe audits
  const { lang, theme, phone } = testInfo.project.metadata || {};
  test.skip(phone !== 'pixel', 'one viewport is enough for the rule audit');
  const key = `${lang}-${theme}`;
  const result = {};
  await boot(page);
  result.landing = await audit(page);
  for (const id of SCREENS) {
    if (!(await appPage.locator(`#${id}`).count())) continue;
    await show(appPage, id);
    result[id] = await audit(appPage);
  }
  let all = {};
  if (existsSync(FILE)) all = JSON.parse(readFileSync(FILE, 'utf8'));
  if (!all[key]) {
    all[key] = result;
    mkdirSync('tests/e2e/__baselines__', { recursive: true });
    writeFileSync(FILE, JSON.stringify(all, null, 2) + '\n');
    testInfo.annotations.push({ type: 'baseline', description: `recorded ${key}: ${JSON.stringify(result)}` });
    return;
  }
  // Fail only on a NEW rule id per screen (a new class of violation). Counts of
  // already-known rules fluctuate with dynamic content; report them instead.
  const base = all[key];
  for (const [screen, tally] of Object.entries(result)) {
    for (const [rule, n] of Object.entries(tally)) {
      const b = base[screen]?.[rule];
      if (b === undefined) expect.soft(rule, `${screen}: new axe rule ${rule} (${n} node(s))`).toBe('known');
      else if (n > b) testInfo.annotations.push({ type: 'axe-count', description: `${screen}: ${rule} ${b} -> ${n}` });
    }
  }
});

// The v2 shell renders different markup on the same screen ids (and two screens
// v1 never shows at all), so it needs its own baseline rather than sharing the
// v1 one. Navigation goes through the dock: a direct show() would leave the
// router stale and the tab roots render on 'nav:change'.
test('axe (v2): no new WCAG AA violations on the tab roots', async ({ appPageV2: page }, testInfo) => {
  test.setTimeout(300_000);
  const { lang, theme, phone } = testInfo.project.metadata || {};
  test.skip(phone !== 'pixel', 'one viewport is enough for the rule audit');
  const key = `v2-${lang}-${theme}`;
  const result = {};
  for (const [tab, id] of V2_TABS) {
    await page.click(`.dock-tab[data-tab="${tab === 'me' ? 'home' : 'me'}"]`);
    await page.waitForTimeout(250);
    await page.click(`.dock-tab[data-tab="${tab}"]`);
    await page.waitForTimeout(400);
    if (!(await page.locator(`#${id}.active`).count())) { await page.click(`.dock-tab[data-tab="${tab}"]`); await page.waitForTimeout(400); }
    await expect(page.locator(`#${id}.active`)).toBeVisible();
    await page.waitForTimeout(600);            // let the tab's first render settle
    result[id] = await audit(page);
  }
  let all = {};
  if (existsSync(FILE)) all = JSON.parse(readFileSync(FILE, 'utf8'));
  if (!all[key]) {
    all[key] = result;
    mkdirSync('tests/e2e/__baselines__', { recursive: true });
    writeFileSync(FILE, JSON.stringify(all, null, 2) + '\n');
    testInfo.annotations.push({ type: 'baseline', description: `recorded ${key}: ${JSON.stringify(result)}` });
    return;
  }
  const base = all[key];
  for (const [screen, tally] of Object.entries(result)) {
    for (const [rule, n] of Object.entries(tally)) {
      const b = base[screen]?.[rule];
      if (b === undefined) expect.soft(rule, `${screen} (v2): new axe rule ${rule} (${n} node(s))`).toBe('known');
      else if (n > b) testInfo.annotations.push({ type: 'axe-count', description: `${screen} (v2): ${rule} ${b} -> ${n}` });
    }
  }
});
