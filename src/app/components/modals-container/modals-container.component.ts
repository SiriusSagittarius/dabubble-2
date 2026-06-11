import { Component, ElementRef, ViewChild, inject, signal, HostListener, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockDatabaseService } from '../../database/mock-database.service';
import { MockUser } from '../../database/mock-database.models';
import { ProfileDialogService } from '../../services/profile-dialog.service';
import { UiStateService } from '../../services/ui-state.service';
import { ProfileCardComponent } from '../profile-card/profile-card.component';

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
export class ModalsContainer {
  protected readonly database = inject(MockDatabaseService);
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
  protected addChannelMembersStep = false;
  protected addChannelMemberMode: 'all' | 'selected' = 'all';
  protected pendingAddChannelId: string | null = null;

  protected readonly showAddMembersSuggestions = signal(false);
  protected readonly selectedAddMemberIds = signal<string[]>([]);
  protected readonly channelEditionOpen = signal(false);
  protected readonly profileUser = signal<MockUser | null>(null);

  protected get membersPanelOpen() { return this.uiState.membersPanelOpen; }
  protected get addMembersPanelOpen() { return this.uiState.addMembersPanelOpen; }
  protected get addChannelDialogOpen() { return this.uiState.addChannelDialogOpen; }
  @ViewChild('addMemberInput') private addMemberInput?: ElementRef<HTMLInputElement>;

  constructor() {
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
    this.addChannelMembersStep = false;
    this.addChannelMemberMode = 'all';
    this.pendingAddChannelId = null;
    this.uiState.openAddChannelDialog();
  }

  protected closeAddChannelDialog(): void {
    this.uiState.closeAddChannelDialog();
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

    const channel = this.database.createChannel(name);
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

  // ... (Bisherige Variablen aus Teil 1 bleiben bestehen)
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
      this.database.addMembersToChannel(
        channelId,
        this.database.users().map((user) => user.id),
      );
    } else if (this.addChannelMemberMode === 'selected') {
      const selectedIds = this.selectedAddMemberIds();
      if (selectedIds.length > 0) {
        this.database.addMembersToChannel(channelId, selectedIds);
      }
    }

    this.closeAddChannelDialog();
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

    const filtered = this.database.users().filter((user) => {
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
  // ... (Bisheriger Code aus Teil 1 & Teil 2 bleibt unverändert bestehen)

  protected removeSelectedMember(userId: string): void {
    this.selectedAddMemberIds.update((ids) => ids.filter((id) => id !== userId));
  }

  protected selectedAddMembers() {
    return this.selectedAddMemberIds()
      .map((id) => this.database.findUser(id))
      .filter((u): u is NonNullable<typeof u> => !!u);
  }

  protected profileSpriteBackgroundPosition(userId: string, scale: number): string {
    const avatarId = this.userAvatarId(userId);
    if (avatarId === null) {
      return 'center';
    }

    const row = Math.floor((avatarId - 1) / 6);
    const col = (avatarId - 1) % 6;

    const x = col * 80 * scale;
    const y = row * 84 * scale;

    switch (avatarId) {
      case 1:
        return `-${x}px -${y}px`;
      case 2:
        return `-${84 * scale}px -${y}px`;
      case 3:
        return `-${164 * scale}px -${y}px`;
      case 4:
        return `-${244 * scale}px -${y}px`;
      case 5:
        return `-${324 * scale}px -${y}px`;
      case 6:
        return `-${404 * scale}px -${y}px`;
      default:
        return 'center';
    }
  }

  protected profileSpriteBackgroundSize(scale: number): string {
    return `${472 * scale}px ${167 * scale}px`;
  }
  protected saveProfileEdit(): void {
    const user = this.profileUser();
    if (user && this.profileEditName.trim()) {
      this.database.updateCurrentUserName(this.profileEditName);
      this.profileEditMode = false;
    }
  }
  protected avatarSvgPath(userId: string): string {
    const avatarImage = this.database.findUser(userId)?.avatarImage;
    if (avatarImage) return avatarImage;

    const avatarId = this.userAvatarId(userId);
    if (!avatarId) {
      return '/assets/1.svg';
    }

    return `/assets/${avatarId}.svg`;
  }

  private userAvatarId(userId: string): number | null {
    const user = this.database.findUser(userId);
    if (!user) {
      return null;
    }

    if (typeof user.avatarId === 'number') {
      return user.avatarId;
    }

    if (typeof user.avatarId === 'string') {
      const num = parseInt(user.avatarId, 10);
      if (!isNaN(num)) return num;
    }

    const classMatch = user.avatarClass?.match(/avatar-(\d)/);
    if (classMatch) return Number(classMatch[1]);
    return null;
  }
// --- Profil & Panels Schließen ---
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

  // --- Kontakt-Profil öffnen ---
  protected openContactProfile(userId: string): void {
    this.profileDialog.open(userId);
  }

  // --- Avatar-Helfer für das Template ---
  // Diese verknüpfen deine bestehende Sprite-Logik mit dem Namen im Template
  protected contactAvatarBackgroundImage(userId: string): string {
    return `url('/assets/sprites.png')`; // Pfad anpassen, falls nötig
  }
  protected contactAvatarBackgroundPosition(userId: string): string {
    return this.profileSpriteBackgroundPosition(userId, 1);
  }
  protected contactAvatarBackgroundSize(userId: string): string {
    return this.profileSpriteBackgroundSize(1);
  }

  protected profileAvatarSrc(): string {
    const user = this.profileUser();
    return this.avatarSvgPath(user?.id ?? '');
  }
}

