import { Injectable, computed, inject, signal } from '@angular/core';

import { MOCK_DATABASE_SEED } from './mock-database.seed';
import { UiStateService } from '../services/ui-state.service';
import { MockDatabaseState, MockUser } from './mock-database.models';
import { cloneState, dmChannelId, formatTime } from './mock-database.utils';

const STORAGE_KEY = 'dabubble.mock-database.v1';

@Injectable({ providedIn: 'root' })
export class MockDatabaseStore {
  private readonly uiState = inject(UiStateService);
  readonly state = signal<MockDatabaseState>(this.loadState());

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

  readonly activeDirectMessageChannelId = computed(() => {
    const otherUserId = this.uiState.selectedDirectMessageUserId();
    const currentUser = this.currentUser();

    if (!otherUserId || !currentUser) {
      return null;
    }

    return dmChannelId(currentUser.id, otherUserId);
  });

  readonly activeMessageChannelId = computed(() => {
    return this.activeDirectMessageChannelId() ?? this.activeChannel()?.id ?? null;
  });

  readonly channelMessages = computed(() => {
    const channelId = this.activeMessageChannelId();
    if (!channelId) {
      return [];
    }

    return this.state().messages
      .filter((message) => message.channelId === channelId && !message.threadId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  });

  readonly activeThread = computed(() => {
    const state = this.state();
    const channelId = this.activeMessageChannelId();
    if (!channelId) {
      return null;
    }

    return (
      state.threads.find((thread) => thread.id === state.selectedThreadId && thread.channelId === channelId) ??
      state.threads.find((thread) => thread.channelId === channelId) ??
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
    return formatTime(date);
  }

  patchState(updater: (state: MockDatabaseState) => MockDatabaseState): void {
    const nextState = updater(this.state());
    this.state.set(nextState);
    this.persistState(nextState);
  }

  resetDatabase(): void {
    const seed = cloneState(MOCK_DATABASE_SEED);
    this.state.set(seed);
    this.persistState(seed);
  }

  private loadState(): MockDatabaseState {
    const storage = this.getStorage();
    if (!storage) {
      return cloneState(MOCK_DATABASE_SEED);
    }

    const storedState = storage.getItem(STORAGE_KEY);
    if (!storedState) {
      const seed = cloneState(MOCK_DATABASE_SEED);
      this.persistState(seed);
      return seed;
    }

    try {
      return JSON.parse(storedState) as MockDatabaseState;
    } catch {
      const seed = cloneState(MOCK_DATABASE_SEED);
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

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage;
  }
}
