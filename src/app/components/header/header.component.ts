import { Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MockDatabaseService } from '../../database/mock-database.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class Header {
  protected readonly database = inject(MockDatabaseService);
  private readonly router = inject(Router);

  protected readonly profileMenuOpen = signal(false);
  protected workspaceSearchDraft = '';

  @ViewChild('profileArea', { read: ElementRef })
  private profileArea?: ElementRef<HTMLElement>;

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
}