// scripts/lib/admin.js
// Firebase Admin SDK initialization for the L2.04 authoring CLI.
//
// Environment routing:
//   --env=dev      → tomodachi-dev      (default; safe sandbox)
//   --env=staging  → tomodachi-staging
//   --env=prod     → tomodachi-prod     (requires explicit confirm per write)
//
// Service account credentials are loaded from:
//   scripts/secrets/service-account.{env}.json
// or from the GOOGLE_APPLICATION_CREDENTIALS environment variable.
//
// All secrets/*.json files are gitignored per PROJECT_RULES.md §18.2.
// The CLI never prints the service account contents to stdout.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPTS_ROOT = dirname(__dirname);

const PROJECT_IDS = {
  dev: 'tomodachi-dev',
  staging: 'tomodachi-staging',
  prod: 'tomodachi-prod'
};

export function isValidEnv(env) {
  return Object.prototype.hasOwnProperty.call(PROJECT_IDS, env);
}

export function getProjectId(env) {
  if (!isValidEnv(env)) {
    throw new Error(`unknown env "${env}". Allowed: ${Object.keys(PROJECT_IDS).join(', ')}`);
  }
  return PROJECT_IDS[env];
}

function resolveServiceAccountPath(env) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  return join(SCRIPTS_ROOT, 'secrets', `service-account.${env}.json`);
}

// Initialize the Admin SDK for the given env. Returns { db, projectId }.
// Caches per-env (Admin SDK forbids re-initializing the same name).
export function initAdmin(env) {
  if (!isValidEnv(env)) {
    throw new Error(`unknown env "${env}". Allowed: ${Object.keys(PROJECT_IDS).join(', ')}`);
  }

  const appName = `tomodachi-${env}`;
  const existing = getApps().find(a => a.name === appName);
  if (existing) {
    return { db: getFirestore(existing), projectId: existing.options.projectId };
  }

  const projectId = PROJECT_IDS[env];
  const credPath = resolveServiceAccountPath(env);

  if (!existsSync(credPath)) {
    throw new Error(
      `service account not found at ${credPath}\n` +
      `\n` +
      `Set up credentials before running with --env=${env}:\n` +
      `  1. Open https://console.firebase.google.com/project/${projectId}/settings/serviceaccounts/adminsdk\n` +
      `  2. Click "Generate new private key" → download the JSON\n` +
      `  3. Move it to: ${credPath}\n` +
      `  4. Re-run this command.\n` +
      `\n` +
      `Alternatively: set GOOGLE_APPLICATION_CREDENTIALS to an existing key file path.`
    );
  }

  const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
  if (serviceAccount.project_id !== projectId) {
    throw new Error(
      `service account project_id "${serviceAccount.project_id}" does not match expected "${projectId}".\n` +
      `Wrong key file for --env=${env}?`
    );
  }

  const app = initializeApp({ credential: cert(serviceAccount), projectId }, appName);
  return { db: getFirestore(app), projectId };
}

// Returns the Firestore path for a content item, by type.
// Lessons live at /content_sets/lessons/{lessonKey}; everything else at
// /content_sets/{type}/items/{key}.
export function pathFor(contentType, item) {
  if (contentType === 'lesson') {
    return `content_sets/lessons/${item.lessonKey}`;
  }
  return `content_sets/${contentType}/items/${item.key}`;
}

// Fetch a doc by content-type + key. Returns the data object, or null if missing.
export async function fetchExisting(db, contentType, item) {
  const path = pathFor(contentType, item);
  const snap = await db.doc(path).get();
  return snap.exists ? snap.data() : null;
}

// Write a content item. Overwrites if it exists.
// Returns the resolved path on success.
export async function writeItem(db, contentType, item) {
  const path = pathFor(contentType, item);
  await db.doc(path).set(item);
  return path;
}
