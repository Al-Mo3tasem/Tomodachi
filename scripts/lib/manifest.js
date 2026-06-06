// scripts/lib/manifest.js
// Manifest + progress-tracking helpers for the L2.04 authoring CLI.
//
// A manifest is a curriculum-scope file: it lists which content items exist
// to author, in what order, with optional hints (japanese form, expected
// EN meaning, etc.) for Codex drafting. Manifests live at
// scripts/manifests/*.json and are TRACKED — they're project specification.
//
// Progress files live at scripts/progress/author_progress.{env}.json and
// are GITIGNORED — local per-machine state. One file per env (dev/staging/
// prod) prevents cross-env confusion.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPTS_ROOT = dirname(__dirname);

// ============================================================
// Manifest loading
// ============================================================

export function loadManifest(manifestPath) {
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest not found: ${manifestPath}`);
  }
  const raw = readFileSync(manifestPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`manifest ${manifestPath} is not valid JSON: ${e.message}`);
  }
  if (!parsed.type || !Array.isArray(parsed.items)) {
    throw new Error(`manifest ${manifestPath} missing required fields { type, items[] }`);
  }
  return parsed;
}

// ============================================================
// Progress file (per-env, gitignored)
// ============================================================

function progressPath(env) {
  return join(SCRIPTS_ROOT, 'progress', `author_progress.${env}.json`);
}

function emptyProgress() {
  return { version: 1, entries: [] };
}

export function loadProgress(env) {
  const path = progressPath(env);
  if (!existsSync(path)) return emptyProgress();
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    if (!Array.isArray(parsed.entries)) return emptyProgress();
    return parsed;
  } catch {
    // Corrupt progress file: start fresh; don't crash the session.
    return emptyProgress();
  }
}

export function saveProgress(env, progress) {
  const path = progressPath(env);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(progress, null, 2) + '\n', 'utf8');
}

// Returns a Set of keys already authored or skipped in the progress log,
// optionally filtered by content type.
export function completedKeys(progress, contentType) {
  const keys = new Set();
  for (const entry of progress.entries) {
    if (contentType && entry.type !== contentType) continue;
    if (entry.action === 'authored' || entry.action === 'skipped') {
      keys.add(entry.key);
    }
  }
  return keys;
}

// Append a progress entry. Returns the updated progress object.
// Caller saves it.
export function recordEntry(progress, entry) {
  const stamped = {
    ...entry,
    // Caller passes authoredAt (ISO string) since Date.now() is forbidden in
    // some script contexts; we don't fabricate timestamps here.
  };
  progress.entries.push(stamped);
  return progress;
}

// Compute pending items: manifest items whose key is NOT already in
// progress (authored or skipped). Preserves manifest order.
export function pendingItems(manifest, progress) {
  const done = completedKeys(progress, manifest.type);
  return manifest.items.filter(item => !done.has(item.key));
}

// Quick stats for the resume banner.
export function progressStats(progress, contentType) {
  let authored = 0, skipped = 0, errored = 0;
  for (const entry of progress.entries) {
    if (contentType && entry.type !== contentType) continue;
    if (entry.action === 'authored') authored++;
    else if (entry.action === 'skipped') skipped++;
    else if (entry.action === 'errored') errored++;
  }
  return { authored, skipped, errored };
}
