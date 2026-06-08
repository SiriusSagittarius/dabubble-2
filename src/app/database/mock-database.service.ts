import { Injectable, computed, inject, signal } from '@angular/core';

import { MOCK_DATABASE_SEED } from './mock-database.seed';
import { FirebaseChatService } from '../services/firebase-chat.service';
import {
  MockChannel,
  MockDatabaseState,
  MockLoginResult,
  MockMessage,
  MockThread,
  MockUser,
} from './mock-database.models';

const STORAGE_KEY = 'dabubble.mock-database.v1';

@Injectable({ providedIn: 'root' })
export class MockDatabaseService {
  private readonly chatStore = inject(FirebaseChatService);
  private readonly state = signal<MockDatabaseState>(this.loadState());

  readonly users = computed(() => this.state().users);
  readonly channels = computed(() => this.state().channels);
  readonly messages = computed(() => this.state().messages);
  readonly threads = computed(() => this.state().threads);
  readonly selectedChannelId = computed(() => this.state().selectedChannelId);
  readonly recentReactionEmojis = computed(() => {
    const fallback = ['👍', '❤️', '😂', '😮', '😢'];
    const recent = this.state().recentReactionEmojis.slice(0, 5).filter(Boolean);

    return recent.length > 0 ? recent : fallback;
  });
  readonly currentUser = computed(() => this.findUser(this.state().currentUserId));
  readonly contacts = computed(() => this.state().users);
  readonly directMessageUsers = computed(() => {
    const currentUser = this.currentUser();
    const users = this.state().users;

    if (!currentUser) {
      return users;
    }

    return [currentUser, ...users.filter((user) => user.id !== currentUser.id)];
  });

  readonly activeChannel = computed(() => {
    const state = this.state();
    return state.channels.find((channel) => channel.id === state.selectedChannelId) ?? state.channels[0] ?? null;
  });

  readonly activeChannelMembers = computed(() => {
    const channel = this.activeChannel();
    if (!channel) {
      return [];
    }

    return channel.memberIds
      .map((userId) => this.findUser(userId))
      .filter((user): user is MockUser => !!user);
  });

