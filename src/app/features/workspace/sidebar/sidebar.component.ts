import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { ProfileDialogService } from '../../../core/services/profile-dialog.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  protected readonly meineChannelsExpanded = signal(true);
  protected readonly alleChannelsExpanded = signal(false);
  protected readonly devspaceSearchOpen = signal(false);
  protected readonly devspaceSearchQuery = signal('');
  protected readonly addContactOpen = signal(false);
  protected readonly addContactFirstName = signal('');
  protected readonly addContactLastName = signal('');
  protected readonly addContactEmail = signal('');
  protected readonly addContactPhone = signal('');

  protected readonly searchShowChannels = computed(() =>
    this.devspaceSearchQuery().startsWith('#')
  );
  protected readonly searchShowUsers = computed(() =>
    this.devspaceSearchQuery().startsWith('@')
  );
  protected readonly searchShowDefault = computed(() =>
    !this.searchShowChannels() && !this.searchShowUsers()
  );

  protected readonly filteredChannels = computed(() => {
    const q = this.devspaceSearchQuery().slice(1).toLowerCase();
    const currentUserId = this.database.currentUser()?.id;
    return this.database.channels().filter(c =>
      (!q || c.name.toLowerCase().includes(q)) &&
      // Private Channels nur fuer Mitglieder sichtbar
      (!c.isPrivate || (!!currentUserId && c.memberIds.includes(currentUserId)))
    );
  });

  protected readonly filteredUsers = computed(() => {
    const q = this.devspaceSearchQuery().slice(1).toLowerCase();
    return this.database.users().filter(u =>
      !q || u.name.toLowerCase().includes(q)
    );
  });

  protected readonly joinedChannelIds = computed(() =>
    new Set(this.database.joinedChannels().map(c => c.id))
  );

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

    const avatarId = this.userAvatarId(userId);
    if (avatarId === null || avatarId === 0) {
      return '/assets/icons/1.svg';
    }
    return `/assets/icons/${avatarId}.svg`;
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

  // ===== Kontakt-Kontextmenue =====
  protected readonly openContactMenuId = signal<string | null>(null);
  protected readonly deleteArmedId = signal<string | null>(null);
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressFired = false;

  protected toggleContactMenu(userId: string): void {
    this.openContactMenuId.update((id) => (id === userId ? null : userId));
    this.deleteArmedId.set(null);
  }

  protected closeContactMenu(): void {
    this.openContactMenuId.set(null);
    this.deleteArmedId.set(null);
  }

  protected isActiveChannelCreator(): boolean {
    const channel = this.database.activeChannel();
    const currentUser = this.database.currentUser();
    return !!channel && !!currentUser && channel.createdBy === currentUser.id;
  }

  protected contactAddToChannel(userId: string): void {
    const channel = this.database.activeChannel();
    if (channel) {
      this.database.addMembersToChannel(channel.id, [userId]);
    }
    this.closeContactMenu();
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

  // 1. Klick: aus aktuellem Channel entfernen. 2. Klick / Long-Press: ganz loeschen (nur Channel-Ersteller).
  protected contactDelete(userId: string): void {
    if (this.longPressFired) {
      this.longPressFired = false;
      return;
    }
    if (this.deleteArmedId() === userId) {
      if (this.isActiveChannelCreator()) {
        this.database.deleteUserEverywhere(userId);
      }
      this.closeContactMenu();
      return;
    }
    const channel = this.database.activeChannel();
    if (channel) {
      this.database.removeMemberFromChannel(channel.id, userId);
    }
    if (this.isActiveChannelCreator()) {
      this.deleteArmedId.set(userId);
    } else {
      this.closeContactMenu();
    }
  }

  protected onDeletePressStart(userId: string): void {
    if (!this.isActiveChannelCreator()) {
      return;
    }
    this.longPressFired = false;
    this.longPressTimer = setTimeout(() => {
      this.longPressFired = true;
      this.database.deleteUserEverywhere(userId);
      this.closeContactMenu();
    }, 600);
  }

  protected onDeletePressEnd(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
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

  private userAvatarId(userId: string): number | null {
    const user = this.database.findUser(userId);
    if (!user) return null;
    if (typeof user.avatarId === 'number') return user.avatarId;
    if (typeof user.avatarId === 'string') {
      const num = parseInt(user.avatarId, 10);
      if (!isNaN(num)) return num;
    }
    const classMatch = user.avatarClass?.match(/avatar-(\d)/);
    if (classMatch) return Number(classMatch[1]);
    return null;
  }
}
