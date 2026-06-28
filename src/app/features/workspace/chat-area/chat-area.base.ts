import { inject } from '@angular/core';
import { MockDatabaseService } from '../../../core/database/mock-database.service';

export abstract class ChatAreaBase {
  protected readonly database = inject(MockDatabaseService);

  protected formatDateSeparator(date: string): string {
    const value = new Date(date);
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return `${weekdays[value.getDay()]}, ${value.getDate()} ${months[value.getMonth()]}`;
  }

  protected shouldShowDateSeparator(index: number): boolean {
    const messages = this.database.channelMessages();
    const message = messages[index];
    if (!message) return false;
    if (index === 0) return true;
    const previousMessage = messages[index - 1];
    return this.dateKey(message.createdAt) !== this.dateKey(previousMessage.createdAt);
  }

  protected channelIntroCreatorLabel(): string {
    const channel = this.database.activeChannel();
    if (!channel) return '';

    return this.database.isCurrentUser(channel.createdBy)
      ? 'Du hast'
      : `${this.database.userName(channel.createdBy)} hat`;
  }

  protected channelIntroDateLabel(): string {
    const channel = this.database.activeChannel();
    if (!channel?.createdAt) return '';

    const created = new Date(channel.createdAt);
    if (isNaN(created.getTime())) return '';

    const now = new Date();
    const isToday =
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate();

    if (isToday) return 'heute';

    const day = String(created.getDate()).padStart(2, '0');
    const month = String(created.getMonth() + 1).padStart(2, '0');
    const year = created.getFullYear();
    return `am ${day}.${month}.${year}`;
  }

  protected formatMessageTimestamp(date: string): string {
    const value = new Date(date);
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes} Uhr`;
  }

  protected dateKey(date: string): string {
    const value = new Date(date);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected reactionIcon(reaction: string): string {
    switch (reaction) {
      case 'check': return '✅';
      case 'hands': return '👏';
      case 'thumbs_up': return '👍';
      case 'heart': return '❤️';
      case 'smile': return '😊';
      case 'open_mouth': return '😮';
      case 'sad': return '😢';
      default: return reaction;
    }
  }

  protected reactionHoverUser(reaction: { userIds: string[] }): string {
    const name = reaction.userIds.map((userId) => this.database.userName(userId)).find(Boolean);
    return name ?? 'Reaktion';
  }

  protected avatarSvgPath(userId: string): string {
    const avatarImage = this.database.findUser(userId)?.avatarImage;
    if (avatarImage) return avatarImage;

    const avatarId = this.userAvatarId(userId);
    return avatarId ? `/assets/icons/${avatarId}.svg` : '/assets/icons/1.svg';
  }

  protected userAvatarId(userId: string): number | null {
    const user = this.database.findUser(userId);
    if (!user) return null;
    if (typeof user.avatarId === 'number' && user.avatarId >= 1 && user.avatarId <= 6) {
      return user.avatarId;
    }
    const classMatch = user.avatarClass?.match(/avatar-(\d+)/);
    if (classMatch) {
      const id = Number(classMatch[1]);
      if (id >= 1 && id <= 6) return id;
    }
    return 1;
  }

  protected mentionSuggestions(draft: string) {
    const trimmed = draft.trimStart();
    if (!trimmed.startsWith('@')) return [];
    const query = trimmed.slice(1).trim().toLowerCase();
    const members = this.database.activeChannelMembers();
    return members
      .filter((user) => {
        const name = user.name.toLowerCase();
        const email = user.email.toLowerCase();
        return !query || name.includes(query) || email.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  protected replaceLeadingMention(draft: string, name: string): string {
    const trimmed = draft.trimStart();
    if (!trimmed.startsWith('@')) return `@${name} `;
    const remaining = trimmed.slice(1);
    const spaceIndex = remaining.search(/\s/);
    const tail = spaceIndex === -1 ? '' : remaining.slice(spaceIndex);
    return `@${name}${tail || ' '}`;
  }
}
