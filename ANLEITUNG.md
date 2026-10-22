# Master Sudoku: Einrichtung

Die Apps werden nur auf ausdrückliche Ansage gebaut, nicht bei jedem Hochladen. Auslöser ist
entweder das Hochladen auf den Zweig `release` (Version aus `package.json`), eine Versionsmarke wie
`v1.1.0` oder **Actions → Apps bauen → Run workflow** mit einer Versionsnummer. Die fertigen Dateien liegen danach unter **Releases**.

Ohne die folgenden Schritte entstehen bereits funktionierende Apps, allerdings nur
für das Offline-Spiel und mit einer Debug-APK. Für Synchronisation und saubere
Updates braucht es die Secrets unten.

Alle Secrets trägst du hier ein:
**github.com/PlashaWasTaken/master-sudoku → Settings → Secrets and variables → Actions → New repository secret**

---

## Schritt 1: Android-Signierschlüssel (5 Minuten)

Die Werte stehen in der Datei `android-signierschluessel.txt`, die du von Claude bekommen hast.
Lege drei Secrets an:

| Name | Wert |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | der lange Textblock |
| `ANDROID_KEYSTORE_PASSWORD` | das Passwort |
| `ANDROID_KEY_ALIAS` | `sudoku` |

Bewahre die Datei sicher auf, zum Beispiel im Passwort-Manager. Ohne diesen Schlüssel
lassen sich Updates nur nach Deinstallation der App aufspielen.

---

## Schritt 2: Firebase-Projekt anlegen (10 Minuten)

1. Öffne <https://console.firebase.google.com> und melde dich mit deinem Google-Konto an.
2. **Projekt erstellen** → Name `master-sudoku` → Google Analytics **ausschalten** → Erstellen.

### Anmeldung einschalten
3. Links **Build → Authentication → Jetzt starten**.
4. Reiter **Anmeldemethode**:
   - **E-Mail-Adresse/Passwort** → oberen Schalter aktivieren → Speichern.
   - **Neuer Anbieter → Google** → aktivieren, Support-E-Mail wählen → Speichern.
5. Den Anbieter **Google** noch einmal öffnen, **Web SDK-Konfiguration** aufklappen und die
   **Web-Client-ID** kopieren → Secret `GOOGLE_WEB_CLIENT_ID`.
6. Optional, aber schöner: Reiter **Vorlagen** → Stiftsymbol → **Vorlagensprache: Deutsch**.
   Dann kommen Bestätigungs- und Passwort-Mails auf Deutsch.

### Datenbank anlegen
7. Links **Build → Firestore Database → Datenbank erstellen**.
8. Standort **europe-west3 (Frankfurt)** → **Im Produktionsmodus starten** → Erstellen.
9. Reiter **Regeln**: Den gesamten Inhalt ersetzen durch den Inhalt der Datei
   [`firestore.rules`](firestore.rules) aus diesem Repository → **Veröffentlichen**.

### Web-App registrieren (für die Zugangsdaten)
10. Oben links Zahnrad → **Projekteinstellungen** → unten **Meine Apps** → Symbol `</>` (Web).
11. Name `master-sudoku`, Hosting **nicht** anhaken → App registrieren.
12. Aus dem angezeigten `firebaseConfig` je ein Secret anlegen:

| Secret | Feld in firebaseConfig |
|---|---|
| `FIREBASE_API_KEY` | `apiKey` |
| `FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `FIREBASE_PROJECT_ID` | `projectId` |
| `FIREBASE_APP_ID` | `appId` |
| `FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |

### Android-App registrieren (für die Google-Anmeldung auf Android)
13. Wieder **Projekteinstellungen → Meine Apps → App hinzufügen → Android**.
14. Paketname: `com.plashawastaken.mastersudoku`
15. **SHA-1-Zertifikat**: den SHA1-Wert aus `android-signierschluessel.txt` eintragen → App registrieren.
16. Danach in den Projekteinstellungen bei der Android-App **Fingerabdruck hinzufügen** und auch
    den SHA256-Wert eintragen.
17. **google-services.json herunterladen.** Erst nach dem Eintragen der Fingerabdrücke,
    sonst fehlt darin die Google-Anmeldung.
18. In Windows die PowerShell öffnen und diesen Befehl ausführen. Er kopiert die Datei als Text
    in die Zwischenablage:
    ```powershell
    [Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\Downloads\google-services.json")) | Set-Clipboard
    ```
    Den Inhalt der Zwischenablage als Secret `GOOGLE_SERVICES_JSON_BASE64` einfügen.

---

## Schritt 3: Google-Anmeldung für Windows freischalten (3 Minuten)

Die Windows-App öffnet für die Google-Anmeldung deinen normalen Browser und empfängt
die Antwort lokal. Diese Rücksprungadresse muss Google einmal erlaubt werden:

1. Öffne <https://console.cloud.google.com/auth/clients>. Alternativ über das Menü ☰ links oben:
   **Google Auth Platform → Clients**.
2. Oben links neben dem Google-Cloud-Logo das Projekt **master-sudoku** auswählen.
3. In der Liste **Clients** (früher „OAuth 2.0-Client-IDs“) auf
   **Web client (auto created by Google Service)** klicken.
   Ist die Liste leer, ist in Firebase der Anbieter Google noch nicht aktiviert (Schritt 2, Punkt 4).
4. Bei **Autorisierte Weiterleitungs-URIs** → **URI hinzufügen** → `http://localhost:53682`
5. **Speichern.** Es kann ein paar Minuten dauern, bis das wirkt.

---

## Schritt 4: Neu bauen und installieren

1. Im Repository Reiter **Actions → Apps bauen → Run workflow**, Versionsnummer eingeben (z. B. `1.1.1`), starten.
2. Nach etwa 10 bis 15 Minuten unter **Releases** die neueste Version öffnen.
3. **Android:** Die `.apk` auf dem Handy bzw. Tablet herunterladen und öffnen. Beim ersten Mal
   fragt Android, ob der Browser Apps installieren darf → **Einstellungen → Zulassen**.
4. **Windows:** `master-sudoku-…-setup.exe` herunterladen und starten. Weil der Installer nicht
   kostenpflichtig signiert ist, warnt Windows SmartScreen: **Weitere Informationen →
   Trotzdem ausführen.**

Updates installierst du genauso, einfach über die alte Version drüber. Dein Spielstand bleibt erhalten.
