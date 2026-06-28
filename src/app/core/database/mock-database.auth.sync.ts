import { MockUser } from './mock-database.models';
import { MockDatabaseStore } from './mock-database.store';
import { avatarClassForId, isOnlineFromLastActive } from './mock-database.utils';

export interface FirestoreUserEntry {
  uid: string;
  email: string;
  name: string;
  picture?: string | null;
  avatarId?: number | null;
  avatarImage?: string | null;
  lastActiveAt?: number | null;
  bio?: string | null;
  links?: Array<{ label: string; url: string }> | null;
  profileCategories?: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    entries: Array<{ value: string; emoji: string }>;
  }> | null;

  contactUserIds?: string[] | null;
}

export function applyFirestoreUserSync(
  store: MockDatabaseStore,
  users: FirestoreUserEntry[],
  currentUserUid: string | null,
): void {
  if (users.length === 0) {
    return;
  }

  const now = Date.now();

  store.patchState((state) => {
    const existingByEmail = new Map(state.users.map((user) => [user.email.toLowerCase(), user] as const));
    const nextUsers: MockUser[] = users.map((entry, index) => {
      const existingUser = existingByEmail.get(entry.email.toLowerCase());
      const hasImage = typeof entry.avatarImage === 'string' && entry.avatarImage.length > 0;
      const hasAvatarId = typeof entry.avatarId === 'number' && entry.avatarId >= 1 && entry.avatarId <= 6;
      const lastActiveAt = typeof entry.lastActiveAt === 'number' ? entry.lastActiveAt : existingUser?.lastActiveAt;

      if (existingUser) {
        const isCurrent =
          !!currentUserUid && (entry.uid === currentUserUid || existingUser.id === currentUserUid);
        const merged: MockUser = {
          ...existingUser,
          id: entry.uid || existingUser.id,
          name: entry.name || existingUser.name,
          email: entry.email,
          lastActiveAt,
          isOnline: isCurrent || isOnlineFromLastActive(lastActiveAt, now),
        };

        if (typeof entry.bio === 'string') {
          merged.bio = entry.bio;
        }
        if (entry.links) {
          merged.links = entry.links;
        }
        if (entry.profileCategories) {
          merged.profileCategories = entry.profileCategories;
        }

        if (hasImage) {
          merged.avatarImage = entry.avatarImage as string;
          delete merged.avatarId;
        } else if (hasAvatarId) {
          merged.avatarId = entry.avatarId as number;
          merged.avatarClass = avatarClassForId(entry.avatarId);
          delete merged.avatarImage;
        }

        return merged;
      }

      const avatarId = hasAvatarId ? (entry.avatarId as number) : (index % 6) + 1;
      const isCurrent = !!currentUserUid && entry.uid === currentUserUid;
      const newUser: MockUser = {
        id: entry.uid,
        name: entry.name,
        email: entry.email,
        password: '',
        avatarClass: avatarClassForId(avatarId),
        avatarId,
        lastActiveAt,
        isOnline: isCurrent || isOnlineFromLastActive(lastActiveAt, now),
      };

      if (hasImage) {
        newUser.avatarImage = entry.avatarImage as string;
      }
      if (typeof entry.bio === 'string') {
        newUser.bio = entry.bio;
      }
      if (entry.links) {
        newUser.links = entry.links;
      }
      if (entry.profileCategories) {
        newUser.profileCategories = entry.profileCategories;
      }

      return newUser;
    });

    const currentStateUser = state.users.find((u) => u.id === state.currentUserId);
    if (currentStateUser) {
      const alreadyInNext =
        nextUsers.some((u) => u.id === currentStateUser.id) ||
        nextUsers.some((u) => u.email.toLowerCase() === currentStateUser.email.toLowerCase());
      if (!alreadyInNext) {
        nextUsers.push({ ...currentStateUser });
      }
    }

    const guestUsers = state.users.filter(
      (u) => u.isGuest && !nextUsers.some((nu) => nu.id === u.id),
    );
    nextUsers.push(...guestUsers);

    const nextCurrentUserId =
      currentUserUid && nextUsers.some((user) => user.id === currentUserUid)
        ? currentUserUid
        : state.currentUserId;

    let nextContactUserIds = state.contactUserIds;
    const currentEntry = users.find((entry) => entry.uid === nextCurrentUserId);
    if (currentEntry && Array.isArray(currentEntry.contactUserIds)) {
      const knownIds = new Set(nextUsers.map((user) => user.id));
      const fromFirestore = currentEntry.contactUserIds.filter((id) => knownIds.has(id));
      const localOnly = (state.contactUserIds ?? []).filter(
        (id) => knownIds.has(id) && !fromFirestore.includes(id),
      );
      nextContactUserIds = Array.from(new Set([...fromFirestore, ...localOnly]));
    }

    return {
      ...state,
      users: nextUsers,
      currentUserId: nextCurrentUserId,
      contactUserIds: nextContactUserIds,
    };
  });
}
