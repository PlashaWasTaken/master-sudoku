# Master Sudoku

Sudoku lernen und spielen: zehn Schwierigkeitsstufen, 24 Lösungstechniken mit Erklärung,
Beispielbild und endlosen Übungen, Punktesystem, Färbe-Werkzeug und eigene Farben.

- **Android** (Capacitor) und **Windows** (Tauri) aus einer gemeinsamen Web-Oberfläche in `web/`
- Spielen ohne Konto, komplett offline
- Optional Konto mit E-Mail/Passwort oder Google, Synchronisation über Firebase

Gebaut wird automatisch über GitHub Actions, die fertigen Apps liegen unter **Releases**.
Die Einrichtung von Firebase und Signierung steht in [ANLEITUNG.md](ANLEITUNG.md).

## Aufbau

| Pfad | Inhalt |
|---|---|
| `web/` | App: `core.js` (Generator, Löser, Techniken), `app.js` (Oberfläche), `bridge.src.js` (Konto, Sync, Plattform) |
| `scripts/build-web.mjs` | baut `dist/` und bindet die Firebase-Konfiguration ein |
| `android/` | Android-Projekt (Capacitor) |
| `src-tauri/` | Windows-Projekt (Tauri) |
| `firestore.rules` | Zugriffsregeln für die Datenbank |
