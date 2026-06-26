import { Injectable, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  deleteDoc,
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class FirebaseChatService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  /** Fuehrt eine Firestore-Operation im Angular Injection-Context aus. */
  private inContext<T>(operation: () => T): T {
    return runInInjectionContext(this.injector, operation);
  }

  async createMessage(payload: {
    channelId: string;
    body: string;
    threadId?: string;
  }): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return;
    }

    await this.inContext(() =>
      addDoc(collection(this.firestore, 'messages'), {
        channelId: payload.channelId,
        authorId: user.uid,
        body: payload.body,
        threadId: payload.threadId ?? null,
        createdAt: new Date().toISOString(),
        reactions: [],
        createdAtServer: serverTimestamp(),
      }),
    );
  }

  async createChannel(channel: {
    id: string;
    name: string;
    description?: string;
    memberIds: string[];
    createdBy: string;
    createdAt: string;
    isPrivate?: boolean;
  }): Promise<void> {
    if (!this.auth.currentUser) {
      return;
    }

    // Dokument-ID = lokale Channel-ID, damit der Snapshot-Sync denselben Channel
    // zurueckspielt (kein Duplikat).
    await this.inContext(() =>
      setDoc(
        doc(this.firestore, 'channels', channel.id),
        {
          name: channel.name,
          description: channel.description ?? '',
          memberIds: channel.memberIds ?? [],
          createdBy: channel.createdBy,
          createdAt: channel.createdAt,
          isPrivate: channel.isPrivate ?? false,
          createdAtServer: serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }

  async updateChannelMembers(channelId: string, memberIds: string[]): Promise<void> {
    if (!this.auth.currentUser) {
      return;
    }

    await this.inContext(() =>
      setDoc(doc(this.firestore, 'channels', channelId), { memberIds }, { merge: true }),
    );
  }

  async updateChannelDetails(
    channelId: string,
    updates: { name?: string; description?: string },
  ): Promise<void> {
    if (!this.auth.currentUser) {
      return;
    }

    const data: Record<string, unknown> = {};
    if (typeof updates.name === 'string') {
      data['name'] = updates.name;
    }
    if (typeof updates.description === 'string') {
      data['description'] = updates.description;
    }
    if (Object.keys(data).length === 0) {
      return;
    }

    await this.inContext(() =>
      setDoc(doc(this.firestore, 'channels', channelId), data, { merge: true }),
    );
  }

  async deleteChannel(channelId: string): Promise<void> {
    if (!this.auth.currentUser) {
      return;
    }

    await this.inContext(() => deleteDoc(doc(this.firestore, 'channels', channelId)));
  }

  async deleteMessages(messageIds: string[]): Promise<void> {
    if (!this.auth.currentUser || messageIds.length === 0) {
      return;
    }

    await this.inContext(() =>
      Promise.all(messageIds.map((id) => deleteDoc(doc(this.firestore, 'messages', id)))),
    );
  }

  async createThread(payload: {
    channelId: string;
    originMessageId: string;
  }): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) {
      return null;
    }

    const threadRef = await this.inContext(() =>
      addDoc(collection(this.firestore, 'threads'), {
        channelId: payload.channelId,
        originMessageId: payload.originMessageId,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        createdAtServer: serverTimestamp(),
      }),
    );

    return threadRef.id;
  }

  async updateMessage(messageId: string, body: string): Promise<void> {
    await this.inContext(() =>
      updateDoc(doc(this.firestore, 'messages', messageId), {
        body,
        updatedAtServer: serverTimestamp(),
      }),
    );
  }

  async toggleReaction(messageId: string, emoji: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return;
    }

    const messageRef = doc(this.firestore, 'messages', messageId);
    const message = await this.inContext(() => getDoc(messageRef));

    if (!message.exists()) {
      return;
    }

    const data = message.data() as {
      reactions?: Array<{ emoji: string; count: number; userIds: string[] }>;
    };
    const reactions = data.reactions ?? [];
    const existing = reactions.find((reaction) => reaction.emoji === emoji);

    if (!existing) {
      await this.inContext(() =>
        updateDoc(messageRef, { reactions: [...reactions, { emoji, count: 1, userIds: [user.uid] }] }),
      );
      return;
    }

    const hasReacted = existing.userIds.includes(user.uid);

    if (hasReacted) {
      const nextReaction = {
        ...existing,
        count: Math.max(0, existing.count - 1),
        userIds: existing.userIds.filter((id) => id !== user.uid),
      };

      const nextReactions = reactions
        .map((reaction) => (reaction.emoji === emoji ? nextReaction : reaction))
        .filter((reaction) => reaction.count > 0);

      await this.inContext(() =>
        setDoc(messageRef, { reactions: nextReactions }, { merge: true }),
      );
      return;
    }

    const nextReactions = reactions.map((reaction) =>
      reaction.emoji === emoji
        ? { ...reaction, count: reaction.count + 1, userIds: [...reaction.userIds, user.uid] }
        : reaction,
    );

    await setDoc(messageRef, { reactions: nextReactions }, { merge: true });
  }
}
