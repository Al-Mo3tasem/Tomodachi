#!/usr/bin/env node
// scripts/author_content.js
// Tomodachi — interactive content authoring CLI (L2.04).
//
// Walks the project lead through authoring content items one at a time.
// Per CONTENT_GUIDELINES §2.3: each item gets eyes-on review before commit.
// The AR quality moat lives or dies on this discipline.
//
// USAGE
//   node scripts/author_content.js --env=dev --manifest=scripts/manifests/_sample_vocab.json
//   node scripts/author_content.js --env=dev --type=vocab --key=n5_v_007_book
//   node scripts/author_content.js --env=dev --manifest=… --use-codex --dry-run
//
// FLAGS
//   --env=<dev|staging|prod>   target environment (default: dev)
//   --manifest=<path>          load a manifest and walk all pending items
//   --type=<contentType>       force content type (else inferred from manifest)
//   --key=<itemKey>            single-item mode (must pair with --type)
//   --use-codex                print Codex paste-in prompt for each item
//   --dry-run                  validate + display only; do not write Firestore
//   --help                     print this help

import { existsSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateContentItem,
  formatErrors,
  CONTENT_TYPES
} from '../js/validators/content.js';

import {
  initAdmin,
  isValidEnv,
  pathFor,
  fetchExisting,
  writeItem
} from './lib/admin.js';

import {
  loadManifest,
  loadProgress,
  saveProgress,
  pendingItems,
  progressStats,
  recordEntry
} from './lib/manifest.js';

import {
  ask,
  closeRL,
  color,
  walkForm,
  displayDraft,
  promptField,
  editAsJSON,
  FORMS
} from './lib/prompts.js';

import { promptFor as codexPromptFor, parsePaste } from './lib/codex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// CLI args
// ============================================================

function parseArgs(argv) {
  const args = { env: 'dev', dryRun: false, useCodex: false };
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--use-codex') args.useCodex = true;
    else if (a.startsWith('--env=')) args.env = a.slice(6);
    else if (a.startsWith('--manifest=')) args.manifest = a.slice(11);
    else if (a.startsWith('--type=')) args.type = a.slice(7);
    else if (a.startsWith('--key=')) args.key = a.slice(6);
    else if (a.startsWith('--prefill=')) args.prefill = a.slice(10);
    else {
      console.error(color.red(`Unknown arg: ${a}`));
      args.help = true;
    }
  }
  return args;
}

