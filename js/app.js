// ============================================
// Tomodachi — Application Orchestrator
// Phase 4: Auth, Dashboard, Character Select, Zen, Survival Rush,
// Duel Mode, Sync Match (co-op), Leaderboards, Settings, Presence.
// ============================================

import { APP_CONFIG } from './config/firebase.js?v=20260528c';
import {
  state, $, showScreen, currentScreen, showLoading, toast, setTheme, withTimeout
} from './core/core.js?v=20260528c';
import {
  auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, signOut,
  doc, getDoc, setDoc, getDocs, deleteDoc, collection, query, where, onSnapshot,
  serverTimestamp, limit
} from './data/firebase.js?v=20260528c';
import {
  startGame, requestExit, playAgain, cleanup as cleanupGame,
  speakCurrent, pauseGame, resumeGame, resumeFromPause, isActive
} from './games/engine.js?v=20260528c';
import {
  openLeaderboard, renderLeaderboardPreview, removeUserFromLeaderboards
} from './data/leaderboards.js?v=20260528c';
import { isSpeechSupported } from './audio/audio.js?v=20260526a';
import {
  initDuelInvites, stopDuelInvites, sendChallenge, cancelChallenge,
  acceptInvite, declineInvite, exitDuel, isInDuel, onFriendPresence as duelOnFriendPresence,
  playAgainDuel, resolveStall, cleanupDuel
} from './games/duel.js?v=20260528c';
import {
  sendCoopChallenge, cancelCoopChallenge, exitCoop, isInCoop,
  onFriendPresence as coopOnFriendPresence, playAgainCoop, resolveCoopStall, cleanupCoop
} from './games/coop.js?v=20260528c';
import { initI18n, t, setLocale, getLocale, onLocaleChange } from './i18n/index.js?v=20260528s';
import { initGA4, updateConsent as ga4UpdateConsent, trackEvent as ga4TrackEvent } from './analytics/ga4.js?v=20260528q';
import { initSentry, setUserContext as sentrySetUserContext } from './analytics/sentry.js?v=20260528r';

const AVATARS = ['🌸', '🐱', '🦊', '🐼', '🐧', '🦄', '🐸', '🦋', '⭐', '🌙', '🍙', '🍣', '🎮', '🏯', '🐉', '🌊'];
const MODE_EMOJI = { zen: '🧘', survival: '🔥', duel: '⚔️', coop: '🤝' };
const ZEN_DURATIONS = [60, 180, 300, 420, 600];   // 1, 3, 5, 7, 10 minutes

// L1.04 waitlist counter baseline. Per Commercialization_Plan.md the
// visible number = real Brevo count + baseline (350). L1.04 ships the
// baseline as a stubbed display; L1.09 wires the real Brevo count on
// top of it. Move to js/config/limits.js when L1.09 lands.
const WAITLIST_BASELINE = 350;

// L1.10 cookie consent — localStorage key + 1-year expiry per
// PROJECT_RULES.md §19.2. The actual gating of GA4 + Sentry user-
// context happens at L1.11 + L1.14; L1.10 just captures + stores the
// decision so those tasks can read it.
const CONSENT_STORAGE_KEY = 'tomodachi-consent';
const CONSENT_VERSION = 1;
const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

// Looks up the localized name for a game mode. Falls back to the raw
// type string if the key is missing (i18next returns the key on miss).
function modeName(type) {
  const key = `modes.${type}.name`;
  const translated = t(key);
  return translated === key ? type : translated;
}

let pendingAvatar = '🌸';

// L1.20 race-prevention flag (v2 fix). handleRegister sets this to true
// before any Auth call and clears it in finally. The onAuthStateChanged
// listener checks the flag and skips the post-auth UI flow (which is
// what triggers ensureUserProfile) while it's true, so the listener
// can't race in and write orphan docs. handleRegister itself triggers
// the post-auth entry on success via enterAppAsUser(). The v1 fix
// (delete-in-cleanup) couldn't reliably win the race because cleanup
// may complete before the racing writes do — confirmed empirically in
// R2.07 verification on tomodachi-dev.
let _registrationInFlight = false;

// ============================================
// PROFILE HELPERS
// ============================================

function fallbackUserData(user) {
  const emailName = user.email?.split('@')[0] || 'player';
  return {
    displayName: user.displayName || emailName,
    username: emailName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    avatarEmoji: '🌸'
  };
}

// Try to reserve a usernames/{lower} doc as part of self-heal. Returns
// the reserved name (which may have a numeric suffix on collision). If
// 10 attempts all fail (collisions or rule-deny), returns the base name
// without a reservation — degraded but the user can still play. Used by
// ensureUserProfile when self-healing a profile-less Auth user. (L1.20.)
async function reserveFallbackUsername(uid, emailLocalPart) {
  const base = (emailLocalPart || 'player').toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'player';
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = attempt === 0 ? base : `${base}_${attempt + 1}`;
    try {
      await setDoc(doc(db, 'usernames', candidate), {
        uid,
        createdAt: serverTimestamp()
      });
      return candidate;
    } catch (err) {
      if (err.code !== 'permission-denied') throw err;
      // permission-denied = doc exists (collision) OR rules block (legacy
      // project with no usernames/ block). Try the next candidate either way.
    }
  }
  console.warn('[ensureUserProfile] No usernames/ slot available after 10 attempts; profile created without reservation. Future signup may collide.');
  return base;
}

async function ensureUserProfile(user) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await withTimeout(getDoc(userRef), 'Loading your profile', 15000);

  if (userDoc.exists()) {
    return userDoc.data();
  }

  // Self-heal path: registration partially completed. Reserve a username
  // in usernames/{lower} so the R2.05 uniqueness invariant (one users/
  // doc <-> one usernames/ reservation) holds for self-healed profiles
  // too. Falls back gracefully on legacy projects with no usernames/
  // rule (the reservation step silently degrades, profile still created).
  const emailName = user.email?.split('@')[0] || 'player';
  const username = await reserveFallbackUsername(user.uid, emailName);

  const profile = {
    uid: user.uid,
    username,
    displayName: user.displayName || emailName,
    avatarEmoji: '🌸',
    email: user.email || '',
    createdAt: serverTimestamp(),
    status: 'offline'
  };

  await withTimeout(setDoc(userRef, profile, { merge: true }), 'Creating missing user profile', 15000);
  await withTimeout(setDoc(doc(db, 'stats', user.uid), {
    userId: user.uid,
    totalGames: 0,
    duelsWon: 0,
    duelsLost: 0,
    highestSoloScore: 0,
    highestCoopScore: 0,
    charactersMastered: [],
    createdAt: serverTimestamp()
  }, { merge: true }), 'Creating missing stats profile', 15000);

  toast(t('toast.profile_created'), 'success', 5000);
  return profile;
}

