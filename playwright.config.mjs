// Playwright config — the redesign's guard rails.
// Matrix: 2 phone viewports × 2 locales × 2 themes (8 projects). Both run in
// Chromium (the WebKit descriptor is used only for its viewport/touch
// settings). Locale + theme are applied by tests/e2e/fixtures.mjs from each
// project's metadata via localStorage before the app boots.
import { defineConfig, devices } from '@playwright/test';

const BASE = 'http://127.0.0.1:8744';
const PHONES = [
  { key: 'pixel',  device: devices['Pixel 7'] },     // 412×915, Android
  { key: 'iphone', device: devices['iPhone 13'] },   // 390×844, iOS
];

const projects = [];
for (const p of PHONES) {
  for (const lang of ['en', 'ar']) {
    for (const theme of ['light', 'dark']) {
      projects.push({
        name: `${p.key}-${lang}-${theme}`,
        use: { ...p.device, browserName: 'chromium', colorScheme: theme },
        metadata: { lang, theme, phone: p.key },
      });
    }
  }
}

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' } },
  fullyParallel: false,          // the specs share one QA account on the dev project
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/e2e/.report' }]],
  outputDir: 'tests/e2e/.results',
  snapshotPathTemplate: 'tests/e2e/__baselines__/{testFileName}/{arg}-{projectName}{ext}',
  use: { baseURL: BASE, trace: 'retain-on-failure', locale: 'en-US' },
  projects,
  webServer: {
    command: 'npx http-server -p 8744 -c-1 -s',
    url: `${BASE}/index.html`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
