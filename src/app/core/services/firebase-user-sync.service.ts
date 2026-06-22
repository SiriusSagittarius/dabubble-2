import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { collection, onSnapshot, DocumentData } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import { MockDatabaseService } from '../database/mock-database.service';

@Injectable({ providedIn: 'root' })
export class FirebaseUserSyncService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly database = inject(MockDatabaseService);
  private unsubUsers: (() => void) | null = null;
  private unsubChannels: (() => void) | null = null;
  private unsubMessages: (() => void) | null = null;
  private unsubThreads: (() => void) | null = null;
  private authUnsubscribe: (() => void) | null = null;

  start(): void {
    if (this.authUnsubscribe) {
      return;
    }

    this.authUnsubscribe = onAuthStateChanged(this.auth, (user) => {
      this.unsubUsers?.();
      this.unsubUsers = null;
      this.unsubChannels?.();
      this.unsubChannels = null;
      this.unsubMessages?.();
      this.unsubMessages = null;
      this.unsubThreads?.();
      this.unsubThreads = null;

      if (!user) {
        if (!this.database.isGuestSession()) {
          this.database.logout();
        }
        return;
      }

      this.unsubUsers = onSnapshot(collection(this.firestore, 'users'), (snap) => {
        const profiles = snap.docs
          .map((doc) => {
            const d = doc.data() as DocumentData;
            const uid = doc.id;
            const email = d['email'];
            if (!uid || !email) return null;
            return {
              uid,
              email: email as string,
              name: (d['name'] as string | undefined) ?? email as string,
              picture: (d['picture'] as string | null | undefined) ?? null,
            };
          })
          .filter((e): e is { uid: string; email: string; name: string; picture: string | null } => !!e);
        this.database.syncUsersFromFirestore(profiles, user.uid);
      });

      this.unsubChannels = onSnapshot(collection(this.firestore, 'channels'), (snap) => {
        const profiles = snap.docs
          .map((doc) => {
            const d = doc.data() as DocumentData;
            const id = doc.id;
            const name = d['name'];
            if (!id || !name) return null;
            return {
              id,
              name: name as string,
              description: (d['description'] as string | undefined) ?? '',
              memberIds: (d['memberIds'] as string[] | undefined) ?? [],
              createdBy: (d['createdBy'] as string | undefined) ?? user.uid,
            };
          })
          .filter(
            (e): e is { id: string; name: string; description: string; memberIds: string[]; createdBy: string } => !!e,
          );
        this.database.syncChannelsFromFirestore(profiles);
      });

      this.unsubMessages = onSnapshot(collection(this.firestore, 'messages'), (snap) => {
        const profiles = snap.docs
          .map((doc) => {
            const d = doc.data() as DocumentData;
            const id = doc.id;
            if (!id || !d['channelId'] || !d['authorId'] || !d['body'] || !d['createdAt']) return null;
            return {
              id,
              channelId: d['channelId'] as string,
              authorId: d['authorId'] as string,
              body: d['body'] as string,
              createdAt: d['createdAt'] as string,
              threadId: d['threadId'] as string | undefined,
              reactions: (d['reactions'] as Array<{ emoji: string; count: number; userIds: string[] }> | undefined) ?? [],
            };
          })
          .filter(
            (e): e is {
              id: string;
              channelId: string;
              authorId: string;
              body: string;
              createdAt: string;
              threadId: string | undefined;
              reactions: Array<{ emoji: string; count: number; userIds: string[] }>;
            } => !!e,
          );
        this.database.syncMessagesFromFirestore(profiles);
      });

      this.unsubThreads = onSnapshot(collection(this.firestore, 'threads'), (snap) => {
        const profiles = snap.docs
          .map((doc) => {
            const d = doc.data() as DocumentData;
            const id = doc.id;
            if (!id || !d['channelId'] || !d['originMessageId']) return null;
            return {
              id,
              channelId: d['channelId'] as string,
              originMessageId: d['originMessageId'] as string,
            };
          })
          .filter((e): e is { id: string; channelId: string; originMessageId: string } => !!e);
        this.database.syncThreadsFromFirestore(profiles);
      });
    });
  }
}
