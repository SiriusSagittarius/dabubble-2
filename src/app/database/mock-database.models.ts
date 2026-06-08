export interface MockUser {
  id: string;
  name: string;
  email: string;
  password: string;
  avatarClass: string;
  avatarId?: number;
  isGuest?: boolean;
  isOnline: boolean;
}

export interface MockChannel {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  createdBy: string;
}

export interface MockReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface MockMessage {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  createdAt: string;
  threadId?: string;
  reactions: MockReaction[];
}

export interface MockThread {
  id: string;
  channelId: string;
  originMessageId: string;
}

export interface MockDatabaseState {
  currentUserId: string;
  selectedChannelId: string;
  selectedThreadId: string;
  recentReactionEmojis: string[];
  users: MockUser[];
  channels: MockChannel[];
  messages: MockMessage[];
  threads: MockThread[];
}

export type MockLoginResult =
  | { ok: true; user: MockUser }
  | { ok: false; message: string };
