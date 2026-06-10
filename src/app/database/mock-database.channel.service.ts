import { Injectable, inject } from '@angular/core';

import { MockDatabaseStore } from './mock-database.store';
import { MockChannel, MockDatabaseState } from './mock-database.models';
import { createId } from './mock-database.utils';

@Injectable({ providedIn: 'root' })
export class MockDatabaseChannelService {
  private readonly store = inject(MockDatabaseStore);

  syncChannelsFromFirestore(
    channels: Array<{
      id: string;
      name: string;
      description?: string;
      memberIds?: string[];
      createdBy?: string;
      createdAt?: string;
    }>,
  ): void {
    this.store.patchState((state) => {
      const nextChannels: MockChannel[] = channels.map((entry) => {
        const existingChannel = state.channels.find((channel) => channel.id === entry.id);

        return {
          id: entry.id,
          name: entry.name,
          description: entry.description ?? '',
          memberIds: entry.memberIds ?? [],
          createdBy: entry.createdBy ?? state.currentUserId,
          createdAt: entry.createdAt ?? existingChannel?.createdAt ?? new Date().toISOString(),
        };
      });

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

  selectChannel(channelId: string): void {
    const state = this.store.state();
    const channel = state.channels.find((entry) => entry.id === channelId);

    if (!channel) {
      return;
    }

    const threadId = state.threads.find((thread) => thread.channelId === channelId)?.id ?? '';
    this.store.patchState((state) => ({ ...state, selectedChannelId: channelId, selectedThreadId: threadId }));
  }

  createChannel(name: string, memberIds: string[] = []): MockChannel | null {
    const trimmedName = name.trim();
    const currentUser = this.store.currentUser();

    if (!trimmedName || !currentUser) {
      return null;
    }

    const channel: MockChannel = {
      id: createId('channel'),
      name: trimmedName,
      description: '',
      memberIds: Array.from(new Set([currentUser.id, ...memberIds])),
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };

    this.store.patchState((state) => ({
      ...state,
      selectedChannelId: channel.id,
      channels: [...state.channels, channel],
    }));

    return channel;
  }

  addMembersToChannel(channelId: string, memberIds: string[]): MockChannel | null {
    const currentChannel = this.store.state().channels.find((channel) => channel.id === channelId);

    if (!currentChannel || memberIds.length === 0) {
      return currentChannel ?? null;
    }

    const nextChannel: MockChannel = {
      ...currentChannel,
      memberIds: Array.from(new Set([...currentChannel.memberIds, ...memberIds])),
    };

    this.store.patchState((state) => ({
      ...state,
      channels: state.channels.map((channel) => (channel.id === channelId ? nextChannel : channel)),
    }));

    return nextChannel;
  }

  joinChannel(channelId: string): boolean {
    const currentUser = this.store.currentUser();

    if (!currentUser) {
      return false;
    }

    return !!this.addMembersToChannel(channelId, [currentUser.id]);
  }

  leaveChannel(channelId: string): boolean {
    const state = this.store.state();
    const currentChannel = state.channels.find((channel) => channel.id === channelId);

    if (!currentChannel || currentChannel.createdBy === state.currentUserId) {
      return false;
    }

    const nextChannels = state.channels.map((channel) =>
      channel.id === channelId
        ? { ...channel, memberIds: channel.memberIds.filter((userId) => userId !== state.currentUserId) }
        : channel,
    );

    this.store.patchState((currentState) => ({
      ...currentState,
      channels: nextChannels,
    }));

    return true;
  }

  deleteChannel(channelId: string): boolean {
    const state = this.store.state();
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

    this.store.patchState((currentState) => ({
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
    const currentChannel = this.store.state().channels.find((channel) => channel.id === channelId);

    if (!currentChannel) {
      return null;
    }

    const nextChannel: MockChannel = {
      ...currentChannel,
      ...updates,
    };

    this.store.patchState((state) => ({
      ...state,
      channels: state.channels.map((channel) => (channel.id === channelId ? nextChannel : channel)),
    }));

    return nextChannel;
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
}
