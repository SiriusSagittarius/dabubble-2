import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly showMainChatIntro = signal(false);
  readonly selectedDirectMessageUserId = signal<string | null>(null);
  readonly membersPanelOpen = signal(false);
  readonly addMembersPanelOpen = signal(false);
  readonly addChannelDialogOpen = signal(false);
  readonly newMessageRecipient = signal('');

  openMainChatIntro(): void {
    this.showMainChatIntro.set(true);
    this.selectedDirectMessageUserId.set(null);
    this.newMessageRecipient.set('');
  }

  openDirectMessage(userId: string): void {
    this.selectedDirectMessageUserId.set(userId);
    this.showMainChatIntro.set(false);
  }

  openChannel(): void {
    this.showMainChatIntro.set(false);
    this.selectedDirectMessageUserId.set(null);
  }

  openMembersPanel(): void {
    this.membersPanelOpen.set(true);
  }

  closeMembersPanel(): void {
    this.membersPanelOpen.set(false);
  }

  openAddMembersPanel(): void {
    this.addMembersPanelOpen.set(true);
  }

  closeAddMembersPanel(): void {
    this.addMembersPanelOpen.set(false);
  }

  openAddChannelDialog(): void {
    this.addChannelDialogOpen.set(true);
  }

  closeAddChannelDialog(): void {
    this.addChannelDialogOpen.set(false);
  }
}
