import { Component, EventEmitter, Output, inject } from '@angular/core';
import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { UiStateService } from '../../../core/services/ui-state.service';

@Component({
  selector: 'app-sidebar-help-button',
  standalone: true,
  imports: [],
  template: `
    <section class="sidebar-section">
      <button
        type="button"
        class="hilfe-header-row"
        [class.hilfe-active]="uiState.showHelp() || database.onboardingActive()"
        aria-label="Hilfe öffnen"
        (click)="openHelp()"
      >
        <svg class="hilfe-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
        </svg>
        <span class="hilfe-title">Hilfe</span>
      </button>
    </section>
  `,
  styleUrl: './sidebar.kontakte.scss',
})
export class SidebarHelpButtonComponent {
  @Output() opened = new EventEmitter<void>();

  protected readonly database = inject(MockDatabaseService);
  protected readonly uiState = inject(UiStateService);

  protected openHelp(): void {
    this.uiState.openHelp();
    this.opened.emit();
  }
}
