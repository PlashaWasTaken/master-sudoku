// Brücke zwischen der App und der Plattform: Firebase-Konto und Synchronisation,
// Google-Anmeldung je Plattform (Android nativ, Windows über den Systembrowser) und Zurück-Taste.
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail, signOut as fbSignOut, GoogleAuthProvider, signInWithCredential, signInWithPopup,
  reauthenticateWithCredential, reauthenticateWithPopup, EmailAuthProvider, deleteUser, reload
} from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { start as oauthStart, cancel as oauthCancel, onUrl } from '@fabianlars/tauri-plugin-oauth';
import { openUrl } from '@tauri-apps/plugin-opener';

const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const OAUTH_PORT = 53682;

// ---------- Plattform ----------
const Platform = {
  name: isAndroid ? 'android' : isTauri ? 'windows' : 'web',
  onBack(handler) {
    if (!isAndroid) return;
    CapApp.addListener('backButton', () => handler()).catch(() => {});
  },
  exit() { if (isAndroid) CapApp.exitApp().catch(() => {}); },
  onResume(handler) {
    if (isAndroid) CapApp.addListener('resume', () => handler()).catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) handler(); });
  }
};

// ---------- Fehlermeldungen ----------
const MESSAGES = {
  'auth/invalid-email': 'Die E-Mail-Adresse ist ungültig.',
  'auth/missing-email': 'Bitte gib deine E-Mail-Adresse ein.',
  'auth/missing-password': 'Bitte gib dein Passwort ein.',
  'auth/weak-password': 'Das Passwort ist zu kurz. Es braucht mindestens 6 Zeichen.',
  'auth/email-already-in-use': 'Für diese E-Mail-Adresse gibt es schon ein Konto. Melde dich an oder setze das Passwort zurück.',
  'auth/invalid-credential': 'E-Mail oder Passwort stimmt nicht.',
  'auth/wrong-password': 'Das Passwort stimmt nicht.',
  'auth/user-not-found': 'Zu dieser E-Mail-Adresse gibt es kein Konto.',
  'auth/user-disabled': 'Dieses Konto ist gesperrt.',
  'auth/too-many-requests': 'Zu viele Versuche. Warte ein paar Minuten und versuch es dann noch einmal.',
  'auth/network-request-failed': 'Keine Verbindung zum Server. Prüfe deine Internetverbindung.',
  'auth/popup-closed-by-user': 'Die Anmeldung wurde abgebrochen.',
  'auth/account-exists-with-different-credential': 'Für diese E-Mail gibt es schon ein Konto mit Passwort. Melde dich damit an.',
  'auth/requires-recent-login': 'Bitte melde dich zur Sicherheit noch einmal an.',
  'permission-denied': 'Der Server hat den Zugriff abgelehnt. Ist deine E-Mail-Adresse bestätigt?',
  'unavailable': 'Der Server ist gerade nicht erreichbar. Es wird später automatisch abgeglichen.'
};
const msg = e => {
  const code = (e && e.code) || '';
  if (MESSAGES[code]) return MESSAGES[code];
  if (e && e.message && /cancel|abgebrochen|canceled/i.test(e.message)) return 'Die Anmeldung wurde abgebrochen.';
  return (e && e.message) ? `Es ist ein Fehler aufgetreten: ${e.message}` : 'Es ist ein unbekannter Fehler aufgetreten.';
};
const fail = (code, text) => Object.assign(new Error(text || MESSAGES[code] || code), { code });

// ---------- Firebase ----------
const cfg = typeof window !== 'undefined' ? window.FIREBASE_CONFIG : null;
let auth = null, db = null;
if (cfg) {
  try {
    const app = initializeApp(cfg);
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      ...(isAndroid || isTauri ? {} : { popupRedirectResolver: browserPopupRedirectResolver })
    });
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
  } catch (e) {
    console.error('Firebase konnte nicht starten', e);
    auth = null; db = null;
  }
}

const hooks = { getLocal: null, applyRemote: null, onState: null };
const state = { available: !!auth, googleAvailable: false, user: null, status: auth ? 'signedout' : 'unavailable', lastSync: 0, error: '' };
state.googleAvailable = !!auth && (isAndroid ? Capacitor.isPluginAvailable('FirebaseAuthentication') : isTauri ? !!window.GOOGLE_WEB_CLIENT_ID : true);