function renderUserIdentity() {
  const displayName = state.userData?.displayName || t('nav.user_default_name');
  const username = state.userData?.username || 'player';
  const avatar = state.userData?.avatarEmoji || '🌸';

  const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  set('dash-welcome-line', t('dashboard.subtitle_named', { name: displayName }));
  set('dash-displayname', displayName);
  set('dash-username', `@${username}`);
  set('dash-avatar', avatar);
  set('nav-name', displayName);
  set('nav-avatar', avatar);
}

// ============================================
// AUTHENTICATION
// ============================================

function formatAuthError(code, fallbackMessage = '') {
  if (code) {
    // Firebase codes look like 'auth/invalid-email'. Map to i18n key
    // shape: 'error.auth.invalid_email'.
    const sub = code.replace(/^auth\//, '').replace(/-/g, '_');
    const key = `error.auth.${sub}`;
    const translated = t(key);
    // i18next returns the key string itself when missing; treat that as
    // "no translation available" and fall through.
    if (translated !== key) return translated;
  }
  if (fallbackMessage) return fallbackMessage;
  return code
    ? t('error.auth.fallback_with_code', { code })
    : t('error.auth.fallback_generic');
}

function showFormError(errorEl, message) {
  if (errorEl) errorEl.textContent = message;
  toast(message, 'error', 7000);
}

async function handleLogin(e) {
  e.preventDefault();
  const email = $('login-email').value.trim();
  const password = $('login-password').value;
  const errorEl = $('login-error');
  if (errorEl) errorEl.textContent = '';

  if (!email || !password) {
    showFormError(errorEl, t('error.form.email_password_required'));
    return;
  }

  try {
    showLoading(true);
    await withTimeout(signInWithEmailAndPassword(auth, email, password), 'Signing in', 15000);
    toast(t('toast.signed_in'), 'success');
  } catch (err) {
    showFormError(errorEl, formatAuthError(err.code, err.message));
    console.error('Login error:', err);
  } finally {
    showLoading(false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = $('reg-username').value.trim().toLowerCase();
  const displayName = $('reg-displayname').value.trim();
  const email = $('reg-email').value.trim();
  const password = $('reg-password').value;
  const errorEl = $('register-error');
  if (errorEl) errorEl.textContent = '';

  if (!/^[a-z0-9_]+$/.test(username)) {
    showFormError(errorEl, t('error.form.username_format'));
    return;
  }

  if (!displayName || !email || !password) {
    showFormError(errorEl, t('error.form.all_fields_required'));
    return;
  }

  let cred = null;
  _registrationInFlight = true;
  try {
    showLoading(true);

    // Step 1: create the Auth account so we have a real uid for the
    // usernames write that follows. The onAuthStateChanged listener
    // will fire as soon as this resolves, but L1.20's flag prevents
    // it from racing into the post-auth UI flow.
    cred = await withTimeout(
      createUserWithEmailAndPassword(auth, email, password),
      'Creating Firebase Auth account',
      15000
    );

    // Step 2: usernames/{lowercase} is the atomic uniqueness lock.
    // The rule only allows create when the doc doesn't exist, so two
    // simultaneous claims for the same username can never both win.
    // permission-denied here = doc already exists = username taken.
    try {
      await withTimeout(
        setDoc(doc(db, 'usernames', username), {
          uid: cred.user.uid,
          createdAt: serverTimestamp()
        }),
        'Reserving username',
        15000
      );
    } catch (usernameErr) {
      // Any failure here means the registration didn't complete the
      // usernames step. Clean up any docs ensureUserProfile may have
      // raced in (best-effort), then the Auth account, then surface
      // the right error. Firestore-deletes BEFORE Auth-delete because
      // Firestore rules need auth.uid context. (L1.20 fix.)
      if (cred?.user) {
        const uid = cred.user.uid;
        try { await deleteDoc(doc(db, 'users', uid)); } catch (e) { /* best-effort */ }
        try { await deleteDoc(doc(db, 'stats', uid)); } catch (e) { /* best-effort */ }
        try { await cred.user.delete(); }
        catch (cleanupErr) { console.error('Auth cleanup failed:', cleanupErr); }
        cred = null;
      }
      if (usernameErr.code === 'permission-denied') {
        // permission-denied at this point means EITHER the usernames doc
        // already exists (atomicity gate fired — true collision) OR the
        // project's rules don't permit usernames writes at all (e.g., the
        // legacy hiraquest0 project; see docs/Firestore_Rules.md carve-out).
        // We surface "Username already taken" in both cases — the UX is
        // close enough, and the underlying cause shows up in console.
        throw new Error('USERNAME_TAKEN');
      }
      throw usernameErr;
    }

    // Step 3: profile + display name + stats. From here on, failures
    // leave the usernames/ reservation in place — acceptable because
    // the user still owns it (uid matches) and retry will work.
    await withTimeout(updateProfile(cred.user, { displayName }), 'Saving display name', 15000);

    await withTimeout(setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      username,
      displayName,
      email,
      avatarEmoji: '🌸',
      createdAt: serverTimestamp(),
      status: 'offline'
    }), 'Creating user profile', 15000);

    await withTimeout(setDoc(doc(db, 'stats', cred.user.uid), {
      userId: cred.user.uid,
      totalGames: 0,
      duelsWon: 0,
      duelsLost: 0,
      highestSoloScore: 0,
      highestCoopScore: 0,
      charactersMastered: [],
      createdAt: serverTimestamp()
    }), 'Creating stats profile', 15000);

    // L1.20: onAuthStateChanged's post-auth flow was skipped earlier
    // because _registrationInFlight was true. Trigger the entry now
    // that registration is complete.
    await enterAppAsUser(cred.user, true);
  } catch (err) {
    if (err.message === 'USERNAME_TAKEN') {
      showFormError(errorEl, t('error.username_taken'));
    } else {
      showFormError(errorEl, formatAuthError(err.code, err.message));
    }
    console.error('Register error:', err);
  } finally {
    _registrationInFlight = false;
    showLoading(false);
  }
}

async function logout() {
  try {
    cleanupGame();
    cleanupDuel();
    cleanupCoop();
    stopDuelInvites();
    if (state.user) {
      await setDoc(doc(db, 'presence', state.user.uid), {
        status: 'offline',
        lastSeen: serverTimestamp()
      }, { merge: true });
    }
    // L1.14: clear Sentry user context before sign-out so subsequent
    // errors during/after logout don't carry the previous user's id.
    sentrySetUserContext(null);
    await signOut(auth);
  } catch (err) {
    toast(t('error.logout_failed', { message: err.message }), 'error');
  }
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.auth-form').forEach(f => {
    f.classList.toggle('active', f.dataset.form === tab);
  });
}

// ============================================
// LANDING (unauthenticated default)
// ============================================

// Hero counter — parametric translation (Pattern D from L1.02). Re-rendered
// on init AND on every locale change. L1.04 ships the baseline-only display;
// L1.09 will wire the real Brevo count on top of the baseline.
function renderHeroCounter() {
  const el = $('hero-counter');
  if (!el) return;
  el.textContent = t('hero.counter_line', { count: WAITLIST_BASELINE });
}

