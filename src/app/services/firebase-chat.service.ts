import { Injectable, inject } from '@angular/core';
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
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class FirebaseChatService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  async createMessage(payload: {
    channelId: string;
    body: string;
    threadId?: string;
  }): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return;
    }

    await addDoc(collection(this.firestore, 'messages'), {
      channelId: payload.channelId,
      authorId: user.uid,
      body: payload.body,
      threadId: payload.threadId ?? null,
      createdAt: new Date().toISOString(),
      reactions: [],
      createdAtServer: serverTimestamp(),
    });
  }

  async createThread(payload: {
    channelId: string;
    originMessageId: string;
  }): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) {
      return null;
    }

    const threadRef = await addDoc(collection(this.firestore, 'threads'), {
      channelId: payload.channelId,
      originMessageId: payload.originMessageId,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });

    return threadRef.id;
  }

  async updateMessage(messageId: string, body: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'messages', messageId), {
      body,
      updatedAtServer: serverTimestamp(),
    });
  }

  async toggleReaction(messageId: string, emoji: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return;
    }

    const messageRef = doc(this.firestore, 'messages', messageId);
    const message = await getDoc(messageRef);

    if (!message.exists()) {
      return;
    }

    const data = message.data() as {
      reactions?: Array<{ emoji: string; count: number; userIds: string[] }>;
    };
    const reactions = data.reactions ?? [];
    const existing = reactions.find((reaction) => reaction.emoji === emoji);

    if (!existing) {
      await updateDoc(messageRef, { reactions: [...reactions, { emoji, count: 1, userIds: [user.uid] }] });
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

      await setDoc(messageRef, { reactions: nextReactions }, { merge: true });
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
