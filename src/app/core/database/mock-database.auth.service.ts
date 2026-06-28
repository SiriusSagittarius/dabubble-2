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

  /**
   * Liefert eine fuer den User sichtbare Channel-Auswahl. Bleibt der aktuell
   * gewaehlte Channel privat und der User ist kein Mitglied, wird auf einen
   * sichtbaren Channel (beigetretener oder erster oeffentlicher) gewechselt.
   */
  private resolveVisibleChannelId(channels: MockChannel[], selectedChannelId: string, userId: string): string {
    const current = channels.find((channel) => channel.id === selectedChannelId);
    if (current && (!current.isPrivate || current.memberIds.includes(userId))) {
      return selectedChannelId;
    }

    const joined = channels.find((channel) => channel.memberIds.includes(userId));
    return joined?.id ?? channels.find((channel) => !channel.isPrivate)?.id ?? selectedChannelId;
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
      selectedChannelId: this.resolveVisibleChannelId(state.channels, state.selectedChannelId, user.id),
      users: state.users.map((entry) => (entry.id === user.id ? { ...entry, isOnline: true } : entry)),
    }));

    return { ok: true, user };
  }

  loginAsGuest(): MockUser {
    // Gast immer per fester ID aufloesen. Fehlt er (z.B. weil der Firebase-Sync
    // die Nutzerliste ersetzt hat), aus dem Seed wiederherstellen statt auf
    // users[0] auszuweichen - sonst landet man im naechstbesten echten Account.
    const guest = this.store.findUser('user-guest') ?? GUEST_USER;
    this.store.patchState((state) => {
      const guestExists = state.users.some((entry) => entry.id === guest.id);
      const users = guestExists
        ? state.users.map((entry) => (entry.id === guest.id ? { ...entry, isOnline: true } : entry))
        : [...state.users, { ...guest, isOnline: true }];

      return {
        ...state,
        users,
        currentUserId: guest.id,
        isGuestSession: true,
        selectedChannelId: this.resolveVisibleChannelId(state.channels, state.selectedChannelId, guest.id),
      };
    });

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

    // Neue User starten ohne Channel: sie sehen zuerst die Hilfe/Onboarding und
    // muessen selbst einen Channel erstellen, beitreten oder eingeladen werden.
    this.store.patchState((state) => ({
      ...state,
      currentUserId: newUser.id,
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

  // Uebernimmt einen bereits existierenden (oeffentlichen) Nutzer in die eigene
  // private Kontaktliste, ohne einen neuen Nutzer anzulegen.
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