// Load a Codex-output prefill file and return a Map<key, fields>.
// Accepted shapes:
//   { "type": "...", "items": { "a": {...}, "i": {...} } }     (recommended)
//   { "type": "...", "items": [ { "key": "a", ... } ] }
//   { "a": {...}, "i": {...} }                                  (flat fallback)
function loadPrefill(path) {
  if (!existsSync(path)) {
    throw new Error(`prefill file not found: ${path}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`prefill ${path} is not valid JSON: ${e.message}`);
  }
  const map = new Map();
  if (parsed && typeof parsed === 'object' && parsed.items) {
    if (Array.isArray(parsed.items)) {
      for (const it of parsed.items) {
        if (it && typeof it === 'object' && it.key) map.set(it.key, it);
      }
    } else if (typeof parsed.items === 'object') {
      for (const [k, v] of Object.entries(parsed.items)) {
        if (v && typeof v === 'object') map.set(k, v);
      }
    }
  } else if (parsed && typeof parsed === 'object') {
    // Flat fallback: top-level keys map directly to draft objects
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v === 'object') map.set(k, v);
    }
  }
  return map;
}

function printHelp() {
  console.log(`
${color.bold('Tomodachi content authoring CLI (L2.04)')}

${color.cyan('USAGE')}
  node scripts/author_content.js [flags]

${color.cyan('FLAGS')}
  --env=<dev|staging|prod>   target environment (default: dev)
  --manifest=<path>          walk pending items from a manifest
  --type=<contentType>       force content type (hiragana|katakana|vocab|kanji|grammar|listening|radicals)
  --key=<itemKey>            single-item mode (with --type)
  --use-codex                print Codex paste-in prompt per item
  --prefill=<path>           load a Codex-output JSON file and pre-fill items
                             (silent batch mode — no per-item paste; review menu only)
  --dry-run                  validate + display only; no Firestore writes
  --help                     this help

${color.cyan('EXAMPLES')}
  ${color.dim('# Walk a manifest of pending vocab against dev, dry-run')}
  node scripts/author_content.js --manifest=scripts/manifests/n5_vocab.json --dry-run

  ${color.dim('# Author a single new kanji using Codex paste-in, against dev')}
  node scripts/author_content.js --type=kanji --key=k_n5_002_tree --use-codex

  ${color.dim('# Batch authoring from a Codex-output file (recommended L2.05+ flow)')}
  node scripts/author_content.js --manifest=scripts/manifests/n5_hiragana.json \\
    --prefill=scripts/output/codex-l2-05-hiragana.json

  ${color.dim('# Production write (will require explicit confirmation per item)')}
  node scripts/author_content.js --env=prod --manifest=scripts/manifests/n5_vocab.json

${color.cyan('REQUIRED SETUP')} ${color.dim('(see scripts/README.md for numbered steps)')}
  1. npm install                                       (inside scripts/)
  2. Place service account JSON at:
     scripts/secrets/service-account.<env>.json
  3. Or set GOOGLE_APPLICATION_CREDENTIALS=<path>
`);
}

// ============================================================
// Per-item authoring loop
// ============================================================

const EXIT = Symbol('exit');
const SKIP = Symbol('skip');

async function authorOneItem(ctx, hint) {
  const { contentType, useCodex, prefills } = ctx;
  console.log('');
  console.log(color.bold(`━━━ ${contentType} :: ${hint.key} ━━━`));
  if (hint.ordinal) console.log(color.gray(`  ordinal: ${hint.ordinal}`));
  if (hint.japanese_hint) console.log(color.gray(`  hint: ${hint.japanese_hint}`));
  if (hint.expected_meaning_en) console.log(color.gray(`  expected EN: ${hint.expected_meaning_en}`));

  // Manifest items may pre-populate item fields via a `seed` object —
  // useful for kana where the glyph/romaji/row are deterministic and
  // typing them 104 times would be wasteful. seed values appear as
  // "current" defaults in the form walk; user can press Enter to accept.
  const seed = hint.seed && typeof hint.seed === 'object' ? hint.seed : {};
  let item = { key: hint.key, ...seed };
  if (contentType === 'lesson') item = { lessonKey: hint.key, ...seed };

  // 0) Prefill from a Codex-output file (--prefill). Wins over seed.
  const prefill = prefills && prefills.get(hint.key);
  if (prefill) {
    item = { ...item, ...prefill, key: item.key };
    console.log(color.green(`  ✓ loaded prefill from file (${Object.keys(prefill).length} fields)`));
  }

  // 1) Optional Codex paste-in pre-fill (skipped if a file prefill was applied)
  if (useCodex && !prefill) {
    console.log('');
    console.log(color.bold('━━━ Codex prompt (copy → paste into Codex) ━━━'));
    console.log(codexPromptFor(contentType, hint));
    console.log(color.bold('━━━ End prompt ━━━'));
    console.log('');
    console.log(color.cyan('Paste the JSON Codex returned, then enter a line containing only END:'));
    const lines = [];
    while (true) {
      const line = await ask('');
      if (line === null) return EXIT;  // stdin closed — exit queue cleanly
      if (line === 'END') break;
      lines.push(line);
    }
    try {
      item = { ...item, ...parsePaste(lines.join('\n')) };
      console.log(color.green('  ✓ Codex paste accepted; opening for review.'));
    } catch (e) {
      console.log(color.red(`  ✕ ${e.message}`));
      console.log(color.yellow('  Falling back to manual entry.'));
    }
  } else if (!prefill) {
    // 2) Manual walk (skipped if a file prefill was applied)
    const walkResult = await walkForm(contentType, item);
    if (walkResult === null) return EXIT;  // EOF during form walk
  }

  // 3) Review + edit loop
  while (true) {
    displayDraft(contentType, item);
    const result = validateContentItem(contentType, item);
    // Dialect markers are advisory, not blocking — per the user's voice
    // rule (common conversational AR, not strict فصحى). The lead decides
    // per item whether a flagged word is the right register.
    const dialectErrs = result.errors.filter(e =>
      e.message && e.message.includes('dialect markers detected'));
    const blockingErrs = result.errors.filter(e =>
      !(e.message && e.message.includes('dialect markers detected')));
    const blockingResult = { valid: blockingErrs.length === 0, errors: blockingErrs };

    if (blockingResult.valid) {
      console.log(color.green('  ✓ validators pass'));
    } else {
      console.log(color.red(`  ✕ validation errors (${blockingErrs.length}):`));
      console.log(formatErrors(blockingResult));
    }
    if (dialectErrs.length > 0) {
      console.log(color.yellow(`  ⚠ Arabic dialect markers flagged (${dialectErrs.length}) — review, not blocking:`));
      for (const w of dialectErrs) console.log(`    ⚠ ${w.field}: ${w.message}`);
    }

    console.log('');
    console.log(color.bold('Options:'));
    console.log(`  ${color.cyan('[a]')}ccept and write   ${color.cyan('[e]')}dit whole as JSON   ${color.cyan('[f]')}ield <n> to re-edit`);
    console.log(`  ${color.cyan('[r]')}e-validate        ${color.cyan('[s]')}kip                  ${color.cyan('[q]')}uit session`);
    const rawChoice = await ask('  > ');
    if (rawChoice === null) return EXIT;
    const choice = rawChoice.toLowerCase();

    if (choice === 'a') {
      if (!blockingResult.valid) {
        console.log(color.red('  ✕ cannot accept — fix validation errors first.'));
        continue;
      }
      // 4) Write (or dry-run)
      const writeResult = await commitItem(ctx, item);
      if (writeResult === SKIP) {
        return { action: 'skipped', reason: 'aborted_at_confirm' };
      }
      return { action: 'authored', writePath: writeResult };
    }
    if (choice === 'e') {
      item = editAsJSON(item);
      continue;
    }
    if (choice === 'r') continue;
    if (choice === 's') return { action: 'skipped', reason: 'manual_skip' };
    if (choice === 'q') return EXIT;
    if (choice.startsWith('f')) {
      const numStr = choice.slice(1).trim();
      const n = parseInt(numStr, 10);
      const form = FORMS[contentType];
      const { setPath } = await import('./lib/prompts.js');
      if (Number.isFinite(n) && n >= 1 && n <= form.length) {
        const field = form[n - 1];
        const newVal = await promptField(field, item);
        if (newVal !== undefined) setPath(item, field.path, newVal);
      } else {
        console.log(color.bold('Pick a field number:'));
        form.forEach((f, i) => {
          console.log(`  ${color.cyan(String(i + 1).padStart(2))}) ${f.label} ${color.gray('(' + f.path + ')')}`);
        });
        const pickStr = await ask('  field # > ');
        if (pickStr === null) return EXIT;
        const pick = parseInt(pickStr, 10);
        if (Number.isFinite(pick) && pick >= 1 && pick <= form.length) {
          const field = form[pick - 1];
          const newVal = await promptField(field, item);
          if (newVal !== undefined) setPath(item, field.path, newVal);
        }
      }
      continue;
    }
    console.log(color.yellow(`  ⚠ unrecognized choice "${choice}"`));
  }
}


// ============================================================
// Write commit (dry-run or live)
// ============================================================

async function commitItem(ctx, item) {
  const { contentType, env, dryRun, db } = ctx;
  const path = pathFor(contentType, item);

  if (dryRun) {
    console.log('');
    console.log(color.cyan(`  [dry-run] would write to ${env}:${path}`));
    console.log(color.dim('  payload:'));
    console.log(JSON.stringify(item, null, 2).split('\n').map(l => '    ' + l).join('\n'));
    return path;
  }

  // Live write — check for overwrite + extra prod confirm.
  const existing = await fetchExisting(db, contentType, item);
  if (existing) {
    console.log(color.yellow(`  ⚠ ${path} already exists in ${env}.`));
    const ans = (await ask(`  Overwrite existing doc? [y/N] `) || '').toLowerCase();
    if (ans !== 'y') return SKIP;
  }

  if (env === 'prod') {
    const ans = await ask(color.red(`  [PROD] confirm write to ${path}? type 'y' to proceed: `));
    if (ans !== 'y') return SKIP;
  }

  await writeItem(db, contentType, item);
  console.log(color.green(`  ✓ wrote ${env}:${path}`));
  return path;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); process.exit(0); }

  if (!isValidEnv(args.env)) {
    console.error(color.red(`✕ unknown env "${args.env}". Allowed: dev, staging, prod`));
    process.exit(1);
  }

  // Determine content type + work queue
  let contentType, workQueue;
  if (args.manifest) {
    const manifest = loadManifest(args.manifest);
    contentType = args.type || manifest.type;
    if (!CONTENT_TYPES.includes(contentType) && contentType !== 'lesson') {
      console.error(color.red(`✕ unknown content type "${contentType}"`));
      process.exit(1);
    }
    const progress = loadProgress(args.env);
    const pending = pendingItems(manifest, progress);
    const stats = progressStats(progress, contentType);
    console.log('');
    console.log(color.bold(`Tomodachi authoring — env=${color.cyan(args.env)} type=${color.cyan(contentType)}`));
    console.log(color.gray(`Manifest: ${args.manifest} (${manifest.items.length} items)`));
    console.log(color.gray(`Progress: ${stats.authored} authored, ${stats.skipped} skipped, ${stats.errored} errored`));
    console.log(color.gray(`Pending:  ${pending.length} item(s)`));
    if (pending.length === 0) {
      console.log(color.green('Nothing pending. ✓'));
      closeRL();
      process.exit(0);
    }
    workQueue = pending;
  } else if (args.key && args.type) {
    contentType = args.type;
    workQueue = [{ key: args.key }];
    console.log('');
    console.log(color.bold(`Tomodachi authoring — env=${color.cyan(args.env)} type=${color.cyan(contentType)}`));
    console.log(color.gray(`Single-item mode: ${args.key}`));
  } else {
    console.error(color.red('✕ specify either --manifest=<path> OR --type=<...> --key=<...>'));
    printHelp();
    process.exit(1);
  }

  // Init Firestore (skip in dry-run)
  let db = null;
  if (!args.dryRun) {
    try {
      const admin = initAdmin(args.env);
      db = admin.db;
      console.log(color.gray(`Connected: ${admin.projectId}`));
    } catch (e) {
      console.error(color.red(`✕ ${e.message}`));
      process.exit(1);
    }
  } else {
    console.log(color.cyan('[dry-run] no Firestore connection; writes will be printed only.'));
  }

  // Load prefill file if provided
  let prefills = null;
  if (args.prefill) {
    try {
      prefills = loadPrefill(args.prefill);
      console.log(color.gray(`Prefill: ${args.prefill} (${prefills.size} item draft(s))`));
    } catch (e) {
      console.error(color.red(`✕ ${e.message}`));
      process.exit(1);
    }
  }

  // Graceful Ctrl-C — save progress before exiting
  const ctx = { env: args.env, contentType, useCodex: args.useCodex, dryRun: args.dryRun, db, prefills };
  const progress = loadProgress(args.env);
  let interrupted = false;
  process.on('SIGINT', () => {
    interrupted = true;
    console.log('');
    console.log(color.yellow('  ⚠ caught Ctrl-C; saving progress and exiting…'));
    saveProgress(args.env, progress);
    closeRL();
    process.exit(130);
  });

  // Walk the queue
  const summary = { authored: 0, skipped: 0, errored: 0 };
  for (const hint of workQueue) {
    if (interrupted) break;
    try {
      const result = await authorOneItem(ctx, hint);
      if (result === EXIT) {
        console.log(color.yellow('  ⚠ session ended by user.'));
        break;
      }
      recordEntry(progress, {
        key: hint.key,
        type: contentType,
        env: args.env,
        action: result.action,
        ...(result.writePath ? { writePath: result.writePath } : {}),
        ...(result.reason ? { reason: result.reason } : {}),
        authoredAt: new Date().toISOString()
      });
      saveProgress(args.env, progress);
      summary[result.action]++;
    } catch (e) {
      console.error(color.red(`  ✕ error authoring ${hint.key}: ${e.message}`));
      recordEntry(progress, {
        key: hint.key,
        type: contentType,
        env: args.env,
        action: 'errored',
        error: e.message,
        authoredAt: new Date().toISOString()
      });
      saveProgress(args.env, progress);
      summary.errored++;
    }
  }

  // Final summary
  console.log('');
  console.log(color.bold('━━━ Session summary ━━━'));
  console.log(`  ${color.green('✓')} authored: ${summary.authored}`);
  console.log(`  ${color.yellow('⊘')} skipped:  ${summary.skipped}`);
  console.log(`  ${color.red('✕')} errored:  ${summary.errored}`);
  console.log('');
  closeRL();
}

main().catch(e => {
  console.error(color.red(`fatal: ${e && e.stack || e}`));
  closeRL();
  process.exit(1);
});
