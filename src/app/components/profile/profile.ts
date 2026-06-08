import { Component } from '@angular/core';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
[x: string]: any;
}

  protected channelName(channelId: string): string {
    return this.database.channels().find((channel) => channel.id === channelId)?.name ?? 'Channel';
  }

  @HostListener('document:click', ['$event'])
  protected closeProfileMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.profileMenuOpen()) return;

    const target = event.target as Node | null;
    if (target && this.profileArea?.nativeElement.contains(target)) return;

    this.profileMenuOpen.set(false);
  }

  protected toggleProfileMenu(): void {
    this.profileMenuOpen.update((value) => !value);
  }

  protected openProfile(): void {}

  protected logout(): void {}

  protected avatarSvgPath(userId: string): string {
    const avatarId = this.userAvatarId(userId);
    return avatarId ? `/assets/${avatarId}.svg` : '/assets/1.svg';
  }

  protected headerAvatarBackgroundImage() {
    return `url('/assets/sprites.png')`;
  }

  protected headerAvatarBackgroundPosition() {
    const user = this.database.currentUser();
    return user ? this.profileSpriteBackgroundPosition(user.id, 1) : 'center';
  }

  protected headerAvatarBackgroundSize() {
    return this.profileSpriteBackgroundSize(1);
  }

  private profileSpriteBackgroundPosition(userId: string, spriteIndex: number): string {
    const avatarId = this.userAvatarId(userId) ?? spriteIndex;
    const offset = (avatarId - 1) * 80;
    return `-${offset}px 0`;
  }

  private profileSpriteBackgroundSize(spriteIndex: number): string {
    return `${spriteIndex * 100}% auto`;
  }

  private userAvatarId(userId: string): number | null {
    const user = this.database.findUser(userId);
    if (!user) return null;
    if (typeof user.avatarId === 'number') return user.avatarId;

    const num = parseInt(user.avatarId as unknown as string, 10);
    return isNaN(num) ? null : num;
  }
}
