// ============================================
// HiraQuest Main Application - FIXED VERSION
// Phase 1: Auth, Dashboard, Character Select, Presence
// ============================================

import { firebaseConfig, APP_CONFIG } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  addDoc,
  limit
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// ----- Initialize Firebase -----
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

// ----- Global State -----
const state = {
  user: null,
  userData: null,
  friend: null,
  friendPresence: null,
  contentSets: [],
  selectedSets: new Set(),
  selectedChars: new Set(),
  currentGameType: null,
  audioEnabled: true,
  theme: localStorage.getItem('hiraquest-theme') || APP_CONFIG.defaultTheme
};

// ----- DOM Helpers -----
const $ = (id) => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $(id);
  if (el) el.classList.add('active');
}

function showLoading(show) {
  const overlay = $('loading-overlay');
  if (overlay) overlay.classList.toggle('active', show);
}

function toast(message, type = 'info', duration = 3000) {
  const container = $('toast-container');
  if (!container) return;

  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  toastEl.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toastEl);

  setTimeout(() => {
    toastEl.classList.add('leaving');
    setTimeout(() => toastEl.remove(), 300);
  }, duration);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('hiraquest-theme', theme);
  state.theme = theme;
  const toggle = $('toggle-theme');
  if (toggle) toggle.checked = theme === 'dark';
}

