import {
  Component,
  EnvironmentInjector,
  EventEmitter,
  Output,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { MockDatabaseService } from '../../../core/database/mock-database.service';

@Component({
  selector: 'app-sidebar-delete-account',
  standalone: true,
  imports: [],
  templateUrl: './sidebar-delete-account.component.html',
  styleUrl: './sidebar.danger.scss',
})
export class SidebarDeleteAccountComponent {
  /** Wird emittiert, sobald das Konto gelöscht und ausgeloggt wurde. */
  @Output() deleted = new EventEmitter<void>();

  private readonly database = inject(MockDatabaseService);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly injector = inject(EnvironmentInjector);

  protected readonly isGuest = this.database.isGuest;
  protected readonly armed = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected arm(): void {
    this.error.set('');
    this.armed.set(true);
  }

  protected cancel(): void {
    this.armed.set(false);
    this.error.set('');
  }

  protected async confirm(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set('');

    const result = await this.database.deleteCurrentAccount();
    if (!result.ok) {
      this.busy.set(false);
      this.error.set(result.message);
      return;
    }

    try {
      await runInInjectionContext(this.injector, () => signOut(this.auth));
    } catch (error) {
      console.error('Sign-out after account deletion failed', error);
    }

    this.busy.set(false);
    this.armed.set(false);
    this.deleted.emit();
    void this.router.navigate(['/login']);
  }
}
