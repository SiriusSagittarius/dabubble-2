import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockChannel, MockUser } from '../../../core/database/mock-database.models';
import { MockDatabaseService } from '../../../core/database/mock-database.service';

/**
 * Devspace-Suchoverlay der Sidebar. Ausgelagert aus sidebar.component.html wegen
 * der 400-Zeilen-Regel (Vorbild: profile-categories-edit.component.ts). Zeigt je
 * nach Praefix (# / @) Channel- oder Nutzer-Treffer und meldet Aktionen zurueck.
 */
@Component({
  selector: 'app-sidebar-devspace-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar-devspace-search.component.html',
  styleUrls: ['./sidebar.dm.scss'],
})
export class SidebarDevspaceSearchComponent {
  private readonly database = inject(MockDatabaseService);

  query = input.required<string>();
  showChannels = input.required<boolean>();
  showUsers = input.required<boolean>();
  showDefault = input.required<boolean>();
  channels = input.required<MockChannel[]>();
  users = input.required<MockUser[]>();

  queryChange = output<string>();
  selectChannel = output<string>();
  openDirectMessage = output<string>();
  close = output<void>();

  protected avatarSvgPath(userId: string): string {
    const avatarImage = this.database.findUser(userId)?.avatarImage;
    if (avatarImage) return avatarImage;
    const user = this.database.findUser(userId);
    let avatarId = 1;
    if (user) {
      if (typeof user.avatarId === 'number' && user.avatarId >= 1 && user.avatarId <= 6) {
        avatarId = user.avatarId;
      } else {
        const classMatch = user.avatarClass?.match(/avatar-(\d+)/);
        if (classMatch) {
          const id = Number(classMatch[1]);
          if (id >= 1 && id <= 6) avatarId = id;
        }
      }
    }
    return `/assets/icons/${avatarId}.svg`;
  }
}
