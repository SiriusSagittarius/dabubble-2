# CLAUDE.md

Leitfaden für die Arbeit an diesem Projekt (DABubble – Angular + Firebase).
Diese Regeln sind verbindlich und gelten für jede Änderung.

---

## Projektkontext (kurz)

- **Framework:** Angular (standalone components, Signals, `ChangeDetectionStrategy.OnPush`).
- **Styles:** SCSS, pro Komponente oft in mehrere `.scss`-Dateien aufgeteilt
  (z. B. `chat-area.base.scss`, `chat-area.channel.scss`, `chat-area.messages.scss` …).
- **Backend:** Firebase (Auth + Firestore über `@angular/fire`).
  Firestore-/Auth-Aufrufe außerhalb des Injection-Context immer mit
  `runInInjectionContext(this.injector, …)` kapseln.
- **Build prüfen:** `ng build --configuration development` (muss grün sein).

---

## Regel 1 — Keine Datei länger als 400 Zeilen

Keine Datei (`.ts`, `.html`, `.scss`, …) darf **mehr als 400 Zeilen** haben.
Wird das überschritten, **nicht weiter anhängen**, sondern den Inhalt sinnvoll
auf eine **neue Datei** aufteilen.

**So wird aufgeteilt (dem bestehenden Muster folgen):**

- **SCSS:** In thematische Teildateien zerlegen und alle in `styleUrls`
  einbinden – genau wie bei `chat-area.*.scss` oder
  `modals-container.*.scss`. Namensschema: `<komponente>.<thema>.scss`.
- **TypeScript:** Logik in Services, Hilfsklassen oder eine Basisklasse
  auslagern (Vorbild: `chat-area.base.ts`, die `mock-database.*.service.ts`).
  Reine Hilfsfunktionen in eine `*.utils.ts`.
- **HTML-Templates:** Große Blöcke in eigenständige Unterkomponenten
  extrahieren (Vorbild: `sidebar-dm-list-item.component.ts`,
  `profile-categories-edit.component.ts`).

**Vor dem Abschluss prüfen** (geänderte Dateien zählen):

```bash
# Alle Quelldateien mit > 400 Zeilen auflisten (sollte leer sein):
find src -type f \( -name "*.ts" -o -name "*.html" -o -name "*.scss" \) \
  -exec wc -l {} + | awk '$1 > 400 && $2 != "total" { print }'
```

Ziel: Die obige Ausgabe ist leer. Diese CLAUDE.md selbst ebenfalls < 400 Zeilen halten.

### Bewusste Ausnahme
- `src/app/features/workspace/chat-area/chat-area.component.html` (~432 Zeilen)
  bleibt **absichtlich** über dem Limit. Eine saubere Kürzung ginge nur durch
  Auslagern des Channel-Bearbeiten-Modals in eine eigene Kind-Komponente
  (Logik + zugehörige `.channel-edition-*`-Styles aus mehreren SCSS-Dateien
  migrieren). Das ist als gezielter Refactor vorgemerkt, aber kein Blocker:
  Deployt wird nur das gebündelte `dist/dabubble/browser`, in dem keine
  Quell-Zeilenzahlen sichtbar sind. **Nicht** durch Zusammenziehen von
  Klammern „lösen" — Prettier formatiert das ohnehin zurück.

---

## Regel 2 — Google Lighthouse darf nicht meckern

Jede Änderung an UI/Markup so umsetzen, dass alle Lighthouse-Kategorien
sauber bleiben: **Performance, Accessibility, Best Practices, SEO.**

### Accessibility (häufigste Stolpersteine hier)
- **Jedes `<img>` braucht `alt`.** Dekorative Bilder: `alt=""` (leer) +
  ggf. `aria-hidden="true"`. Inhaltsbilder: aussagekräftiger Text.
- **Icon-Buttons brauchen `aria-label`** (Buttons ohne sichtbaren Text).
- **Formularfelder brauchen ein Label** (`<label for>` oder `aria-label`).
- **Farbkontrast** ausreichend (Text ≥ 4.5:1). Projektfarben beachten:
  `#444DF2` / `#797EF3` auf Weiß sind ok; helles `#ADB0D9` **nicht** für
  kleinen Fließtext auf Weiß verwenden.
- **Sichtbarer Fokus:** `:focus-visible`-Styles nicht entfernen; `outline: none`
  nur mit sichtbarem Ersatz (Border/Background).
- **`lang`-Attribut** am `<html>` gesetzt lassen.
- Sinnvolle Überschriften-Hierarchie (kein Sprung von `h1` zu `h3`).

### Performance
- **Bilder mit `width`/`height`** (oder festen CSS-Maßen) ausliefern, um
  Layout-Shift (CLS) zu vermeiden.
- Lazy Loading für Routen/große Bereiche; `@defer` für schwere Inhalte.
- `OnPush` beibehalten; keine teuren Aufrufe in Templates/`@for`-Schleifen.
- Keine riesigen Inline-Daten-URLs (Firestore-Bildgrenze beachten).

### Best Practices
- **Keine Fehler/Warnungen in der Browser-Konsole** (auch keine AngularFire-
  Injection-Context-Warnungen – siehe Projektkontext).
- Gültiges HTML, eindeutige `id`s, keine doppelten Attribute.
- Externe Links mit `rel="noopener"` bei `target="_blank"`.

### SEO
- `index.html`: aussagekräftiger `<title>`, `<meta name="description">`,
  `<meta name="viewport">` vorhanden lassen.
- Links als echte `<a>`/`routerLink` (crawlbar), nicht nur per Klick-Handler.

**Empfehlung:** Nach UI-Änderungen einen Lighthouse-Lauf (Chrome DevTools →
Lighthouse, oder `npx lighthouse <url>`) gegen den Production-Build machen und
Befunde beheben, bevor abgeschlossen wird.