function withTimeout(promise, label, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)} seconds.`)), ms);
    })
  ]);
}

function fallbackUserData(user) {
  const emailName = user.email?.split('@')[0] || 'player';
  return {
    displayName: user.displayName || emailName,
    username: emailName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    avatarEmoji: '🌸'
  };
}

async function ensureUserProfile(user) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await withTimeout(getDoc(userRef), 'Loading your profile', 15000);

  if (userDoc.exists()) {
    return userDoc.data();
  }

  const profile = {
    uid: user.uid,
    ...fallbackUserData(user),
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

  toast('Created your missing profile document.', 'success', 5000);
  return profile;
}

// ============================================
// AUTHENTICATION
// ============================================

function formatAuthError(code, fallbackMessage = '') {
  const map = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-login-credentials': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/operation-not-allowed': 'Email/password login is not enabled in Firebase Authentication.',
    'auth/api-key-not-valid': 'Firebase rejected this API key. Check the deployed config.',
    'auth/app-not-authorized': 'This domain is not authorized for this Firebase app.',
    'auth/unauthorized-domain': 'This domain is not authorized in Firebase Authentication settings.'
  };
  if (code && map[code]) return map[code];
  if (fallbackMessage) return fallbackMessage;
  return code ? `Authentication failed (${code}). Please try again.` : 'Authentication failed. Please try again.';
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
    showFormError(errorEl, 'Enter both email and password.');
    return;
  }

  try {
    showLoading(true);
    await withTimeout(signInWithEmailAndPassword(auth, email, password), 'Signing in', 15000);
    toast('Signed in. Loading dashboard...', 'success');
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
    showFormError(errorEl, 'Username must be lowercase letters, numbers, or underscores only.');
    return;
  }

  if (!displayName || !email || !password) {
    showFormError(errorEl, 'Fill in every field before creating an account.');
    return;
  }

  try {
    showLoading(true);

    // Check 2-user limit
    const usersSnap = await withTimeout(getDocs(collection(db, 'users')), 'Checking account limit', 15000);
    if (usersSnap.size >= APP_CONFIG.maxUsers) {
      showFormError(errorEl, 'HiraQuest is full! Only 2 accounts are allowed.');
      showLoading(false);
      return;
    }

    // Check username uniqueness
    const usernameQuery = query(collection(db, 'users'), where('username', '==', username), limit(1));
    const usernameSnap = await withTimeout(getDocs(usernameQuery), 'Checking username', 15000);
    if (!usernameSnap.empty) {
      showFormError(errorEl, 'Username already taken.');
      showLoading(false);
      return;
    }

    // Create auth account
    const cred = await withTimeout(createUserWithEmailAndPassword(auth, email, password), 'Creating Firebase Auth account', 15000);
    await withTimeout(updateProfile(cred.user, { displayName }), 'Saving display name', 15000);

    // Create user document
    await withTimeout(setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      username,
      displayName,
      email,
      avatarEmoji: '🌸',
      createdAt: serverTimestamp(),
      status: 'offline'
    }), 'Creating user profile', 15000);

    // Create stats document
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

    toast('Account created! Welcome to HiraQuest.', 'success');

  } catch (err) {
    showFormError(errorEl, formatAuthError(err.code, err.message));
    console.error('Register error:', err);
  } finally {
    showLoading(false);
  }
}

async function logout() {
  try {
    if (state.user) {
      await setDoc(doc(db, 'presence', state.user.uid), {
        status: 'offline',
        lastSeen: serverTimestamp()
      }, { merge: true });
    }
    await signOut(auth);
  } catch (err) {
    toast('Logout failed: ' + err.message, 'error');
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
// PRESENCE & FRIEND SYSTEM
// ============================================

let presenceUnsub = null;

function initPresence() {
  if (!state.user) return;

  setDoc(doc(db, 'presence', state.user.uid), {
    userId: state.user.uid,
    username: state.userData?.username,
    displayName: state.userData?.displayName,
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
  const inviteBtn = $('btn-invite');
  const navDot = $('nav-presence');

  if (!p) {
    if (nameEl) nameEl.textContent = 'Waiting for friend...';
    if (statusEl) statusEl.innerHTML = `<span class="status-dot offline"></span><span class="status-text">Offline</span>`;
    if (inviteBtn) inviteBtn.disabled = true;
    if (navDot) navDot.className = 'presence-dot';
    return;
  }

  const isOnline = p.status === 'online' || p.status === 'in_game';
  const dotClass = p.status === 'in_game' ? 'in-game' : (isOnline ? 'online' : 'offline');
  const statusText = p.status === 'in_game' ? 'In Game' : (isOnline ? 'Online' : 'Offline');

  if (nameEl) nameEl.textContent = p.displayName || p.username || 'Friend';
  if (statusEl) statusEl.innerHTML = `<span class="status-dot ${dotClass}"></span><span class="status-text">${statusText}</span>`;
  if (inviteBtn) inviteBtn.disabled = !isOnline;
  if (navDot) navDot.className = `presence-dot ${dotClass}`;

  if (isOnline) {
    const lastToast = sessionStorage.getItem('last-online-toast');
    const now = Date.now();
    const notifyToggle = $('toggle-notify');
    if ((!lastToast || (now - parseInt(lastToast)) > 60000) && notifyToggle && notifyToggle.checked) {
      toast(`${p.displayName || p.username} is online!`, 'success');
      sessionStorage.setItem('last-online-toast', now.toString());
    }
  }
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
    toast('Failed to load Hiragana sets. Make sure database is seeded.', 'error');
  }
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

    const totalEl = $('stat-total');
    const winsEl = $('stat-wins');
    const bestEl = $('stat-best');
    if (totalEl) totalEl.textContent = stats.totalGames || 0;
    if (winsEl) winsEl.textContent = stats.duelsWon || 0;
    if (bestEl) bestEl.textContent = stats.highestSoloScore || 0;

    const welcomeEl = $('dash-welcome');
    const displayEl = $('dash-displayname');
    const usernameEl = $('dash-username');
    const avatarEl = $('dash-avatar');
    const navNameEl = $('nav-name');

    if (welcomeEl) welcomeEl.textContent = state.userData?.displayName || 'Player';
    if (displayEl) displayEl.textContent = state.userData?.displayName || 'Player';
    if (usernameEl) usernameEl.textContent = `@${state.userData?.username || 'player'}`;
    if (avatarEl) avatarEl.textContent = state.userData?.avatarEmoji || '🌸';
    if (navNameEl) navNameEl.textContent = state.userData?.displayName || 'Player';

    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach(u => {
      if (u.id !== state.user.uid) {
        state.friend = u.data();
      }
    });

    renderFriend();
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

async function loadHistory() {
  try {
    const q = query(
      collection(db, 'game_sessions'),
      where('players', 'array-contains', state.user.uid),
      limit(5)
    );
    const snap = await getDocs(q);
    const list = $('history-list');
    if (!list) return;

    if (snap.empty) {
      list.innerHTML = '<p class="empty-state">No games played yet.</p>';
      return;
    }

    list.innerHTML = '';
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const isDuel = data.gameType === 'duel';
      const result = isDuel
        ? (data.winner === state.user.uid ? 'Victory' : 'Defeat')
        : 'Completed';
      const color = result === 'Victory' ? 'var(--success)' : (result === 'Defeat' ? 'var(--danger)' : 'var(--accent)');

      const item = document.createElement('div');
      item.style.cssText = 'padding: 12px 0; border-bottom: 1px solid var(--border); display:flex; justify-content:space-between; align-items:center;';
      item.innerHTML = `
        <div>
          <div style="font-weight:600; font-size:0.9375rem;">${(data.gameType || 'GAME').toUpperCase()}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">${new Date(data.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</div>
        </div>
        <div style="font-weight:700; color:${color}; font-size:0.875rem;">${result}</div>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    console.error('History load error:', err);
  }
}

