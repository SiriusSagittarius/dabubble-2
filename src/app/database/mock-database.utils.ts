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

export function avatarClassForId(avatarId?: number | null): string {
  switch (avatarId) {
    case 1:
      return 'avatar-1';
    case 2:
      return 'avatar-2';
    case 3:
      return 'avatar-3';
    case 4:
    case 5:
    case 6:
      return 'avatar-4';
    default:
      return 'avatar-4';
  }
}

export function cloneState(state: MockDatabaseState): MockDatabaseState {
  return JSON.parse(JSON.stringify(state)) as MockDatabaseState;
}
