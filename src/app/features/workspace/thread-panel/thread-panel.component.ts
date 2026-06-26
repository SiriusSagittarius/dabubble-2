import { Component, ElementRef, ViewChild, HostListener, inject, signal, Output, EventEmitter, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { MockDatabaseService } from '../../../core/database/mock-database.service';

@Component({
  selector: 'app-thread-panel',
  standalone: true,
  imports: [FormsModule, PickerComponent],
  templateUrl: './thread-panel.component.html',
  styleUrls: [
    './thread-panel.header-messages.scss',
    './thread-panel.layout-structure.scss',
    './thread-panel.bubbles-actions.scss',
    './thread-panel.reactions.scss',
  ],
})
export class ThreadPanel {
  protected readonly database = inject(MockDatabaseService);

  protected threadMessageDraft = '';
  protected editMessageDraft = '';

  protected readonly activeThreadEditMenuId = signal<string | null>(null);
  protected readonly activeThreadReactionBarId = signal<string | null>(null);
  protected readonly editingMessageId = signal<string | null>(null);
  protected readonly activeEmojiPicker = signal<string | null>(null);
  protected readonly emojiCategories = ['recent', 'people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols'];
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly emojiPerLine = signal(this.calcPerLine());
  protected readonly emojiSize = signal(this.calcEmojiSize());

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.emojiPerLine.set(this.calcPerLine());
    this.emojiSize.set(this.calcEmojiSize());
  }

  private calcPerLine(): number {
    if (!isPlatformBrowser(this.platformId)) return 9;
    return window.innerWidth <= 520 ? 7 : 9;
  }

  private calcEmojiSize(): number {
    if (!isPlatformBrowser(this.platformId)) return 36;
    return window.innerWidth <= 520 ? 32 : 36;
  }

  @ViewChild('threadMessage') private threadMessageInput?: ElementRef<HTMLTextAreaElement>;
  @Output() close = new EventEmitter<void>();

  protected closeThread(): void {
    this.close.emit();
  }

  protected saveEditedMessage(messageId: string): void {
    this.database.updateMessageBody(messageId, this.editMessageDraft);
    this.editingMessageId.set(null);
    this.editMessageDraft = '';
  }

  protected cancelEditingMessage(): void {
    this.editingMessageId.set(null);
    this.editMessageDraft = '';
  }

  protected addReaction(replyId: string, emoji: string): void {
    this.database.toggleMessageReaction(replyId, emoji);
    this.closeThreadReactionBar();
  }

  protected toggleEmojiPicker(target: string): void {
    this.activeEmojiPicker.update((current) => (current === target ? null : target));
  }

  protected closeEmojiPicker(): void {
    this.activeEmojiPicker.set(null);
  }

  protected sendThreadReply(body: string): void {
    const message = this.database.sendThreadReply(body);
    if (message) {
      this.threadMessageDraft = '';
    }
  }

  protected toggleThreadEditMenu(messageId: string): void {
    this.activeThreadReactionBarId.set(null);
    this.activeThreadEditMenuId.update((activeId) => (activeId === messageId ? null : messageId));
  }

  protected closeThreadReactionBar(): void {
    this.activeThreadReactionBarId.set(null);
  }

  protected startEditingThreadMessage(messageId: string, body: string): void {
    this.activeThreadEditMenuId.set(null);
    this.activeThreadReactionBarId.set(null);
    this.editingMessageId.set(messageId);
    this.editMessageDraft = body;
  }

  protected threadUserName(userId: string): string {
    return this.database.userName(userId).replace(/\s/g, '\u00a0');
  }

  protected formatThreadMetaTimestamp(date: string): string {
    const value = new Date(date);
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}\u00a0${hours}:${minutes}\u00a0Uhr`;
  }

  protected reactionIcon(emoji: string): string {
    switch (emoji) {
      case 'check': return '✅';
      case 'hands': return '👏';
      case 'thumbs_up': return '👍';
      case 'heart': return '❤️';
      case 'smile': return '😊';
      case 'open_mouth': return '😮';
      case 'sad': return '😢';
      default: return emoji;
    }
  }

  protected reactionHoverUser(reaction: any): string {
    if (!reaction || !reaction.userIds) {
      return '';
    }
    return reaction.userIds.map((uid: string) => this.database.userName(uid)).join(', ');
  }

  protected threadContactSuggestions() {
    return this.mentionSuggestions(this.threadMessageDraft);
  }

  protected showThreadContactSuggestions(): boolean {
    return this.threadMessageDraft.trimStart().startsWith('@') && this.threadContactSuggestions().length > 0;
  }

  protected selectThreadContactSuggestion(name: string): void {
    this.threadMessageDraft = this.replaceLeadingMention(this.threadMessageDraft, name);
    this.threadMessageInput?.nativeElement.focus();
  }

  protected insertThreadMentionTrigger(): void {
    this.insertMentionTrigger(this.threadMessageInput, 'thread');
  }

  private mentionSuggestions(draft: string) {
    const trimmed = draft.trimStart();
    if (!trimmed.startsWith('@')) {
      return [];
    }
    const query = trimmed.slice(1).trim().toLowerCase();
    const members = this.database.activeChannelMembers();
    return members
      .filter((user) => {
        const name = user.name.toLowerCase();
        const email = user.email.toLowerCase();
        return !query || name.includes(query) || email.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private replaceLeadingMention(draft: string, name: string): string {
    const trimmed = draft.trimStart();
    if (!trimmed.startsWith('@')) {
      return `@${name} `;
    }
    const remaining = trimmed.slice(1);
    const spaceIndex = remaining.search(/\s/);
    const tail = spaceIndex === -1 ? '' : remaining.slice(spaceIndex);
    return `@${name}${tail || ' '}`;
  }

  private insertMentionTrigger(
    textareaRef: ElementRef<HTMLTextAreaElement> | undefined,
    target: 'chat' | 'thread',
  ): void {
    const textarea = textareaRef?.nativeElement;
    if (!textarea) {
      if (target === 'thread') {
        this.threadMessageDraft = this.threadMessageDraft ? `${this.threadMessageDraft}@` : '@';
      }
      return;
    }
    const value = target === 'thread' ? this.threadMessageDraft : textarea.value;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    const nextValue = `${value.slice(0, start)}@${value.slice(end)}`;
    if (target === 'thread') {
      this.threadMessageDraft = nextValue;
    }
    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1, start + 1);
    });
  }

  @HostListener('document:pointerdown', ['$event'])
  @HostListener('document:mousedown', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  @HostListener('document:click', ['$event'])
  protected closeThreadReactionBarOnOutsideClick(event: Event): void {
    if (!this.activeThreadReactionBarId()) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (
      target?.closest('.thread-reaction-popover') ||
      target?.closest('.thread-edit-icon-button') ||
      target?.closest('.thread-reaction-add') ||
      target?.closest('.thread-message-time-with-icon')
    ) {
      return;
    }
    this.activeThreadReactionBarId.set(null);
  }

  protected onMessageEmojiSelect(event: { emoji?: { native?: string } }, target: string): void {
    const emoji = event.emoji?.native;
    if (!emoji) {
      return;
    }
    if (target === 'thread') {
      this.insertEmojiIntoThreadReply(emoji);
      this.activeEmojiPicker.set(null);
    } else if (target.startsWith('reaction-row-')) {
      const replyId = target.slice('reaction-row-'.length);
      this.addReaction(replyId, emoji);
      this.activeEmojiPicker.set(null);
    } else if (target.startsWith('reaction-')) {
      const replyId = target.slice('reaction-'.length);
      this.addReaction(replyId, emoji);
      this.activeEmojiPicker.set(null);
    }
  }

  private insertEmojiIntoThreadReply(emoji: string): void {
    const textarea = this.threadMessageInput?.nativeElement;
    if (!textarea) {
      this.threadMessageDraft = `${this.threadMessageDraft}${emoji}`;
      return;
    }
    const start = textarea.selectionStart ?? this.threadMessageDraft.length;
    const end = textarea.selectionEnd ?? start;
    this.threadMessageDraft = `${this.threadMessageDraft.slice(0, start)}${emoji}${this.threadMessageDraft.slice(end)}`;
    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  protected avatarSvgPath(userId: string): string {
    const avatarImage = this.database.findUser(userId)?.avatarImage;
    if (avatarImage) return avatarImage;

    return `/assets/icons/${this.userAvatarId(userId)}.svg`;
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
