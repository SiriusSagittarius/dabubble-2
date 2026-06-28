import { Component, ElementRef, EventEmitter, HostListener, Output, ViewChild, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { ProfileDialogService } from '../../../core/services/profile-dialog.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { ChatAreaBase } from './chat-area.base';

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [FormsModule, PickerComponent],
  templateUrl: './chat-area.component.html',
  styleUrls: [
    './chat-area.base.scss',
    './chat-area.channel.scss',
    './chat-area.channel-2.scss',
    './chat-area.messages.scss',
    './chat-area.header-extra.scss',
    './chat-area.editing-reactions.scss',
    './chat-area.emoji-edit.scss',
    './chat-area.emoji-edit-2.scss',
    './chat-area.members.scss',
  ],
})
export class ChatArea extends ChatAreaBase {
  protected readonly uiState = inject(UiStateService);
  protected readonly profileDialog = inject(ProfileDialogService);

  protected chatMessageDraft = '';
  protected editMessageDraft = '';

  @Output() threadOpen = new EventEmitter<void>();
  @Output() backToSidebar = new EventEmitter<void>();

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
    if (!this.isActiveChannelCreator()) {
      return;
    }
    this.channelNameDraft = this.database.activeChannel()?.name ?? '';
    this.channelNameEditMode.set(true);
    this.channelDescriptionEditMode.set(false);
  }

  protected saveChannelName(): void {
    const channel = this.database.activeChannel();
    const trimmedName = this.channelNameDraft.trim();

    if (!channel || !trimmedName || !this.isActiveChannelCreator()) {
      return;
    }

    this.database.updateChannel(channel.id, { name: trimmedName });
    this.channelNameEditMode.set(false);
  }

  protected editChannelDescription(): void {
    if (!this.isActiveChannelCreator()) {
      return;
    }
    this.channelDescriptionDraft = this.database.activeChannel()?.description ?? '';
    this.channelDescriptionEditMode.set(true);
    this.channelNameEditMode.set(false);
  }

  protected saveChannelDescription(): void {
    const channel = this.database.activeChannel();

    if (!channel || !this.isActiveChannelCreator()) {
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

  protected onMembersButtonClick(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 430) {
      this.membersListOpen.set(true);
      return;
    }
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

  protected channelSuggestions() {
    const draft = this.chatMessageDraft;
    // Quick-Navigation: nur wenn '#' das erste Zeichen ist.
    if (!draft.startsWith('#')) return [];
    const query = draft.slice(1).trim().toLowerCase();
    // Es duerfen nur oeffentliche Channels vorgeschlagen werden.
    return this.database.allPublicChannels().filter((c) => c.name.toLowerCase().includes(query));
  }

  protected recipientChannelSuggestions() {
    const draft = this.uiState.newMessageRecipient();
    if (!draft.startsWith('#') && !draft.includes('#')) return [];
    const hashIndex = draft.lastIndexOf('#');
    const query = draft.slice(hashIndex + 1).trim().toLowerCase();
    // Nur Channels vorschlagen, in denen der Nutzer Mitglied ist.
    return this.database.joinedChannels().filter((c) => c.name.toLowerCase().includes(query));
  }

  protected recipientUserSuggestions() {
    const draft = this.uiState.newMessageRecipient();
    if (!draft.trimStart().startsWith('@')) return [];
    const query = draft.slice(draft.indexOf('@') + 1).trim().toLowerCase();
    const currentId = this.database.currentUser()?.id;
    const contactIds = new Set(this.database.contactUsers().map((u) => u.id));
    const memberIds = new Set(
      this.database.joinedChannels().flatMap((c) => c.memberIds)
    );
    // Nur eigene Kontakte und Mitglieder aus eigenen Channels vorschlagen.
    return this.database.users().filter((u) => {
      if (u.id === currentId) return false;
      if (!contactIds.has(u.id) && !memberIds.has(u.id)) return false;
      if (!query) return true;
      return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  protected showRecipientSuggestions(): boolean {
    const draft = this.uiState.newMessageRecipient();
    if (!draft) return false;
    return this.recipientChannelSuggestions().length > 0 || this.recipientUserSuggestions().length > 0;
  }

  protected selectRecipientChannel(channelId: string): void {
    this.database.selectChannel(channelId);
    this.uiState.openChannel();
    this.uiState.newMessageRecipient.set('');
  }

  protected selectRecipientUser(userId: string): void {
    this.uiState.openDirectMessage(userId);
    this.uiState.newMessageRecipient.set('');
  }

  protected contactSuggestions() {
    const draft = this.chatMessageDraft.trimStart();
    // Erwaehnung/Quick-Navigation: nur wenn '@' das erste Zeichen ist.
    if (!draft.startsWith('@')) return [];
    const query = draft.slice(1).trim().toLowerCase();
    const currentId = this.database.currentUser()?.id;

    // In einem Channel duerfen ausschliesslich Mitglieder dieses Channels
    // vorgeschlagen werden. In DM / "neue Nachricht" weiterhin eigene Kontakte
    // oder oeffentliche Profile.
    const inChannel = !this.directMessageUser() && !this.uiState.showMainChatIntro();
    let base = this.database.activeChannelMembers();
    if (!inChannel) {
      const myContactIds = new Set(this.database.contactUsers().map((u) => u.id));
      base = this.database.users().filter((u) => myContactIds.has(u.id) || (u.isPublic ?? true));
    }

    return base
      .filter((u) => u.id !== currentId)
      .filter(
        (u) =>
          !query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  protected showContactSuggestions(): boolean {
    return this.chatMessageDraft.trimStart().startsWith('@') && this.contactSuggestions().length > 0;
  }

  protected selectChannelSuggestion(channelId: string): void {
    // Channel anzeigen statt Text einzufuegen.
    this.database.selectChannel(channelId);
    this.uiState.openChannel();
    this.chatMessageDraft = '';
  }

  protected selectContactSuggestion(userId: string): void {
    // Direktnachricht-Bildschirm fuer den Kontakt oeffnen.
    this.uiState.openDirectMessage(userId);
    this.chatMessageDraft = '';
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

}
