import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MockDatabaseService } from '../../database/mock-database.service';
import { UiStateService } from '../../services/ui-state.service';
import { HeaderComponent } from '../header/header.component';
import { Sidebar } from '../sidebar/sidebar.component';
import { ChatArea } from '../chat-area/chat-area.component';
import { ThreadPanel } from '../thread-panel/thread-panel.component';
import { ModalsContainer } from '../modals-container/modals-container.component';
import { ChannelDetailsComponent } from '../channel-details/channel-details.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeaderComponent, Sidebar, ChatArea, ThreadPanel, ChannelDetailsComponent, ModalsContainer],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class Home {
  protected readonly database = inject(MockDatabaseService);
  protected readonly uiState = inject(UiStateService);
  private readonly router = inject(Router);

  protected readonly sidebarCollapsed = signal(false);
  protected readonly threadCollapsed = signal(true);

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  protected closeThread(): void {
    this.threadCollapsed.set(true);
  }

  protected openThread(): void {
    this.threadCollapsed.set(false);
  }

  protected onChannelDetailsClose(): void {
    this.uiState.closeMembersPanel();
  }
}
