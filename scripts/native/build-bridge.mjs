// scripts/native/build-bridge.mjs — bundles native/bridge.js (the ONLY code
// that imports @capacitor/* packages) into www/native-bridge.js as a classic
// IIFE, so the buildless web app stays buildless: it feature-detects
// window.Native and never imports a plugin itself.
import { build } from 'esbuild';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
await build({
  entryPoints: [join(ROOT, 'native', 'bridge.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020', 'chrome100', 'safari15'],
  outfile: join(ROOT, 'www', 'native-bridge.js'),
  minify: true,
  sourcemap: false,
  logLevel: 'info',
});
