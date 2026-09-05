// ============================================
// Tomodachi — native bridge (Capacitor shell only)
// Bundled by scripts/native/build-bridge.mjs into www/native-bridge.js.
// Exposes a small, stable `window.Native` facade with a FIXED vocabulary so the
// web app never sprinkles plugin calls ad hoc. On the web build this file is
// never loaded; the app must always feature-detect `window.Native`.
//
// Haptic vocabulary (research: "less is more", strength scales with rarity):
//   tap()  = impact Light        — answer tile / dock tab press
//   snap() = impact Medium       — sheet detent, drag-drop
//   tick() = selectionChanged    — segmented control, setup selectors
//   ok()   = notification Success— correct answer, lesson done
//   no()   = notification Error  — wrong answer
//   warn() = notification Warning— last 3 seconds of a timer
// ============================================
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();   // 'ios' | 'android' | 'web'
const quiet = (p) => p.catch(() => {});      // haptics/tts must never throw into UI code

const haptics = {
  tap:  () => quiet(Haptics.impact({ style: ImpactStyle.Light })),
  snap: () => quiet(Haptics.impact({ style: ImpactStyle.Medium })),
  tick: () => quiet(Haptics.selectionChanged()),
  ok:   () => quiet(Haptics.notification({ type: NotificationType.Success })),
  no:   () => quiet(Haptics.notification({ type: NotificationType.Error })),
  warn: () => quiet(Haptics.notification({ type: NotificationType.Warning })),
};

let voicesCache = null;
const tts = {
  // Japanese by default; category 'playback' (iOS) keeps speech audible with the
  // ringer switch on silent. QueueStrategy 1 = flush (interrupt the previous).
  speak: (text, opts = {}) => quiet(TextToSpeech.speak({
    text: String(text), lang: opts.lang || 'ja-JP', rate: opts.rate ?? 0.9, pitch: opts.pitch ?? 1.0,
    volume: opts.volume ?? 1.0, category: 'playback', queueStrategy: 1,
  })),
  stop: () => quiet(TextToSpeech.stop()),
  voices: async () => {
    if (voicesCache) return voicesCache;
    try { voicesCache = (await TextToSpeech.getSupportedVoices()).voices || []; } catch (_e) { voicesCache = []; }
    return voicesCache;
  },
  hasJapanese: async () => (await tts.voices()).some(v => /^ja/i.test(v.lang || '')),
};

const app = {
  // NOTE: registering a backButton listener disables Capacitor's default
  // (exit). Callers must therefore handle the "nothing to go back to" case
  // themselves by calling app.exit().
  onBack: (fn) => App.addListener('backButton', fn),
  onState: (fn) => App.addListener('appStateChange', fn),
  onUrl: (fn) => App.addListener('appUrlOpen', fn),
  exit: () => App.exitApp(),
  info: () => App.getInfo(),
};

const keyboard = {
  onShow: (fn) => Keyboard.addListener('keyboardWillShow', fn),
  onHide: (fn) => Keyboard.addListener('keyboardWillHide', fn),
  hide: () => quiet(Keyboard.hide()),
};

const prefs = {
  get: async (key) => (await Preferences.get({ key })).value,
  set: (key, value) => Preferences.set({ key, value: String(value) }),
  remove: (key) => Preferences.remove({ key }),
};

const notify = {
  requestPermission: () => LocalNotifications.requestPermissions(),
  schedule: (notifications) => LocalNotifications.schedule({ notifications }),
  cancelAll: async () => { const p = await LocalNotifications.getPending(); if (p.notifications.length) await LocalNotifications.cancel(p); },
};

window.Native = Object.freeze({
  isNative, platform,
  haptics, tts, app, keyboard, prefs, notify,
  share: (opts) => Share.share(opts),
  splash: { hide: () => quiet(SplashScreen.hide({ fadeOutDuration: 200 })) },
});
document.dispatchEvent(new CustomEvent('native-ready', { detail: { platform } }));
