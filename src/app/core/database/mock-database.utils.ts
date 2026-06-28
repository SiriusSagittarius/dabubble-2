import { MockDatabaseState } from './mock-database.models';

export function formatTime(date: string): string {
  const value = new Date(date);
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes} Uhr`;
}

export function createId(prefix: string): string {
  const fallbackId = Math.random().toString(36).slice(2);
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : fallbackId;

  return `${prefix}-${randomId}`;
}

export function dmChannelId(userIdA: string, userIdB: string): string {
  return `dm-${[userIdA, userIdB].sort().join('-')}`;
}

export const ONLINE_THRESHOLD_MS = 70_000;

export function isOnlineFromLastActive(lastActiveAt: number | null | undefined, now: number = Date.now()): boolean {
  return typeof lastActiveAt === 'number' && now - lastActiveAt < ONLINE_THRESHOLD_MS;
}

export function avatarClassForId(avatarId?: number | null): string {
  if (avatarId && avatarId >= 1 && avatarId <= 6) {
    return `avatar-${avatarId}`;
  }
  return 'avatar-1';
}

export function avatarIdFromClass(avatarClass?: string): number {
  const match = avatarClass?.match(/avatar-(\d+)/);
  const id = match ? parseInt(match[1], 10) : 1;
  return id >= 1 && id <= 6 ? id : 1;
}

export function cloneState(state: MockDatabaseState): MockDatabaseState {
  return JSON.parse(JSON.stringify(state)) as MockDatabaseState;
}