let unsub = null, remote = null, pushTimer = null, gotFirstSnapshot = false;
const emit = () => { if (hooks.onState) hooks.onState({ ...state, user: state.user ? { ...state.user } : null }); };
const ref = () => doc(db, 'users', auth.currentUser.uid);
const isVerified = u => !!u && (u.emailVerified || u.providerData.some(p => p.providerId === 'google.com'));

function describeUser(u) {
  if (!u) return null;
  const google = u.providerData.some(p => p.providerId === 'google.com');
  return { uid: u.uid, email: u.email || '', verified: isVerified(u), provider: google ? 'google' : 'password' };
}

function stopListening() {
  if (unsub) { unsub(); unsub = null; }
  remote = null; gotFirstSnapshot = false;
}
function startListening() {
  stopListening();
  state.status = navigator.onLine === false ? 'offline' : 'syncing'; emit();
  unsub = onSnapshot(ref(), { includeMetadataChanges: false }, snap => {
    remote = snap.exists() ? snap.data() : null;
    if (hooks.applyRemote) hooks.applyRemote(remote);
    state.lastSync = Date.now();
    state.status = 'synced'; state.error = '';
    emit();
    if (!gotFirstSnapshot) { gotFirstSnapshot = true; doPush(); }
  }, e => {
    state.status = 'error'; state.error = msg(e); emit();
  });
}

function handleUser(u) {
  state.user = describeUser(u);
  if (!u) { stopListening(); state.status = 'signedout'; emit(); return; }
  if (!state.user.verified) { stopListening(); state.status = 'unverified'; emit(); return; }
  startListening();
}
if (auth) onAuthStateChanged(auth, u => handleUser(u));

async function doPush() {
  if (!auth || !auth.currentUser || !state.user || !state.user.verified || !hooks.getLocal || !gotFirstSnapshot) return;
  const L = hooks.getLocal();
  const r = remote || {};
  const epoch = Math.max(L.epoch || 0, r.epoch || 0);
  const payload = {
    epoch,
    devices: { [L.deviceId]: { json: JSON.stringify(L.stats), epoch: L.epoch || 0, at: Date.now(), platform: Platform.name } }
  };
  if (!r.settings || (L.settingsAt || 0) > (r.settings.at || 0)) payload.settings = { json: JSON.stringify(L.settings), at: L.settingsAt || 0 };
  if (!r.game || (L.gameAt || 0) > (r.game.at || 0)) payload.game = { json: JSON.stringify(L.game), at: L.gameAt || 0 };
  try {
    if (navigator.onLine !== false) { state.status = 'syncing'; emit(); }
    await setDoc(ref(), payload, { merge: true });
  } catch (e) {
    state.status = 'error'; state.error = msg(e); emit();
  }
}
function push() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(doPush, 1200);
}
window.addEventListener('online', () => { if (state.user && state.user.verified) { state.status = 'syncing'; emit(); push(); } });
window.addEventListener('offline', () => { if (state.user && state.user.verified) { state.status = 'offline'; emit(); } });

