import { inject } from '@angular/core';
import { MockDatabaseService } from '../../../core/database/mock-database.service';

/**
 * Avatar-/Sprite-Hilfsmethoden fuer den Modals-Container. Ausgelagert wegen der
 * 400-Zeilen-Regel; basiert ausschliesslich auf der Datenbank bzw. reinen
 * Eingabewerten (kein Komponenten-State).
 */
export abstract class ModalsContainerAvatarBase {
  protected readonly database = inject(MockDatabaseService);

  protected profileSpriteBackgroundPosition(userId: string, scale: number): string {
    const avatarId = this.userAvatarId(userId);
    if (avatarId === null) {
      return 'center';
    }

    const row = Math.floor((avatarId - 1) / 6);
    const col = (avatarId - 1) % 6;

    const x = col * 80 * scale;
    const y = row * 84 * scale;

    switch (avatarId) {
      case 1:
        return `-${x}px -${y}px`;
      case 2:
        return `-${84 * scale}px -${y}px`;
      case 3:
        return `-${164 * scale}px -${y}px`;
      case 4:
        return `-${244 * scale}px -${y}px`;
      case 5:
        return `-${324 * scale}px -${y}px`;
      case 6:
        return `-${404 * scale}px -${y}px`;
      default:
        return 'center';
    }
  }

  protected profileSpriteBackgroundSize(scale: number): string {
    return `${472 * scale}px ${167 * scale}px`;
  }

  protected avatarSvgPath(userId: string): string {
    const avatarImage = this.database.findUser(userId)?.avatarImage;
    if (avatarImage) return avatarImage;

    const avatarId = this.userAvatarId(userId);
    if (!avatarId) {
      return '/assets/icons/1.svg';
    }

    return `/assets/icons/${avatarId}.svg`;
  }

  protected contactAvatarBackgroundImage(userId: string): string {
    return `url('/assets/sprites.png')`;
  }

  protected contactAvatarBackgroundPosition(userId: string): string {
    return this.profileSpriteBackgroundPosition(userId, 1);
  }

  protected contactAvatarBackgroundSize(userId: string): string {
    return this.profileSpriteBackgroundSize(1);
  }

  private userAvatarId(userId: string): number | null {
    const user = this.database.findUser(userId);
    if (!user) {
      return null;
    }

    if (typeof user.avatarId === 'number') {
      return user.avatarId;
    }

    if (typeof user.avatarId === 'string') {
      const num = parseInt(user.avatarId, 10);
      if (!isNaN(num)) return num;
    }

    const classMatch = user.avatarClass?.match(/avatar-(\d)/);
    if (classMatch) return Number(classMatch[1]);
    return null;
  }
}
