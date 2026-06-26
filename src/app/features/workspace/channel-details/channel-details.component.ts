import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { ProfileDialogService } from '../../../core/services/profile-dialog.service';

@Component({
  selector: 'app-channel-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './channel-details.component.html',
  styleUrls: ['./channel-details.component.scss'],
})
export class ChannelDetailsComponent {
  protected readonly database = inject(MockDatabaseService);
  protected readonly profileDialog = inject(ProfileDialogService);
  @Output() close = new EventEmitter<void>();

  protected closeDetails(): void {
    this.close.emit();
  }

  protected openMemberProfile(userId: string): void {
    this.profileDialog.open(userId);
  }

  protected avatarSvgPath(userId: string): string {
    const avatarImage = this.database.findUser(userId)?.avatarImage;
    if (avatarImage) return avatarImage;

    return `/assets/icons/${this.userAvatarId(userId)}.svg`;
  }

  protected onAddMembers(): void {
    console.log('Mitglieder hinzufügen');
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
