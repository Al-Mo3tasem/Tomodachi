// ============================================
// Tomodachi Cloud Functions — entry point
// Currently exports: submitWaitlist
//
// Runtime: Node.js 20 (CommonJS). firebase-functions v6 (Generation 2).
// CORS is allow-listed to the three Tomodachi front-end origins +
// localhost for dev. Brevo credentials come from firebase-functions
// params (`defineString`) — set via either:
//   - .env.<projectId>  (committed-template, real values gitignored)
//   - GCP Secret Manager (for production, recommended for the API key)
//   - Shell env vars during emulator runs
//
// See docs/Phases_and_Tasks.md L1.08 + the L1.08 Progress Log entry
// for the project-lead setup steps (Brevo account, API key, list ID,
// double-opt-in template, Firebase Functions deploy).
// ============================================

const { onRequest } = require('firebase-functions/v2/https');
const { defineString, defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');

// API key lives in GCP Secret Manager — never in plain env. Set via:
//   firebase functions:secrets:set BREVO_API_KEY
// Per PROJECT_RULES.md §5.3 (real API keys belong in Cloud Functions only).
const BREVO_API_KEY = defineSecret('BREVO_API_KEY');

// List ID is non-sensitive — plain param in functions/.env.<projectId>.
const BREVO_LIST_ID = defineString('BREVO_LIST_ID', {
  description: 'Numeric ID of the Brevo contact list that receives waitlist signups.'
});

// Same email-shape gate as the client (js/app.js:WAITLIST_EMAIL_RE).
// Server-side check is the trustworthy gate — the client one is just
// for premium UX (CTA disabled-until-valid).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 spec cap.

// Small in-memory blocklist of the highest-volume disposable-email
// providers. This is intentionally conservative — we'd rather let
// through a few mailinator addresses than block legitimate users on a
// long list. If signup-quality becomes a real problem, swap to a
// maintained list like disposable-email-domains npm package.
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '20minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'sharklasers.com',
  'mailinator.com',
  'mailinator.net',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'yopmail.com',
  'yopmail.net',
  'fakeinbox.com',
  'spam4.me',
  'getnada.com',
  'maildrop.cc',
  'mintemail.com',
  'mohmal.com',
  'mailcatch.com',
  'discard.email',
  'spambog.com',
  'spambox.us',
  'tempinbox.com',
  'mytemp.email',
  'dispostable.com'
]);

const ALLOWED_LOCALES = new Set(['en', 'ar']);
const ALLOWED_SOURCES = new Set([
  'landing_hero',
  'faq_cta',
  'footer_cta',
  'unknown'
]);

const ALLOWED_ORIGINS = [
  'https://al-mo3tasem.github.io',
  /\.pages\.dev$/,        // Cloudflare Pages staging previews
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/
];

exports.submitWaitlist = onRequest(
  {
    region: 'us-central1',
    cors: ALLOWED_ORIGINS,
    maxInstances: 10,
    timeoutSeconds: 30,
    invoker: 'public',
    secrets: [BREVO_API_KEY]
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const apiKey = BREVO_API_KEY.value();
    const listId = BREVO_LIST_ID.value();
    if (!apiKey || !listId) {
      // Not configured yet — fail loudly so the project lead notices
      // during the setup walkthrough rather than silently dropping signups.
      logger.error('submitWaitlist called before Brevo params are set', {
        hasApiKey: Boolean(apiKey),
        hasListId: Boolean(listId)
      });
      return res.status(503).json({ ok: false, error: 'brevo_not_configured' });
    }

    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const locale = ALLOWED_LOCALES.has(body.locale) ? body.locale : 'en';
    const source = ALLOWED_SOURCES.has(body.source) ? body.source : 'unknown';

    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
      return res.status(400).json({ ok: false, error: 'invalid_email' });
    }

    const domain = email.split('@')[1];
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return res.status(400).json({ ok: false, error: 'disposable_email' });
    }

    const numericListId = Number(listId);
    if (!Number.isInteger(numericListId) || numericListId <= 0) {
      logger.error('BREVO_LIST_ID is not a positive integer', { listId });
      return res.status(503).json({ ok: false, error: 'brevo_misconfigured' });
    }

    // Brevo /v3/contacts upserts a contact and (optionally) attaches list IDs.
    // Double opt-in is configured at the LIST level in the Brevo dashboard —
    // if the list has DOI enabled, Brevo sends the confirmation email and
    // marks the contact as `unsubscribed` until they click through.
    // `updateEnabled: false` makes a second submit of the same email return
    // 400 `duplicate_parameter`, which we surface to the user as
    // `already_subscribed` — friendlier than silently re-adding them.
    let brevoRes;
    try {
      brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email,
          attributes: {
            LANG: locale.toUpperCase(),       // EN | AR
            SOURCE: source,
            SIGNUP_DATE: new Date().toISOString()
          },
          listIds: [numericListId],
          updateEnabled: false
        })
      });
    } catch (err) {
      logger.error('Brevo fetch threw', { message: err.message });
      return res.status(502).json({ ok: false, error: 'brevo_unreachable' });
    }

    if (brevoRes.status === 201 || brevoRes.status === 204) {
      logger.info('Waitlist signup OK', { domain, source, locale });
      return res.status(200).json({ ok: true });
    }

    // Brevo returned an error. Try to map known codes; default to brevo_error.
    let brevoBody = {};
    try { brevoBody = await brevoRes.json(); } catch (_e) { /* keep empty */ }

    if (brevoRes.status === 400 && brevoBody.code === 'duplicate_parameter') {
      // Friendly user-facing case — already on the list.
      return res.status(200).json({ ok: true, alreadySubscribed: true });
    }

    if (brevoRes.status === 400 && brevoBody.code === 'invalid_parameter') {
      // Brevo's stricter validator caught something our regex missed.
      logger.warn('Brevo rejected email format', { domain, code: brevoBody.code });
      return res.status(400).json({ ok: false, error: 'invalid_email' });
    }

    if (brevoRes.status === 401) {
      logger.error('Brevo rejected our API key — rotate immediately', {
        status: brevoRes.status
      });
      return res.status(503).json({ ok: false, error: 'brevo_auth' });
    }

    logger.error('Brevo returned unexpected error', {
      status: brevoRes.status,
      code: brevoBody.code,
      message: brevoBody.message
    });
    return res.status(502).json({ ok: false, error: 'brevo_error' });
  }
);