// ============================================
// CHARACTER SELECTION LOGIC
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

  if (countEl) countEl.textContent = `${totalChars} character${totalChars !== 1 ? 's' : ''} selected`;
  if (diffEl) diffEl.textContent = `Difficulty: ${multiplier}x`;
  if (startBtn) startBtn.disabled = totalChars === 0;
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
    state.contentSets.forEach(set => {
      const setChars = (set.characters || []).map(c => c.char);
      const hasAll = setChars.every(c => state.selectedChars.has(c));
      if (!hasAll) state.selectedSets.delete(set.id);
    });
  } else {
    state.selectedChars.add(char);
    state.contentSets.forEach(set => {
      const setChars = (set.characters || []).map(c => c.char);
      const hasAll = setChars.every(c => state.selectedChars.has(c));
      if (hasAll) state.selectedSets.add(set.id);
    });
  }
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

// ============================================
// ROUTER & NAVIGATION
// ============================================

function goHome() {
  showScreen('screen-dashboard');
  loadDashboard();
  loadHistory();
}

function goToSelect(gameType) {
  state.currentGameType = gameType;
  const names = { zen: 'Zen Mode', survival: 'Survival Rush', duel: 'Duel Mode', coop: 'Sync Match' };
  const subEl = $('select-subtitle');
  if (subEl) subEl.textContent = `Choose Hiragana for ${names[gameType] || gameType}`;
  showScreen('screen-select');
  renderSets();
  updateSelectionUI();
}

function showSettings() {
  showScreen('screen-settings');
  const toggle = $('toggle-theme');
  if (toggle) toggle.checked = state.theme === 'dark';
}

function showLeaderboard() {
  toast('Full leaderboard coming in Phase 2!', 'info');
}

function startGame() {
  const chars = Array.from(state.selectedChars);
  if (chars.length === 0) {
    toast('Select at least one character!', 'warning');
    return;
  }
  showScreen('screen-game');
  toast(`${state.currentGameType} mode selected with ${chars.length} characters. Phase 2 will add the actual gameplay!`, 'success', 5000);
}

function inviteFriend() {
  if (!state.friendPresence || state.friendPresence.status !== 'online') {
    toast('Your friend is not online right now.', 'warning');
    return;
  }
  toast(`Invite sent to ${state.friendPresence.displayName || 'your friend'}! (Full invites in Phase 3)`, 'info');
}

