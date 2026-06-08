import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';

import { MockDatabaseService } from '../../database/mock-database.service';
import { GoogleLoginComponent, GoogleLoginSuccess } from '../../services/google-login/google-login';
import { FirebaseUserService } from '../../services/firebase-user.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, GoogleLoginComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(Auth);
  private readonly database = inject(MockDatabaseService);
  private readonly firebaseUsers = inject(FirebaseUserService);
  private loginSuccessTimer: ReturnType<typeof setTimeout> | null = null;
  private introTimers: ReturnType<typeof setTimeout>[] = [];

  protected readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly showPassword = signal(false);
  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');
  protected readonly showSuccessOverlay = signal(false);
  protected readonly showIntro = signal(true);
  protected readonly introLeaving = signal(false);

  constructor() {
    this.loginForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.showToast()) {
        this.showToast.set(false);
      }
    });

    this.startIntro();

    this.destroyRef.onDestroy(() => {
      this.clearLoginSuccessTimer();
      this.clearIntroTimers();
    });
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected isFieldInvalid(field: keyof typeof this.loginForm.controls): boolean {
    const control = this.loginForm.controls[field];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    this.clearLoginSuccessTimer();
    this.showSuccessOverlay.set(false);
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      this.toastMessage.set('Bitte die Felder korrekt ausfuellen.');
      this.showToast.set(true);
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    void this.signInWithEmail(email, password);
  }

  protected handleGoogleLogin(result: GoogleLoginSuccess): void {
    if (!result.token || !result.user?.email) {
      this.toastMessage.set('Google-Login konnte nicht verarbeitet werden.');
      this.showToast.set(true);
      return;
    }

    void this.firebaseUsers.upsertCurrentUserProfile({
      uid: result.user.uid ?? result.user.sub ?? result.user.email,
      email: result.user.email,
      name: result.user.name ?? result.user.email,
      picture: result.user.picture ?? null,
    });

    const user = this.database.loginWithGoogleProfile({
      email: result.user.email,
      name: result.user.name,
      picture: result.user.picture ?? null,
    });

    if (!user) {
      this.toastMessage.set('Google-Login hat keine E-Mail geliefert.');
      this.showToast.set(true);
      return;
    }

    this.router.navigate(['/home']);
  }

  protected loginAsGuest(): void {
    this.router.navigate(['/home']);
  }

  private async signInWithEmail(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email.trim().toLowerCase(), password);
      this.showToast.set(false);
      this.showSuccessOverlay.set(true);
      this.loginSuccessTimer = setTimeout(() => {
        this.showSuccessOverlay.set(false);
        this.router.navigate(['/home']);
      }, 1600);
    } catch (error) {
      console.error('Login failed', error);
      this.toastMessage.set('E-Mail oder Passwort stimmt nicht.');
      this.showToast.set(true);
    }
  }

  private clearLoginSuccessTimer(): void {
    if (this.loginSuccessTimer !== null) {
      clearTimeout(this.loginSuccessTimer);
      this.loginSuccessTimer = null;
    }
  }

  private startIntro(): void {
    this.clearIntroTimers();
    this.showIntro.set(true);
    this.introLeaving.set(false);

    this.introTimers.push(
      setTimeout(() => {
        this.introLeaving.set(true);
      }, 3050),
      setTimeout(() => {
        this.showIntro.set(false);
        this.introLeaving.set(false);
      }, 3450),
    );
  }

  private clearIntroTimers(): void {
    for (const timer of this.introTimers) {
      clearTimeout(timer);
    }

    this.introTimers = [];
  }
}
