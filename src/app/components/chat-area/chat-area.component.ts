import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { MockDatabaseService } from '../../database/mock-database.service';
import { ProfileDialogService } from '../../services/profile-dialog.service';
import { UiStateService } from '../../services/ui-state.service';

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [FormsModule, PickerComponent],
  templateUrl: './chat-area.component.html',
  styleUrls: [
    './chat-area.base.scss',
    './chat-area.channel.scss',
    './chat-area.messages.scss',
    './chat-area.header-extra.scss',
    './chat-area.editing-reactions.scss',
    './chat-area.emoji-edit.scss',
    './chat-area.members.scss',
  ],
})
export class ChatArea {
  protected readonly database = inject(MockDatabaseService);
  protected readonly uiState = inject(UiStateService);
  protected readonly profileDialog = inject(ProfileDialogService);

  protected chatMessageDraft = '';
  protected editMessageDraft = '';

  @Output() threadOpen = new EventEmitter<void>();

  protected readonly activeMessageMenuId = signal<string | null>(null);
  protected readonly editingMessageId = signal<string | null>(null);
  protected readonly channelEditionOpen = signal(false);
  protected readonly channelNameEditMode = signal(false);
  protected readonly channelDescriptionEditMode = signal(false);
  protected channelNameDraft = '';
  protected channelDescriptionDraft = '';
  protected readonly membersListOpen = signal(false);
  protected readonly activeEmojiPicker = signal<string | null>(null);
  protected readonly recipientSuggestionsVisible = signal(false);

  protected readonly directMessageUser = computed(() => {
    const id = this.uiState.selectedDirectMessageUserId();
    return id ? this.database.findUser(id) : null;
  });

  protected readonly emojiCategories = [
    'recent', 'people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols',
  ];

  @ViewChild('chatMessage') private chatMessageInput?: ElementRef<HTMLTextAreaElement>;

