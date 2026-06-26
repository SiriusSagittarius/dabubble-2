import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { HeaderComponent } from '../header/header.component';
import { Sidebar } from '../sidebar/sidebar.component';
import { ChatArea } from '../chat-area/chat-area.component';
import { ThreadPanel } from '../thread-panel/thread-panel.component';
import { ModalsContainer } from '../modals-container/modals-container.component';
import { ChannelDetailsComponent } from '../channel-details/channel-details.component';
import { HelpComponent } from '../help/help.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeaderComponent, Sidebar, ChatArea, ThreadPanel, ChannelDetailsComponent, ModalsContainer, HelpComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class Home {
  protected readonly database = inject(MockDatabaseService);
  protected readonly uiState = inject(UiStateService);
  private readonly router = inject(Router);

  protected readonly sidebarCollapsed = signal(false);
  protected readonly threadCollapsed = signal(true);

  // Hilfe-/Onboarding-Ansicht: manuell geoeffnet ODER automatisch fuer neue User
  // (noch ohne Channel). Ersetzt den Hauptbereich und blendet den Thread aus.
  protected readonly helpVisible = computed(
    () => this.uiState.showHelp() || this.database.onboardingActive(),
  );

  constructor() {
    // DM geoeffnet (z.B. ueber "Nachricht" in der Profil-Karte) -> Sidebar mobil schliessen
    effect(() => {
      const dmUserId = this.uiState.selectedDirectMessageUserId();
      if (dmUserId && typeof window !== 'undefined' && window.innerWidth <= 960) {
        this.sidebarCollapsed.set(true);
      }
    });
  }

  protected openSidebar(): void {
    this.sidebarCollapsed.set(false);
    this.threadCollapsed.set(true);
  }

  protected onSidebarItemSelected(): void {
    if (window.innerWidth <= 960) {
      this.sidebarCollapsed.set(true);
    }
  }

  protected toggleSidebar(): void {
    const isNarrow = window.innerWidth <= 1350;
    const opening = this.sidebarCollapsed();
    this.sidebarCollapsed.set(!opening);
    if (isNarrow && opening) {
      // Sidebar wird geöffnet: Thread schließen
      this.threadCollapsed.set(true);
    }
  }

  protected closeThread(): void {
    this.threadCollapsed.set(true);
    // Sidebar bleibt zu
  }

  protected openThread(): void {
    this.threadCollapsed.set(false);
    // Bei ≤1350px: Sidebar zuklappen
    if (window.innerWidth <= 1350) {
      this.sidebarCollapsed.set(true);
    }
  }

  protected onChannelDetailsClose(): void {
    this.uiState.closeMembersPanel();
  }
}
