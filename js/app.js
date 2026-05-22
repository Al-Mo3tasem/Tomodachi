// ============================================
// HiraQuest — Application Orchestrator
// Phase 2.1: Auth, Dashboard, Character Select, Zen (Read/Listen),
// Survival Rush, Leaderboards, Settings, Presence, Progress Reset.
// ============================================

import { APP_CONFIG } from './config.js?v=20260522b';
import {
  state, $, showScreen, currentScreen, showLoading, toast, setTheme, withTimeout
} from './core.js?v=20260522b';
import {
  auth, db,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, signOut,
  doc, getDoc, setDoc, getDocs, deleteDoc, collection, query, where, onSnapshot,
  serverTimestamp, limit
} from './firebase.js?v=20260522b';
import {
  startGame, requestExit, playAgain, cleanup as cleanupGame,
  speakCurrent, pauseGame, resumeGame, resumeFromPause, isActive
} from './game.js?v=20260522b';
import {
  openLeaderboard, renderLeaderboardPreview, removeUserFromLeaderboards
} from './leaderboard.js?v=20260522b';
import { isSpeechSupported } from './audio.js?v=20260522b';

const AVATARS = ['🌸', '🐱', '🦊', '🐼', '🐧', '🦄', '🐸', '🦋', '⭐', '🌙', '🍙', '🍣', '🎮', '🏯', '🐉', '🌊'];
const MODE_NAMES = { zen: 'Zen Mode', survival: 'Survival Rush', duel: 'Duel Mode', coop: 'Sync Match' };
const MODE_EMOJI = { zen: '🧘', survival: '🔥', duel: '⚔️', coop: '🤝' };

let pendingAvatar = '🌸';

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

function renderUserIdentity() {
  const displayName = state.userData?.displayName || 'Player';
  const username = state.userData?.username || 'player';
  const avatar = state.userData?.avatarEmoji || '🌸';

  const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  set('dash-welcome', displayName);
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
    toast('Signed in. Loading dashboard…', 'success');
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

    const usersSnap = await withTimeout(getDocs(collection(db, 'users')), 'Checking account limit', 15000);
    if (usersSnap.size >= APP_CONFIG.maxUsers) {
      showFormError(errorEl, 'HiraQuest is full! Only 2 accounts are allowed.');
      showLoading(false);
      return;
    }

    const usernameQuery = query(collection(db, 'users'), where('username', '==', username), limit(1));
    const usernameSnap = await withTimeout(getDocs(usernameQuery), 'Checking username', 15000);
    if (!usernameSnap.empty) {
      showFormError(errorEl, 'Username already taken.');
      showLoading(false);
      return;
    }

    const cred = await withTimeout(createUserWithEmailAndPassword(auth, email, password), 'Creating Firebase Auth account', 15000);
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
    cleanupGame();
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
    if (nameEl) nameEl.textContent = 'Waiting for friend…';
    if (statusEl) statusEl.innerHTML = `<span class="status-dot offline"></span><span class="status-text">Offline</span>`;
    if (inviteBtn) inviteBtn.disabled = true;
    return;
  }

  const isOnline = p.status === 'online' || p.status === 'in_game';
  const dotClass = p.status === 'in_game' ? 'in-game' : (isOnline ? 'online' : 'offline');
  const statusText = p.status === 'in_game' ? 'In a game' : (isOnline ? 'Online' : 'Offline');

  if (nameEl) nameEl.textContent = p.displayName || p.username || 'Friend';
  if (avatarEl) avatarEl.textContent = p.avatarEmoji || state.friend?.avatarEmoji || '🎮';
  if (statusEl) statusEl.innerHTML = `<span class="status-dot ${dotClass}"></span><span class="status-text">${statusText}</span>`;
  if (inviteBtn) inviteBtn.disabled = !isOnline;

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