// L1.12: keep the browser-tab title in sync with the active locale.
// The static <title> in index.html serves search engines + social
// crawlers (EN — bots typically don't run JS). This function takes
// over for browser-tab UX so AR users see the AR title in their tab.
// Also updates the meta description for any browsers that surface it
// in page-info panels. The static description in index.html (EN)
// remains the SEO-authoritative version.
function updateLocaleAwareSeo() {
  const titleKey = t('seo.page_title');
  if (titleKey && titleKey !== 'seo.page_title') {
    document.title = titleKey;
  }
  const descMeta = document.querySelector('meta[name="description"]');
  const descKey = t('seo.meta_description');
  if (descMeta && descKey && descKey !== 'seo.meta_description') {
    descMeta.setAttribute('content', descKey);
  }
}

function showAuthScreen() { showScreen('screen-auth'); }
function showLandingScreen() { showScreen('screen-landing'); }

// Basic email-shape check; the CTA stays disabled until this passes.
// Same regex used in handleWaitlistSubmit so the gate is consistent.
const WAITLIST_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function updateWaitlistSubmitState() {
  const email = $('waitlist-email')?.value.trim() || '';
  const submitBtn = $('waitlist-submit');
  if (submitBtn) submitBtn.disabled = !WAITLIST_EMAIL_RE.test(email);
}

// ============================================
// COOKIE CONSENT (L1.10)
// ============================================

// Read the stored decision. Returns null if absent / malformed / expired.
function loadConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.v !== CONSENT_VERSION) return null;
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Persist a decision with 1-year expiry. Shape:
//   { v, decidedAt, expiresAt, analytics, errorContext }
// L1.11 (GA4) + L1.14 (Sentry) read these flags to gate user context.
// L1.11: also propagates the analytics decision to GA4 immediately so
// Consent Mode v2 flips analytics_storage to granted/denied without
// requiring a page reload.
function saveConsent({ analytics, errorContext }) {
  const now = Date.now();
  const decision = {
    v: CONSENT_VERSION,
    decidedAt: now,
    expiresAt: now + CONSENT_TTL_MS,
    analytics: !!analytics,
    errorContext: !!errorContext
  };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(decision));
  } catch (err) {
    console.warn('[consent] Failed to persist decision:', err);
  }
  ga4UpdateConsent(decision.analytics);
  // L1.14: Sentry user-context attachment follows errorContext + sign-in
  // state. If user just revoked errorContext: clear context immediately.
  // If user just granted it AND is signed in: attach. The setUserContext
  // helper internally re-checks the consent flag too (belt-and-suspenders).
  if (state.user && decision.errorContext) {
    sentrySetUserContext({ uid: state.user.uid, email: state.user.email });
  } else {
    sentrySetUserContext(null);
  }
  return decision;
}

function hideConsentBanner() {
  $('consent-banner')?.setAttribute('hidden', '');
}

function showConsentBannerIfNeeded() {
  if (loadConsent()) return;
  $('consent-banner')?.removeAttribute('hidden');
}

function openConsentModal() {
  const modal = $('consent-modal');
  if (!modal) return;
  // Sync toggles with the current saved decision (or defaults).
  const current = loadConsent();
  const analyticsToggle = $('consent-toggle-analytics');
  const errorToggle = $('consent-toggle-error');
  if (analyticsToggle) analyticsToggle.checked = current ? current.analytics : true;
  if (errorToggle) errorToggle.checked = current ? current.errorContext : true;
  modal.removeAttribute('hidden');
  // Focus the first interactive element for keyboard users.
  setTimeout(() => $('consent-toggle-analytics')?.focus(), 100);
}

function closeConsentModal() {
  $('consent-modal')?.setAttribute('hidden', '');
}

function handleConsentAccept() {
  saveConsent({ analytics: true, errorContext: true });
  hideConsentBanner();
}

function handleConsentReject() {
  saveConsent({ analytics: false, errorContext: false });
  hideConsentBanner();
}

function handleConsentModalSave() {
  const analytics = !!$('consent-toggle-analytics')?.checked;
  const errorContext = !!$('consent-toggle-error')?.checked;
  saveConsent({ analytics, errorContext });
  closeConsentModal();
  hideConsentBanner();
}

// ESC closes the customize modal (banner stays visible — user still
// needs to choose). Click-outside-card closes too. Both per modal UX
// conventions; the banner itself is non-dismissible without choosing.
function onConsentModalKeydown(e) {
  if (e.key === 'Escape' && !$('consent-modal')?.hasAttribute('hidden')) {
    closeConsentModal();
  }
}

async function handleWaitlistSubmit(e) {
  e.preventDefault();
  const emailEl = $('waitlist-email');
  const errorEl = $('waitlist-error');
  const email = emailEl ? emailEl.value.trim() : '';
  if (errorEl) errorEl.textContent = '';

  // Basic format check; the disposable-domain blocklist + Brevo
  // integration lands in L1.08 (Commercialization_Plan §5). The CTA
  // is also gated by updateWaitlistSubmitState() on input events, so
  // this is the second line of defense (paste of an invalid email or
  // programmatic submit).
  if (!email || !WAITLIST_EMAIL_RE.test(email)) {
    if (errorEl) errorEl.textContent = t('error.auth.invalid_email');
    return;
  }

  // L1.04 stub — the real Brevo /v3/contacts POST is L1.08. Premium-
  // modern feedback: hide the form + counter, fade in an inline success
  // card in the same vertical position. Beats the top-corner toast for
  // a celebration moment (saved as feedback-premium-modern-ux memory).
  $('form-waitlist')?.setAttribute('hidden', '');
  $('hero-counter')?.setAttribute('hidden', '');
  $('waitlist-success')?.removeAttribute('hidden');

  // L1.11: GA4 event. Honors Consent Mode v2 — when analytics_storage
  // is 'denied', gtag sends only the anonymized consent-mode ping
  // (no user data). Source param lets us tell apart hero submits from
  // future per-section CTAs if we add them.
  ga4TrackEvent('waitlist_signup', { source: 'landing_hero' });
}

// ============================================
// PRESENCE & FRIEND SYSTEM
// ============================================

let presenceUnsub = null;

function initPresence() {
  if (!state.user) return;

  setDoc(doc(db, 'presence', state.user.uid), {
    userId: state.user.uid,
    username: state.userData?.username,
    displayName: state.userData?.displayName,
    avatarEmoji: state.userData?.avatarEmoji || '🌸',
    status: 'online',
    lastSeen: serverTimestamp()
  }, { merge: true }).catch(err => {
    console.error('Presence update failed:', err);
  });

  window.addEventListener('beforeunload', () => {
    setDoc(doc(db, 'presence', state.user.uid), {
      status: 'offline',
      lastSeen: serverTimestamp()
    }, { merge: true });
  });

  presenceUnsub = onSnapshot(collection(db, 'presence'), (snap) => {
    snap.forEach(docSnap => {
      if (docSnap.id !== state.user?.uid) {
        state.friendPresence = docSnap.data();
        renderFriend();
      }
    });
  }, (err) => {
    console.error('Presence listener failed:', err);
  });
}

