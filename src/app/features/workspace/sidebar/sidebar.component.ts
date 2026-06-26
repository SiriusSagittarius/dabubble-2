import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { ProfileDialogService } from '../../../core/services/profile-dialog.service';
import { SidebarCaretIconComponent } from './sidebar-caret-icon.component';
import { SidebarDmListItemComponent } from './sidebar-dm-list-item.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarCaretIconComponent, SidebarDmListItemComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.channels.scss', './sidebar.dm.scss', './sidebar.kontakte.scss'],
})
export class Sidebar {
  @Output() itemSelected = new EventEmitter<void>();

  protected readonly database = inject(MockDatabaseService);
  protected readonly uiState = inject(UiStateService);
  private readonly profileDialog = inject(ProfileDialogService);

  protected readonly channelsExpanded = signal(true);
  protected readonly directMessagesExpanded = signal(false);
  protected readonly kontakteExpanded = signal(false);
  protected readonly privateContactsExpanded = signal(true);
  protected readonly teamExpanded = signal(true);
  protected readonly meineChannelsExpanded = signal(true);
  protected readonly alleChannelsExpanded = signal(false);
  protected readonly devspaceSearchOpen = signal(false);
  protected readonly devspaceSearchQuery = signal('');
  protected readonly addContactOpen = signal(false);
  protected readonly addContactFirstName = signal('');
  protected readonly addContactLastName = signal('');
  protected readonly addContactEmail = signal('');
  protected readonly addContactPhone = signal('');
  protected readonly kontakteSearchQuery = signal('');

  protected readonly searchShowChannels = computed(() =>
    this.devspaceSearchQuery().startsWith('#')
  );
  protected readonly searchShowUsers = computed(() =>
    this.devspaceSearchQuery().startsWith('@')
  );
  protected readonly searchShowDefault = computed(() =>
    !this.searchShowChannels() && !this.searchShowUsers()
  );

  // Nur beigetretene / erstellte Channels durchsuchbar
  protected readonly filteredChannels = computed(() => {
    const q = this.devspaceSearchQuery().slice(1).toLowerCase();
    return this.database.joinedChannels().filter(c =>
      !q || c.name.toLowerCase().includes(q)
    );
  });

  private readonly _channelMemberIds = computed(() => {
    const ids = new Set<string>();
    this.database.joinedChannels().forEach(c => c.memberIds.forEach(id => ids.add(id)));
    return ids;
  });

  private readonly _contactIds = computed(() =>
    new Set(this.database.contactUsers().map(u => u.id))
  );

