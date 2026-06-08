import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDatabaseService } from '../../database/mock-database.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class Sidebar {
  protected readonly database = inject(MockDatabaseService);

  protected readonly channelsExpanded = signal(true);
  protected readonly directMessagesExpanded = signal(false);

  protected readonly showMainChatIntro = signal(false);
  protected readonly showTodoList = signal(false);
  protected readonly selectedDirectMessageUserId = signal<string | null>(null);
  protected readonly channelEditionOpen = signal(false);
  protected readonly addChannelDialogOpen = signal(false);
  protected readonly sidebarOpen = signal(true);

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

  protected toggleSidebar(): void {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  protected avatarSvgPath(userId: string): string {
    const avatarId = this.userAvatarId(userId);
    if (avatarId === null || avatarId === 0) {
      return '/assets/1.svg';
    }
    return `/assets/${avatarId}.svg`;
  }

  private userAvatarId(userId: string): number | null {
    const user = this.database.findUser(userId);
    if (!user || user.avatarId === undefined) return null;
    if (typeof user.avatarId === 'number') return user.avatarId;
    const num = parseInt(user.avatarId as string, 10);
    return isNaN(num) ? null : num;
  }

  protected openMainChatIntro(): void {
    this.showMainChatIntro.set(true);
    this.showTodoList.set(false);
    this.selectedDirectMessageUserId.set(null);
    this.channelEditionOpen.set(false);
    this.addChannelDialogOpen.set(false);
  }

  protected openAddChannelDialog(): void {
    this.addChannelDialogOpen.set(true);
  }

  protected openDirectMessage(userId: string): void {
    const isTodo = this.database.isCurrentUser(userId);
    this.selectedDirectMessageUserId.set(userId);
    this.showMainChatIntro.set(false);
    this.showTodoList.set(isTodo);
    this.channelEditionOpen.set(false);
    this.addChannelDialogOpen.set(false);
  }

  protected onSelectChannel(channelId: string): void {
    this.database.selectChannel(channelId);
    this.channelEditionOpen.set(false);
    this.showMainChatIntro.set(false);
    this.showTodoList.set(false);
    this.selectedDirectMessageUserId.set(null);
    this.addChannelDialogOpen.set(false);
    this.syncChannelDrafts();
  }

  protected syncChannelDrafts(): void {
    // Logik für Entwurfssynchronisierung
  }
}
