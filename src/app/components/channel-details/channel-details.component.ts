import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDatabaseService } from '../../database/mock-database.service';
import { ProfileDialogService } from '../../services/profile-dialog.service';

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

    const avatarId = this.userAvatarId(userId);
    return avatarId !== null ? `/assets/${avatarId}.svg` : '/assets/1.svg';
  }

  protected onAddMembers(): void {
    console.log('Mitglieder hinzufügen');
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
