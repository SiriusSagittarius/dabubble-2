import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Subscription } from 'rxjs';

import { MockDatabaseService } from '../database/mock-database.service';

@Injectable({ providedIn: 'root' })
export class FirebaseUserSyncService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly database = inject(MockDatabaseService);
  private usersSubscription: Subscription | null = null;
  private channelsSubscription: Subscription | null = null;
  private messagesSubscription: Subscription | null = null;
  private threadsSubscription: Subscription | null = null;
  private authUnsubscribe: (() => void) | null = null;

  start(): void {
    if (this.authUnsubscribe) {
      return;
    }

    this.authUnsubscribe = onAuthStateChanged(this.auth, (user) => {
      this.usersSubscription?.unsubscribe();
      this.usersSubscription = null;
      this.channelsSubscription?.unsubscribe();
      this.channelsSubscription = null;
      this.messagesSubscription?.unsubscribe();
      this.messagesSubscription = null;
      this.threadsSubscription?.unsubscribe();
      this.threadsSubscription = null;

      if (!user) {
        this.database.logout();
        return;
      }

      const usersRef = collection(this.firestore, 'users');
      this.usersSubscription = collectionData(usersRef, { idField: 'uid' }).subscribe((users) => {
        const profiles = users
          .map((entry) => {
            const profile = entry as {
              uid?: string;
              email?: string;
              name?: string;
              picture?: string | null;
            };

            if (!profile.uid || !profile.email) {
              return null;
            }

            return {
              uid: profile.uid,
              email: profile.email,
              name: profile.name ?? profile.email,
              picture: profile.picture ?? null,
            };
          })
          .filter((entry): entry is { uid: string; email: string; name: string; picture: string | null } => !!entry);

        this.database.syncUsersFromFirestore(profiles, user.uid);
      });

      const channelsRef = collection(this.firestore, 'channels');
      this.channelsSubscription = collectionData(channelsRef, { idField: 'id' }).subscribe((channels) => {
        const profiles = channels
          .map((entry) => {
            const channel = entry as {
              id?: string;
              name?: string;
              description?: string;
              memberIds?: string[];
              createdBy?: string;
            };

            if (!channel.id || !channel.name) {
              return null;
            }

            return {
              id: channel.id,
              name: channel.name,
              description: channel.description ?? '',
              memberIds: channel.memberIds ?? [],
              createdBy: channel.createdBy ?? user.uid,
            };
          })
          .filter(
            (entry): entry is { id: string; name: string; description: string; memberIds: string[]; createdBy: string } =>
              !!entry,
          );

        this.database.syncChannelsFromFirestore(profiles);
      });

      const messagesRef = collection(this.firestore, 'messages');
      this.messagesSubscription = collectionData(messagesRef, { idField: 'id' }).subscribe((messages) => {
        const profiles = messages
          .map((entry) => {
            const message = entry as {
              id?: string;
              channelId?: string;
              authorId?: string;
              body?: string;
              createdAt?: string;
              threadId?: string;
              reactions?: Array<{ emoji: string; count: number; userIds: string[] }>;
            };

            if (!message.id || !message.channelId || !message.authorId || !message.body || !message.createdAt) {
              return null;
            }

            return {
              id: message.id,
              channelId: message.channelId,
              authorId: message.authorId,
              body: message.body,
              createdAt: message.createdAt,
              threadId: message.threadId,
              reactions: message.reactions ?? [],
            };
          })
          .filter(
            (entry): entry is {
              id: string;
              channelId: string;
              authorId: string;
              body: string;
              createdAt: string;
              threadId: string | undefined;
              reactions: Array<{ emoji: string; count: number; userIds: string[] }>;
            } => !!entry,
          );

        this.database.syncMessagesFromFirestore(profiles);
      });

      const threadsRef = collection(this.firestore, 'threads');
      this.threadsSubscription = collectionData(threadsRef, { idField: 'id' }).subscribe((threads) => {
        const profiles = threads
          .map((entry) => {
            const thread = entry as {
              id?: string;
              channelId?: string;
              originMessageId?: string;
            };

            if (!thread.id || !thread.channelId || !thread.originMessageId) {
              return null;
            }

            return {
              id: thread.id,
              channelId: thread.channelId,
              originMessageId: thread.originMessageId,
            };
          })
          .filter(
            (entry): entry is { id: string; channelId: string; originMessageId: string } => !!entry,
          );

        this.database.syncThreadsFromFirestore(profiles);
      });
    });
  }
}
