import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockChannel } from '../../../core/database/mock-database.models';
import { MockDatabaseService } from '../../../core/database/mock-database.service';

@Component({
  selector: 'app-sidebar-channel-sublist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-channel-sublist.component.html',
  styleUrls: ['./sidebar.channels.scss', './sidebar.channels-2.scss'],
})
export class SidebarChannelSublistComponent {
  protected readonly database = inject(MockDatabaseService);

  label = input.required<string>();

  channels = input.required<MockChannel[]>();

  expanded = input.required<boolean>();

  emptyHint = input<string>('');

  toggle = output<void>();

  selectChannel = output<string>();

  protected isActive(channelId: string): boolean {
    return this.database.selectedChannelId() === channelId;
  }
}
