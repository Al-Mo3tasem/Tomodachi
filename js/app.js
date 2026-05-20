
// ============================================
// HiraQuest Main Application
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
  getFirestore,
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
const db = getFirestore(app);

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

// ----- DOM Cache -----
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ============================================
// UI UTILITIES
// ============================================

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function showLoading(show) {
  $('loading-overlay').classList.toggle('active', show);
}

function toast(message, type = 'info', duration = 3000) {
  const container = $('toast-container');
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
  $('toggle-theme').checked = theme === 'dark';
}

// ============================================
// AUTHENTICATION
// ============================================

const Auth = {
  async handleLogin(e) {
    e.preventDefault();
    const email = $('login-email').value.trim();
    const password = $('login-password').value;
    $('login-error').textContent = '';
    
    try {
      showLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      // Success handled by onAuthStateChanged
    } catch (err) {
      $('login-error').textContent = this.formatAuthError(err.code);
    } finally {
      showLoading(false);
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const username = $('reg-username').value.trim().toLowerCase();
    const displayName = $('reg-displayname').value.trim();
    const email = $('reg-email').value.trim();
    const password = $('reg-password').value;
    $('register-error').textContent = '';

    // Validation
    if (!/^[a-z0-9_]+$/.test(username)) {
      $('register-error').textContent = 'Username must be lowercase letters, numbers, or underscores only.';
      return;
    }

    try {
      showLoading(true);

      // Check 2-user limit
      const usersSnap = await getDocs(collection(db, 'users'));
      if (usersSnap.size >= APP_CONFIG.maxUsers) {
        $('register-error').textContent = 'HiraQuest is full! Only 2 accounts are allowed.';
        showLoading(false);
        return;
      }

      // Check username uniqueness
      const usernameQuery = query(collection(db, 'users'), where('username', '==', username), limit(1));
      const usernameSnap = await getDocs(usernameQuery);
      if (!usernameSnap.empty) {
        $('register-error').textContent = 'Username already taken.';
        showLoading(false);
        return;
      }

      // Create auth account
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update auth profile
      await updateProfile(cred.user, { displayName });

      // Create user document
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        username,
        displayName,
        email,
        avatarEmoji: username === 'alice' ? '🌸' : (username === 'bob' ? '🎮' : '🎯'),
        createdAt: serverTimestamp(),
        status: 'offline'
      });

      // Create stats document
      await setDoc(doc(db, 'stats', cred.user.uid), {
        userId: cred.user.uid,
        totalGames: 0,
        duelsWon: 0,
        duelsLost: 0,
        highestSoloScore: 0,
        highestCoopScore: 0,
        charactersMastered: [],
        createdAt: serverTimestamp()
      });

      toast('Account created! Welcome to HiraQuest.', 'success');
      
    } catch (err) {
      $('register-error').textContent = this.formatAuthError(err.code);
    } finally {
      showLoading(false);
    }
  },

  async logout() {
    try {
      // Set offline before logout
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
  },

  formatAuthError(code) {
    const map = {
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'An account already exists with this email.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.'
    };
    return map[code] || 'Authentication failed. Please try again.';
  },

  switchTab(tab) {
    $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    $$('.auth-form').forEach(f => f.classList.toggle('active', f.id === `form-${tab}`));
  }
};

// Bind auth events
window.app = window.app || {};
app.handleLogin = Auth.handleLogin.bind(Auth);
app.handleRegister = Auth.handleRegister.bind(Auth);
app.logout = Auth.logout.bind(Auth);
app.switchAuthTab = Auth.switchTab.bind(Auth);

// ============================================
// PRESENCE & FRIEND SYSTEM
// ============================================

const Presence = {
  unsub: null,

  init() {
    // Update my presence
    if (state.user) {
      setDoc(doc(db, 'presence', state.user.uid), {
        userId: state.user.uid,
        username: state.userData?.username,
        displayName: state.userData?.displayName,
        status: 'online',
        lastSeen: serverTimestamp()
      }, { merge: true });

      // Set offline on page unload
      window.addEventListener('beforeunload', () => {
        // Note: This is best-effort; may not always fire
        setDoc(doc(db, 'presence', state.user.uid), {
          status: 'offline',
          lastSeen: serverTimestamp()
        }, { merge: true });
      });
    }

    // Listen for friend presence
    this.unsub = onSnapshot(collection(db, 'presence'), (snap) => {
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (docSnap.id !== state.user?.uid) {
          state.friendPresence = data;
          this.render();
        }
      });
    });
  },

  render() {
    const p = state.friendPresence;
    if (!p) {
      $('friend-status').innerHTML = `<span class="status-dot offline"></span><span class="status-text">Offline</span>`;
      $('friend-name').textContent = 'Waiting for friend...';
      $('btn-invite').disabled = true;
      $('nav-presence').className = 'presence-dot';
      return;
    }

    const isOnline = p.status === 'online' || p.status === 'in_game';
    const dotClass = p.status === 'in_game' ? 'in-game' : (isOnline ? 'online' : 'offline');
    const statusText = p.status === 'in_game' ? 'In Game' : (isOnline ? 'Online' : 'Offline');

    $('friend-name').textContent = p.displayName || p.username || 'Friend';
    $('friend-avatar').textContent = state.friend?.avatarEmoji || '🎮';
    $('friend-status').innerHTML = `<span class="status-dot ${dotClass}"></span><span class="status-text">${statusText}</span>`;
    $('btn-invite').disabled = !isOnline;

    // Nav presence dot
    $('nav-presence').className = `presence-dot ${dotClass}`;

    // Toast when friend comes online
    if (isOnline && $('toggle-notify')?.checked) {
      const lastToast = sessionStorage.getItem('last-online-toast');
      const now = Date.now();
      if (!lastToast || (now - parseInt(lastToast)) > 60000) {
        toast(`${p.displayName || p.username} is online!`, 'success');
        sessionStorage.setItem('last-online-toast', now.toString());
      }
    }
  },

  cleanup() {
    if (this.unsub) this.unsub();
  }
};

