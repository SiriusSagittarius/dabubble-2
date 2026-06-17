import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDatabaseService } from '../../database/mock-database.service';
import { UiStateService } from '../../services/ui-state.service';
import { Profile } from '../profile/profile';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, Profile],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  @Input() showDevspace = false;
  @Output() backToSidebar = new EventEmitter<void>();

  protected readonly database = inject(MockDatabaseService);
  protected readonly uiState = inject(UiStateService);

  workspaceSearchDraft = '';

  @ViewChild('workspaceSearchArea')
  private workspaceSearchArea?: ElementRef<HTMLElement>;

  protected showWorkspaceSearchResults(): boolean {
    return this.workspaceSearchDraft.trim().length > 0;
  }

  protected workspaceSearchChannels() {
    const query = this.workspaceSearchDraft.trim().toLowerCase();
    if (!query) return [];

    return this.database
      .channels()
      .filter(
        (channel) =>
          channel.name.toLowerCase().includes(query) ||
          channel.description.toLowerCase().includes(query),
      );
  }

  protected workspaceSearchUsers() {
    const query = this.workspaceSearchDraft.trim().toLowerCase();
    if (!query) return [];

    return this.database
      .users()
      .filter(
        (user) =>
          user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
      );
  }

  protected workspaceSearchMessages() {
    const query = this.workspaceSearchDraft.trim().toLowerCase();
    if (!query) return [];

    return this.database.messages().filter((message) => {
      const author = this.database.findUser(message.authorId);
      const channel = this.database.channels().find((entry) => entry.id === message.channelId);
      const body = message.body.toLowerCase();

      return (
        body.includes(query) ||
        author?.name.toLowerCase().includes(query) ||
        channel?.name.toLowerCase().includes(query)
      );
    });
  }

  protected openWorkspaceSearchChannel(channelId: string): void {
    this.database.selectChannel(channelId);
    this.workspaceSearchDraft = '';
  }

  protected openWorkspaceSearchUser(userId: string): void {
    this.workspaceSearchDraft = '';
  }

  protected openWorkspaceSearchMessage(messageId: string): void {
    const message = this.database.findMessage(messageId);
    if (!message) return;

    this.database.selectChannel(message.channelId);
    const thread =
      this.database.threadForMessage(message.id) ??
      (message.threadId ? this.database.findThread(message.threadId) : null);

    if (thread) {
      this.database.selectThread(thread.id);
    }

    this.workspaceSearchDraft = '';
  }

  protected channelName(channelId: string): string {
    return this.database.channels().find((channel) => channel.id === channelId)?.name ?? 'Channel';
  }

  protected avatarSvgPath(userId: string): string {
    const user = this.database.findUser(userId);
    if (user?.avatarImage) return user.avatarImage;

    const avatarId = this.userAvatarId(user);
    return `/assets/${avatarId}.svg`;
  }

  private userAvatarId(user: ReturnType<MockDatabaseService['findUser']>): number {
    if (!user) return 1;
    if (typeof user.avatarId === 'number') return user.avatarId;
    if (typeof user.avatarId === 'string') {
      const num = parseInt(user.avatarId, 10);
      if (!isNaN(num)) return num;
    }
    const classMatch = user.avatarClass?.match(/avatar-(\d)/);
    return classMatch ? Number(classMatch[1]) : 1;
  }
}
