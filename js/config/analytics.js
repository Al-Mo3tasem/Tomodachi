// ============================================
// Tomodachi — Analytics Configuration
// Per-environment GA4 Measurement IDs. Empty string = GA4 doesn't load
// in that env (js/analytics/ga4.js short-circuits). Per
// `docs/PROJECT_RULES.md` §5 + §6: behavioral config lives in
// js/config/, never inlined into logic code.
//
// Filling in real IDs requires the project lead to:
//   1. Create a GA4 property at https://analytics.google.com
//   2. Copy the Measurement ID (format: G-XXXXXXXXXX)
//   3. Paste into `prod` (and optionally `staging`) below
//
// Default = dev + staging blank, prod blank pending user setup.
// Once prod is filled in, GA4 loads on the prod URL with Consent Mode
// v2 defaulting to denied. Per the L1.10 consent banner: events fire
// only after user grants analytics_storage.
// ============================================

import { getEnv } from './firebase.js?v=20260610a';

const measurementIds = {
  dev:     '', // localhost — keep blank so dev sessions don't pollute prod analytics
  staging: '', // Cloudflare Pages staging — fill in if/when we want separate staging analytics
  prod:    'G-W98QV657BE'  // GA4 property created 2026-06-01 (project lead)
};

/**
 * Returns the GA4 Measurement ID for the current environment, or '' if
 * GA4 should not load. Callers in js/analytics/ga4.js no-op when '' is
 * returned.
 * @returns {string} e.g., 'G-XXXXXXXXXX' or ''
 */
export function getMeasurementId() {
  return measurementIds[getEnv()] || '';
}
