import { Component, ElementRef, ViewChild, inject, signal, HostListener, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockUser } from '../../../core/database/mock-database.models';
import { ProfileDialogService } from '../../../core/services/profile-dialog.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { ProfileCardComponent } from '../profile-card/profile-card.component';
import { ModalsContainerAvatarBase } from './modals-container.avatar.base';

@Component({
  selector: 'app-modals-container',
  standalone: true,
  imports: [FormsModule, ProfileCardComponent],
  templateUrl: './modals-container.component.html',
  styleUrls: [
    './modals-container.profile.scss',
    './modals-container.add-channel.scss',
    './modals-container.add-channel-members.scss',
    './modals-container.add-channel-fields.scss',
    './modals-container.channel-edition.scss',
  ],
})
export class ModalsContainer extends ModalsContainerAvatarBase {
  private readonly profileDialog = inject(ProfileDialogService);
  protected readonly uiState = inject(UiStateService);
  protected profileDialogOpen = false;
  protected profileEditMode = false;
  protected profileEditName = '';
  protected channelNameEditMode = false;
  protected channelDescriptionEditMode = false;
  protected channelNameDraft = '';
  protected channelDescriptionDraft = '';
  protected addMembersName = '';
  protected addChannelNameDraft = '';
  protected addChannelDescriptionDraft = '';
  protected addChannelIsPrivate = false;
  protected addChannelMembersStep = false;
  protected addChannelMemberMode: 'all' | 'selected' = 'all';
  protected pendingAddChannelId: string | null = null;
  // Beim Oeffnen des Dialogs aktiver Channel; Quelle fuer "Alle Mitglieder von ...".
  protected addChannelSourceChannelId: string | null = null;
  protected readonly showAddMembersSuggestions = signal(false);
  protected readonly selectedAddMemberIds = signal<string[]>([]);
  protected readonly channelEditionOpen = signal(false);
  protected readonly profileUser = signal<MockUser | null>(null);
  protected get membersPanelOpen() { return this.uiState.membersPanelOpen; }
  protected get addMembersPanelOpen() { return this.uiState.addMembersPanelOpen; }
  protected get addChannelDialogOpen() { return this.uiState.addChannelDialogOpen; }
  @ViewChild('addMemberInput') private addMemberInput?: ElementRef<HTMLInputElement>;

  constructor() {
    super();
    effect(() => {
      const userId = this.profileDialog.profileUserId();

      if (!userId) {
        this.profileDialogOpen = false;
        this.profileEditMode = false;
        this.profileUser.set(null);
        this.profileEditName = '';
        return;
      }

      const user = this.database.findUser(userId);
      if (!user) {
        return;
      }

      this.profileUser.set(user);
      this.profileDialogOpen = true;
      this.profileEditMode = false;
      this.profileEditName = user.name;
    });
  }

  protected openAddChannelDialog(): void {
    this.addChannelNameDraft = '';
    this.addChannelDescriptionDraft = '';
    this.addChannelIsPrivate = false;
    this.addChannelMembersStep = false;
    this.addChannelMemberMode = 'all';
    this.pendingAddChannelId = null;
    this.addChannelSourceChannelId = this.database.activeChannel()?.id || null;
    this.uiState.openAddChannelDialog();
  }

  protected closeAddChannelDialog(): void {
    this.uiState.closeAddChannelDialog();
    this.addChannelMembersStep = false;
    this.addChannelNameDraft = '';
    this.addChannelDescriptionDraft = '';
    this.addChannelIsPrivate = false;
    this.addChannelMemberMode = 'all';
    this.pendingAddChannelId = null;
    this.addChannelSourceChannelId = null;
    this.addMembersName = '';
    this.selectedAddMemberIds.set([]);
  }
  protected messageProfileUser(): void {
    const user = this.profileUser();
    if (user) {
      this.uiState.openDirectMessage(user.id);
      this.closeProfileDialog();
    }
  }