  // Nur eigene Kontakte, Channel-Mitglieder und öffentliche User
  protected readonly filteredUsers = computed(() => {
    const q = this.devspaceSearchQuery().slice(1).toLowerCase();
    const currentUserId = this.database.currentUser()?.id;
    const contactIds = this._contactIds();
    const memberIds = this._channelMemberIds();
    return this.database.users().filter(u => {
      if (u.id === currentUserId) return false;
      const visible = u.isPublic || contactIds.has(u.id) || memberIds.has(u.id);
      return visible && (!q || u.name.toLowerCase().includes(q));
    });
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

  protected readonly joinedChannelIds = computed(() =>
    new Set(this.database.joinedChannels().map(c => c.id))
  );

  // DM-Liste: bereits gefuehrte Gespraeche + das gerade geoeffnete (auch wenn
  // dort noch keine Nachricht steht), damit es sofort sichtbar ist.
  protected readonly directMessageList = computed(() => {
    const partners = this.database.directMessagePartners();
    const openId = this.uiState.selectedDirectMessageUserId();
    if (!openId || partners.some((u) => u.id === openId)) {
      return partners;
    }
    const openUser = this.database.findUser(openId);
    return openUser ? [openUser, ...partners] : partners;
  });

  protected channelIsActive(channelId: string): boolean {
    return this.database.selectedChannelId() === channelId;
  }

  protected toggleChannels(): void {
    const next = !this.channelsExpanded();
    this.directMessagesExpanded.set(false);
    this.kontakteExpanded.set(false);
    this.channelsExpanded.set(next);
  }

  protected toggleDirectMessages(): void {
    const next = !this.directMessagesExpanded();
    this.channelsExpanded.set(false);
    this.kontakteExpanded.set(false);
    this.directMessagesExpanded.set(next);
  }

  protected toggleKontakte(): void {
    const next = !this.kontakteExpanded();
    this.channelsExpanded.set(false);
    this.directMessagesExpanded.set(false);
    this.kontakteExpanded.set(next);
  }

  protected togglePrivateContacts(): void {
    this.privateContactsExpanded.update((open) => !open);
  }

  protected toggleTeam(): void {
    this.teamExpanded.update((open) => !open);
  }

  // Alle/Meine Channels: nur eines von beiden offen
  protected toggleAlleChannels(): void {
    const next = !this.alleChannelsExpanded();
    this.meineChannelsExpanded.set(false);
    this.alleChannelsExpanded.set(next);
  }

  protected toggleMeineChannels(): void {
    const next = !this.meineChannelsExpanded();
    this.alleChannelsExpanded.set(false);
    this.meineChannelsExpanded.set(next);
  }

  protected avatarSvgPath(userId: string): string {
    const avatarImage = this.database.findUser(userId)?.avatarImage;
    if (avatarImage) return avatarImage;

    return `/assets/icons/${this.userAvatarId(userId)}.svg`;
  }

  protected openDevspaceSearch(): void {
    this.devspaceSearchOpen.set(true);
  }

  protected closeDevspaceSearch(): void {
    this.devspaceSearchOpen.set(false);
    this.devspaceSearchQuery.set('');
  }

  protected openMainChatIntro(): void {
    this.uiState.openMainChatIntro();
    this.itemSelected.emit();
  }

  protected openAddChannelDialog(): void {
    this.uiState.openAddChannelDialog();
  }

  protected openAddMembersPanel(): void {
    this.uiState.openAddMembersPanel();
  }

  protected openDirectMessage(userId: string): void {
    this.uiState.openDirectMessage(userId);
    this.itemSelected.emit();
  }

  protected onSelectChannel(channelId: string): void {
    this.database.selectChannel(channelId);
    this.uiState.openChannel();
    this.itemSelected.emit();
  }

  protected joinChannel(channelId: string): void {
    this.database.joinChannel(channelId);
    this.onSelectChannel(channelId);
  }

  protected openUserProfile(userId: string): void {
    this.profileDialog.open(userId);
  }

  protected openHelp(): void {
    this.uiState.openHelp();
    this.itemSelected.emit();
  }

  // Oeffentlichen Kontakt in die eigene private Kontaktliste uebernehmen.
  protected addPublicContact(userId: string): void {
    this.database.addExistingContact(userId);
  }

  // ===== Kontakt-Kontextmenue =====
  protected readonly openContactMenuId = signal<string | null>(null);
  protected readonly deleteArmedId = signal<string | null>(null);
  private deletePressTimer: ReturnType<typeof setTimeout> | null = null;

  protected toggleContactMenu(userId: string): void {
    this.openContactMenuId.update((id) => (id === userId ? null : userId));
    this.deleteArmedId.set(null);
  }

  protected closeContactMenu(): void {
    this.openContactMenuId.set(null);
    this.deleteArmedId.set(null);
  }

  protected contactMessage(userId: string): void {
    this.uiState.openDirectMessage(userId);
    this.itemSelected.emit();
    this.closeContactMenu();
  }

  protected contactProfile(userId: string): void {
    this.profileDialog.open(userId);
    this.closeContactMenu();
  }

  protected contactAddToChannel(userId: string): void {
    const channelId = this.database.selectedChannelId();
    if (channelId) {
      this.database.addMembersToChannel(channelId, [userId]);
    } else {
      this.uiState.openAddMembersPanel();
    }
    this.closeContactMenu();
  }

  // Zweistufiges Loeschen: erster Klick "scharf schalten", zweiter Klick loescht.
  protected contactDelete(userId: string): void {
    if (this.deleteArmedId() === userId) {
      this.database.removeContact(userId);
      this.deleteArmedId.set(null);
      this.closeContactMenu();
    } else {
      this.deleteArmedId.set(userId);
    }
  }

  // Langes Druecken schaltet das Loeschen ebenfalls scharf.
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

  private userAvatarId(userId: string): number {
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
