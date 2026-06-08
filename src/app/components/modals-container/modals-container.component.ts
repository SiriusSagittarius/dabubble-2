import { Component, ElementRef, ViewChild, inject, signal, HostListener, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockDatabaseService } from '../../database/mock-database.service';

@Component({
  selector: 'app-modals-container',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './modals-container.component.html',
  styleUrl: './modals-container.component.scss',
})
export class ModalsContainer {
  protected readonly database = inject(MockDatabaseService);

  protected profileDialogOpen = false;
  protected profileEditMode = false;
  protected profileEditName = '';
  protected selectedProfileUserId: string | null = null;

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
  protected readonly membersPanelOpen = signal(false);
  protected readonly addMembersPanelOpen = signal(false);
  protected readonly addChannelDialogOpen = signal(false);
  protected readonly channelEditionOpen = signal(false);
  protected readonly isEditMode = signal(false);
  protected editProfileEditName = '';
  protected readonly profileUser = signal<any | null>(null); // Typ 'any' oder dein User-Typ
  @ViewChild('addMemberInput') private addMemberInput?: ElementRef<HTMLInputElement>;

  protected openAddChannelDialog(): void {
    this.addChannelNameDraft = '';
    this.addChannelDescriptionDraft = '';
    this.addChannelMembersStep = false;
    this.addChannelMemberMode = 'all';
    this.pendingAddChannelId = null;
    this.addChannelDialogOpen.set(true);
  }

  protected closeAddChannelDialog(): void {
    this.addChannelDialogOpen.set(false);
  }
  protected messageProfileUser(): void {
    const user = this.profileUser();
    if (user) {
      this.selectedProfileUserId = user.id;
      this.profileDialogOpen = false;
    }
  }

  protected cancelProfileEdit(): void {
    this.isEditMode.set(false);
    this.editProfileEditName = ''; // Korrigiert für Signal
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
      this.editProfileEditName = user.name; // Initialisiere mit dem aktuellen Namen
      this.isEditMode.set(true);
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

    console.log('Mitglieder zum Channel hinzufügen:', selectedIds);
    // Bezieht sich auf den Modal-Schließen-Zustand aus Teil 1
    this.addMembersPanelOpen.set(false);
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
    // Jetzt funktioniert .trim() wieder, weil es ein String ist
    if (user && this.editProfileEditName.trim()) {
      this.database.updateCurrentUserName(this.editProfileEditName);
      this.isEditMode.set(false);
    }
  }
  protected avatarSvgPath(userId: string): string {
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

    // Fallback-Logik aus dem Original
    const num = parseInt(user.avatarId as unknown as string, 10);
    return isNaN(num) ? null : num;
  }
// --- Profil & Panels Schließen ---
  protected closeMembersPanel(): void { this.membersPanelOpen.set(false); }
  protected closeAddMembersPanel(): void { this.addMembersPanelOpen.set(false); }
  protected openAddMembersPanel(): void { this.addMembersPanelOpen.set(true); }
  protected closeProfileDialog(): void { this.profileDialogOpen = false; }

  // --- Kontakt-Profil öffnen ---
  protected openContactProfile(userId: string): void {
    const user = this.database.findUser(userId);
    if (user) {
      this.profileUser.set(user);
      this.profileDialogOpen = true;
    }
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

  protected profileAvatarBackgroundImage(): string {
    return `url('/assets/sprites.png')`;
  }
  protected profileAvatarBackgroundPosition(): string {
    const user = this.profileUser();
    return user ? this.profileSpriteBackgroundPosition(user.id, 1) : 'center';
  }
  protected profileAvatarBackgroundSize(): string {
    return this.profileSpriteBackgroundSize(1);
  }}

