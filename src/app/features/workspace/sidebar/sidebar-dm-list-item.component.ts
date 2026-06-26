import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { UiStateService } from '../../../core/services/ui-state.service';

@Component({
  selector: 'app-sidebar-dm-list-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="dm-item"
      [class.dm-item-active]="uiState.selectedDirectMessageUserId() === member().id"
      (click)="onClick.emit(member().id)"
    >
      <span class="dm-item-avatar-wrapper" aria-hidden="true">
        <img class="dm-item-avatar" [src]="avatarPath()" [alt]="member().name" />
        <span class="dm-item-status-dot" [class.online]="member().isOnline" [class.offline]="!member().isOnline"></span>
      </span>
      <span class="dm-name">
        {{ member().name }}
        @if (database.isCurrentUser(member().id)) {
          <span class="dm-self-tag"> (Du)</span>
        }
      </span>
    </button>
  `,
})
export class SidebarDmListItemComponent {
  protected readonly database = inject(MockDatabaseService);
  protected readonly uiState = inject(UiStateService);

  member = input.required<any>();
  onClick = output<string>();

  protected avatarPath() {
    const userId = this.member().id;
    const user = this.database.findUser(userId);
    if (user?.avatarImage) {
      return user.avatarImage;
    }
    const avatarId = user?.avatarId ?? 1;
    return `/assets/icons/${avatarId}.svg`;
  }
}
