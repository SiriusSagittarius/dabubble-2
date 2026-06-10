import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDatabaseService } from '../../database/mock-database.service';
import { UiStateService } from '../../services/ui-state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.channels.scss', './sidebar.dm.scss'],
})
export class Sidebar {
  protected readonly database = inject(MockDatabaseService);
  protected readonly uiState = inject(UiStateService);

  protected readonly channelsExpanded = signal(true);
  protected readonly directMessagesExpanded = signal(false);

  protected channelIsActive(channelId: string): boolean {
    return this.database.selectedChannelId() === channelId;
  }

  protected toggleChannels(): void {
    const nextExpanded = !this.channelsExpanded();
    this.channelsExpanded.set(nextExpanded);
    if (nextExpanded) {
      this.directMessagesExpanded.set(false);
    }
  }

  protected toggleDirectMessages(): void {
    const nextExpanded = !this.directMessagesExpanded();
    this.directMessagesExpanded.set(nextExpanded);
    if (nextExpanded) {
      this.channelsExpanded.set(false);
    }
  }

  protected avatarSvgPath(userId: string): string {
    const avatarImage = this.database.findUser(userId)?.avatarImage;
    if (avatarImage) return avatarImage;

    const avatarId = this.userAvatarId(userId);
    if (avatarId === null || avatarId === 0) {
      return '/assets/1.svg';
    }
    return `/assets/${avatarId}.svg`;
  }

  protected openMainChatIntro(): void {
    this.uiState.openMainChatIntro();
  }

  protected openAddChannelDialog(): void {
    this.uiState.openAddChannelDialog();
  }

  protected openAddMembersPanel(): void {
    this.uiState.openAddMembersPanel();
  }

  protected openDirectMessage(userId: string): void {
    this.uiState.openDirectMessage(userId);
  }

  protected onSelectChannel(channelId: string): void {
    this.database.selectChannel(channelId);
    this.uiState.openChannel();
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