function inviteFriend() {
  if (!state.friendPresence || state.friendPresence.status === 'offline') {
    toast('Your friend is not online right now.', 'warning');
    return;
  }
  toast('Live invites arrive with Duel Mode in Phase 3!', 'info', 4000);
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
    toast('Failed to load Hiragana sets. Make sure the database is seeded.', 'error');
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
      list.innerHTML = '<p class="empty-state">No games played yet.</p>';
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
      item.innerHTML = `
        <div>
          <div class="history-mode">${MODE_EMOJI[type] || '🎮'} ${MODE_NAMES[type] || type}</div>
          <div class="history-date">${date}</div>
        </div>
        <div class="history-meta">
          <div class="history-score">${(data.score || 0).toLocaleString()} pts</div>
          <div class="history-sub">${Math.round((data.accuracy || 0) * 100)}% accuracy</div>
        </div>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    console.error('History load error:', err);
    list.innerHTML = '<p class="empty-state">Could not load history.</p>';
  }
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

  if (countEl) countEl.textContent = `${totalChars} character${totalChars !== 1 ? 's' : ''} selected`;
  if (diffEl) diffEl.textContent = `Difficulty: ${multiplier}×`;
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
  localStorage.setItem('hiraquest-practice', type);
  syncSegmented('#seg-practice', 'practice', type);
  // Listening practice always uses multiple choice — hide the input row.
  const inputRow = $('option-input');
  if (inputRow) inputRow.style.display = type === 'listen' ? 'none' : 'flex';
}

function setInputMethod(method) {
  state.inputMethod = method;
  localStorage.setItem('hiraquest-input', method);
  syncSegmented('#seg-input', 'input', method);
}

function setZenDuration(seconds) {
  state.zenDuration = seconds;
  localStorage.setItem('hiraquest-duration', String(seconds));
  syncSegmented('#seg-duration', 'duration', seconds);
}

// ============================================
// NAVIGATION
// ============================================

function goHome() {
  cleanupGame();
  state.returnScreen = null;
  showScreen('screen-dashboard');
  loadDashboard();
  loadHistory();
}

function goToSelect(gameType) {
  state.currentGameType = gameType;

  const subEl = $('select-subtitle');
  if (subEl) subEl.textContent = `Set up your ${MODE_NAMES[gameType] || gameType} game`;

  const infoEl = $('select-options-info');
  const practiceRow = $('option-practice');
  const inputRow = $('option-input');
  const durationRow = $('option-duration');

  if (gameType === 'survival') {
    if (infoEl) infoEl.textContent = '🔥 Reading · typing · 3 lives. The clock speeds up every 5 correct answers — and your score scales with how many characters you pick.';
    if (practiceRow) practiceRow.style.display = 'none';
    if (inputRow) inputRow.style.display = 'none';
    if (durationRow) durationRow.style.display = 'none';
  } else {
    if (infoEl) infoEl.textContent = '🧘 Timed solo practice. Read the glyph, or switch to Listen to train your ear — audio never gives away a reading answer.';
    if (practiceRow) practiceRow.style.display = 'flex';
    if (durationRow) durationRow.style.display = 'flex';

    const listenBtn = document.querySelector('#seg-practice .seg-btn[data-practice="listen"]');
    if (listenBtn) {
      if (!isSpeechSupported()) {
        listenBtn.disabled = true;
        listenBtn.title = 'Listening practice needs browser speech support.';
        if (state.practiceType === 'listen') state.practiceType = 'read';
      } else {
        listenBtn.disabled = false;
        listenBtn.title = '';
      }
    }
    setPractice(state.practiceType);
    setInputMethod(state.inputMethod);
    setZenDuration(state.zenDuration);
  }

  showScreen('screen-select');
  renderSets();
  updateSelectionUI();
}

function handleModeClick(mode) {
  if (mode === 'duel') {
    toast('⚔️ Duel Mode arrives in Phase 3!', 'info', 4000);
    return;
  }
  if (mode === 'coop') {
    toast('🤝 Sync Match arrives in Phase 4!', 'info', 4000);
    return;
  }
  goToSelect(mode);
}

function handleStartGame() {
  startGame(state.currentGameType);
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
  if (versionEl) versionEl.textContent = `HiraQuest ${APP_CONFIG.version}`;

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
  localStorage.setItem('hiraquest-audio', state.audioEnabled);
}

async function saveProfileSettings(e) {
  e.preventDefault();
  if (!state.user) return;

  const displayName = $('settings-displayname').value.trim();
  const username = $('settings-username').value.trim().toLowerCase();
  const errorEl = $('settings-profile-error');
  if (errorEl) errorEl.textContent = '';

  if (!displayName) {
    showFormError(errorEl, 'Display name is required.');
    return;
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    showFormError(errorEl, 'Username must be lowercase letters, numbers, or underscores only.');
    return;
  }

  try {
    showLoading(true);
    const usernameQuery = query(collection(db, 'users'), where('username', '==', username), limit(1));
    const usernameSnap = await withTimeout(getDocs(usernameQuery), 'Checking username', 15000);
    const takenByOther = usernameSnap.docs.some(docSnap => docSnap.id !== state.user.uid);
    if (takenByOther) {
      showFormError(errorEl, 'Username already taken.');
      return;
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
    toast('Profile updated.', 'success');
  } catch (err) {
    console.error('Profile save failed:', err);
    showFormError(errorEl, `Could not save profile: ${err.message}`);
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

    // 1. Overwrite the stats document (no merge — truly clears accuracy map).
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

    // 2. Delete this player's solo game sessions.
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

    // 3. Remove this player from every leaderboard bracket.
    await removeUserFromLeaderboards(state.user.uid);

    toast('Progress reset — fresh start!', 'success', 5000);
    cancelReset();
    goHome();
  } catch (err) {
    console.error('Reset failed:', err);
    toast('Reset failed: ' + err.message, 'error', 8000);
  } finally {
    showLoading(false);
  }
}

// ============================================
// EVENT WIRING
// ============================================

function attachListeners() {
  // Auth tabs + forms
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
  });
  $('form-login')?.addEventListener('submit', handleLogin);
  $('form-register')?.addEventListener('submit', handleRegister);

  // Nav
  $('nav-brand')?.addEventListener('click', goHome);
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
    btn.addEventListener('click', () => setInputMethod(btn.dataset.input));
  });
  document.querySelectorAll('#seg-duration .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => setZenDuration(Number(btn.dataset.duration)));
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

  // Friend
  $('btn-invite')?.addEventListener('click', inviteFriend);

  // Game screen
  $('game-exit')?.addEventListener('click', requestExit);
  $('game-speak')?.addEventListener('click', speakCurrent);
  $('pause-resume')?.addEventListener('click', resumeFromPause);
  $('results-again')?.addEventListener('click', playAgain);
  $('results-home')?.addEventListener('click', goHome);

  // Internal navigation event (dispatched by the game engine)
  document.addEventListener('hq:gohome', goHome);
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  setTheme(state.theme);
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

        $('screen-auth')?.classList.remove('active');
        $('app')?.classList.remove('hidden');

        initPresence();
        await loadContentSets();
        goHome();
        toast(`Welcome back, ${state.userData?.displayName || 'Player'}!`, 'success');
      } else {
        cleanupGame();
        state.user = null;
        state.userData = null;
        if (presenceUnsub) { presenceUnsub(); presenceUnsub = null; }

        $('app')?.classList.add('hidden');
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
