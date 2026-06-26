import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { UiStateService } from '../../../core/services/ui-state.service';

@Component({
  selector: 'app-sidebar-dm-list-item',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host { display: block; width: 100%; }

    .dm-item {
      position: relative;
      width: 100%;
      border: 0;
      border-radius: 18px;
      background: transparent;
      padding: 10px 12px 10px 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      text-align: left;
      text-decoration: none;
      font: inherit;
      color: #1f1f1f;
      overflow: hidden;
    }

    .dm-item:hover,
    .dm-item.dm-item-active { background: #eceefe; }

    .dm-item:hover:not(.dm-item-active) .dm-name { color: #444df2; }

    .dm-item.dm-item-active .dm-name {
      color: #444df2;
      font-weight: 700;
    }

    .dm-item-avatar-wrapper {
      position: relative;
      width: 34px;
      height: 34px;
      flex: 0 0 34px;
    }

    .dm-item-avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    .dm-item-status-dot {
      position: absolute;
      right: -1px;
      bottom: -1px;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      background: #adb0d9;
    }

    .dm-item-status-dot.online { background: #92c83e; }
    .dm-item-status-dot.offline { background: #adb0d9; }

    .dm-name {
      min-width: 0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #1f1f1f;
    }

    .dm-self-tag {
      font-weight: 400;
      color: #1f1f1f;
    }
  `],
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