// ============================================
// CONTENT SETS (Character Data)
// ============================================

const Content = {
  async loadSets() {
    try {
      const snap = await getDocs(collection(db, 'content_sets'));
      state.contentSets = [];
      snap.forEach(docSnap => {
        state.contentSets.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by order field
      state.contentSets.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (err) {
      console.error('Failed to load content sets:', err);
      toast('Failed to load Hiragana sets.', 'error');
    }
  },

  renderSets() {
    const grid = $('sets-grid');
    grid.innerHTML = '';

    state.contentSets.forEach(set => {
      const el = document.createElement('div');
      el.className = 'set-item';
      el.dataset.id = set.id;
      el.onclick = () => app.toggleSet(set.id);

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

    this.renderCustomGrid();
  },

  renderCustomGrid() {
    const grid = $('custom-grid');
    grid.innerHTML = '';

    // Flatten all characters from all sets
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
      el.onclick = () => app.toggleChar(c.char);

      el.innerHTML = `
        <span class="jp">${c.char}</span>
        <span class="romaji">${c.romaji}</span>
      `;

      grid.appendChild(el);
    });
  }
};

// ============================================
// DASHBOARD
// ============================================

const Dashboard = {
  async loadStats() {
    if (!state.user) return;
    try {
      const statsDoc = await getDoc(doc(db, 'stats', state.user.uid));
      const stats = statsDoc.exists() ? statsDoc.data() : {};
      
      $('stat-total').textContent = stats.totalGames || 0;
      $('stat-wins').textContent = stats.duelsWon || 0;
      $('stat-best').textContent = stats.highestSoloScore || 0;
      
      $('dash-welcome').textContent = state.userData?.displayName || 'Player';
      $('dash-displayname').textContent = state.userData?.displayName || 'Player';
      $('dash-username').textContent = `@${state.userData?.username || 'player'}`;
      $('dash-avatar').textContent = state.userData?.avatarEmoji || '🌸';
      $('nav-name').textContent = state.userData?.displayName || 'Player';
      
      // Load friend data
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(u => {
        if (u.id !== state.user.uid) {
          state.friend = u.data();
        }
      });
      
      Presence.render();
      
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  },

  async loadHistory() {
    try {
      const q = query(
        collection(db, 'game_sessions'),
        where('players', 'array-contains', state.user.uid),
        limit(5)
      );
      const snap = await getDocs(q);
      const list = $('history-list');
      
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
        const resultColor = result === 'Victory' ? 'var(--success)' : (result === 'Defeat' ? 'var(--danger)' : 'var(--accent)');
        
        const item = document.createElement('div');
        item.style.cssText = 'padding: 12px 0; border-bottom: 1px solid var(--border); display:flex; justify-content:space-between; align-items:center;';
        item.innerHTML = `
          <div>
            <div style="font-weight:600; font-size:0.9375rem;">${data.gameType?.toUpperCase()}</div>
            <div style="font-size:0.75rem; color:var(--text-secondary);">${new Date(data.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</div>
          </div>
          <div style="font-weight:700; color:${resultColor}; font-size:0.875rem;">${result}</div>
        `;
        list.appendChild(item);
      });
    } catch (err) {
      console.error('History load error:', err);
    }
  }
};

// ============================================
// CHARACTER SELECTION
// ============================================

const Selection = {
  updateUI() {
    // Update set items
    $$('.set-item').forEach(el => {
      el.classList.toggle('selected', state.selectedSets.has(el.dataset.id));
    });

    // Update char tiles
    $$('.char-tile').forEach(el => {
      el.classList.toggle('selected', state.selectedChars.has(el.dataset.char));
    });

    // Update counts
    const totalChars = state.selectedChars.size;
    const multiplier = (totalChars / 5).toFixed(1);
    
    $('selection-count').textContent = `${totalChars} character${totalChars !== 1 ? 's' : ''} selected`;
    $('selection-difficulty').textContent = `Difficulty: ${multiplier}x`;
    $('btn-start').disabled = totalChars === 0;
  },

  toggleSet(setId) {
    const set = state.contentSets.find(s => s.id === setId);
    if (!set) return;

    if (state.selectedSets.has(setId)) {
      // Deselect: remove set and its chars
      state.selectedSets.delete(setId);
      (set.characters || []).forEach(c => state.selectedChars.delete(c.char));
    } else {
      // Select: add set and its chars
      state.selectedSets.add(setId);
      (set.characters || []).forEach(c => state.selectedChars.add(c.char));
    }

    this.updateUI();
  },

  toggleChar(char) {
    if (state.selectedChars.has(char)) {
      state.selectedChars.delete(char);
      // Check if this breaks any full set selection
      state.contentSets.forEach(set => {
        const setChars = (set.characters || []).map(c => c.char);
        const hasAll = setChars.every(c => state.selectedChars.has(c));
        if (!hasAll) state.selectedSets.delete(set.id);
      });
    } else {
      state.selectedChars.add(char);
      // Check if this completes any set
      state.contentSets.forEach(set => {
        const setChars = (set.characters || []).map(c => c.char);
        const hasAll = setChars.every(c => state.selectedChars.has(c));
        if (hasAll) state.selectedSets.add(set.id);
      });
    }

    this.updateUI();
  },

  selectAllSets() {
    state.contentSets.forEach(set => {
      state.selectedSets.add(set.id);
      (set.characters || []).forEach(c => state.selectedChars.add(c.char));
    });
    this.updateUI();
  },

  clearCustom() {
    state.selectedSets.clear();
    state.selectedChars.clear();
    this.updateUI();
  }
};

// ============================================
// ROUTER & NAVIGATION
// ============================================

const Router = {
  goHome() {
    showScreen('screen-dashboard');
    Dashboard.loadStats();
    Dashboard.loadHistory();
  },

  goToSelect(gameType) {
    state.currentGameType = gameType;
    const names = { zen: 'Zen Mode', survival: 'Survival Rush', duel: 'Duel Mode', coop: 'Sync Match' };
    $('select-subtitle').textContent = `Choose Hiragana for ${names[gameType] || gameType}`;
    showScreen('screen-select');
    Content.renderSets();
    Selection.updateUI();
  },

  showSettings() {
    showScreen('screen-settings');
    $('toggle-theme').checked = state.theme === 'dark';
  },

  showLeaderboard() {
    toast('Full leaderboard coming in Phase 2!', 'info');
  },

  startGame() {
    const chars = Array.from(state.selectedChars);
    if (chars.length === 0) {
      toast('Select at least one character!', 'warning');
      return;
    }
    
    // Phase 1 placeholder — just show the game screen
    showScreen('screen-game');
    toast(`${state.currentGameType} mode selected with ${chars.length} characters. Phase 2 will add the actual gameplay!`, 'success', 5000);
  },

  inviteFriend() {
    if (!state.friendPresence || state.friendPresence.status !== 'online') {
      toast('Your friend is not online right now.', 'warning');
      return;
    }
    toast(`Invite sent to ${state.friendPresence.displayName || 'your friend'}! (Full invites in Phase 3)`, 'info');
  },

  toggleTheme() {
    const newTheme = $('toggle-theme').checked ? 'dark' : 'light';
    setTheme(newTheme);
  },

  toggleAudio() {
    state.audioEnabled = $('toggle-audio').checked;
    localStorage.setItem('hiraquest-audio', state.audioEnabled);
  }
};

// Bind all router methods to window.app
Object.assign(app, Router);

// ============================================
// APP INITIALIZATION
// ============================================

async function init() {
  // Apply saved theme
  setTheme(state.theme);
  $('toggle-audio').checked = localStorage.getItem('hiraquest-audio') !== 'false';

  // Auth state listener
  onAuthStateChanged(auth, async (user) => {
    showLoading(true);
    
    if (user) {
      // Logged in
      state.user = user;
      
      // Load user data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        state.userData = userDoc.data();
      }
      
      // Hide auth, show app
      $('screen-auth').classList.remove('active');
      $('app').classList.remove('hidden');
      
      // Init presence
      Presence.init();
      
      // Load content
      await Content.loadSets();
      
      // Go to dashboard
      Router.goHome();
      
      toast(`Welcome back, ${state.userData?.displayName || 'Player'}!`, 'success');
      
    } else {
      // Logged out
      state.user = null;
      state.userData = null;
      Presence.cleanup();
      
      $('app').classList.add('hidden');
      $('screen-auth').classList.add('active');
      showScreen('screen-auth');
    }
    
    showLoading(false);
  });
}

// Start
init();

// Expose selection methods
app.toggleSet = Selection.toggleSet.bind(Selection);
app.toggleChar = Selection.toggleChar.bind(Selection);
app.selectAllSets = Selection.selectAllSets.bind(Selection);
app.clearCustom = Selection.clearCustom.bind(Selection);