  protected cancelProfileEdit(): void {
    this.profileEditMode = false;
    this.profileEditName = '';
  }
  protected createAddChannel(): void {
    const name = this.addChannelNameDraft.trim();
    if (!name) return;

    // Zuletzt gesehenen Channel festhalten, BEVOR createChannel den aktiven
    // Channel auf den neuen umstellt. Quelle fuer "Alle Mitglieder von ...".
    this.addChannelSourceChannelId = this.database.activeChannel()?.id || null;

    const channel = this.database.createChannel(name, [], this.addChannelIsPrivate);
    if (channel && this.addChannelDescriptionDraft.trim()) {
      this.database.updateChannel(channel.id, {
        description: this.addChannelDescriptionDraft.trim(),
      });
    }

    if (channel) {
      this.pendingAddChannelId = channel.id;
      this.addChannelMembersStep = true;
    }
  }

  protected readonly isCurrentProfileUser = computed(() => {
    const user = this.profileUser();
    return user && user.id === this.database.currentUser()?.id;
  });
  protected finishAddChannelMembers(): void {
    const channelId = this.pendingAddChannelId;
    if (!channelId) {
      this.closeAddChannelDialog();
      return;
    }

    if (this.addChannelMemberMode === 'all') {
      // Auch im "alle"-Modus nur eigene Kontakte uebernehmen.
      const contactIds = new Set(this.database.contactUsers().map((user) => user.id));
      const memberIds = (this.addChannelSourceChannel()?.memberIds ?? []).filter((id) =>
        contactIds.has(id),
      );
      if (memberIds.length > 0) {
        this.database.addMembersToChannel(channelId, memberIds);
      }
    } else if (this.addChannelMemberMode === 'selected') {
      const selectedIds = this.selectedAddMemberIds();
      if (selectedIds.length > 0) {
        this.database.addMembersToChannel(channelId, selectedIds);
      }
    }

    this.closeAddChannelDialog();
  }

  // Beim Dialog-Start aktiver Channel; dessen Mitglieder fuellen Option "alle".
  protected addChannelSourceChannel() {
    const id = this.addChannelSourceChannelId;
    if (!id) return null;
    return this.database.channels().find((channel) => channel.id === id) ?? null;
  }

  protected addChannelSourceChannelName(): string {
    return this.addChannelSourceChannel()?.name || 'Devspace';
  }
  protected editProfile(): void {
    const user = this.profileUser();
    if (user) {
      this.profileEditName = user.name;
      this.profileEditMode = true;
    }
  }
  protected editChannelName(): void {
    this.channelNameDraft = this.database.activeChannel()?.name ?? '';
    this.channelNameEditMode = true;
    this.channelDescriptionEditMode = false;
  }

  protected saveChannelName(): void {
    const channel = this.database.activeChannel();
    const trimmedName = this.channelNameDraft.trim();

    if (!channel || !trimmedName) {
      return;
    }

    this.database.updateChannel(channel.id, { name: trimmedName });
    this.channelNameEditMode = false;
  }

  protected cancelChannelNameEdit(): void {
    this.channelNameDraft = this.database.activeChannel()?.name ?? '';
    this.channelNameEditMode = false;
  }

  protected editChannelDescription(): void {
    this.channelDescriptionDraft = this.database.activeChannel()?.description ?? '';
    this.channelDescriptionEditMode = true;
    this.channelNameEditMode = false;
  }

  protected saveChannelDescription(): void {
    const channel = this.database.activeChannel();

    if (!channel) {
      return;
    }

    this.database.updateChannel(channel.id, { description: this.channelDescriptionDraft.trim() });
    this.channelDescriptionEditMode = false;
  }

  protected isActiveChannelCreator(): boolean {
    const channel = this.database.activeChannel();
    const currentUser = this.database.currentUser();

    return !!channel && !!currentUser && channel.createdBy === currentUser.id;
  }

