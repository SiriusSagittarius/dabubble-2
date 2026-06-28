import { Injectable, inject } from '@angular/core';

import { MockDatabaseAuthService } from './mock-database.auth.service';
import { MockDatabaseChannelService } from './mock-database.channel.service';
import { MockDatabaseMessageService } from './mock-database.message.service';
import { MockDatabaseStore } from './mock-database.store';
import { FirebaseUserService } from '../services/firebase-user.service';
import {
  MockChannel,
  MockLoginResult,
  MockMessage,
  MockThread,
  MockUser,
  ProfileCategory,
} from './mock-database.models';

@Injectable({ providedIn: 'root' })
export class MockDatabaseService {
  private readonly store = inject(MockDatabaseStore);
  private readonly authService = inject(MockDatabaseAuthService);
  private readonly channelService = inject(MockDatabaseChannelService);
  private readonly messageService = inject(MockDatabaseMessageService);
  private readonly firebaseUsers = inject(FirebaseUserService);

  private syncContactIdsToFirebase(): void {
    void this.firebaseUsers.updateContactIds(this.store.contactUserIds());
  }

  readonly users = this.store.users;
  readonly channels = this.store.channels;
  readonly messages = this.store.messages;
  readonly threads = this.store.threads;
  readonly selectedChannelId = this.store.selectedChannelId;
  readonly recentReactionEmojis = this.store.recentReactionEmojis;
  readonly currentUser = this.store.currentUser;
  readonly isGuest = this.store.isGuest;
  readonly contacts = this.store.contacts;
  readonly visibleContacts = this.store.visibleContacts;
  readonly contactUsers = this.store.contactUsers;
  readonly directMessageUsers = this.store.directMessageUsers;
  readonly directMessagePartners = this.store.directMessagePartners;
  readonly joinedChannels = this.store.joinedChannels;
  readonly onboardingActive = this.store.onboardingActive;
  readonly availablePublicChannels = this.store.availablePublicChannels;
  readonly allPublicChannels = this.store.allPublicChannels;
  readonly visibleChannels = this.store.visibleChannels;
  readonly activeChannel = this.store.activeChannel;
  readonly activeChannelMembers = this.store.activeChannelMembers;
  readonly activeDirectMessageChannelId = this.store.activeDirectMessageChannelId;
  readonly activeMessageChannelId = this.store.activeMessageChannelId;
  readonly channelMessages = this.store.channelMessages;
  readonly activeThread = this.store.activeThread;
  readonly activeThreadOrigin = this.store.activeThreadOrigin;
  readonly threadMessages = this.store.threadMessages;

  syncUsersFromFirestore(
    users: Array<{
      uid: string;
      email: string;
      name: string;
      picture?: string | null;
      avatarId?: number | null;
      avatarImage?: string | null;
      lastActiveAt?: number | null;
      bio?: string | null;
      links?: Array<{ label: string; url: string }> | null;
      profileCategories?: ProfileCategory[] | null;
      contactUserIds?: string[] | null;
    }>,
    currentUserUid: string | null,
  ): void {
    this.authService.syncUsersFromFirestore(users, currentUserUid);
  }

  refreshPresence(): void {
    this.store.refreshPresence();
  }

  syncChannelsFromFirestore(
    channels: Array<{
      id: string;
      name: string;
      description?: string;
      memberIds?: string[];
      createdBy?: string;
      createdAt?: string;
      isPrivate?: boolean;
    }>,
  ): void {
    this.channelService.syncChannelsFromFirestore(channels);
  }

  syncMessagesFromFirestore(
    messages: Array<{
      id: string;
      channelId: string;
      authorId: string;
      body: string;
      createdAt: string;
      threadId?: string;
      reactions?: Array<{ emoji: string; count: number; userIds: string[] }>;
    }>,
  ): void {
    if (this.isGuestSession()) return;
    this.messageService.syncMessagesFromFirestore(messages);
  }

  syncThreadsFromFirestore(
    threads: Array<{ id: string; channelId: string; originMessageId: string }>,
  ): void {
    if (this.isGuestSession()) return;
    this.messageService.syncThreadsFromFirestore(threads);
  }

  login(email: string, password: string): MockLoginResult {
    return this.authService.login(email, password);
  }

  loginAsGuest(): MockUser {
    return this.authService.loginAsGuest();
  }

  loginWithGoogleProfile(profile: { email?: string; name?: string; picture?: string | null }): MockUser | null {
    return this.authService.loginWithGoogleProfile(profile);
  }

  requestPasswordReset(email: string): { ok: boolean; message: string } {
    return this.authService.requestPasswordReset(email);
  }

  updatePasswordByEmail(email: string, newPassword: string): { ok: boolean; message: string } {
    return this.authService.updatePasswordByEmail(email, newPassword);
  }

  logout(): void {
    this.authService.logout();
  }

  isGuestSession(): boolean {
    return this.authService.isGuestSession();
  }