function toggleTheme() {
  const newTheme = $('toggle-theme').checked ? 'dark' : 'light';
  setTheme(newTheme);
}

function toggleAudio() {
  state.audioEnabled = $('toggle-audio').checked;
  localStorage.setItem('hiraquest-audio', state.audioEnabled);
}

// ============================================
// EVENT LISTENERS (All attached here - robust)
// ============================================

function attachListeners() {
  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
  });

  // Auth forms
  const loginForm = $('form-login');
  const registerForm = $('form-register');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  // Nav
  const navBrand = $('nav-brand');
  const btnSettings = $('btn-settings');
  const btnLogout = $('btn-logout');
  if (navBrand) navBrand.addEventListener('click', goHome);
  if (btnSettings) btnSettings.addEventListener('click', showSettings);
  if (btnLogout) btnLogout.addEventListener('click', logout);

  // Game mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => goToSelect(btn.dataset.mode));
  });

  // Select screen
  const btnSelectBack = $('btn-select-back');
  const btnSelectAll = $('btn-select-all');
  const btnClearCustom = $('btn-clear-custom');
  const btnStart = $('btn-start');
  if (btnSelectBack) btnSelectBack.addEventListener('click', goHome);
  if (btnSelectAll) btnSelectAll.addEventListener('click', selectAllSets);
  if (btnClearCustom) btnClearCustom.addEventListener('click', clearCustom);
  if (btnStart) btnStart.addEventListener('click', startGame);

  // Settings
  const btnSettingsBack = $('btn-settings-back');
  const toggleThemeEl = $('toggle-theme');
  const toggleAudioEl = $('toggle-audio');
  if (btnSettingsBack) btnSettingsBack.addEventListener('click', goHome);
  if (toggleThemeEl) toggleThemeEl.addEventListener('change', toggleTheme);
  if (toggleAudioEl) toggleAudioEl.addEventListener('change', toggleAudio);

  // Game placeholder
  const btnGameBack = $('btn-game-back');
  if (btnGameBack) btnGameBack.addEventListener('click', goHome);

  // Leaderboard
  const btnLeaderboard = $('btn-leaderboard');
  if (btnLeaderboard) btnLeaderboard.addEventListener('click', showLeaderboard);

  // Invite
  const btnInvite = $('btn-invite');
  if (btnInvite) btnInvite.addEventListener('click', inviteFriend);
}

// ============================================
// APP INITIALIZATION
// ============================================

async function init() {
  setTheme(state.theme);
  const audioToggle = $('toggle-audio');
  if (audioToggle) audioToggle.checked = localStorage.getItem('hiraquest-audio') !== 'false';

  attachListeners();

  onAuthStateChanged(auth, async (user) => {
    showLoading(true);

    try {
      if (user) {
        state.user = user;

        try {
          state.userData = await ensureUserProfile(user);
        } catch (err) {
          console.error('Profile load failed:', err);
          state.userData = fallbackUserData(user);
          toast(`Could not load your profile: ${err.message}`, 'error', 8000);
        }

        $('screen-auth').classList.remove('active');
        const appEl = $('app');
        if (appEl) appEl.classList.remove('hidden');

        initPresence();
        await loadContentSets();
        goHome();
        toast(`Welcome back, ${state.userData?.displayName || 'Player'}!`, 'success');

      } else {
        state.user = null;
        state.userData = null;
        if (presenceUnsub) presenceUnsub();

        const appEl = $('app');
        if (appEl) appEl.classList.add('hidden');
        const authScreen = $('screen-auth');
        if (authScreen) authScreen.classList.add('active');
        showScreen('screen-auth');
      }
    } catch (err) {
      console.error('App startup failed:', err);
      toast(`App startup failed: ${err.message}`, 'error', 10000);
    } finally {
      showLoading(false);
    }
  });
}

init();
