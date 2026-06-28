import { Injectable, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, collection, onSnapshot, DocumentData, QuerySnapshot } from '@angular/fire/firestore';

import { MockDatabaseService } from '../database/mock-database.service';

@Injectable({ providedIn: 'root' })
export class FirebaseUserSyncService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly database = inject(MockDatabaseService);
  private readonly injector = inject(EnvironmentInjector);
  private unsubUsers: (() => void) | null = null;
  private unsubChannels: (() => void) | null = null;
  private unsubMessages: (() => void) | null = null;
  private unsubThreads: (() => void) | null = null;
  private authUnsubscribe: (() => void) | null = null;

  private onSnap(
    path: string,
    handler: (snap: QuerySnapshot<DocumentData>) => void,
  ): () => void {
    return runInInjectionContext(this.injector, () =>
      onSnapshot(collection(this.firestore, path), handler),
    );
  }

  startGuestSnapshots(): void {
    this.unsubUsers = this.onSnap('users', (snap) => {
      const profiles = snap.docs.map((doc) => {
        const d = doc.data() as DocumentData;
        const uid = doc.id;
        const email = d['email'];
        if (!uid || !email) return null;
        return {
          uid,
          email: email as string,
          name: (d['name'] as string | undefined) ?? email as string,
          picture: (d['picture'] as string | null | undefined) ?? null,
          avatarId: (d['avatarId'] as number | null | undefined) ?? null,
          avatarImage: (d['avatarImage'] as string | null | undefined) ?? null,
          lastActiveAt: null,
          bio: null,
          links: null,
          profileCategories: null,
          contactUserIds: null,
        };
      }).filter((e): e is NonNullable<typeof e> => !!e);
      this.database.syncUsersFromFirestore(profiles, null);
    });

    this.unsubChannels = this.onSnap('channels', (snap) => {
      const profiles = snap.docs.map((doc) => {
        const d = doc.data() as DocumentData;
        const id = doc.id;
        const name = d['name'];
        if (!id || !name) return null;
        return {
          id,
          name: name as string,
          description: (d['description'] as string | undefined) ?? '',
          memberIds: ((d['memberIds'] as string[] | undefined) ?? []).filter(id => id !== 'user-guest'),
          createdBy: (d['createdBy'] as string | undefined) ?? '',
          createdAt: (d['createdAt'] as string | undefined) ?? undefined,
          isPrivate: (d['isPrivate'] as boolean | undefined) ?? false,
        };
      }).filter((e): e is NonNullable<typeof e> => !!e);
      this.database.syncChannelsFromFirestore(profiles);
    });

    this.unsubMessages = this.onSnap('messages', (snap) => {
      const profiles = snap.docs.map((doc) => {
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
      }).filter((e): e is NonNullable<typeof e> => !!e);
      this.database.syncMessagesFromFirestore(profiles);
    });

    this.unsubThreads = this.onSnap('threads', (snap) => {
      const profiles = snap.docs.map((doc) => {
        const d = doc.data() as DocumentData;
        const id = doc.id;
        if (!id || !d['channelId'] || !d['originMessageId']) return null;
        return { id, channelId: d['channelId'] as string, originMessageId: d['originMessageId'] as string };
      }).filter((e): e is NonNullable<typeof e> => !!e);
      this.database.syncThreadsFromFirestore(profiles);
    });
  }

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

      this.unsubUsers = this.onSnap('users', (snap) => {
        const profiles = snap.docs
          .map((doc) => {
            const d = doc.data() as DocumentData;
            const uid = doc.id;
            const email = d['email'];
            if (!uid || !email) return null;
            const lastActiveRaw = d['lastActive'] as { toMillis?: () => number } | null | undefined;
            const lastActiveAt =
              lastActiveRaw && typeof lastActiveRaw.toMillis === 'function' ? lastActiveRaw.toMillis() : null;
            const rawLinks = d['links'];
            const links = Array.isArray(rawLinks)
              ? (rawLinks as Array<{ label?: unknown; url?: unknown }>)
                  .map((l) => ({ label: String(l?.label ?? ''), url: String(l?.url ?? '') }))
                  .filter((l) => l.url.length > 0)
              : null;
            const rawCategories = d['profileCategories'];
            const profileCategories = Array.isArray(rawCategories)
              ? (rawCategories as Array<{ id?: unknown; name?: unknown; icon?: unknown; color?: unknown; entries?: unknown }>)
                  .map((cat) => ({
                    id: String(cat?.id ?? ''),
                    name: String(cat?.name ?? ''),
                    icon: String(cat?.icon ?? ''),
                    color: String(cat?.color ?? ''),
                    entries: Array.isArray(cat?.entries)
                      ? (cat.entries as Array<{ value?: unknown; emoji?: unknown }>)
                          .map((e) => ({ value: String(e?.value ?? ''), emoji: String(e?.emoji ?? '') }))
                          .filter((e) => e.value.length > 0)
                      : [],
                  }))
                  .filter((cat) => cat.id.length > 0)
              : null;
            const rawContactIds = d['contactUserIds'];
            const contactUserIds = Array.isArray(rawContactIds)
              ? (rawContactIds as unknown[]).map((id) => String(id)).filter((id) => id.length > 0)
              : null;
            return {
              uid,
              email: email as string,
              name: (d['name'] as string | undefined) ?? email as string,
              picture: (d['picture'] as string | null | undefined) ?? null,
              avatarId: (d['avatarId'] as number | null | undefined) ?? null,
              avatarImage: (d['avatarImage'] as string | null | undefined) ?? null,
              lastActiveAt,
              bio: (d['bio'] as string | null | undefined) ?? null,
              links,
              profileCategories,
              contactUserIds,
            };
          })
          .filter(
            (e): e is {
              uid: string;
              email: string;
              name: string;
              picture: string | null;
              avatarId: number | null;
              avatarImage: string | null;
              lastActiveAt: number | null;
              bio: string | null;
              links: Array<{ label: string; url: string }> | null;
              profileCategories: Array<{
                id: string;
                name: string;
                icon: string;
                color: string;
                entries: Array<{ value: string; emoji: string }>;
              }> | null;
              contactUserIds: string[] | null;
            } => !!e,
          );
        this.database.syncUsersFromFirestore(profiles, user.uid);
      });

      this.unsubChannels = this.onSnap('channels', (snap) => {
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
              memberIds: ((d['memberIds'] as string[] | undefined) ?? []).filter(id => id !== 'user-guest'),
              createdBy: (d['createdBy'] as string | undefined) ?? user.uid,
              createdAt: (d['createdAt'] as string | undefined) ?? undefined,
              isPrivate: (d['isPrivate'] as boolean | undefined) ?? false,
            };
          })
          .filter(
            (e): e is {
              id: string;
              name: string;
              description: string;
              memberIds: string[];
              createdBy: string;
              createdAt: string | undefined;
              isPrivate: boolean;
            } => !!e,
          );
        this.database.syncChannelsFromFirestore(profiles);
      });

      this.unsubMessages = this.onSnap('messages', (snap) => {
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

      this.unsubThreads = this.onSnap('threads', (snap) => {
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
