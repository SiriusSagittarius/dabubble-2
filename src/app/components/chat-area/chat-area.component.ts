import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { MockDatabaseService } from '../../database/mock-database.service';

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [FormsModule, PickerComponent],
  templateUrl: './chat-area.component.html',
  styleUrl: './chat-area.component.scss',
})
export class ChatArea {
  protected readonly database = inject(MockDatabaseService);

  protected chatMessageDraft = '';
  protected editMessageDraft = '';
  protected todoDraft = '';

  private _showTodoList = false;
  private _showMainChatIntro = false;
  private _selectedDirectMessageUserId: string | null = null;

  @Output() threadOpen = new EventEmitter<void>();

  @Input()
  set showTodoList(value: boolean) {
    this._showTodoList = value;
  }
  get showTodoList(): boolean {
    return this._showTodoList;
  }

  @Input()
  set showMainChatIntro(value: boolean) {
    this._showMainChatIntro = value;
  }
  get showMainChatIntro(): boolean {
    return this._showMainChatIntro;
  }

  @Input()
  set selectedDirectMessageUserId(value: string | null) {
    this._selectedDirectMessageUserId = value;
  }
  get selectedDirectMessageUserId(): string | null {
    return this._selectedDirectMessageUserId;
  }

  protected readonly activeMessageMenuId = signal<string | null>(null);
  protected readonly editingMessageId = signal<string | null>(null);
  protected readonly channelEditionOpen = signal(false);
  protected readonly activeEmojiPicker = signal<'message' | 'thread' | null>(null);
  protected readonly directMessageUser = computed(() => {
    const id = this.selectedDirectMessageUserId;
    return id ? this.database.findUser(id) : null;
  });

  protected readonly todoItems = signal([
    { id: 1, title: 'Channel-Layout final prüfen', done: false },
    { id: 2, title: 'Thread-Ansicht responsive testen', done: true },
    { id: 3, title: 'Neue Nachrichten-Ansicht mit Daten verbinden', done: false },
  ]);

  protected readonly emojiCategories = [
    'recent',
    'people',
    'nature',
    'foods',
    'activity',
    'places',
    'objects',
    'symbols',
  ];

  @ViewChild('chatMessage') private chatMessageInput?: ElementRef<HTMLTextAreaElement>;

  protected sendChannelMessage(body: string): void {
    const message = this.database.sendChannelMessage(body);
    if (message) {
      this.activeMessageMenuId.set(null);
    }
  }

  protected openMessageThread(messageId: string): void {
    this.activeMessageMenuId.set(null);
    this.database.createThreadFromMessage(messageId);
    this.threadOpen.emit();
  }

  protected toggleMessageMenu(messageId: string): void {
    this.activeMessageMenuId.update((activeId) => (activeId === messageId ? null : messageId));
  }

  protected toggleTodoItem(todoId: number): void {
    this.todoItems.update((items) =>
      items.map((item) => (item.id === todoId ? { ...item, done: !item.done } : item)),
    );
  }

  protected addTodoItem(title: string): void {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    this.todoItems.update((items) => [...items, { id: Date.now(), title: trimmed, done: false }]);
  }

  protected toggleChannelEdition(): void {
    this.channelEditionOpen.update((value) => !value);
  }

  protected openMembersPanel(): void {
    this._showMainChatIntro = false;
  }

  protected openAddMembersPanel(): void {
    this._showMainChatIntro = true;
  }

  protected startEditingMessage(messageId: string, body: string): void {
    this.activeMessageMenuId.set(null);
    this.editingMessageId.set(messageId);
    this.editMessageDraft = body;
  }

  protected cancelEditingMessage(): void {
    this.editingMessageId.set(null);
    this.editMessageDraft = '';
  }

  protected saveEditedMessage(messageId: string): void {
    const updatedMessage = this.database.updateMessageBody(messageId, this.editMessageDraft);
    if (updatedMessage) {
      this.cancelEditingMessage();
    }
  }

  protected shouldShowDateSeparator(index: number): boolean {
    const messages = this.database.channelMessages();
    const message = messages[index];
    if (!message) return false;
    if (index === 0) return true;

    const previousMessage = messages[index - 1];
    return this.dateKey(message.createdAt) !== this.dateKey(previousMessage.createdAt);
  }

  protected formatDateSeparator(date: string): string {
    const value = new Date(date);
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = [
      'Januar',
      'Februar',
      'Maerz',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ];
    return `${weekdays[value.getDay()]}, ${value.getDate()} ${months[value.getMonth()]}`;
  }