  updateCurrentUserName(name: string): MockUser | null {
    if (this.isGuest()) {
      return null;
    }
    return this.authService.updateCurrentUserName(name);
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
    if (this.isGuest()) {
      return null;
    }
    return this.authService.updateCurrentUserProfile(updates);
  }

  registerUser(name: string, email: string, password: string, avatarId?: number | null, avatarImage?: string | null, isPublic = true): MockLoginResult {
    return this.authService.registerUser(name, email, password, avatarId, avatarImage, isPublic);
  }

  addContact(name: string, email: string, phone?: string): MockUser | null {
    if (this.isGuest()) {
      return null;
    }
    const contact = this.authService.addContact(name, email, phone);
    if (contact) {
      this.syncContactIdsToFirebase();
    }
    return contact;
  }

  removeContact(userId: string): void {
    if (this.isGuest()) {
      return;
    }
    this.authService.removeContact(userId);
    this.syncContactIdsToFirebase();
  }

  deleteDirectConversation(otherUserId: string): boolean {
    if (this.isGuest()) {
      return false;
    }
    return this.messageService.deleteDirectConversation(otherUserId);
  }

  addExistingContact(userId: string): void {
    if (this.isGuest()) {
      return;
    }
    this.authService.addExistingContact(userId);
    this.syncContactIdsToFirebase();
  }

  updateContactName(userId: string, name: string): void {
    if (this.isGuest()) {
      return;
    }
    this.authService.updateContactName(userId, name);
  }

  selectChannel(channelId: string): void {
    this.channelService.selectChannel(channelId);
  }

  createChannel(name: string, memberIds: string[] = [], isPrivate = false): MockChannel | null {
    if (this.isGuest()) {
      return null;
    }
    return this.channelService.createChannel(name, memberIds, isPrivate);
  }

  addMembersToChannel(channelId: string, memberIds: string[]): MockChannel | null {
    if (this.isGuest()) {
      return null;
    }
    return this.channelService.addMembersToChannel(channelId, memberIds);
  }

  joinChannel(channelId: string): boolean {
    return this.channelService.joinChannel(channelId);
  }

  leaveChannel(channelId: string): boolean {
    return this.channelService.leaveChannel(channelId);
  }

  removeMemberFromChannel(channelId: string, userId: string): boolean {
    if (this.isGuest()) {
      return false;
    }
    return this.channelService.removeMemberFromChannel(channelId, userId);
  }

  deleteUserEverywhere(userId: string): void {
    if (this.isGuest()) {
      return;
    }
    this.store.deleteUserEverywhere(userId);
  }

  deleteChannel(channelId: string): boolean {
    if (this.isGuest()) {
      return false;
    }
    return this.channelService.deleteChannel(channelId);
  }

  updateChannel(channelId: string, updates: Partial<Pick<MockChannel, 'name' | 'description'>>): MockChannel | null {
    if (this.isGuest()) {
      return null;
    }
    return this.channelService.updateChannel(channelId, updates);
  }

  selectThread(threadId: string): void {
    this.messageService.selectThread(threadId);
  }

  findMessage(messageId: string): MockMessage | null {
    return this.messageService.findMessage(messageId);
  }

  findThread(threadId: string): MockThread | null {
    return this.messageService.findThread(threadId);
  }

  createThreadFromMessage(messageId: string): MockThread | null {

    if (this.isGuest()) {
      return this.messageService.threadForMessage(messageId);
    }
    return this.messageService.createThreadFromMessage(messageId);
  }

  threadForMessage(messageId: string): MockThread | null {
    return this.messageService.threadForMessage(messageId);
  }

  threadReplyCount(messageId: string): number {
    return this.messageService.threadReplyCount(messageId);
  }

  threadLastReplyTime(messageId: string): string | null {
    return this.messageService.threadLastReplyTime(messageId);
  }

  sendChannelMessage(body: string): MockMessage | null {
    if (this.isGuest()) {
      return null;
    }
    return this.messageService.sendChannelMessage(body);
  }

  sendThreadReply(body: string): MockMessage | null {
    if (this.isGuest()) {
      return null;
    }
    return this.messageService.sendThreadReply(body);
  }

  updateMessageBody(messageId: string, body: string): MockMessage | null {
    if (this.isGuest()) {
      return null;
    }
    return this.messageService.updateMessageBody(messageId, body);
  }

  toggleMessageReaction(messageId: string, emoji: string): MockMessage | null {
    if (this.isGuest()) {
      return null;
    }
    return this.messageService.toggleMessageReaction(messageId, emoji);
  }

  resetDatabase(): void {
    this.store.resetDatabase();
  }

  findUser(userId: string): MockUser | null {
    return this.store.findUser(userId);
  }

  userName(userId: string): string {
    return this.store.userName(userId);
  }

  avatarClass(userId: string): string {
    return this.store.avatarClass(userId);
  }

  isCurrentUser(userId: string): boolean {
    return this.store.isCurrentUser(userId);
  }

  formatTime(date: string): string {
    return this.store.formatTime(date);
  }
}
