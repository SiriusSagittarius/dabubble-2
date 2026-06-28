import { MockDatabaseState } from './mock-database.models';

export const MOCK_DATABASE_SEED: MockDatabaseState = {
  currentUserId: '',
  isGuestSession: false,
  selectedChannelId: '',
  selectedThreadId: '',
  recentReactionEmojis: ['👍', '❤️', '😂', '😮'],
  users: [],
  channels: [],
  messages: [],
  threads: [],
  contactUserIds: [],
  blockedUserIds: [],
};
