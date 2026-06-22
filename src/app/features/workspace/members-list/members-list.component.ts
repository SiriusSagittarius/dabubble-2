import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDatabaseService } from '../../../core/database/mock-database.service';

@Component({
  selector: 'app-members-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './members-list.component.html',
  styleUrls: ['./members-list.component.scss'],
})
export class MembersListComponent {
  protected readonly database = inject(MockDatabaseService);
  protected readonly members = this.database.activeChannelMembers;

  protected onAddMembers(): void {
    console.log('Mitglieder hinzufügen');
  }

  protected avatarSvgPath(userId: string): string {
    const avatarImage = this.database.findUser(userId)?.avatarImage;
    if (avatarImage) return avatarImage;

    const avatarId = this.userAvatarId(userId);
    return avatarId !== null ? `/assets/icons/${avatarId}.svg` : '/assets/icons/1.svg';
  }

  private userAvatarId(userId: string): number | null {
    const user = this.database.findUser(userId);
    if (!user) return null;
    if (typeof user.avatarId === 'number') return user.avatarId;
    if (typeof user.avatarId === 'string') {
      const num = parseInt(user.avatarId, 10);
      if (!isNaN(num)) return num;
    }
    const classMatch = user.avatarClass?.match(/avatar-(\d)/);
    if (classMatch) return Number(classMatch[1]);
    return null;
  }
}
