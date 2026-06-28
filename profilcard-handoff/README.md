# Profilkarte — Übergabe-Paket (Kopien)

Dies sind **Kopien** der Dateien, die die Profilkarte ausmachen, plus die nötigen
Abhängigkeiten als Kontext. Die Originale im Projekt bleiben unverändert.

> Hinweis: Das ist Angular (standalone Components, Signals, `ChangeDetectionStrategy.OnPush`),
> Styles in SCSS, Daten über einen lokalen Store + Firebase/Firestore-Spiegelung.

---

## 1. Die Profilkarte (Hauptdateien) — Ordner `profile-card/`

Originalpfad: `src/app/features/workspace/profile-card/`

| Datei | Zweck |
|---|---|
| `profile-card.component.ts` | Logik: Anzeige/Edit-Umschaltung, Speichern, Bio, Avatar-Upload |
| `profile-card.component.html` | Markup (Anzeige- + Bearbeiten-Ansicht) |
| `profile-card.component.scss` | Grundlayout, Avatar, Header |
| `profile-card.details-form.scss` | Anzeige-Stile (Name, Status, E-Mail, Bio) |
| `profile-card.edit-form.scss` | Stile fürs Bearbeiten-Formular |
| `profile-categories-display.component.*` | Anzeige der Profil-Kategorien |
| `profile-categories-edit.component.*` | Bearbeiten der Kategorien |
| `add-category-modal.component.*` | Dialog „Kategorie hinzufügen" |

## 2. Öffnen/Schließen + Einbindung

- `dependencies/core-services/profile-dialog.service.ts`
  - hält das Signal `profileUserId` und `open(userId)` / `close()`.
  - Original: `src/app/core/services/profile-dialog.service.ts`
- Eingebunden wird die Karte als `<app-profile-card />` in
  `src/app/features/workspace/modals-container/modals-container.component.html`.
- Geöffnet wird sie an mehreren Stellen per `profileDialog.open(userId)`
  (Sidebar, Chat-Bereich, Channel-Details, Mitglieder-Liste).

## 3. Abhängigkeiten (Kontext) — Ordner `dependencies/`

### core-database/
- `mock-database.models.ts` — Datentypen. Relevant für die Karte v. a. `MockUser`
  mit Feldern: `id, name, email, isOnline, isPublic, avatarId, avatarImage,
  avatarClass, bio, links, profileCategories`. Außerdem `ProfileCategory`, `ProfileLink`.
  Original: `src/app/core/database/mock-database.models.ts`
- `mock-database.service.ts` — Fassade über den Store. Von der Karte genutzt:
  `findUser(id)`, `currentUser()`, `updateCurrentUserProfile(updates)`.
  Original: `src/app/core/database/mock-database.service.ts`

### core-services/
- `firebase-user.service.ts` — spiegelt Profiländerungen nach Firestore
  (`upsertCurrentUserProfile`). Original: `src/app/core/services/firebase-user.service.ts`
- `profile-category.service.ts` — Logik der Profil-Kategorien.
- `ui-state.service.ts` — u. a. `openDirectMessage(userId)` (Button „Nachricht").
- `design-system.service.ts` — Design-/Theme-Helfer.

---

## Wichtige Hinweise für die Weiterarbeit

- **Speichern läuft doppelt:** lokal über `database.updateCurrentUserProfile(...)`
  UND nach Firestore über `firebaseUsers.upsertCurrentUserProfile(...)`
  (umschlossen mit `runInInjectionContext`, da außerhalb des Injection-Context).
- **Edit-Modus darf nicht „zurückspringen":** Der Init-Effect reagiert bewusst
  nur auf die **ID** des geöffneten Profils (`profileUserId`), die Nutzerdaten
  werden via `untracked()` gelesen. Sonst würden Hintergrund-Updates (Präsenz,
  Firestore-Snapshots) den laufenden Bearbeiten-Vorgang zurücksetzen.
- **Avatar:** entweder `avatarImage` (Data-URL) ODER `avatarId` 1–6 (`/assets/icons/<id>.svg`).
- Beim Wieder-Einbauen ggf. **Importpfade anpassen** (hier liegen die Dateien flacher
  als im Original).
