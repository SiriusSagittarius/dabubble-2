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

    return `/assets/icons/${this.userAvatarId(userId)}.svg`;
  }

  private userAvatarId(userId: string): number {
    const user = this.database.findUser(userId);
    if (!user) return 1;
    if (typeof user.avatarId === 'number' && user.avatarId >= 1 && user.avatarId <= 6) return user.avatarId;
    const classMatch = user.avatarClass?.match(/avatar-(\d+)/);
    if (classMatch) {
      const id = Number(classMatch[1]);
      if (id >= 1 && id <= 6) return id;
    }
    return 1;
  }
}
