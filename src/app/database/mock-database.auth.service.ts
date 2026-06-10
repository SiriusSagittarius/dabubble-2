import { Injectable, inject } from '@angular/core';

import { MockDatabaseStore } from './mock-database.store';
import { MockLoginResult, MockUser } from './mock-database.models';
import { avatarClassForId, createId } from './mock-database.utils';

@Injectable({ providedIn: 'root' })
export class MockDatabaseAuthService {
  private readonly store = inject(MockDatabaseStore);

  syncUsersFromFirestore(
    users: Array<{
      uid: string;
      email: string;
      name: string;
      picture?: string | null;
    }>,
    currentUserUid: string | null,
  ): void {
    if (users.length === 0) {
      return;
    }

    this.store.patchState((state) => {
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
          avatarClass: avatarClassForId((index % 4) + 1),
          avatarId: (index % 6) + 1,
          isOnline: currentUserUid ? entry.uid === currentUserUid : false,
        };
      });

      // Aktuellen User immer erhalten, auch wenn er nicht in Firestore steht
      const currentStateUser = state.users.find((u) => u.id === state.currentUserId);
      if (currentStateUser) {
        const alreadyInNext =
          nextUsers.some((u) => u.id === currentStateUser.id) ||
          nextUsers.some((u) => u.email.toLowerCase() === currentStateUser.email.toLowerCase());
        if (!alreadyInNext) {
          nextUsers.push({ ...currentStateUser });
        }
      }

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

  login(email: string, password: string): MockLoginResult {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.store.state().users.find(
      (entry) => entry.email.toLowerCase() === normalizedEmail && entry.password === password,
    );

    if (!user) {
      return { ok: false, message: 'E-Mail oder Passwort stimmt nicht.' };
    }

    this.store.patchState((state) => ({
      ...state,
      currentUserId: user.id,
      users: state.users.map((entry) => (entry.id === user.id ? { ...entry, isOnline: true } : entry)),
    }));

    return { ok: true, user };
  }

  loginAsGuest(): MockUser {
    const guest = this.store.findUser('user-guest') ?? this.store.state().users[0];
    this.store.patchState((state) => ({
      ...state,
      currentUserId: guest.id,
      isGuestSession: true,
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

    const existingUser = this.store.state().users.find((user) => user.email.toLowerCase() === email);
    if (existingUser) {
      const updatedUser = {
        ...existingUser,
        name: name || existingUser.name,
        isOnline: true,
      };

      this.store.patchState((state) => ({
        ...state,
        currentUserId: existingUser.id,
        users: state.users.map((user) => (user.id === existingUser.id ? updatedUser : user)),
      }));

      return updatedUser;
    }

    const newUser: MockUser = {
      id: createId('user'),
      name,
      email,
      password: '',
      avatarClass: 'avatar-4',
      isOnline: true,
      ...(profile.picture ? { avatarId: 4 } : {}),
    };

    this.store.patchState((state) => ({
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
    const user = this.store.state().users.find((entry) => entry.email.toLowerCase() === normalizedEmail);

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

    const currentUser = this.store.state().users.find((entry) => entry.email.toLowerCase() === normalizedEmail);
    if (!currentUser) {
      return { ok: false, message: 'Diese E-Mail ist nicht in der Mock-Datenbank.' };
    }

    this.store.patchState((state) => ({
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
    const currentUserId = this.store.state().currentUserId;
    if (!currentUserId) {
      return;
    }

    this.store.patchState((state) => ({
      ...state,
      currentUserId: '',
      isGuestSession: false,
      users: state.users.map((user) => (user.id === currentUserId ? { ...user, isOnline: false } : user)),
    }));
  }

  isGuestSession(): boolean {
    return this.store.state().isGuestSession ?? false;
  }

  updateCurrentUserName(name: string): MockUser | null {
    return this.updateCurrentUserProfile({ name });
  }

  updateCurrentUserProfile(updates: {
    name?: string;
    email?: string;
    isOnline?: boolean;
    avatarId?: number | null;
    avatarImage?: string | null;
  }): MockUser | null {
    const currentUserId = this.store.state().currentUserId;

    if (!currentUserId) {
      return null;
    }

    const currentUser = this.store.findUser(currentUserId);
    if (!currentUser) {
      return null;
    }

    const nextName = updates.name?.trim() ?? currentUser.name;
    const nextEmail = updates.email?.trim().toLowerCase() ?? currentUser.email;
    const nextIsOnline = typeof updates.isOnline === 'boolean' ? updates.isOnline : currentUser.isOnline;

    if (!nextName || !nextEmail) {
      return null;
    }

    const duplicateEmail = this.store.state().users.some(
      (user) => user.id !== currentUserId && user.email.toLowerCase() === nextEmail,
    );
    if (duplicateEmail) {
      return null;
    }

    const updatedUser: MockUser = {
      ...currentUser,
      name: nextName,
      email: nextEmail,
      isOnline: nextIsOnline,
    };

    if (updates.avatarImage) {
      updatedUser.avatarImage = updates.avatarImage;
      delete updatedUser.avatarId;
    } else if (typeof updates.avatarId === 'number') {
      updatedUser.avatarId = updates.avatarId;
      updatedUser.avatarClass = avatarClassForId(updates.avatarId);
      delete updatedUser.avatarImage;
    }

    this.store.patchState((state) => ({
      ...state,
      users: state.users.map((user) => (user.id === currentUserId ? updatedUser : user)),
    }));

    return updatedUser;
  }

  registerUser(name: string, email: string, password: string, avatarId?: number | null, avatarImage?: string | null): MockLoginResult {
    const normalizedEmail = email.trim().toLowerCase();
    const exists = this.store.state().users.some((user) => user.email.toLowerCase() === normalizedEmail);

    if (exists) {
      return { ok: false, message: 'Diese E-Mail ist schon in der Mock-Datenbank.' };
    }

    const newUser: MockUser = {
      id: createId('user'),
      name: name.trim(),
      email: normalizedEmail,
      password,
      avatarClass: avatarClassForId(avatarId),
      ...(avatarId ? { avatarId } : {}),
      ...(avatarImage ? { avatarImage } : {}),
      isOnline: true,
    };

    this.store.patchState((state) => ({
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

  addContact(name: string, email: string): MockUser | null {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail) {
      return null;
    }

    const existingUser = this.store.state().users.find((user) => user.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return existingUser;
    }

    const contact: MockUser = {
      id: createId('user'),
      name: trimmedName,
      email: normalizedEmail,
      password: 'dabubble123',
      avatarClass: 'avatar-4',
      isOnline: false,
    };

    this.store.patchState((state) => ({ ...state, users: [...state.users, contact] }));
    return contact;
  }
}
