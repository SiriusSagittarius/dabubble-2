import { Injectable, inject } from '@angular/core';

import { MockDatabaseStore } from './mock-database.store';
import { FirebaseChatService } from '../services/firebase-chat.service';
import { MockMessage, MockThread } from './mock-database.models';
import { createId, dmChannelId } from './mock-database.utils';

@Injectable({ providedIn: 'root' })
export class MockDatabaseMessageService {
  private readonly store = inject(MockDatabaseStore);
  private readonly chatStore = inject(FirebaseChatService);

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
    this.store.patchState((state) => ({
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
    this.store.patchState((state) => {
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

  selectThread(threadId: string): void {
    if (!this.store.state().threads.some((thread) => thread.id === threadId)) {
      return;
    }

    this.store.patchState((state) => ({ ...state, selectedThreadId: threadId }));
  }

  findMessage(messageId: string): MockMessage | null {
    return this.store.state().messages.find((message) => message.id === messageId) ?? null;
  }

  findThread(threadId: string): MockThread | null {
    return this.store.state().threads.find((thread) => thread.id === threadId) ?? null;
  }

  createThreadFromMessage(messageId: string): MockThread | null {
    const originMessage = this.store.state().messages.find((message) => message.id === messageId && !message.threadId);

    if (!originMessage) {
      return null;
    }

    const existingThread = this.store.state().threads.find((thread) => thread.originMessageId === messageId);
    if (existingThread) {
      this.selectThread(existingThread.id);
      return existingThread;
    }

    const thread: MockThread = {
      id: createId('thread'),
      channelId: originMessage.channelId,
      originMessageId: originMessage.id,
    };

    this.store.patchState((state) => ({
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

      this.store.patchState((state) => ({
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
    return this.store.state().threads.find((thread) => thread.originMessageId === messageId) ?? null;
  }

  threadReplyCount(messageId: string): number {
    const thread = this.threadForMessage(messageId);

    if (!thread) {
      return 0;
    }

    return this.store.state().messages.filter((message) => message.threadId === thread.id).length;
  }

  threadLastReplyTime(messageId: string): string | null {
    const thread = this.threadForMessage(messageId);

    if (!thread) {
      return null;
    }

    const lastReply = this.store.state().messages
      .filter((message) => message.threadId === thread.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];

    return lastReply ? this.store.formatTime(lastReply.createdAt) : null;
  }

  sendChannelMessage(body: string): MockMessage | null {
    const text = body.trim();
    const channelId = this.store.activeMessageChannelId();
    const currentUser = this.store.currentUser();

    if (!text || !channelId || !currentUser) {
      return null;
    }

    const message: MockMessage = {
      id: createId('message'),
      channelId,
      authorId: currentUser.id,
      body: text,
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    const thread: MockThread = {
      id: createId('thread'),
      channelId,
      originMessageId: message.id,
    };

    this.store.patchState((state) => ({
      ...state,
      messages: [...state.messages, message],
      selectedThreadId: thread.id,
      threads: [...state.threads, thread],
    }));

    void this.chatStore.createMessage({
      channelId,
      body: text,
    });
    void this.chatStore.createThread({
      channelId,
      originMessageId: message.id,
    }).then((threadId) => {
      if (!threadId) {
        return;
      }

      this.store.patchState((state) => ({
        ...state,
        threads: state.threads.map((entry) =>
          entry.originMessageId === message.id ? { ...entry, id: threadId } : entry,
        ),
        selectedThreadId: threadId,
      }));
    });

    return message;
  }

  sendThreadReply(body: string): MockMessage | null {
    const text = body.trim();
    const thread = this.store.activeThread();
    const currentUser = this.store.currentUser();

    if (!text || !thread || !currentUser) {
      return null;
    }

    const message: MockMessage = {
      id: createId('message'),
      channelId: thread.channelId,
      threadId: thread.id,
      authorId: currentUser.id,
      body: text,
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    this.store.patchState((state) => ({ ...state, messages: [...state.messages, message] }));
    void this.chatStore.createMessage({
      channelId: thread.channelId,
      body: text,
      threadId: thread.id,
    });
    return message;
  }

  updateMessageBody(messageId: string, body: string): MockMessage | null {
    const text = body.trim();
    const currentUser = this.store.currentUser();
    const message = this.store.state().messages.find((entry) => entry.id === messageId);

    if (!text || !currentUser || !message || message.authorId !== currentUser.id) {
      return null;
    }

    const updatedMessage = { ...message, body: text };

    this.store.patchState((state) => ({
      ...state,
      messages: state.messages.map((entry) => (entry.id === messageId ? updatedMessage : entry)),
    }));

    void this.chatStore.updateMessage(messageId, text);

    return updatedMessage;
  }

  toggleMessageReaction(messageId: string, emoji: string): MockMessage | null {
    const currentUser = this.store.currentUser();
    const message = this.store.state().messages.find((entry) => entry.id === messageId);

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
      ...this.store.state().recentReactionEmojis.filter((entry) => entry !== emoji),
    ].slice(0, 5);

    this.store.patchState((state) => ({
      ...state,
      recentReactionEmojis,
      messages: state.messages.map((entry) => (entry.id === messageId ? updatedMessage : entry)),
    }));

    void this.chatStore.toggleReaction(messageId, emoji);

    return updatedMessage;
  }

  deleteDirectConversation(otherUserId: string): boolean {
    const currentUser = this.store.currentUser();

    if (!currentUser || !otherUserId) {
      return false;
    }

    const channelId = dmChannelId(currentUser.id, otherUserId);
    const removedIds = this.store
      .state()
      .messages.filter((message) => message.channelId === channelId)
      .map((message) => message.id);

    if (removedIds.length === 0) {
      return false;
    }

    this.store.patchState((state) => {
      const selectedThreadRemoved = state.threads.some(
        (thread) => thread.channelId === channelId && thread.id === state.selectedThreadId,
      );

      return {
        ...state,
        messages: state.messages.filter((message) => message.channelId !== channelId),
        threads: state.threads.filter((thread) => thread.channelId !== channelId),
        selectedThreadId: selectedThreadRemoved ? '' : state.selectedThreadId,
      };
    });

    void this.chatStore.deleteMessages(removedIds);

    return true;
  }
}