function renderFriend() {
  const p = state.friendPresence;
  const nameEl = $('friend-name');
  const statusEl = $('friend-status');
  const avatarEl = $('friend-avatar');
  const inviteBtn = $('btn-invite');

  if (!p) {
    // L1.02 fix: re-add data-i18n on the empty-state name so locale
    // toggle's apply.js can pick it up. The with-friend branch below
    // removes it (friend names don't translate).
    if (nameEl) {
      nameEl.setAttribute('data-i18n', 'dashboard.friend.waiting');
      nameEl.textContent = t('dashboard.friend.waiting');
    }
    if (statusEl) {
      statusEl.innerHTML = '';
      const dot = document.createElement('span');
      dot.className = 'status-dot offline';
      const text = document.createElement('span');
      text.className = 'status-text';
      text.setAttribute('data-i18n', 'dashboard.friend.status_offline');
      text.textContent = t('dashboard.friend.status_offline');
      statusEl.append(dot, text);
    }
    if (inviteBtn) inviteBtn.disabled = true;
    return;
  }

  const isOnline = p.status === 'online' || p.status === 'in_game';
  const dotClass = p.status === 'in_game' ? 'in-game' : (isOnline ? 'online' : 'offline');
  const statusKey = p.status === 'in_game'
    ? 'dashboard.friend.status_in_game'
    : (isOnline ? 'dashboard.friend.status_online' : 'dashboard.friend.status_offline');

  if (nameEl) {
    // L1.02 fix: remove data-i18n so locale-toggle's apply.js doesn't
    // clobber the friend's real name back to "Waiting for friend…".
    nameEl.removeAttribute('data-i18n');
    nameEl.textContent = p.displayName || p.username || 'Friend';
  }
  if (avatarEl) avatarEl.textContent = p.avatarEmoji || state.friend?.avatarEmoji || '🎮';
  if (statusEl) {
    statusEl.innerHTML = '';
    const dot = document.createElement('span');
    dot.className = `status-dot ${dotClass}`;
    const text = document.createElement('span');
    text.className = 'status-text';
    // Status text DOES translate (Online / Offline / In a game) — set
    // data-i18n to the current state's key so locale toggle propagates.
    text.setAttribute('data-i18n', statusKey);
    text.textContent = t(statusKey);
    statusEl.append(dot, text);
  }
  if (inviteBtn) inviteBtn.disabled = !isOnline;

  if (isOnline) {
    const lastToast = sessionStorage.getItem('last-online-toast');
    const now = Date.now();
    const notifyToggle = $('toggle-notify');
    if ((!lastToast || (now - parseInt(lastToast)) > 60000) && notifyToggle && notifyToggle.checked) {
      toast(t('dashboard.friend.online_toast', { name: p.displayName || p.username }), 'success');
      sessionStorage.setItem('last-online-toast', now.toString());
    }
  }

  // Let the multiplayer engines react to opponent disconnects.
  duelOnFriendPresence(p);
  coopOnFriendPresence(p);
}

// ============================================
// CONTENT SETS
// ============================================