  protected sendChannelMessage(body: string): void {
    const message = this.database.sendChannelMessage(body);
    if (message) {
      this.activeMessageMenuId.set(null);

      if (this.uiState.showMainChatIntro()) {
        this.uiState.openChannel();
      }
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

  protected toggleChannelEdition(): void {
    this.channelEditionOpen.update((value) => !value);
    this.channelNameEditMode.set(false);
    this.channelDescriptionEditMode.set(false);
  }

  protected editChannelName(): void {
    this.channelNameDraft = this.database.activeChannel()?.name ?? '';
    this.channelNameEditMode.set(true);
    this.channelDescriptionEditMode.set(false);
  }

  protected saveChannelName(): void {
    const channel = this.database.activeChannel();
    const trimmedName = this.channelNameDraft.trim();

    if (!channel || !trimmedName) {
      return;
    }

    this.database.updateChannel(channel.id, { name: trimmedName });
    this.channelNameEditMode.set(false);
  }

  protected editChannelDescription(): void {
    this.channelDescriptionDraft = this.database.activeChannel()?.description ?? '';
    this.channelDescriptionEditMode.set(true);
    this.channelNameEditMode.set(false);
  }

  protected saveChannelDescription(): void {
    const channel = this.database.activeChannel();

    if (!channel) {
      return;
    }

    this.database.updateChannel(channel.id, { description: this.channelDescriptionDraft.trim() });
    this.channelDescriptionEditMode.set(false);
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

    this.toggleChannelEdition();
  }

  protected openMembersPanel(): void {
    this.uiState.openMembersPanel();
  }

  protected openAddMembersPanel(): void {
    this.uiState.openAddMembersPanel();
  }

  protected openMemberProfile(userId: string): void {
    this.membersListOpen.set(false);
    this.profileDialog.open(userId);
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
    const months = ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return `${weekdays[value.getDay()]}, ${value.getDate()} ${months[value.getMonth()]}`;
  }

  protected channelIntroCreatorLabel(): string {
    const channel = this.database.activeChannel();
    if (!channel) return '';

    return this.database.isCurrentUser(channel.createdBy)
      ? 'Du hast'
      : `${this.database.userName(channel.createdBy)} hat`;
  }

  protected channelIntroDateLabel(): string {
    const channel = this.database.activeChannel();
    if (!channel) return '';

    const created = new Date(channel.createdAt);
    const now = new Date();
    const isToday =
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate();

    if (isToday) return 'heute';

    const day = String(created.getDate()).padStart(2, '0');
    const month = String(created.getMonth() + 1).padStart(2, '0');
    const year = created.getFullYear();
    return `am ${day}.${month}.${year}`;
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
    const draft = this.chatMessageDraft;
    const hashIndex = draft.lastIndexOf('#');
    if (hashIndex === -1) return [];
    const query = draft.slice(hashIndex + 1).trim().toLowerCase();
    return this.database.channels().filter((c) => c.name.toLowerCase().includes(query));
  }

  protected recipientChannelSuggestions() {
    const draft = this.uiState.newMessageRecipient();
    if (!draft.startsWith('#') && !draft.includes('#')) return [];
    const hashIndex = draft.lastIndexOf('#');
    const query = draft.slice(hashIndex + 1).trim().toLowerCase();
    return this.database.channels().filter((c) => c.name.toLowerCase().includes(query));
  }

  protected recipientUserSuggestions() {
    const draft = this.uiState.newMessageRecipient();
    if (!draft.trimStart().startsWith('@')) return [];
    const query = draft.slice(draft.indexOf('@') + 1).trim().toLowerCase();
    return this.database.users().filter((u) => {
      const name = u.name.toLowerCase();
      const email = u.email.toLowerCase();
      return !query || name.includes(query) || email.includes(query);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  protected showRecipientSuggestions(): boolean {
    const draft = this.uiState.newMessageRecipient();
    if (!draft) return false;
    return this.recipientChannelSuggestions().length > 0 || this.recipientUserSuggestions().length > 0;
  }

  protected selectRecipientChannel(name: string): void {
    this.uiState.newMessageRecipient.set(`#${name} `);
    this.recipientSuggestionsVisible.set(false);
  }

  protected selectRecipientUser(name: string): void {
    this.uiState.newMessageRecipient.set(`@${name} `);
    this.recipientSuggestionsVisible.set(false);
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

  protected toggleEmojiPicker(target: string): void {
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
      case 'check': return '✅';
      case 'hands': return '👏';
      case 'thumbs_up': return '👍';
      case 'heart': return '❤️';
      case 'smile': return '😊';
      case 'open_mouth': return '😮';
      case 'sad': return '😢';
      default: return reaction;
    }
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
    const avatarImage = this.database.findUser(userId)?.avatarImage;
    if (avatarImage) return avatarImage;

    const avatarId = this.userAvatarId(userId);
    return avatarId ? `/assets/${avatarId}.svg` : '/assets/1.svg';
  }

  protected onMessageEmojiSelect(event: any, target: string): void {
    const emoji = event?.emoji?.native;
    if (!emoji) return;
    if (target === 'message') {
      this.insertEmojiIntoMessageDraft(emoji);
      this.closeEmojiPicker();
    } else if (target.startsWith('reaction-row-')) {
      const messageId = target.slice('reaction-row-'.length);
      this.addReaction(messageId, emoji);
      this.closeEmojiPicker();
    } else if (target.startsWith('reaction-')) {
      const messageId = target.slice('reaction-'.length);
      this.addReaction(messageId, emoji);
      this.closeEmojiPicker();
    }
  }

  protected closeEmojiPickerOnOutsideClick(event: MouseEvent): void {
    if (!this.activeEmojiPicker()) return;
    const target = event.target as HTMLElement | null;
    if (!target) { this.activeEmojiPicker.set(null); return; }
    if (target.closest('.emoji-picker-popover') || target.closest('.action-button-emoji') || target.closest('.reaction-add-button')) return;
    this.activeEmojiPicker.set(null);
  }

  protected closeMessageMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.activeMessageMenuId()) return;
    const target = event.target as HTMLElement | null;
    if (!target) { this.activeMessageMenuId.set(null); return; }
    if (target.closest('.message-edit-menu') || target.closest('.message-menu-toggle')) return;
    this.activeMessageMenuId.set(null);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    this.closeEmojiPickerOnOutsideClick(event);
    this.closeMessageMenuOnOutsideClick(event);
  }

  private mentionSuggestions(draft: string) {
    const trimmed = draft.trimStart();
    if (!trimmed.startsWith('@')) return [];
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
    if (!trimmed.startsWith('@')) return `@${name} `;
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
    if (target === 'chat') { this.chatMessageDraft = nextValue; }
    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1, start + 1);
    });
  }

  private insertEmojiIntoMessageDraft(emoji: string): void {
    const textarea = this.chatMessageInput?.nativeElement;
    if (!textarea) { this.chatMessageDraft = `${this.chatMessageDraft}${emoji}`; return; }
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
    if (classMatch) return Number(classMatch[1]);
    return null;
  }
}
