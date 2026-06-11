// ============================================
// Tomodachi — Google Analytics 4 with Consent Mode v2
// Wires gtag.js with consent-default-denied per the L1.10 consent
// banner contract (PROJECT_RULES.md §19). User accepts analytics →
// updateConsent(true) flips analytics_storage to 'granted'. Until
// then, GA4 sends only consent-mode pings with no user data.
//
// All ad_*-tagged consent stays 'denied' permanently — Tomodachi
// doesn't run ads. The Consent Mode v2 spec requires these four
// signals (analytics_storage, ad_storage, ad_user_data,
// ad_personalization), so they're all set explicitly.
//
// `js/config/analytics.js` returns empty string for envs that
// shouldn't load GA4 (dev + staging + any prod where the user
// hasn't filled in their Measurement ID yet). When empty, every
// function in this module no-ops cleanly.
// ============================================

import { getMeasurementId } from '../config/analytics.js?v=20260610a';

let _initialized = false;

/**
 * Boot GA4 with Consent Mode v2 default-denied. Idempotent — safe
 * to call multiple times. No-op when getMeasurementId() returns ''.
 * Called once from app.js init() AFTER initI18n() so the consent
 * decision (if any) is loaded before consent-update propagates.
 */
export function initGA4() {
  if (_initialized) return;
  const measurementId = getMeasurementId();
  if (!measurementId) return; // No GA4 in this env

  // Set up the dataLayer + gtag function BEFORE the script loads so
  // any early gtag() calls queue correctly.
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };

  // Consent Mode v2 default — analytics + all ad signals start denied.
  // wait_for_update: 500ms gives our consent decision (read from
  // localStorage in app.js init) time to propagate before the first
  // page_view fires. Past 500ms gtag proceeds with default-denied.
  window.gtag('consent', 'default', {
    analytics_storage:    'denied',
    ad_storage:           'denied',
    ad_user_data:         'denied',
    ad_personalization:   'denied',
    wait_for_update:      500
  });

  // Standard GA4 boot.
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    anonymize_ip:   true,
    send_page_view: true // auto-fire page_view on init
  });

  // Inject the gtag.js script tag last so the dataLayer queue is
  // ready when it loads.
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  _initialized = true;
}

/**
 * Propagate the user's consent decision to GA4. Called from
 * saveConsent() in app.js whenever the user picks (Accept All /
 * Reject / Save in modal). When analyticsAllowed is true, the
 * analytics_storage signal flips to 'granted' and GA4 starts
 * sending full events. Ad signals stay 'denied' permanently.
 *
 * @param {boolean} analyticsAllowed
 */
export function updateConsent(analyticsAllowed) {
  if (!window.gtag) return;
  window.gtag('consent', 'update', {
    analytics_storage:  analyticsAllowed ? 'granted' : 'denied',
    ad_storage:         'denied',
    ad_user_data:       'denied',
    ad_personalization: 'denied'
  });
}

/**
 * Track a custom GA4 event. Respects Consent Mode v2 — when consent
 * is 'denied', gtag sends only the consent-mode ping (no user data).
 * Event params are merged onto the gtag event payload.
 *
 * Documented events (per PROJECT_RULES.md §22.7):
 *   - page_view       (auto, fired by config above)
 *   - waitlist_signup (fired from handleWaitlistSubmit on success)
 *
 * @param {string} eventName  e.g., 'waitlist_signup'
 * @param {Object} [params]   e.g., { source: 'landing_hero' }
 */
export function trackEvent(eventName, params = {}) {
  if (!window.gtag) return;
  window.gtag('event', eventName, params);
}