async function loadContentSets() {
  try {
    const snap = await withTimeout(getDocs(collection(db, 'content_sets')), 'Loading Hiragana sets', 12000);
    state.contentSets = [];
    snap.forEach(docSnap => {
      state.contentSets.push({ id: docSnap.id, ...docSnap.data() });
    });
    state.contentSets.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (err) {
    console.error('Failed to load content sets:', err);
    toast(t('error.content_sets_load_failed'), 'error');
  }
}

function totalCharCount() {
  const chars = new Set();
  state.contentSets.forEach(s => (s.characters || []).forEach(c => chars.add(c.char)));
  return chars.size;
}

function renderSets() {
  const grid = $('sets-grid');
  if (!grid) return;
  grid.innerHTML = '';

  state.contentSets.forEach(set => {
    const el = document.createElement('div');
    el.className = 'set-item';
    el.dataset.id = set.id;
    el.addEventListener('click', () => toggleSet(set.id));

    const chars = (set.characters || []).map(c => c.char).join(' ');
    el.innerHTML = `
      <div class="set-checkbox"></div>
      <div class="set-info">
        <div class="set-name">${set.name || set.id}</div>
        <div class="set-chars">${chars}</div>
      </div>
      <div class="set-count">${set.characters?.length || 0}</div>
    `;
    grid.appendChild(el);
  });

  renderCustomGrid();
}

function renderCustomGrid() {
  const grid = $('custom-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const allChars = [];
  state.contentSets.forEach(set => {
    (set.characters || []).forEach(c => {
      if (!allChars.find(x => x.char === c.char)) {
        allChars.push({ ...c, setId: set.id });
      }
    });
  });

  allChars.forEach(c => {
    const el = document.createElement('div');
    el.className = 'char-tile';
    el.dataset.char = c.char;
    el.addEventListener('click', () => toggleChar(c.char));
    el.innerHTML = `<span class="jp">${c.char}</span><span class="romaji">${c.romaji}</span>`;
    grid.appendChild(el);
  });
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
  if (!state.user) return;
  try {
    const statsDoc = await getDoc(doc(db, 'stats', state.user.uid));
    const stats = statsDoc.exists() ? statsDoc.data() : {};

    const masteredCount = (stats.charactersMastered || []).length;
    const total = totalCharCount() || 46;

    const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };
    set('stat-total', stats.totalGames || 0);
    set('stat-best', (stats.highestSoloScore || 0).toLocaleString());
    set('stat-record', `${stats.duelsWon || 0}–${stats.duelsLost || 0}`);
    set('stat-coop', (stats.highestCoopScore || 0).toLocaleString());
    set('stat-mastered', `${masteredCount}/${total}`);

    const pct = Math.round((masteredCount / total) * 100);
    set('mastery-percent', `${pct}%`);
    const fill = $('mastery-fill');
    if (fill) fill.style.width = `${pct}%`;

    renderUserIdentity();

    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach(u => {
      if (u.id !== state.user.uid) state.friend = u.data();
    });

    renderFriend();
    renderLeaderboardPreview();
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

async function loadHistory() {
  const list = $('history-list');
  if (!list || !state.user) return;
  try {
    const q = query(
      collection(db, 'game_sessions'),
      where('playerIds', 'array-contains', state.user.uid),
      limit(20)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = `<p class="empty-state">${escapeText(t('dashboard.history.empty'))}</p>`;
      return;
    }

    const games = [];
    snap.forEach(docSnap => games.push(docSnap.data()));
    games.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

    list.innerHTML = '';
    games.slice(0, 6).forEach(data => {
      const type = data.gameType || 'game';
      const date = new Date(toMillis(data.createdAt)).toLocaleDateString();
      const item = document.createElement('div');
      item.className = 'history-item';

      let metaHtml;
      if (type === 'duel') {
        const iWon = data.winnerId === state.user.uid;
        const result = data.isDraw
          ? t('dashboard.history.result_draw')
          : (iWon ? t('dashboard.history.result_won') : t('dashboard.history.result_lost'));
        const cls = data.isDraw ? '' : (iWon ? 'res-win' : 'res-loss');
        const oppText = t('dashboard.history.vs_opponent', { name: opponentNameFrom(data) });
        metaHtml = `<div class="history-score ${cls}">${escapeText(result)}</div>
                    <div class="history-sub">${escapeText(oppText)}</div>`;
      } else if (type === 'coop') {
        const scoreText = t('dashboard.history.score_pts', { score: (data.finalScore || 0).toLocaleString() });
        const subText = data.endReason === 'cleared'
          ? t('dashboard.history.all_cleared')
          : t('dashboard.history.team_run');
        metaHtml = `<div class="history-score">${escapeText(scoreText)}</div>
                    <div class="history-sub">${escapeText(subText)}</div>`;
      } else {
        const scoreText = t('dashboard.history.score_pts', { score: (data.score || 0).toLocaleString() });
        const accText = t('dashboard.history.accuracy', { percent: Math.round((data.accuracy || 0) * 100) });
        metaHtml = `<div class="history-score">${escapeText(scoreText)}</div>
                    <div class="history-sub">${escapeText(accText)}</div>`;
      }

      item.innerHTML = `
        <div>
          <div class="history-mode">${MODE_EMOJI[type] || '🎮'} ${escapeText(modeName(type))}</div>
          <div class="history-date">${escapeText(date)}</div>
        </div>
        <div class="history-meta">${metaHtml}</div>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    console.error('History load error:', err);
    list.innerHTML = `<p class="empty-state">${escapeText(t('dashboard.history.could_not_load'))}</p>`;
  }
}

function opponentNameFrom(data) {
  const players = data.players || {};
  const oppId = (data.playerIds || []).find(id => id !== state.user.uid);
  return players[oppId]?.displayName || 'opponent';
}

function escapeText(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return new Date(ts).getTime() || 0;
}

// ============================================
// CHARACTER SELECTION
// ============================================

function updateSelectionUI() {
  document.querySelectorAll('.set-item').forEach(el => {
    el.classList.toggle('selected', state.selectedSets.has(el.dataset.id));
  });
  document.querySelectorAll('.char-tile').forEach(el => {
    el.classList.toggle('selected', state.selectedChars.has(el.dataset.char));
  });

  const totalChars = state.selectedChars.size;
  const multiplier = totalChars > 0 ? (totalChars / 5).toFixed(1) : '1.0';

  const countEl = $('selection-count');
  const diffEl = $('selection-difficulty');
  const startBtn = $('btn-start');

  if (countEl) {
    countEl.textContent = totalChars === 1
      ? t('select.footer.count_one', { count: totalChars })
      : t('select.footer.count_other', { count: totalChars });
  }
  if (diffEl) diffEl.textContent = t('select.footer.difficulty', { multiplier });
  if (startBtn) {
    const multiplayer = state.currentGameType === 'duel' || state.currentGameType === 'coop';
    startBtn.disabled = totalChars < (multiplayer ? 4 : 1);
  }
}

function toggleSet(setId) {
  const set = state.contentSets.find(s => s.id === setId);
  if (!set) return;

  if (state.selectedSets.has(setId)) {
    state.selectedSets.delete(setId);
    (set.characters || []).forEach(c => state.selectedChars.delete(c.char));
  } else {
    state.selectedSets.add(setId);
    (set.characters || []).forEach(c => state.selectedChars.add(c.char));
  }
  updateSelectionUI();
}

function toggleChar(char) {
  if (state.selectedChars.has(char)) {
    state.selectedChars.delete(char);
  } else {
    state.selectedChars.add(char);
  }
  state.contentSets.forEach(set => {
    const setChars = (set.characters || []).map(c => c.char);
    const hasAll = setChars.length > 0 && setChars.every(c => state.selectedChars.has(c));
    if (hasAll) state.selectedSets.add(set.id);
    else state.selectedSets.delete(set.id);
  });
  updateSelectionUI();
}

function selectAllSets() {
  state.contentSets.forEach(set => {
    state.selectedSets.add(set.id);
    (set.characters || []).forEach(c => state.selectedChars.add(c.char));
  });
  updateSelectionUI();
}

function clearCustom() {
  state.selectedSets.clear();
  state.selectedChars.clear();
  updateSelectionUI();
}

// ----- Game options (segmented controls) -----

function syncSegmented(groupSelector, attr, value) {
  document.querySelectorAll(`${groupSelector} .seg-btn`).forEach(b => {
    b.classList.toggle('active', b.dataset[attr] === String(value));
  });
}

function setPractice(type) {
  state.practiceType = type;
  localStorage.setItem('tomodachi-practice', type);
  syncSegmented('#seg-practice', 'practice', type);
  const inputRow = $('option-input');
  if (inputRow) inputRow.style.display = type === 'listen' ? 'none' : 'flex';
}

function setInputMethod(method) {
  state.inputMethod = method;
  localStorage.setItem('tomodachi-input', method);
  syncSegmented('#seg-input', 'input', method);
}

function setZenDuration(seconds) {
  state.zenDuration = seconds;
  localStorage.setItem('tomodachi-duration', String(seconds));
  syncSegmented('#seg-duration', 'duration', seconds);
}

function setWinCondition(wc) {
  state.winCondition = wc;
  localStorage.setItem('tomodachi-wincon', wc);
  syncSegmented('#seg-wincon', 'wincon', wc);
}

function setDuelInput(method) {
  state.duelInput = method;
  localStorage.setItem('tomodachi-duelinput', method);
  syncSegmented('#seg-input', 'input', method);
}

function setCoopInput(method) {
  state.coopInput = method;
  localStorage.setItem('tomodachi-coopinput', method);
  syncSegmented('#seg-input', 'input', method);
}

// The shared #seg-input control feeds Zen, Duel, or Co-op by context.
function handleInputSeg(method) {
  if (state.currentGameType === 'duel') setDuelInput(method);
  else if (state.currentGameType === 'coop') setCoopInput(method);
  else setInputMethod(method);
}

// ============================================
// NAVIGATION
// ============================================

function goHome() {
  cleanupGame();
  cleanupDuel();
  cleanupCoop();
  state.returnScreen = null;
  showScreen('screen-dashboard');
  loadDashboard();
  loadHistory();
}

function navBrandClick() {
  if (isInDuel()) { exitDuel(); return; }
  if (isInCoop()) { exitCoop(); return; }
  goHome();
}

function goToSelect(gameType) {
  state.currentGameType = gameType;

  const subEl = $('select-subtitle');
  const infoEl = $('select-options-info');
  const practiceRow = $('option-practice');
  const inputRow = $('option-input');
  const durationRow = $('option-duration');
  const winconRow = $('option-wincon');
  const startBtn = $('btn-start');

  const show = (el, on) => { if (el) el.style.display = on ? 'flex' : 'none'; };

  // L1.02 fix: set data-i18n on the dynamic copy elements so locale
  // toggle's apply.js re-translates them automatically. Without this,
  // a locale switch on the select screen would clobber the mode-specific
  // text back to the static "Choose which Hiragana to include" default.
  const setI18n = (el, key) => {
    if (!el || !key) return;
    el.setAttribute('data-i18n', key);
    el.textContent = t(key);
  };

  if (gameType === 'survival') {
    setI18n(subEl, 'select.subtitle.survival');
    setI18n(infoEl, 'select.info.survival');
    show(practiceRow, false); show(inputRow, false); show(durationRow, false); show(winconRow, false);
    setI18n(startBtn, 'select.start_button.survival');
  } else if (gameType === 'duel') {
    setI18n(subEl, 'select.subtitle.duel');
    setI18n(infoEl, 'select.info.duel');
    show(practiceRow, false); show(durationRow, false);
    show(winconRow, true); show(inputRow, true);
    setWinCondition(state.winCondition);
    setDuelInput(state.duelInput);
    setI18n(startBtn, 'select.start_button.duel');
  } else if (gameType === 'coop') {
    setI18n(subEl, 'select.subtitle.coop');
    setI18n(infoEl, 'select.info.coop');
    show(practiceRow, false); show(durationRow, false); show(winconRow, false);
    show(inputRow, true);
    setCoopInput(state.coopInput);
    setI18n(startBtn, 'select.start_button.coop');
  } else {
    // Zen
    setI18n(subEl, 'select.subtitle.zen');
    setI18n(infoEl, 'select.info.zen');
    show(practiceRow, true); show(durationRow, true); show(winconRow, false);

    const listenBtn = document.querySelector('#seg-practice .seg-btn[data-practice="listen"]');
    if (listenBtn) {
      if (!isSpeechSupported()) {
        listenBtn.disabled = true;
        listenBtn.title = t('select.listen_unsupported');
        if (state.practiceType === 'listen') state.practiceType = 'read';
      } else {
        listenBtn.disabled = false;
        listenBtn.title = '';
      }
    }
    setPractice(state.practiceType);
    setInputMethod(state.inputMethod);
    // Snap any previously-stored duration onto the current option set.
    if (!ZEN_DURATIONS.includes(state.zenDuration)) state.zenDuration = 60;
    setZenDuration(state.zenDuration);
    setI18n(startBtn, 'select.start_button.zen');
  }

  showScreen('screen-select');
  renderSets();
  updateSelectionUI();
}

function handleModeClick(mode) {
  if (mode === 'duel' || mode === 'coop') {
    const fp = state.friendPresence;
    if (!fp || fp.status === 'offline') {
      toast(t('error.friend_offline_for_mp'), 'warning', 4000);
      return;
    }
  }
  goToSelect(mode);
}

function handleStartGame() {
  if (state.currentGameType === 'duel') sendChallenge();
  else if (state.currentGameType === 'coop') sendCoopChallenge();
  else startGame(state.currentGameType);
}

function lobbyCancel() {
  if (isInCoop()) cancelCoopChallenge();
  else cancelChallenge();
}

// ============================================
// SETTINGS
// ============================================

function renderAvatarPicker() {
  const host = $('avatar-picker');
  if (!host) return;
  pendingAvatar = state.userData?.avatarEmoji || '🌸';
  host.innerHTML = '';
  AVATARS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-option';
    btn.textContent = emoji;
    if (emoji === pendingAvatar) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      pendingAvatar = emoji;
      host.querySelectorAll('.avatar-option').forEach(o => {
        o.classList.toggle('selected', o.textContent === emoji);
      });
    });
    host.appendChild(btn);
  });
}

function openSettings() {
  if (isInDuel() || isInCoop()) {
    toast(t('settings.blocked_during_match'), 'info', 3500);
    return;
  }
  state.returnScreen = currentScreen() || 'screen-dashboard';
  if (state.returnScreen === 'screen-game' && isActive()) {
    pauseGame();
  }
  showSettings();
}

function showSettings() {
  showScreen('screen-settings');

  const themeToggle = $('toggle-theme');
  if (themeToggle) themeToggle.checked = state.theme === 'dark';
  const audioToggle = $('toggle-audio');
  if (audioToggle) audioToggle.checked = state.audioEnabled;

  const displayInput = $('settings-displayname');
  const usernameInput = $('settings-username');
  const errorEl = $('settings-profile-error');
  if (displayInput) displayInput.value = state.userData?.displayName || '';
  if (usernameInput) usernameInput.value = state.userData?.username || '';
  if (errorEl) errorEl.textContent = '';

  const versionEl = $('settings-version');
  if (versionEl) versionEl.textContent = t('settings.version', { version: APP_CONFIG.version });

  renderAvatarPicker();
  cancelReset();
}

function settingsBack() {
  const ret = state.returnScreen;
  state.returnScreen = null;
  if (ret === 'screen-game' && isActive()) {
    showScreen('screen-game');
    resumeGame();
  } else if (ret === 'screen-select' || ret === 'screen-leaderboard') {
    showScreen(ret);
  } else {
    goHome();
  }
}

function toggleTheme() {
  setTheme($('toggle-theme').checked ? 'dark' : 'light');
}

function toggleAudio() {
  state.audioEnabled = $('toggle-audio').checked;
  localStorage.setItem('tomodachi-audio', state.audioEnabled);
}

async function saveProfileSettings(e) {
  e.preventDefault();
  if (!state.user) return;

  const displayName = $('settings-displayname').value.trim();
  const username = $('settings-username').value.trim().toLowerCase();
  const errorEl = $('settings-profile-error');
  if (errorEl) errorEl.textContent = '';

  if (!displayName) {
    showFormError(errorEl, t('error.form.display_name_required'));
    return;
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    showFormError(errorEl, t('error.form.username_format'));
    return;
  }

  // L1.19: bring username CHANGE onto the same atomic pattern R2.05
  // established for signup. The old code queried `users` for uniqueness
  // — race-vulnerable when two users in Settings simultaneously try to
  // claim the same available name. Refactor: claim the new
  // usernames/{newLower} doc first (Firestore create semantics is the
  // atomic gate per the R2.05 ruleset), release the old usernames/
  // reservation, then update users/{uid}. The same permission-denied
  // → "Username already taken" idiom as handleRegister.
  const oldUsername = (state.userData?.username || '').toLowerCase();
  const isUsernameChange = username !== oldUsername;

  let claimedNewUsername = false;
  try {
    showLoading(true);

    if (isUsernameChange) {
      // Atomic lock: create the new usernames/ doc. Rule allows create
      // only when the doc doesn't already exist, so two simultaneous
      // claims for the same name can never both win.
      try {
        await withTimeout(setDoc(doc(db, 'usernames', username), {
          uid: state.user.uid,
          createdAt: serverTimestamp()
        }), 'Reserving username', 15000);
        claimedNewUsername = true;
      } catch (usernameErr) {
        if (usernameErr.code === 'permission-denied') {
          // Either a true collision (doc exists, atomicity gate fired)
          // or the project rules don't permit usernames writes (legacy
          // hiraquest0 carve-out). Same UX message in both cases.
          showFormError(errorEl, t('settings.username_taken'));
          return;
        }
        throw usernameErr;
      }

      // Release the old usernames/ reservation. Best-effort: if the
      // user was self-healed by ensureUserProfile's graceful-degradation
      // path (L1.20's reserveFallbackUsername hit 10 collisions and
      // returned without a reservation) there may be no old doc to
      // delete. deleteDoc on a non-existent doc is a no-op.
      if (oldUsername) {
        try {
          await withTimeout(deleteDoc(doc(db, 'usernames', oldUsername)), 'Releasing old username', 15000);
        } catch (releaseErr) {
          // Non-fatal: the new reservation is the source of truth.
          // A leftover usernames/{oldLower} doc is benign — its uid
          // still matches the owner; only its display purpose is stale.
          console.warn('[saveProfileSettings] Old usernames/ release failed:', releaseErr);
        }
      }
    }

    await withTimeout(updateProfile(state.user, { displayName }), 'Updating display name', 15000);
    await withTimeout(setDoc(doc(db, 'users', state.user.uid), {
      uid: state.user.uid,
      username,
      displayName,
      email: state.user.email || '',
      avatarEmoji: pendingAvatar,
      updatedAt: serverTimestamp()
    }, { merge: true }), 'Saving profile', 15000);

    setDoc(doc(db, 'presence', state.user.uid), {
      username, displayName, avatarEmoji: pendingAvatar
    }, { merge: true }).catch(() => {});

    state.userData = {
      ...state.userData,
      uid: state.user.uid,
      username,
      displayName,
      email: state.user.email || '',
      avatarEmoji: pendingAvatar
    };

    renderUserIdentity();
    toast(t('settings.profile_updated'), 'success');
  } catch (err) {
    // If we claimed the new usernames/ doc but a later write failed,
    // release the reservation so the user can retry without seeing a
    // false "Username already taken" on the same name they just typed.
    // No listener-race here (unlike L1.20) — this cleanup runs after
    // the synchronous-failure path, not concurrent with another writer.
    if (claimedNewUsername) {
      try {
        await deleteDoc(doc(db, 'usernames', username));
      } catch (cleanupErr) {
        console.warn('[saveProfileSettings] Rollback of new usernames/ reservation failed:', cleanupErr);
      }
    }
    console.error('Profile save failed:', err);
    showFormError(errorEl, t('settings.profile_save_failed', { message: err.message }));
  } finally {
    showLoading(false);
  }
}

// ----- Danger Zone: reset progress -----

function startReset() {
  const startBtn = $('btn-reset-start');
  const confirmBox = $('reset-confirm');
  if (startBtn) startBtn.hidden = true;
  if (confirmBox) confirmBox.hidden = false;
  const input = $('reset-input');
  if (input) { input.value = ''; input.focus(); }
  const confirmBtn = $('btn-reset-confirm');
  if (confirmBtn) confirmBtn.disabled = true;
}

function cancelReset() {
  const startBtn = $('btn-reset-start');
  const confirmBox = $('reset-confirm');
  const input = $('reset-input');
  if (confirmBox) confirmBox.hidden = true;
  if (startBtn) startBtn.hidden = false;
  if (input) input.value = '';
}

function onResetInput() {
  const input = $('reset-input');
  const confirmBtn = $('btn-reset-confirm');
  if (confirmBtn) confirmBtn.disabled = !input || input.value.trim().toUpperCase() !== 'RESET';
}

async function resetProgress() {
  if (!state.user) return;
  try {
    showLoading(true);

    await setDoc(doc(db, 'stats', state.user.uid), {
      userId: state.user.uid,
      totalGames: 0,
      duelsWon: 0,
      duelsLost: 0,
      highestSoloScore: 0,
      highestCoopScore: 0,
      charactersMastered: [],
      characterAccuracy: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const q = query(
      collection(db, 'game_sessions'),
      where('playerIds', 'array-contains', state.user.uid)
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      const pids = docSnap.data().playerIds || [];
      if (pids.length <= 1) {
        try {
          await deleteDoc(docSnap.ref);
        } catch (err) {
          console.error('Session delete failed:', err);
        }
      }
    }

    await removeUserFromLeaderboards(state.user.uid);

    toast(t('settings.reset_success'), 'success', 5000);
    cancelReset();
    goHome();
  } catch (err) {
    console.error('Reset failed:', err);
    toast(t('settings.reset_failed', { message: err.message }), 'error', 8000);
  } finally {
    showLoading(false);
  }
}

// ============================================
// EVENT WIRING
// ============================================

function attachListeners() {
  // Landing (unauthenticated default)
  $('btn-landing-signin')?.addEventListener('click', showAuthScreen);
  $('btn-auth-back')?.addEventListener('click', showLandingScreen);
  $('form-waitlist')?.addEventListener('submit', handleWaitlistSubmit);
  // CTA stays disabled until the email matches a basic valid shape. The
  // user can't click the button into an invalid-submit attempt — premium-
  // modern affordance over the previous always-clickable form.
  $('waitlist-email')?.addEventListener('input', updateWaitlistSubmitState);

  // Cookie consent (L1.10) — banner buttons + customize modal wiring.
  $('btn-consent-accept')?.addEventListener('click', handleConsentAccept);
  $('btn-consent-reject')?.addEventListener('click', handleConsentReject);
  $('btn-consent-customize')?.addEventListener('click', openConsentModal);
  $('btn-consent-modal-save')?.addEventListener('click', handleConsentModalSave);
  $('btn-consent-modal-cancel')?.addEventListener('click', closeConsentModal);
  $('consent-modal-backdrop')?.addEventListener('click', closeConsentModal);
  document.addEventListener('keydown', onConsentModalKeydown);

  // Auth tabs + forms
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
  });
  $('form-login')?.addEventListener('submit', handleLogin);
  $('form-register')?.addEventListener('submit', handleRegister);

  // Nav
  $('nav-brand')?.addEventListener('click', navBrandClick);
  $('btn-settings')?.addEventListener('click', openSettings);
  $('btn-logout')?.addEventListener('click', logout);

  // Game mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => handleModeClick(btn.dataset.mode));
  });

  // Character select + options
  $('btn-select-back')?.addEventListener('click', goHome);
  $('btn-select-all')?.addEventListener('click', selectAllSets);
  $('btn-clear-custom')?.addEventListener('click', clearCustom);
  $('btn-start')?.addEventListener('click', handleStartGame);
  document.querySelectorAll('#seg-practice .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => setPractice(btn.dataset.practice));
  });
  document.querySelectorAll('#seg-input .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => handleInputSeg(btn.dataset.input));
  });
  document.querySelectorAll('#seg-duration .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => setZenDuration(Number(btn.dataset.duration)));
  });
  document.querySelectorAll('#seg-wincon .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => setWinCondition(btn.dataset.wincon));
  });

  // Leaderboard
  $('btn-leaderboard')?.addEventListener('click', openLeaderboard);
  $('btn-lb-back')?.addEventListener('click', goHome);

  // Settings
  $('btn-settings-back')?.addEventListener('click', settingsBack);
  $('form-profile')?.addEventListener('submit', saveProfileSettings);
  $('toggle-theme')?.addEventListener('change', toggleTheme);
  $('toggle-audio')?.addEventListener('change', toggleAudio);

  // Danger zone
  $('btn-reset-start')?.addEventListener('click', startReset);
  $('btn-reset-cancel')?.addEventListener('click', cancelReset);
  $('reset-input')?.addEventListener('input', onResetInput);
  $('btn-reset-confirm')?.addEventListener('click', resetProgress);

  // Friend bar
  $('btn-invite')?.addEventListener('click', () => handleModeClick('duel'));

  // Solo game screen
  $('game-exit')?.addEventListener('click', requestExit);
  $('game-speak')?.addEventListener('click', speakCurrent);
  $('pause-resume')?.addEventListener('click', resumeFromPause);
  $('results-again')?.addEventListener('click', playAgain);
  $('results-home')?.addEventListener('click', goHome);

  // Multiplayer invites + lobby
  $('invite-accept')?.addEventListener('click', acceptInvite);
  $('invite-decline')?.addEventListener('click', declineInvite);
  $('lobby-cancel')?.addEventListener('click', lobbyCancel);

  // Duel
  $('duel-exit')?.addEventListener('click', exitDuel);
  $('duel-result-home')?.addEventListener('click', exitDuel);
  $('duel-result-rematch')?.addEventListener('click', playAgainDuel);
  $('duel-stall-leave')?.addEventListener('click', resolveStall);

  // Co-op
  $('coop-exit')?.addEventListener('click', exitCoop);
  $('coop-result-home')?.addEventListener('click', exitCoop);
  $('coop-result-again')?.addEventListener('click', playAgainCoop);
  $('coop-stall-leave')?.addEventListener('click', resolveCoopStall);

  // Internal navigation events
  document.addEventListener('hq:gohome', goHome);
  document.addEventListener('hq:duel-rematch', () => sendChallenge());
  document.addEventListener('hq:coop-rematch', () => sendCoopChallenge());
}

// ============================================
// INITIALIZATION
// ============================================

// Extracted from init() so handleRegister can trigger the post-auth
// entry directly on successful registration (the onAuthStateChanged
// listener skips this flow during registration to avoid the L1.20
// race; handleRegister calls this here itself once registration is
// complete).
async function enterAppAsUser(user, isFreshRegistration = false) {
  state.user = user;

  try {
    state.userData = await ensureUserProfile(user);
  } catch (err) {
    console.error('Profile load failed:', err);
    state.userData = fallbackUserData(user);
    toast(t('error.profile_load_failed', { message: err.message }), 'error', 8000);
  }

  // L1.14: attach Sentry user context (uid + email) so subsequent
  // errors carry the user identity. Internally gated by consent
  // .errorContext — no-op when consent is denied or unset.
  sentrySetUserContext({ uid: user.uid, email: user.email });

  $('screen-auth')?.classList.remove('active');
  $('screen-landing')?.classList.remove('active');
  $('app')?.classList.remove('hidden');

  initPresence();
  await loadContentSets();
  goHome();
  initDuelInvites();

  const name = state.userData?.displayName || t('nav.user_default_name');
  toast(
    t(isFreshRegistration ? 'toast.welcome_new' : 'toast.welcome_back', { name }),
    'success'
  );
}

// Wire the EN | AR locale toggles in both the auth-screen and nav bars.
// Sets active state for visual feedback; setLocale's languageChanged event
// re-walks the DOM (via i18n/index.js) so substitution stays in sync.
function bindLocaleToggles() {
  const update = () => {
    const cur = getLocale();
    document.querySelectorAll('.locale-toggle').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.locale === cur);
    });
  };
  document.querySelectorAll('.locale-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      await setLocale(btn.dataset.locale);
      update();
    });
  });
  update();
}

async function init() {
  setTheme(state.theme);
  // initI18n must run BEFORE attachListeners + onAuthStateChanged so that
  // t() is callable everywhere downstream (auth listener may call enter-
  // AppAsUser immediately on cached session, which calls t() for toasts).
  await initI18n();
  attachListeners();
  bindLocaleToggles();

  // Initial render for parametric strings the markup can't carry on its
  // own (i.e., values that interpolate vars from JS state).
  renderHeroCounter();
  // L1.12: locale-aware document.title + meta description (the static
  // ones in index.html stay as EN for crawlers).
  updateLocaleAwareSeo();

  // L1.11: boot GA4 with Consent Mode v2 default-denied. If a prior
  // consent decision exists in localStorage, propagate it immediately
  // so the user doesn't see the consent banner reappear after
  // accepting once. No-ops when the env has no Measurement ID set.
  initGA4();
  // L1.14: boot Sentry. SDK is lazy-loaded only when a DSN is set in
  // js/config/sentry.js; otherwise no-op. Errors capture anonymously
  // by default; user context attaches separately on enterAppAsUser
  // (and only if consent.errorContext is granted).
  initSentry();
  const existingConsent = loadConsent();
  if (existingConsent) ga4UpdateConsent(existingConsent.analytics);

  // L1.10: show the cookie consent banner if no valid decision is on
  // file. Idempotent — no-op once a decision is saved (with 1-year TTL).
  showConsentBannerIfNeeded();

  // L1.02: re-run the parametric t() renders that apply.js can't update
  // on its own (it only handles static [data-i18n] nodes; vars like the
  // {{name}} in "Welcome back, {{name}}" live in JS state).
  onLocaleChange(() => {
    if (state.userData) renderUserIdentity();
    renderHeroCounter();
    updateLocaleAwareSeo();
  });

  onAuthStateChanged(auth, async (user) => {
    // L1.20: handleRegister sets _registrationInFlight while it's mid-
    // sequence. Skip the post-auth UI flow (and the ensureUserProfile
    // self-heal inside it) during registration so they don't race the
    // mainline. handleRegister calls enterAppAsUser itself on success.
    if (user && _registrationInFlight) return;

    showLoading(true);
    try {
      if (user) {
        await enterAppAsUser(user, false);
      } else {
        cleanupGame();
        cleanupDuel();
        cleanupCoop();
        stopDuelInvites();
        state.user = null;
        state.userData = null;
        if (presenceUnsub) { presenceUnsub(); presenceUnsub = null; }

        $('app')?.classList.add('hidden');
        // L1.04: unauthenticated users now land on the waitlist hero.
        // The auth-screen is still reachable via the "Sign in" link in
        // the landing nav.
        showScreen('screen-landing');
      }
    } catch (err) {
      console.error('App startup failed:', err);
      toast(t('error.app_startup_failed', { message: err.message }), 'error', 10000);
    } finally {
      showLoading(false);
    }
  });
}

init();
