import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild, ElementRef, signal, inject, computed, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { ProfileDialogService } from '../../../core/services/profile-dialog.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly router = inject(Router);
  private readonly database = inject(MockDatabaseService);
  private readonly profileDialog = inject(ProfileDialogService);
  private readonly auth = inject(Auth);
  private readonly injector = inject(EnvironmentInjector);

  protected profileMenuOpen = signal(false);
  protected readonly currentUser = computed(() => this.database.currentUser());
  @ViewChild('profileArea') profileArea!: ElementRef;

  @HostListener('document:click', ['$event'])
  protected closeProfileMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.profileMenuOpen()) return;

    const target = event.target as Node | null;
    if (target && this.profileArea?.nativeElement.contains(target)) return;

    this.profileMenuOpen.set(false);
  }

  protected toggleProfileMenu(): void {
    this.profileMenuOpen.update((value) => !value);
  }

  protected closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  protected openProfile(): void {
    this.profileMenuOpen.set(false);
    const user = this.currentUser();
    if (!user) {
      return;
    }
    this.profileDialog.open(user.id);
  }

  protected async logout(): Promise<void> {
    this.profileMenuOpen.set(false);
    this.profileDialog.close();

    try {
      await runInInjectionContext(this.injector, () => signOut(this.auth));
    } catch (error) {
      console.error('Sign-out failed', error);
    }
    this.database.logout();
    void this.router.navigate(['/login']);
  }

  protected profileAvatarBackgroundImage(): string {
    const user = this.currentUser();
    if (user?.avatarImage) {
      return `url('${user.avatarImage}')`;
    }

    const avatarId = user?.avatarId ?? 1;
    return `url('/assets/icons/${avatarId}.svg')`;
  }
}