// ---------- Google-Anmeldung je Plattform ----------
function tauriGoogleIdToken() {
  const clientId = window.GOOGLE_WEB_CLIENT_ID;
  if (!clientId) return Promise.reject(fail('google/not-configured', 'Die Google-Anmeldung ist in dieser Version nicht eingerichtet.'));
  return new Promise(async (resolve, reject) => {
    const nonce = crypto.randomUUID(), stateParam = crypto.randomUUID();
    let port = null, unlisten = null, timer = null;
    const finish = (err, token) => {
      clearTimeout(timer);
      if (unlisten) unlisten();
      if (port !== null && err) oauthCancel(port).catch(() => {});
      err ? reject(err) : resolve(token);
    };
    try {
      unlisten = await onUrl(url => {
        const u = new URL(url);
        const params = new URLSearchParams(u.hash.replace(/^#/, '') || u.search.replace(/^\?/, ''));
        if (params.get('error')) return finish(fail('google/' + params.get('error'), 'Die Google-Anmeldung wurde abgebrochen.'));
        if (params.get('state') !== stateParam || !params.get('id_token')) return finish(fail('google/invalid', 'Die Antwort von Google war ungültig. Bitte versuch es noch einmal.'));
        finish(null, params.get('id_token'));
      });
      port = await oauthStart({
        ports: [OAUTH_PORT],
        response: '<html><head><meta charset="utf-8"><title>Sudoku-Schule</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:48px">Anmeldung abgeschlossen. Du kannst dieses Fenster schließen und zur Sudoku-Schule zurückkehren.</body></html>'
      });
      const q = new URLSearchParams({
        client_id: clientId, redirect_uri: `http://localhost:${OAUTH_PORT}`, response_type: 'id_token',
        scope: 'openid email profile', nonce, state: stateParam, prompt: 'select_account'
      });
      await openUrl('https://accounts.google.com/o/oauth2/v2/auth?' + q.toString());
      timer = setTimeout(() => finish(fail('google/timeout', 'Die Google-Anmeldung hat zu lange gedauert. Bitte versuch es noch einmal.')), 5 * 60 * 1000);
    } catch (e) {
      finish(fail('google/start', 'Die Google-Anmeldung konnte nicht gestartet werden: ' + (e && e.message ? e.message : e)));
    }
  });
}
async function googleCredential() {
  if (isAndroid) {
    if (!Capacitor.isPluginAvailable('FirebaseAuthentication')) throw fail('google/not-configured', 'Die Google-Anmeldung ist in dieser Version nicht eingerichtet.');
    const r = await FirebaseAuthentication.signInWithGoogle();
    const idToken = r && r.credential && r.credential.idToken;
    if (!idToken) throw fail('google/invalid', 'Google hat keine Anmeldedaten geliefert.');
    return GoogleAuthProvider.credential(idToken);
  }
  if (isTauri) return GoogleAuthProvider.credential(await tauriGoogleIdToken());
  return null; // Browser: Popup
}

// ---------- Öffentliche Schnittstelle ----------
const need = () => { if (!auth) throw fail('unavailable-build', 'Die Synchronisation ist in dieser Version nicht eingerichtet.'); };
const wrap = fn => async (...a) => {
  try { need(); return await fn(...a); } catch (e) {
    const own = e && e.code && (String(e.code).startsWith('google/') || e.code === 'unavailable-build');
    throw Object.assign(new Error(own ? e.message : msg(e)), { code: e && e.code });
  }
};

const Sync = {
  get state() { return { ...state }; },
  init(h) { Object.assign(hooks, h); emit(); },
  push,
  signIn: wrap(async (email, pw) => { await signInWithEmailAndPassword(auth, email.trim(), pw); }),
  signUp: wrap(async (email, pw) => {
    const c = await createUserWithEmailAndPassword(auth, email.trim(), pw);
    await sendEmailVerification(c.user);
    handleUser(c.user);
  }),
  google: wrap(async () => {
    const cred = await googleCredential();
    if (cred) await signInWithCredential(auth, cred);
    else await signInWithPopup(auth, new GoogleAuthProvider());
  }),
  resetPassword: wrap(async email => { await sendPasswordResetEmail(auth, email.trim()); }),
  resendVerification: wrap(async () => { if (auth.currentUser) await sendEmailVerification(auth.currentUser); }),
  checkVerified: wrap(async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    if (auth.currentUser.emailVerified) await auth.currentUser.getIdToken(true);
    handleUser(auth.currentUser);
    return auth.currentUser.emailVerified;
  }),
  syncNow: wrap(async () => { if (state.user && state.user.verified) await doPush(); }),
  signOut: wrap(async () => {
    stopListening();
    if (isAndroid && Capacitor.isPluginAvailable('FirebaseAuthentication')) { try { await FirebaseAuthentication.signOut(); } catch (e) { /* egal */ } }
    await fbSignOut(auth);
  }),
  deleteAccount: wrap(async password => {
    const u = auth.currentUser;
    if (!u) return;
    if (describeUser(u).provider === 'google') {
      const cred = await googleCredential();
      if (cred) await reauthenticateWithCredential(u, cred);
      else await reauthenticateWithPopup(u, new GoogleAuthProvider());
    } else {
      if (!password) throw fail('auth/missing-password');
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
    }
    const r = doc(db, 'users', u.uid);
    stopListening();
    await deleteDoc(r);
    await deleteUser(u);
  })
};

window.SudokuSync = Sync;
window.SudokuPlatform = Platform;
