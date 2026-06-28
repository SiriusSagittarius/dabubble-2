import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { UiStateService } from '../../../core/services/ui-state.service';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss',
})
export class HelpComponent {
  protected readonly database = inject(MockDatabaseService);
  protected readonly uiState = inject(UiStateService);
  private readonly router = inject(Router);

  protected createChannel(): void {
    this.uiState.openAddChannelDialog();
  }

  protected close(): void {
    this.uiState.closeHelp();
  }

  protected goToRegister(): void {
    this.router.navigate(['/login']);
  }
}
