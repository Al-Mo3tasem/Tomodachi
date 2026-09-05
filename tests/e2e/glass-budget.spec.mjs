// tests/e2e/glass-budget.spec.mjs — counts MOUNTED backdrop-filter surfaces
// per screen. The redesign's hard budget: Android ≤ 2, iOS ≤ 3, 0 under
// Reduce glass. Until batch 2 this simply records today's counts as the
// baseline; afterwards the assertion is the budget itself.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test, expect, boot, show } from './fixtures.mjs';

const FILE = 'tests/e2e/__baselines__/glass-budget.json';
const SCREENS = ['screen-dashboard', 'screen-select', 'screen-settings', 'screen-leaderboard'];

async function countGlass(page) {
  return page.evaluate(() => {
    let n = 0; const which = [];
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const bf = cs.backdropFilter || cs.webkitBackdropFilter;
      if (!bf || bf === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
      n++; which.push(el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
    }
    return { n, which };
  });
}

test('mounted glass surfaces per screen stay within baseline', async ({ page, appPage }, testInfo) => {
  const { lang, theme } = testInfo.project.metadata || {};
  test.skip(lang === 'ar' || theme === 'dark', 'budget is layout-only; one locale/theme per phone is enough');
  const counts = {};
  await boot(page);                                   // signed-out landing (fresh context)
  counts.landing = (await countGlass(page)).n;
  for (const id of SCREENS) {
    if (!(await appPage.locator(`#${id}`).count())) continue;
    await show(appPage, id);
    const r = await countGlass(appPage);
    counts[id] = r.n;
    testInfo.annotations.push({ type: 'glass', description: `${id}: ${r.n} ${r.which.join(' ')}` });
  }
  if (!existsSync(FILE)) {
    mkdirSync('tests/e2e/__baselines__', { recursive: true });
    writeFileSync(FILE, JSON.stringify(counts, null, 2) + '\n');
    testInfo.annotations.push({ type: 'baseline', description: `recorded ${JSON.stringify(counts)}` });
    return;
  }
  const base = JSON.parse(readFileSync(FILE, 'utf8'));
  for (const [k, v] of Object.entries(counts)) {
    expect(v, `${k} glass count (baseline ${base[k]})`).toBeLessThanOrEqual(base[k] ?? v);
  }
});