  protected isActiveChannelMember(): boolean {
    const channel = this.database.activeChannel();
    const currentUser = this.database.currentUser();

    return !!channel && !!currentUser && channel.memberIds.includes(currentUser.id);
  }

  protected channelEditionActionLabel(): string {
    if (!this.isActiveChannelMember()) {
      return 'Channel beitreten';
    }

    return this.isActiveChannelCreator() ? 'Channel löschen' : 'Channel verlassen';
  }

  protected handleChannelEditionAction(): void {
    const channel = this.database.activeChannel();

    if (!channel) {
      return;
    }

    if (!this.isActiveChannelMember()) {
      this.database.joinChannel(channel.id);
    } else if (this.isActiveChannelCreator()) {
      this.database.deleteChannel(channel.id);
    } else {
      this.database.leaveChannel(channel.id);
    }

    this.closeChannelEdition();
  }

  protected addMembersSuggestions() {
    const query = this.addMembersName.trim().toLowerCase();

    const selectedIds = this.selectedAddMemberIds();
    const channelId = this.addChannelMembersStep
      ? this.pendingAddChannelId
      : this.database.activeChannel()?.id;
    const channel = channelId ? this.database.channels().find((c) => c.id === channelId) : null;
    const activeMemberIds = channel?.memberIds ?? [];

    // Es duerfen ausschliesslich eigene Kontakte hinzugefuegt werden – sowohl beim
    // Erstellen eines Channels als auch beim Hinzufuegen zu einem bestehenden.
    const candidates = this.database.contactUsers();

    const filtered = candidates.filter((user) => {
      if (selectedIds.includes(user.id)) return false;
      if (activeMemberIds.includes(user.id)) return false;

      if (!query) return true;

      return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  protected hideSuggestionsWithDelay(): void {
    setTimeout(() => this.showAddMembersSuggestions.set(false), 200);
  }

  protected selectSuggestedMember(userId: string): void {
    if (!this.selectedAddMemberIds().includes(userId)) {
      this.selectedAddMemberIds.update((ids) => [...ids, userId]);
    }
    this.addMembersName = '';
    this.addMemberInput?.nativeElement.focus();
  }

  protected addMembersToChannel(): void {
    const selectedIds = this.selectedAddMemberIds();
    if (selectedIds.length === 0) return;

    const channel = this.database.activeChannel();
    if (!channel) return;

    this.database.addMembersToChannel(channel.id, selectedIds);

    this.uiState.closeAddMembersPanel();
  }

  protected closeChannelEdition(): void {
    this.channelEditionOpen.set(false);
    this.channelNameEditMode = false;
    this.channelDescriptionEditMode = false;
  }

  protected removeSelectedMember(userId: string): void {
    this.selectedAddMemberIds.update((ids) => ids.filter((id) => id !== userId));
  }

  protected selectedAddMembers() {
    return this.selectedAddMemberIds()
      .map((id) => this.database.findUser(id))
      .filter((u): u is NonNullable<typeof u> => !!u);
  }

  protected saveProfileEdit(): void {
    const user = this.profileUser();
    if (user && this.profileEditName.trim()) {
      this.database.updateCurrentUserName(this.profileEditName);
      this.profileEditMode = false;
    }
  }
  protected closeMembersPanel(): void { this.uiState.closeMembersPanel(); }
  protected closeAddMembersPanel(): void { this.uiState.closeAddMembersPanel(); }
  protected openAddMembersPanel(): void { this.uiState.openAddMembersPanel(); }
  protected closeProfileDialog(): void {
    this.profileDialog.close();
    this.profileDialogOpen = false;
    this.profileEditMode = false;
    this.profileEditName = '';
    this.profileUser.set(null);
  }


  protected openContactProfile(userId: string): void {
    this.profileDialog.open(userId);
  }


  protected profileAvatarSrc(): string {
    const user = this.profileUser();
    return this.avatarSvgPath(user?.id ?? '');
  }
}