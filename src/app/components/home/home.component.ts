import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MockDatabaseService } from '../../database/mock-database.service';
import { Header } from '../header/header.component';
import { Sidebar } from '../sidebar/sidebar.component';
import { ChatArea } from '../chat-area/chat-area.component';
import { ThreadPanel } from '../thread-panel/thread-panel.component';
import { ModalsContainer } from '../modals-container/modals-container.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    Header,
    Sidebar,
    ChatArea,
    ThreadPanel,
    ModalsContainer
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class Home {
  protected readonly database = inject(MockDatabaseService);
  private readonly router = inject(Router);

  // Layout & Sichtbarkeiten aus dem Original-Zustand
  protected readonly sidebarCollapsed = signal(false);
  protected readonly threadCollapsed = signal(false);
  protected readonly showMainChatIntro = signal(false);
  protected readonly showTodoList = signal(false);
  protected readonly selectedDirectMessageUserId = signal<string | null>(null);

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  protected openMainChatIntro(): void {
    this.selectedDirectMessageUserId.set(null);
    this.showTodoList.set(false);
    this.showMainChatIntro.update((value) => !value);
  }

  protected isSidebarExpanded(): boolean {
    return !this.sidebarCollapsed();
  }

  protected isSidebarCollapsed(): boolean {
    return this.sidebarCollapsed();
  }

  protected isThreadCollapsed(): boolean {
    return this.threadCollapsed();
  }

  protected closeThread(): void {
    this.threadCollapsed.set(true);
  }

  protected openThread(): void {
    this.threadCollapsed.set(false);
  }
}