  readonly channelMessages = computed(() => {
    const channel = this.activeChannel();
    if (!channel) {
      return [];
    }

    return this.state().messages
      .filter((message) => message.channelId === channel.id && !message.threadId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  });

  readonly activeThread = computed(() => {
    const state = this.state();
    const channel = this.activeChannel();
    if (!channel) {
      return null;
    }

    return (
      state.threads.find((thread) => thread.id === state.selectedThreadId && thread.channelId === channel.id) ??
      state.threads.find((thread) => thread.channelId === channel.id) ??
      null
    );
  });

  readonly activeThreadOrigin = computed(() => {
    const thread = this.activeThread();
    if (!thread) {
      return null;
    }

    return this.state().messages.find((message) => message.id === thread.originMessageId) ?? null;
  });

  readonly threadMessages = computed(() => {
    const thread = this.activeThread();
    if (!thread) {
      return [];
    }

    return this.state().messages
      .filter((message) => message.threadId === thread.id)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  });

  syncUsersFromFirestore(
    users: Array<{
      uid: string;
      email: string;
      name: string;
      picture?: string | null;
    }>,
    currentUserUid: string | null,
  ): void {
    this.patchState((state) => {
      const existingByEmail = new Map(state.users.map((user) => [user.email.toLowerCase(), user] as const));
      const nextUsers: MockUser[] = users.map((entry, index) => {
        const existingUser = existingByEmail.get(entry.email.toLowerCase());

        if (existingUser) {
          return {
            ...existingUser,
            id: entry.uid || existingUser.id,
            name: entry.name || existingUser.name,
            email: entry.email,
            isOnline: currentUserUid ? entry.uid === currentUserUid || existingUser.id === currentUserUid : existingUser.isOnline,
          };
        }

        return {
          id: entry.uid,
          name: entry.name,
          email: entry.email,
          password: '',
          avatarClass: this.avatarClassForId((index % 4) + 1),
          avatarId: (index % 6) + 1,
          isOnline: currentUserUid ? entry.uid === currentUserUid : false,
        };
      });

      const nextCurrentUserId =
        currentUserUid && nextUsers.some((user) => user.id === currentUserUid)
          ? currentUserUid
          : state.currentUserId;

      return {
        ...state,
        users: nextUsers,
        currentUserId: nextCurrentUserId,
      };
    });
  }

  syncChannelsFromFirestore(
    channels: Array<{
      id: string;
      name: string;
      description?: string;
      memberIds?: string[];
      createdBy?: string;
    }>,
  ): void {
    this.patchState((state) => {
      const nextChannels: MockChannel[] = channels.map((entry) => ({
        id: entry.id,
        name: entry.name,
        description: entry.description ?? '',
        memberIds: entry.memberIds ?? [],
        createdBy: entry.createdBy ?? state.currentUserId,
      }));

      const selectedChannelId = nextChannels.some((channel) => channel.id === state.selectedChannelId)
        ? state.selectedChannelId
        : nextChannels[0]?.id ?? '';

      return {
        ...state,
        channels: nextChannels,
        selectedChannelId,
      };
    });
  }

  syncMessagesFromFirestore(
    messages: Array<{
      id: string;
      channelId: string;
      authorId: string;
      body: string;
      createdAt: string;
      threadId?: string;
      reactions?: Array<{
        emoji: string;
        count: number;
        userIds: string[];
      }>;
    }>,
  ): void {
    this.patchState((state) => ({
      ...state,
      messages: messages.map((message) => ({
        id: message.id,
        channelId: message.channelId,
        authorId: message.authorId,
        body: message.body,
        createdAt: message.createdAt,
        threadId: message.threadId,
        reactions: message.reactions ?? [],
      })),
    }));
  }

  syncThreadsFromFirestore(
    threads: Array<{
      id: string;
      channelId: string;
      originMessageId: string;
    }>,
  ): void {
    this.patchState((state) => {
      const nextThreads: MockThread[] = threads.map((entry) => ({
        id: entry.id,
        channelId: entry.channelId,
        originMessageId: entry.originMessageId,
      }));

      const selectedThreadId = nextThreads.some((thread) => thread.id === state.selectedThreadId)
        ? state.selectedThreadId
        : nextThreads[0]?.id ?? '';

      return {
        ...state,
        threads: nextThreads,
        selectedThreadId,
      };
    });
  }

  login(email: string, password: string): MockLoginResult {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.state().users.find(
      (entry) => entry.email.toLowerCase() === normalizedEmail && entry.password === password,
    );

    if (!user) {
      return { ok: false, message: 'E-Mail oder Passwort stimmt nicht.' };
    }

    this.patchState((state) => ({
      ...state,
      currentUserId: user.id,
      users: state.users.map((entry) => (entry.id === user.id ? { ...entry, isOnline: true } : entry)),
    }));

    return { ok: true, user };
  }

  loginAsGuest(): MockUser {
    const guest = this.findUser('user-guest') ?? this.state().users[0];
    this.patchState((state) => ({
      ...state,
      currentUserId: guest.id,
      users: state.users.map((entry) => (entry.id === guest.id ? { ...entry, isOnline: true } : entry)),
    }));

    return guest;
  }

  loginWithGoogleProfile(profile: { email?: string; name?: string; picture?: string | null }): MockUser | null {
    const email = profile.email?.trim().toLowerCase();
    const name = profile.name?.trim() || email || 'Google Nutzer';

    if (!email) {
      return null;
    }

    const existingUser = this.state().users.find((user) => user.email.toLowerCase() === email);
    if (existingUser) {
      const updatedUser = {
        ...existingUser,
        name: name || existingUser.name,
        isOnline: true,
      };

      this.patchState((state) => ({
        ...state,
        currentUserId: existingUser.id,
        users: state.users.map((user) => (user.id === existingUser.id ? updatedUser : user)),
      }));

      return updatedUser;
    }

    const newUser: MockUser = {
      id: this.createId('user'),
      name,
      email,
      password: '',
      avatarClass: 'avatar-4',
      isOnline: true,
      ...(profile.picture ? { avatarId: 4 } : {}),
    };

    this.patchState((state) => ({
      ...state,
      currentUserId: newUser.id,
      users: [...state.users, newUser],
      channels: state.channels.map((channel) =>
        channel.id === state.selectedChannelId
          ? { ...channel, memberIds: Array.from(new Set([...channel.memberIds, newUser.id])) }
          : channel,
      ),
    }));

    return newUser;
  }

  requestPasswordReset(email: string): { ok: boolean; message: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.state().users.find((entry) => entry.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return { ok: false, message: 'Diese E-Mail ist nicht in der Mock-Datenbank.' };
    }

    return { ok: true, message: 'Wir haben dir eine E-Mail zum Zurücksetzen geschickt.' };
  }

  updatePasswordByEmail(email: string, newPassword: string): { ok: boolean; message: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const nextPassword = newPassword;

    if (!nextPassword.length) {
      return { ok: false, message: 'Bitte ein neues Passwort eingeben.' };
    }

    const currentUser = this.state().users.find((entry) => entry.email.toLowerCase() === normalizedEmail);
    if (!currentUser) {
      return { ok: false, message: 'Diese E-Mail ist nicht in der Mock-Datenbank.' };
    }

    this.patchState((state) => ({
      ...state,
      users: state.users.map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              password: nextPassword,
            }
          : user,
      ),
    }));

