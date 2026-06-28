import { Directive, computed, inject, signal } from '@angular/core';
import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { ProfileDialogService } from '../../../core/services/profile-dialog.service';

/**
 * Basisklasse fuer den Kontakte-Teil der Sidebar. Ausgelagert aus
 * sidebar.component.ts wegen der 400-Zeilen-Regel (Vorbild: chat-area.base.ts).
 * Buendelt Kontakt-Suche, Hinzufuegen-Formular, Kontextmenue, Loeschen sowie
 * Import/Export. Die Sidebar erbt hiervon.
 */
@Directive()
export abstract class SidebarContactsBase {
  protected readonly database = inject(MockDatabaseService);
  protected readonly uiState = inject(UiStateService);
  protected readonly profileDialog = inject(ProfileDialogService);

  /** Muss von der Sidebar bereitgestellt werden (Schliessen der mobilen Sidebar). */
  protected abstract emitItemSelected(): void;

  // ===== Kontakte-Akkordeon =====
  protected readonly kontakteExpanded = signal(false);
  protected readonly privateContactsExpanded = signal(true);
  protected readonly teamExpanded = signal(false);
  protected readonly kontakteSearchQuery = signal('');

  // ===== Add-Contact-Formular =====
  protected readonly addContactOpen = signal(false);
  protected readonly addContactFirstName = signal('');
  protected readonly addContactLastName = signal('');
  protected readonly addContactEmail = signal('');
  protected readonly addContactPhone = signal('');

  private readonly _contactIds = computed(() =>
    new Set(this.database.contactUsers().map(u => u.id))
  );

  protected readonly _channelMemberIds = computed(() => {
    const ids = new Set<string>();
    this.database.joinedChannels().forEach(c => c.memberIds.forEach(id => ids.add(id)));
    return ids;
  });

  // Kontakte-Liste: eigene Kontakte + Channel-Mitglieder; bei Suche auch öffentliche
  protected readonly visibleContacts = computed(() => {
    const currentUserId = this.database.currentUser()?.id;
    const contactIds = this._contactIds();
    const memberIds = this._channelMemberIds();
    const q = this.kontakteSearchQuery().toLowerCase().trim();
    return this.database.users().filter(u => {
      if (u.id === currentUserId) return false;
      const isBase = contactIds.has(u.id) || memberIds.has(u.id);
      if (!q) return isBase;
      const nameMatches = u.name.toLowerCase().includes(q);
      return nameMatches && (isBase || u.isPublic === true);
    });
  });

  // Suche nach oeffentlichen Kontakten, die noch nicht in der eigenen Liste sind.
  protected readonly contactSearchResults = computed(() => {
    const q = this.kontakteSearchQuery().toLowerCase().trim();
    if (!q) return [];
    const currentUserId = this.database.currentUser()?.id;
    const contactIds = this._contactIds();
    return this.database.users().filter((u) =>
      u.id !== currentUserId &&
      !u.isGuest &&
      u.isPublic !== false &&
      !contactIds.has(u.id) &&
      u.name.toLowerCase().includes(q)
    );
  });

  // Kontakte-Bereich als Akkordeon: Suche, Kontakte und Team – es ist immer nur
  // eines offen. Oeffnen einer Liste schliesst die andere und leert die Suche.
  protected togglePrivateContacts(): void {
    const next = !this.privateContactsExpanded();
    if (next) {
      this.teamExpanded.set(false);
      this.kontakteSearchQuery.set('');
    }
    this.privateContactsExpanded.set(next);
  }

  protected toggleTeam(): void {
    const next = !this.teamExpanded();
    if (next) {
      this.privateContactsExpanded.set(false);
      this.kontakteSearchQuery.set('');
    }
    this.teamExpanded.set(next);
  }

  // Suche aktiv -> Kontakte- und Team-Liste schliessen.
  protected onKontakteSearchFocus(): void {
    this.privateContactsExpanded.set(false);
    this.teamExpanded.set(false);
  }

  protected openUserProfile(userId: string): void {
    this.profileDialog.open(userId);
  }

  // Oeffentlichen Kontakt in die eigene private Kontaktliste uebernehmen.
  protected addPublicContact(userId: string): void {
    this.database.addExistingContact(userId);
  }

