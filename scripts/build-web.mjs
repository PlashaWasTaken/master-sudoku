// Baut die Web-Oberfläche nach dist/: kopiert die App, bündelt Schrift und Firebase-Brücke
// und schreibt die Firebase-Konfiguration aus Umgebungsvariablen (GitHub-Secrets).
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'web');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'js'), { recursive: true });
fs.mkdirSync(path.join(dist, 'css'), { recursive: true });
fs.mkdirSync(path.join(dist, 'fonts'), { recursive: true });

for (const f of ['index.html', 'css/app.css', 'js/core.js', 'js/app.js']) fs.copyFileSync(path.join(web, f), path.join(dist, f));

// Schrift lokal mitliefern, damit die App offline gleich aussieht
const fontDir = path.join(root, 'node_modules/@fontsource/figtree/files');
let fontCss = '';
for (const sub of ['latin', 'latin-ext']) {
  for (const w of [400, 500, 600, 700, 800, 900]) {
    const file = `figtree-${sub}-${w}-normal.woff2`;
    fs.copyFileSync(path.join(fontDir, file), path.join(dist, 'fonts', file));
    const range = sub === 'latin'
      ? 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
      : 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
    fontCss += `@font-face{font-family:"Figtree";font-style:normal;font-weight:${w};font-display:swap;src:url(../fonts/${file}) format("woff2");unicode-range:${range}}\n`;
  }
}
fs.writeFileSync(path.join(dist, 'css/fonts.css'), fontCss);

// Firebase-Konfiguration: aus Umgebungsvariablen oder lokal aus firebase.local.json
let cfg = null;
const env = process.env;
if (env.FIREBASE_API_KEY && env.FIREBASE_PROJECT_ID && env.FIREBASE_APP_ID) {
  cfg = {
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN || `${env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: env.FIREBASE_PROJECT_ID,
    appId: env.FIREBASE_APP_ID,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || undefined
  };
} else if (fs.existsSync(path.join(root, 'firebase.local.json'))) {
  cfg = JSON.parse(fs.readFileSync(path.join(root, 'firebase.local.json'), 'utf8'));
}
const googleClient = env.GOOGLE_WEB_CLIENT_ID || (cfg && cfg.googleWebClientId) || '';
if (cfg) delete cfg.googleWebClientId;
fs.writeFileSync(path.join(dist, 'js/firebase-config.js'),
  `window.FIREBASE_CONFIG = ${JSON.stringify(cfg)};\nwindow.GOOGLE_WEB_CLIENT_ID = ${JSON.stringify(googleClient)};\n`);
console.log(cfg ? `Firebase-Konfiguration für Projekt "${cfg.projectId}" eingebunden.` : 'Keine Firebase-Konfiguration gefunden: Die App läuft nur offline.');

await build({
  entryPoints: [path.join(web, 'js/bridge.src.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020', 'chrome100'],
  outfile: path.join(dist, 'js/bridge.js'),
  legalComments: 'none',
  logLevel: 'warning'
});
console.log('Web-Oberfläche gebaut: dist/');
