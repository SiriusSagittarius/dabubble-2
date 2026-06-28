import { Injectable, inject } from '@angular/core';

import { MockDatabaseStore } from './mock-database.store';
import { MockChannel, MockLoginResult, MockUser, ProfileCategory } from './mock-database.models';
import { MOCK_DATABASE_SEED } from './mock-database.seed';
import { avatarClassForId, createId } from './mock-database.utils';
import { applyFirestoreUserSync, FirestoreUserEntry } from './mock-database.auth.sync';

const GUEST_USER: MockUser =
  MOCK_DATABASE_SEED.users.find((user) => user.id === 'user-guest') ?? {
    id: 'user-guest',
    name: 'Gast',
    email: 'guest@dabubble.dev',
    password: 'guest',
    avatarClass: 'avatar-5',
    avatarId: 5,
    isGuest: true,
    isOnline: true,
  };

@Injectable({ providedIn: 'root' })
export class MockDatabaseAuthService {
  private readonly store = inject(MockDatabaseStore);

  private resolveVisibleChannelId(channels: MockChannel[], selectedChannelId: string, userId: string): string {
    const current = channels.find((channel) => channel.id === selectedChannelId);
    if (current && current.memberIds.includes(userId)) {
      return selectedChannelId;
    }

    const joined = channels.find((channel) => channel.memberIds.includes(userId));
    return joined?.id ?? '';
  }

  syncUsersFromFirestore(users: FirestoreUserEntry[], currentUserUid: string | null): void {
    applyFirestoreUserSync(this.store, users, currentUserUid);
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
      isGuestSession: false,
      selectedChannelId: this.resolveVisibleChannelId(state.channels, state.selectedChannelId, user.id),
      users: state.users.map((entry) => (entry.id === user.id ? { ...entry, isOnline: true } : entry)),
    }));

    return { ok: true, user };
  }

  loginAsGuest(): MockUser {

    this.store.clearStorage();

    const guest = GUEST_USER;
    this.store.patchState((state) => ({
      ...state,
      users: [...state.users, { ...guest, isOnline: true }],
      currentUserId: guest.id,
      isGuestSession: true,
      selectedChannelId: '',
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
        isGuestSession: false,
        selectedChannelId: this.resolveVisibleChannelId(state.channels, state.selectedChannelId, existingUser.id),
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
      avatarId: 4,
      isOnline: true,
    };

    this.store.patchState((state) => ({
      ...state,
      currentUserId: newUser.id,
      isGuestSession: false,
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
    const state = this.store.state();
    const currentUserId = state.currentUserId;
    if (!currentUserId) {
      return;
    }

    if (state.isGuestSession) {

      const guestChannelIds = new Set(
        state.channels.filter(c => c.createdBy === currentUserId).map(c => c.id)
      );
      const remainingChannels = state.channels
        .filter(c => c.createdBy !== currentUserId)
        .map(c => ({ ...c, memberIds: c.memberIds.filter(id => id !== currentUserId) }));
      const remainingMessages = state.messages.filter(
        m => m.authorId !== currentUserId && !guestChannelIds.has(m.channelId)
      );
      const remainingThreadIds = new Set(remainingMessages.map(m => m.threadId).filter(Boolean));
      const remainingThreads = state.threads.filter(
        t => !guestChannelIds.has(t.channelId) && remainingThreadIds.has(t.id)
      );
      const remainingUsers = state.users.filter(u => u.id !== currentUserId);

      this.store.patchState(() => ({
        ...state,
        currentUserId: '',
        isGuestSession: false,
        selectedChannelId: '',
        selectedThreadId: '',
        channels: remainingChannels,
        messages: remainingMessages,
        threads: remainingThreads,
        users: remainingUsers,
      }));
      return;
    }

    this.store.patchState((s) => ({
      ...s,
      currentUserId: '',
      isGuestSession: false,
      selectedChannelId: '',
      selectedThreadId: '',
      users: s.users.map((user) => (user.id === currentUserId ? { ...user, isOnline: false } : user)),
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
    isPublic?: boolean;
    bio?: string;
    links?: Array<{ label: string; url: string }>;
    profileCategories?: ProfileCategory[];
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
    const nextIsPublic = typeof updates.isPublic === 'boolean' ? updates.isPublic : currentUser.isPublic;

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
      isPublic: nextIsPublic,
    };

    if (updates.avatarImage) {
      updatedUser.avatarImage = updates.avatarImage;
      delete updatedUser.avatarId;
    } else if (typeof updates.avatarId === 'number') {
      updatedUser.avatarId = updates.avatarId;
      updatedUser.avatarClass = avatarClassForId(updates.avatarId);
      delete updatedUser.avatarImage;
    }

    if (typeof updates.bio === 'string') {
      updatedUser.bio = updates.bio.trim();
    }
    if (updates.links) {
      updatedUser.links = updates.links
        .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
        .filter((link) => link.url.length > 0);
    }
    if (updates.profileCategories) {
      updatedUser.profileCategories = updates.profileCategories;
    }

    this.store.patchState((state) => ({
      ...state,
      users: state.users.map((user) => (user.id === currentUserId ? updatedUser : user)),
    }));

    return updatedUser;
  }

  registerUser(name: string, email: string, password: string, avatarId?: number | null, avatarImage?: string | null, isPublic = true): MockLoginResult {
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
      isPublic,
    };

    this.store.patchState((state) => ({
      ...state,
      currentUserId: newUser.id,
      isGuestSession: false,
      users: [...state.users, newUser],
    }));

    return { ok: true, user: newUser };
  }

  addContact(name: string, email: string, phone?: string): MockUser | null {
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
      avatarId: 4,
      isOnline: false,
      ...(phone?.trim() ? { phone: phone.trim() } : {}),
    };

    this.store.patchState((state) => ({
      ...state,
      users: [...state.users, contact],
      contactUserIds: [...(state.contactUserIds ?? []), contact.id],
    }));
    return contact;
  }

  removeContact(userId: string): void {
    this.store.patchState((state) => ({
      ...state,
      contactUserIds: (state.contactUserIds ?? []).filter(id => id !== userId),
    }));
  }

  addExistingContact(userId: string): void {
    const state = this.store.state();
    const ids = state.contactUserIds ?? [];
    if (ids.includes(userId) || !state.users.some((u) => u.id === userId)) {
      return;
    }
    this.store.patchState((s) => ({
      ...s,
      contactUserIds: [...(s.contactUserIds ?? []), userId],
    }));
  }

  updateContactName(userId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.store.patchState((state) => ({
      ...state,
      users: state.users.map(u => u.id === userId ? { ...u, name: trimmed } : u),
    }));
  }
}