// ============================================
// L1.09 — getWaitlistCount
// Returns the raw Brevo list contact count. The client adds the
// WAITLIST_BASELINE (350) on top and caps the displayed number at 1000
// per Commercialization_Plan.md §3. We keep the response shape
// minimal — only the raw count — so the display rules can live with
// the rest of the landing-copy logic in app.js.
//
// No caching: at pre-launch traffic, Brevo's free-tier rate limits are
// nowhere near a concern, and the count drift between requests is
// usually 0-1 anyway. If traffic ever justifies it, swap to a Firestore
// counter incremented by submitWaitlist + a daily reconciliation job.
// ============================================
exports.getWaitlistCount = onRequest(
  {
    region: 'us-central1',
    cors: ALLOWED_ORIGINS,
    maxInstances: 10,
    timeoutSeconds: 15,
    invoker: 'public',
    secrets: [BREVO_API_KEY]
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const apiKey = BREVO_API_KEY.value();
    const listId = BREVO_LIST_ID.value();
    if (!apiKey || !listId) {
      return res.status(503).json({ ok: false, error: 'brevo_not_configured' });
    }

    const numericListId = Number(listId);
    if (!Number.isInteger(numericListId) || numericListId <= 0) {
      return res.status(503).json({ ok: false, error: 'brevo_misconfigured' });
    }

    // Brevo's `GET /v3/contacts/lists/{listId}` returns list metadata
    // including totalSubscribers (the number we want) + totalBlacklisted.
    // We surface only the confirmed-subscribers count; blacklisted users
    // shouldn't pad the social-proof number.
    let brevoRes;
    try {
      brevoRes = await fetch(
        `https://api.brevo.com/v3/contacts/lists/${numericListId}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'api-key': apiKey
          }
        }
      );
    } catch (err) {
      logger.error('Brevo fetch threw (getWaitlistCount)', { message: err.message });
      return res.status(502).json({ ok: false, error: 'brevo_unreachable' });
    }

    if (!brevoRes.ok) {
      let brevoBody = {};
      try { brevoBody = await brevoRes.json(); } catch (_e) { /* empty */ }
      if (brevoRes.status === 401) {
        logger.error('Brevo rejected our API key in getWaitlistCount', {});
        return res.status(503).json({ ok: false, error: 'brevo_auth' });
      }
      if (brevoRes.status === 404) {
        logger.error('Brevo list not found (check BREVO_LIST_ID)', { listId: numericListId });
        return res.status(503).json({ ok: false, error: 'brevo_misconfigured' });
      }
      logger.error('Brevo list-fetch unexpected error', {
        status: brevoRes.status,
        code: brevoBody.code
      });
      return res.status(502).json({ ok: false, error: 'brevo_error' });
    }

    const body = await brevoRes.json();
    const count = Number(body.totalSubscribers) || 0;
    return res.status(200).json({ ok: true, count });
  }
);