  // ===== Kontakt-Kontextmenue =====
  protected readonly openContactMenuId = signal<string | null>(null);
  // Getrennte "scharf schalten"-Zustaende fuer die zwei Loeschaktionen, damit sie
  // sich nicht gegenseitig beeinflussen (Chat loeschen vs. Kontakt entfernen).
  protected readonly deleteArmedId = signal<string | null>(null);
  protected readonly removeArmedId = signal<string | null>(null);
  private deletePressTimer: ReturnType<typeof setTimeout> | null = null;

  protected toggleContactMenu(userId: string): void {
    this.openContactMenuId.update((id) => (id === userId ? null : userId));
    this.deleteArmedId.set(null);
    this.removeArmedId.set(null);
  }

  protected closeContactMenu(): void {
    this.openContactMenuId.set(null);
    this.deleteArmedId.set(null);
    this.removeArmedId.set(null);
  }

  protected contactMessage(userId: string): void {
    this.uiState.openDirectMessage(userId);
    this.emitItemSelected();
    this.closeContactMenu();
  }

  protected contactProfile(userId: string): void {
    this.profileDialog.open(userId);
    this.closeContactMenu();
  }

  // Zweistufiges Loeschen: erster Klick "scharf schalten", zweiter Klick loescht
  // nur die DM-Unterhaltung mit diesem Nutzer, nicht den Kontakt selbst.
  protected contactDelete(userId: string): void {
    if (this.deleteArmedId() === userId) {
      this.database.deleteDirectConversation(userId);
      this.deleteArmedId.set(null);
      this.closeContactMenu();
    } else {
      this.deleteArmedId.set(userId);
      this.removeArmedId.set(null);
    }
  }

  // Zweistufiges Entfernen des Nutzers aus der EIGENEN Kontaktliste (loescht den
  // Nutzer nicht global, nur aus den eigenen contactUserIds + Firebase-Sync).
  protected contactRemove(userId: string): void {
    if (this.removeArmedId() === userId) {
      this.database.removeContact(userId);
      this.removeArmedId.set(null);
      this.closeContactMenu();
    } else {
      this.removeArmedId.set(userId);
      this.deleteArmedId.set(null);
    }
  }

  // Langes Druecken schaltet das Chat-Loeschen ebenfalls scharf.
  protected onDeletePressStart(userId: string): void {
    this.clearDeletePressTimer();
    this.deletePressTimer = setTimeout(() => this.deleteArmedId.set(userId), 600);
  }

  protected onDeletePressEnd(): void {
    this.clearDeletePressTimer();
  }

  private clearDeletePressTimer(): void {
    if (this.deletePressTimer !== null) {
      clearTimeout(this.deletePressTimer);
      this.deletePressTimer = null;
    }
  }

  protected openAddContact(): void {
    this.addContactFirstName.set('');
    this.addContactLastName.set('');
    this.addContactEmail.set('');
    this.addContactPhone.set('');
    this.addContactOpen.set(true);
  }

  protected closeAddContact(): void {
    this.addContactOpen.set(false);
  }

  protected submitAddContact(): void {
    const first = this.addContactFirstName().trim();
    const last = this.addContactLastName().trim();
    const email = this.addContactEmail().trim();
    if (!first || !email) return;
    const name = last ? `${first} ${last}` : first;
    this.database.addContact(name, email, this.addContactPhone().trim() || undefined);
    this.closeAddContact();
  }

  protected exportContacts(): void {
    const data = this.database.contactUsers().map(u => ({ name: u.name, email: u.email ?? '' }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kontakte.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  protected importContacts(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (!Array.isArray(data)) return;
          for (const entry of data) {
            if (typeof entry.name === 'string' && typeof entry.email === 'string') {
              this.database.addContact(entry.name, entry.email);
            }
          }
        } catch {}
      };
      reader.readAsText(file);
    };
    input.click();
  }

  protected avatarSvgPath(userId: string): string {
    const avatarImage = this.database.findUser(userId)?.avatarImage;
    if (avatarImage) return avatarImage;
    return `/assets/icons/${this.userAvatarId(userId)}.svg`;
  }

  protected userAvatarId(userId: string): number {
    const user = this.database.findUser(userId);
    if (!user) return 1;
    if (typeof user.avatarId === 'number' && user.avatarId >= 1 && user.avatarId <= 6) return user.avatarId;
    const classMatch = user.avatarClass?.match(/avatar-(\d+)/);
    if (classMatch) {
      const id = Number(classMatch[1]);
      if (id >= 1 && id <= 6) return id;
    }
    return 1;
  }
}
