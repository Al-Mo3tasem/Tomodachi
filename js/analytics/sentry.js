// ============================================
// Tomodachi — Sentry error reporting with consent-gated user context
// Errors are captured anonymously the moment Sentry initializes; the
// user's uid + email are attached only when both the L1.10 consent
// banner has granted `errorContext` AND the user is signed in.
// PROJECT_RULES.md §19.1: "Sentry's user-tracking features fire only
// after Accept (errors still capture, but without user context)."
//
// SDK is lazy-loaded via dynamic import — zero bytes ship in dev /
// staging / any prod where the DSN isn't configured yet. When a DSN
// is configured, @sentry/browser is fetched from jsdelivr only at
// initSentry() time, AFTER the rest of the app has booted. Keeps the
// initial page weight light.
// ============================================

import { getSentryDsn } from '../config/sentry.js?v=20260802b';
import { getEnv } from '../config/firebase.js?v=20260802b';
import { APP_CONFIG } from '../config/firebase.js?v=20260802b';

let _sentry = null;
let _initialized = false;
let _initInFlight = null;

/**
 * Boot Sentry. Idempotent — safe to call multiple times. No-op when
 * getSentryDsn() returns '' (no DSN configured for this env). The
 * actual SDK download only happens when a DSN is configured AND this
 * is called for the first time. Returns the init promise so callers
 * that need to await readiness (e.g., to attach user context) can do
 * so without re-triggering the import.
 *
 * Pinned to @sentry/browser@8.40.0 — version-verified at the start
 * of L1.14 execution per PROJECT_RULES.md §20. Bump intentionally
 * with each SDK upgrade pass, not silently via "latest".
 */
export function initSentry() {
  if (_initInFlight) return _initInFlight;
  if (_initialized) return Promise.resolve();
  const dsn = getSentryDsn();
  if (!dsn) return Promise.resolve(); // No Sentry in this env

  _initInFlight = (async () => {
    try {
      const Sentry = await import('https://cdn.jsdelivr.net/npm/@sentry/browser@8.40.0/+esm');
      Sentry.init({
        dsn,
        environment: getEnv(),
        release: APP_CONFIG.version,
        // Drop ad/marketing-leaning auto-instrumentation — Tomodachi
        // doesn't need session replays or auto-tracing. Errors only.
        integrations: [],
        tracesSampleRate: 0,
        // Final consent-aware scrub before send. Even if setUser was
        // called somewhere with user data, beforeSend strips it if the
        // user later toggled errorContext off. Belt-and-suspenders.
        beforeSend(event) {
          if (!_consentGranted()) {
            delete event.user;
            if (event.contexts && event.contexts.user) {
              delete event.contexts.user;
            }
          }
          return event;
        }
      });
      _sentry = Sentry;
      _initialized = true;
    } catch (err) {
      console.warn('[sentry] Failed to load SDK:', err);
    } finally {
      _initInFlight = null;
    }
  })();

  return _initInFlight;
}

/** Read consent.errorContext from localStorage. Defensive — avoids
 *  importing the consent helper here (would create a cycle with
 *  app.js). Direct localStorage read with the same key + schema. */
function _consentGranted() {
  try {
    const raw = localStorage.getItem('tomodachi-consent');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) return false;
    return !!parsed.errorContext;
  } catch {
    return false;
  }
}

/**
 * Attach (or clear) the signed-in user's uid + email on every
 * subsequent error event. Only fires the attach when the L1.10
 * consent banner has granted errorContext. Pass `null` to clear
 * (e.g., on sign-out or when user revokes consent).
 *
 * @param {{uid: string, email?: string} | null} user
 */
export function setUserContext(user) {
  if (!_initialized || !_sentry) return;
  if (!user || !_consentGranted()) {
    _sentry.setUser(null);
    return;
  }
  _sentry.setUser({
    id: user.uid,
    email: user.email
  });
}

/**
 * Capture a caught exception. Errors thrown but caught locally still
 * surface to Sentry this way, with optional context. Uncaught errors
 * are captured automatically by Sentry's window.onerror hook.
 *
 * @param {Error} error
 * @param {Object} [context] arbitrary serializable extras
 */
export function captureException(error, context) {
  if (!_initialized || !_sentry) return;
  _sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Capture a non-error message (info / warning / error level). Useful
 * for "this shouldn't happen but isn't fatal" cases.
 *
 * @param {string} message
 * @param {'info'|'warning'|'error'} [level='info']
 */
export function captureMessage(message, level = 'info') {
  if (!_initialized || !_sentry) return;
  _sentry.captureMessage(message, level);
}