  protected formatMessageTimestamp(date: string): string {
    const value = new Date(date);
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes} Uhr`;
  }

  protected channelSuggestions() {
    const hashIndex = this.chatMessageDraft.lastIndexOf('#');
    if (hashIndex === -1) {
      return [];
    }

    const query = this.chatMessageDraft.slice(hashIndex + 1).trim().toLowerCase();
    return this.database.channels().filter((c) => c.name.toLowerCase().includes(query));
  }

  protected contactSuggestions() {
    return this.mentionSuggestions(this.chatMessageDraft);
  }

  protected showContactSuggestions(): boolean {
    return this.chatMessageDraft.trimStart().startsWith('@') && this.contactSuggestions().length > 0;
  }

  protected selectChannelSuggestion(name: string): void {
    const hashIndex = this.chatMessageDraft.lastIndexOf('#');
    if (hashIndex === -1) {
      this.chatMessageDraft = `#${name} `;
    } else {
      this.chatMessageDraft = `${this.chatMessageDraft.slice(0, hashIndex)}#${name} `;
    }
    this.chatMessageInput?.nativeElement.focus();
  }

  protected selectContactSuggestion(name: string): void {
    this.chatMessageDraft = this.replaceLeadingMention(this.chatMessageDraft, name);
    this.chatMessageInput?.nativeElement.focus();
  }

  protected insertContactMentionTrigger(): void {
    this.insertMentionTrigger(this.chatMessageInput, 'chat');
  }

  protected toggleEmojiPicker(target: 'message' | 'thread'): void {
    this.activeEmojiPicker.update((activeTarget) => (activeTarget === target ? null : target));
  }

  protected closeEmojiPicker(): void {
    this.activeEmojiPicker.set(null);
  }

  protected addReaction(messageId: string, reaction: string): void {
    this.database.toggleMessageReaction(messageId, reaction);
  }

  protected reactionIcon(reaction: string): string {
    switch (reaction) {
      case 'check':
        return '✅';
      case 'hands':
        return '👏';
      case 'thumbs_up':
        return '👍';
      case 'heart':
        return '❤️';
      case 'smile':
        return '😊';
      case 'open_mouth':
        return '😮';
      case 'sad':
        return '😢';
      default:
        return reaction;
    }
  }

  protected reactionHoverLabel(reaction: { userIds: string[] }): string {
    const names = reaction.userIds.map((userId) => this.database.userName(userId)).filter(Boolean);
    return names.length ? `${names.join(', ')} hat reagiert` : 'Reaktion';
  }

  protected reactionHoverUser(reaction: { userIds: string[] }): string {
    const name = reaction.userIds.map((userId) => this.database.userName(userId)).find(Boolean);
    return name ?? 'Reaktion';
  }

  protected dateKey(date: string): string {
    const value = new Date(date);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected avatarSvgPath(userId: string): string {
    const avatarId = this.userAvatarId(userId);
    return avatarId ? `/assets/${avatarId}.svg` : '/assets/1.svg';
  }

  protected onMessageEmojiSelect(event: any, target: 'message' | 'thread'): void {
    const emoji = event?.emoji?.native;
    if (!emoji) {
      return;
    }

    if (target === 'message') {
      this.insertEmojiIntoMessageDraft(emoji);
      this.closeEmojiPicker();
    }
  }

  protected closeEmojiPickerOnOutsideClick(event: MouseEvent): void {
    if (!this.activeEmojiPicker()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      this.activeEmojiPicker.set(null);
      return;
    }

    if (target.closest('.emoji-picker-popover') || target.closest('.action-button-emoji')) {
      return;
    }

    this.activeEmojiPicker.set(null);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    this.closeEmojiPickerOnOutsideClick(event);
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
      if (target === 'chat') {
        this.chatMessageDraft = this.chatMessageDraft ? `${this.chatMessageDraft}@` : '@';
      }
      return;
    }

    const value = target === 'chat' ? this.chatMessageDraft : textarea.value;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    const nextValue = `${value.slice(0, start)}@${value.slice(end)}`;

    if (target === 'chat') {
      this.chatMessageDraft = nextValue;
    }

    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1, start + 1);
    });
  }

  private insertEmojiIntoMessageDraft(emoji: string): void {
    const textarea = this.chatMessageInput?.nativeElement;
    if (!textarea) {
      this.chatMessageDraft = `${this.chatMessageDraft}${emoji}`;
      return;
    }

    const start = textarea.selectionStart ?? this.chatMessageDraft.length;
    const end = textarea.selectionEnd ?? start;
    this.chatMessageDraft = `${this.chatMessageDraft.slice(0, start)}${emoji}${this.chatMessageDraft.slice(end)}`;

    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    });
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
    if (classMatch) {
      return Number(classMatch[1]);
    }
    return null;
  }
}