    return { ok: true, message: 'Passwort erfolgreich geändert.' };
  }

  logout(): void {
    const currentUserId = this.state().currentUserId;
    if (!currentUserId) {
      return;
    }

    this.patchState((state) => ({
      ...state,
      currentUserId: '',
      users: state.users.map((user) => (user.id === currentUserId ? { ...user, isOnline: false } : user)),
    }));
  }

  updateCurrentUserName(name: string): MockUser | null {
    const currentUserId = this.state().currentUserId;
    const trimmedName = name.trim();

    if (!currentUserId || !trimmedName) {
      return null;
    }

    const currentUser = this.findUser(currentUserId);
    if (!currentUser) {
      return null;
    }

    const updatedUser: MockUser = {
      ...currentUser,
      name: trimmedName,
    };

    this.patchState((state) => ({
      ...state,
      users: state.users.map((user) => (user.id === currentUserId ? updatedUser : user)),
    }));

    return updatedUser;
  }

  registerUser(name: string, email: string, password: string, avatarId?: number | null): MockLoginResult {
    const normalizedEmail = email.trim().toLowerCase();
    const exists = this.state().users.some((user) => user.email.toLowerCase() === normalizedEmail);

    if (exists) {
      return { ok: false, message: 'Diese E-Mail ist schon in der Mock-Datenbank.' };
    }

    const newUser: MockUser = {
      id: this.createId('user'),
      name: name.trim(),
      email: normalizedEmail,
      password,
      avatarClass: this.avatarClassForId(avatarId),
      ...(avatarId ? { avatarId } : {}),
      isOnline: true,
    };

    this.patchState((state) => ({
      ...state,
      currentUserId: newUser.id,
      users: [...state.users, newUser],
      channels: state.channels.map((channel) =>
        channel.id === state.selectedChannelId
          ? { ...channel, memberIds: [...channel.memberIds, newUser.id] }
          : channel,
      ),
    }));

    return { ok: true, user: newUser };
  }

  selectChannel(channelId: string): void {
    const state = this.state();
    const channel = state.channels.find((entry) => entry.id === channelId);

    if (!channel) {
      return;
    }

    const threadId = state.threads.find((thread) => thread.channelId === channelId)?.id ?? '';
    this.patchState((state) => ({ ...state, selectedChannelId: channelId, selectedThreadId: threadId }));
  }

  selectThread(threadId: string): void {
    if (!this.state().threads.some((thread) => thread.id === threadId)) {
      return;
    }

    this.patchState((state) => ({ ...state, selectedThreadId: threadId }));
  }

  findMessage(messageId: string): MockMessage | null {
    return this.state().messages.find((message) => message.id === messageId) ?? null;
  }

  findThread(threadId: string): MockThread | null {
    return this.state().threads.find((thread) => thread.id === threadId) ?? null;
  }

  createChannel(name: string, memberIds: string[] = []): MockChannel | null {
    const trimmedName = name.trim();
    const currentUser = this.currentUser();

    if (!trimmedName || !currentUser) {
      return null;
    }

    const channel: MockChannel = {
      id: this.createId('channel'),
      name: trimmedName,
      description: '',
      memberIds: Array.from(new Set([currentUser.id, ...memberIds])),
      createdBy: currentUser.id,
    };

    this.patchState((state) => ({
      ...state,
      selectedChannelId: channel.id,
      channels: [...state.channels, channel],
    }));

    return channel;
  }

  addMembersToChannel(channelId: string, memberIds: string[]): MockChannel | null {
    const currentChannel = this.state().channels.find((channel) => channel.id === channelId);

    if (!currentChannel || memberIds.length === 0) {
      return currentChannel ?? null;
    }

    const nextChannel: MockChannel = {
      ...currentChannel,
      memberIds: Array.from(new Set([...currentChannel.memberIds, ...memberIds])),
    };

    this.patchState((state) => ({
      ...state,
      channels: state.channels.map((channel) => (channel.id === channelId ? nextChannel : channel)),
    }));

    return nextChannel;
  }

  joinChannel(channelId: string): boolean {
    const currentUser = this.currentUser();

    if (!currentUser) {
      return false;
    }

    return !!this.addMembersToChannel(channelId, [currentUser.id]);
  }

  leaveChannel(channelId: string): boolean {
    const state = this.state();
    const currentChannel = state.channels.find((channel) => channel.id === channelId);

    if (!currentChannel || currentChannel.createdBy === state.currentUserId) {
      return false;
    }

    const nextChannels = state.channels.map((channel) =>
      channel.id === channelId
        ? { ...channel, memberIds: channel.memberIds.filter((userId) => userId !== state.currentUserId) }
        : channel,
    );

    this.patchState((currentState) => ({
      ...currentState,
      channels: nextChannels,
    }));

    return true;
  }

  deleteChannel(channelId: string): boolean {
    const state = this.state();
    const currentChannel = state.channels.find((channel) => channel.id === channelId);

    if (!currentChannel || currentChannel.createdBy !== state.currentUserId) {
      return false;
    }

    const nextChannels = state.channels.filter((channel) => channel.id !== channelId);
    const nextThreads = state.threads.filter((thread) => thread.channelId !== channelId);
    const nextMessages = state.messages.filter((message) => message.channelId !== channelId);
    const nextSelected = this.nextChannelSelection(
      { ...state, threads: nextThreads },
      nextChannels,
      channelId,
    );

    this.patchState((currentState) => ({
      ...currentState,
      channels: nextChannels,
      messages: nextMessages,
      threads: nextThreads,
      selectedChannelId: nextSelected.channelId,
      selectedThreadId: nextSelected.threadId,
    }));

    return true;
  }

  updateChannel(channelId: string, updates: Partial<Pick<MockChannel, 'name' | 'description'>>): MockChannel | null {
    const currentChannel = this.state().channels.find((channel) => channel.id === channelId);

    if (!currentChannel) {
      return null;
    }

    const nextChannel: MockChannel = {
      ...currentChannel,
      ...updates,
    };

    this.patchState((state) => ({
      ...state,
      channels: state.channels.map((channel) => (channel.id === channelId ? nextChannel : channel)),
    }));

    return nextChannel;
  }

  addContact(name: string, email: string): MockUser | null {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail) {
      return null;
    }

    const existingUser = this.state().users.find((user) => user.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return existingUser;
    }

    const contact: MockUser = {
      id: this.createId('user'),
      name: trimmedName,
      email: normalizedEmail,
      password: 'dabubble123',
      avatarClass: 'avatar-4',
      isOnline: false,
    };

    this.patchState((state) => ({ ...state, users: [...state.users, contact] }));
    return contact;
  }

  createThreadFromMessage(messageId: string): MockThread | null {
    const originMessage = this.state().messages.find((message) => message.id === messageId && !message.threadId);

    if (!originMessage) {
      return null;
    }

    const existingThread = this.state().threads.find((thread) => thread.originMessageId === messageId);
    if (existingThread) {
      this.selectThread(existingThread.id);
      return existingThread;
    }

    const thread: MockThread = {
      id: this.createId('thread'),
      channelId: originMessage.channelId,
      originMessageId: originMessage.id,
    };

    this.patchState((state) => ({
      ...state,
      selectedThreadId: thread.id,
      threads: [...state.threads, thread],
    }));

    void this.chatStore.createThread({
      channelId: originMessage.channelId,
      originMessageId: originMessage.id,
    }).then((threadId) => {
      if (!threadId) {
        return;
      }

      this.patchState((state) => ({
        ...state,
        threads: state.threads.map((entry) =>
          entry.originMessageId === originMessage.id ? { ...entry, id: threadId } : entry,
        ),
        selectedThreadId: threadId,
      }));
    });

    return thread;
  }

  threadForMessage(messageId: string): MockThread | null {
    return this.state().threads.find((thread) => thread.originMessageId === messageId) ?? null;
  }

  threadReplyCount(messageId: string): number {
    const thread = this.threadForMessage(messageId);

    if (!thread) {
      return 0;
    }

    return this.state().messages.filter((message) => message.threadId === thread.id).length;
  }

  threadLastReplyTime(messageId: string): string | null {
    const thread = this.threadForMessage(messageId);

    if (!thread) {
      return null;
    }

    const lastReply = this.state().messages
      .filter((message) => message.threadId === thread.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];

    return lastReply ? this.formatTime(lastReply.createdAt) : null;
  }

  sendChannelMessage(body: string): MockMessage | null {
    const text = body.trim();
    const channel = this.activeChannel();
    const currentUser = this.currentUser();

    if (!text || !channel || !currentUser) {
      return null;
    }

    const message: MockMessage = {
      id: this.createId('message'),
      channelId: channel.id,
      authorId: currentUser.id,
      body: text,
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    const thread: MockThread = {
      id: this.createId('thread'),
      channelId: channel.id,
      originMessageId: message.id,
    };

    this.patchState((state) => ({
      ...state,
      messages: [...state.messages, message],
      selectedThreadId: thread.id,
      threads: [...state.threads, thread],
    }));

    void this.chatStore.createMessage({
      channelId: channel.id,
      body: text,
    });
    void this.chatStore.createThread({
      channelId: channel.id,
      originMessageId: message.id,
    }).then((threadId) => {
      if (!threadId) {
        return;
      }

      this.patchState((state) => ({
        ...state,
        threads: state.threads.map((entry) =>
          entry.originMessageId === message.id ? { ...entry, id: threadId } : entry,
        ),
        selectedThreadId: threadId,
        messages: state.messages.map((entry) =>
          entry.id === message.id ? { ...entry, threadId } : entry,
        ),
      }));
    });

    return message;
  }

  sendThreadReply(body: string): MockMessage | null {
    const text = body.trim();
    const thread = this.activeThread();
    const currentUser = this.currentUser();

    if (!text || !thread || !currentUser) {
      return null;
    }

    const message: MockMessage = {
      id: this.createId('message'),
      channelId: thread.channelId,
      threadId: thread.id,
      authorId: currentUser.id,
      body: text,
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    this.patchState((state) => ({ ...state, messages: [...state.messages, message] }));
    void this.chatStore.createMessage({
      channelId: thread.channelId,
      body: text,
      threadId: thread.id,
    });
    return message;
  }

  updateMessageBody(messageId: string, body: string): MockMessage | null {
    const text = body.trim();
    const currentUser = this.currentUser();
    const message = this.state().messages.find((entry) => entry.id === messageId);

    if (!text || !currentUser || !message || message.authorId !== currentUser.id) {
      return null;
    }

    const updatedMessage = { ...message, body: text };

    this.patchState((state) => ({
      ...state,
      messages: state.messages.map((entry) => (entry.id === messageId ? updatedMessage : entry)),
    }));

    void this.chatStore.updateMessage(messageId, text);

    return updatedMessage;
  }

  toggleMessageReaction(messageId: string, emoji: string): MockMessage | null {
    const currentUser = this.currentUser();
    const message = this.state().messages.find((entry) => entry.id === messageId);

    if (!currentUser || !message) {
      return null;
    }

    const reactions = message.reactions.map((reaction) => ({ ...reaction }));
    const existingReaction = reactions.find((reaction) => reaction.emoji === emoji);

    if (existingReaction) {
      const hasReacted = existingReaction.userIds.includes(currentUser.id);

      if (hasReacted) {
        existingReaction.userIds = existingReaction.userIds.filter((userId) => userId !== currentUser.id);
        existingReaction.count = Math.max(0, existingReaction.count - 1);
      } else {
        existingReaction.userIds = [...existingReaction.userIds, currentUser.id];
        existingReaction.count += 1;
      }
    } else {
      reactions.push({
        emoji,
        count: 1,
        userIds: [currentUser.id],
      });
    }

    const filteredReactions = reactions.filter((reaction) => reaction.count > 0);
    const updatedMessage = { ...message, reactions: filteredReactions };
    const recentReactionEmojis = [
      emoji,
      ...this.state().recentReactionEmojis.filter((entry) => entry !== emoji),
    ].slice(0, 5);

    this.patchState((state) => ({
      ...state,
      recentReactionEmojis,
      messages: state.messages.map((entry) => (entry.id === messageId ? updatedMessage : entry)),
    }));

    void this.chatStore.toggleReaction(messageId, emoji);

    return updatedMessage;
  }

  resetDatabase(): void {
    const seed = this.cloneState(MOCK_DATABASE_SEED);
    this.state.set(seed);
    this.persistState(seed);
  }

  findUser(userId: string): MockUser | null {
    return this.state().users.find((user) => user.id === userId) ?? null;
  }

  userName(userId: string): string {
    return this.findUser(userId)?.name ?? 'Unbekannt';
  }

  avatarClass(userId: string): string {
    return this.findUser(userId)?.avatarClass ?? 'avatar-4';
  }

  isCurrentUser(userId: string): boolean {
    return userId === this.state().currentUserId;
  }

  formatTime(date: string): string {
    const value = new Date(date);
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes} Uhr`;
  }

  private nextChannelSelection(
    state: MockDatabaseState,
    channels: MockChannel[],
    removedChannelId: string,
  ): { channelId: string; threadId: string } {
    if (state.selectedChannelId !== removedChannelId) {
      return { channelId: state.selectedChannelId, threadId: state.selectedThreadId };
    }

    const nextChannelId = channels[0]?.id ?? '';
    const nextThreadId = nextChannelId
      ? state.threads.find((thread) => thread.channelId === nextChannelId)?.id ?? ''
      : '';

    return { channelId: nextChannelId, threadId: nextThreadId };
  }

  private patchState(updater: (state: MockDatabaseState) => MockDatabaseState): void {
    const nextState = updater(this.state());
    this.state.set(nextState);
    this.persistState(nextState);
  }

  private loadState(): MockDatabaseState {
    const storage = this.getStorage();
    if (!storage) {
      return this.cloneState(MOCK_DATABASE_SEED);
    }

    const storedState = storage.getItem(STORAGE_KEY);
    if (!storedState) {
      const seed = this.cloneState(MOCK_DATABASE_SEED);
      this.persistState(seed);
      return seed;
    }

    try {
      return JSON.parse(storedState) as MockDatabaseState;
    } catch {
      const seed = this.cloneState(MOCK_DATABASE_SEED);
      this.persistState(seed);
      return seed;
    }
  }

  private persistState(state: MockDatabaseState): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  private cloneState(state: MockDatabaseState): MockDatabaseState {
    return JSON.parse(JSON.stringify(state)) as MockDatabaseState;
  }

  private createId(prefix: string): string {
    const fallbackId = Math.random().toString(36).slice(2);
    const randomId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : fallbackId;

    return `${prefix}-${randomId}`;
  }

  private avatarClassForId(avatarId?: number | null): string {
    switch (avatarId) {
      case 1:
        return 'avatar-1';
      case 2:
        return 'avatar-2';
      case 3:
        return 'avatar-3';
      case 4:
      case 5:
      case 6:
        return 'avatar-4';
      default:
        return 'avatar-4';
    }
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage;
  }
}
