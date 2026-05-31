// ============================================
// Tomodachi — Sentry Configuration
// Per-environment Sentry DSNs. Empty string = Sentry doesn't load in
// that env (js/analytics/sentry.js short-circuits). Per
// `docs/PROJECT_RULES.md` §5 + §6: behavioral config lives in
// js/config/, never inlined into logic code.
//
// Filling in real DSNs requires the project lead to:
//   1. Create a Sentry project at https://sentry.io
//   2. Pick "Browser JavaScript" platform
//   3. Copy the DSN (format: https://...@o<N>.ingest.sentry.io/<N>)
//   4. Paste into `prod` (and optionally `staging`) below
//
// Default = dev + staging blank, prod blank pending user setup.
// Once prod is filled in, Sentry lazy-loads on the prod URL. Errors
// are captured anonymously by default; user context (uid + email)
// only attaches when both `loadConsent().errorContext` is true AND
// the user is signed in (per L1.10 + PROJECT_RULES.md §19.1).
// ============================================

import { getEnv } from './firebase.js?v=20260528c';

const dsns = {
  dev:     '', // localhost — skip Sentry for dev unless explicitly enabled
  staging: '', // Cloudflare Pages — fill in if/when we want staging error reporting
  prod:    ''  // GitHub Pages — fill in after creating the Sentry project
};

/**
 * Returns the Sentry DSN for the current environment, or '' if Sentry
 * should not load. Callers in js/analytics/sentry.js no-op when '' is
 * returned.
 * @returns {string} e.g., 'https://abc@o123.ingest.sentry.io/456' or ''
 */
export function getSentryDsn() {
  return dsns[getEnv()] || '';
}
