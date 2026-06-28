import { Component, DestroyRef, EnvironmentInjector, inject, runInInjectionContext, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';

import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { FirebaseUserService } from '../../../core/services/firebase-user.service';
import { compressImageFile } from '../../../core/utils/image.util';

interface AvatarOption {
  id: number;
  label: string;
}

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

@Component({
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.account.scss', './signup.form.scss', './signup.account.responsive.scss'],
})
export class SignupComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly database = inject(MockDatabaseService);
  private readonly auth = inject(Auth);
  private readonly injector = inject(EnvironmentInjector);
  private readonly firebaseUsers = inject(FirebaseUserService);
  private successOverlayTimer: ReturnType<typeof setTimeout> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly registerForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(PASSWORD_PATTERN)] }),
    acceptTerms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  protected readonly showPassword = signal(false);
  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');
  protected readonly showSuccessOverlay = signal(false);
  protected readonly isAvatarStep = signal(false);
  protected readonly selectedAvatarId = signal<number | null>(null);
  protected readonly customAvatarImage = signal<string | null>(null);
  protected readonly isProfilePublic = signal(true);
  protected readonly avatarOptions: AvatarOption[] = [
    { id: 1, label: 'Avatar 1' },
    { id: 2, label: 'Avatar 2' },
    { id: 3, label: 'Avatar 3' },
    { id: 4, label: 'Avatar 4' },
    { id: 5, label: 'Avatar 5' },
    { id: 6, label: 'Avatar 6' },
  ];

  constructor() {
    this.registerForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.showToast()) {
        this.showToast.set(false);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.clearSuccessOverlayTimer();
      this.clearToastTimer();
    });
  }

  private showToastMessage(message: string): void {
    this.toastMessage.set(message);
    this.showToast.set(true);
    this.clearToastTimer();
    this.toastTimer = setTimeout(() => this.showToast.set(false), 4000);
  }

  private clearToastTimer(): void {
    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  protected goBack(): void {
    if (this.isAvatarStep()) {
      this.isAvatarStep.set(false);
      return;
    }

    this.router.navigate(['/login']);
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected toggleProfileVisibility(): void {
    this.isProfilePublic.update((value) => !value);
  }

  protected selectAvatar(avatarId: number): void {
    this.customAvatarImage.set(null);
    this.selectedAvatarId.set(avatarId);
  }

  protected selectedAvatarOption(): AvatarOption | null {
    return this.avatarOptions.find((avatar) => avatar.id === this.selectedAvatarId()) ?? null;
  }

  protected onCustomAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    void compressImageFile(file)
      .then((dataUrl) => {
        this.customAvatarImage.set(dataUrl);
        this.selectedAvatarId.set(null);
      })
      .catch(() => {});
    input.value = '';
  }

  protected avatarPreviewBackgroundImage(): string {
    const customImage = this.customAvatarImage();
    if (customImage) {
      return `url('${customImage}')`;
    }

    const option = this.selectedAvatarOption();
    return option ? `url('/assets/icons/${option.id}.svg')` : "url('/assets/icons/person.svg')";
  }

  protected avatarPreviewBackgroundSize(): string {
    return this.customAvatarImage() || this.selectedAvatarOption() ? 'cover' : 'contain';
  }

  protected toggleTerms(): void {
    const current = this.registerForm.controls.acceptTerms.value;
    this.registerForm.controls.acceptTerms.setValue(!current);
    this.registerForm.controls.acceptTerms.markAsDirty();
    this.registerForm.controls.acceptTerms.markAsTouched();
  }

  protected openPrivacyPolicy(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['/info/privacy']);
  }

  protected isFieldInvalid(field: keyof typeof this.registerForm.controls): boolean {
    const control = this.registerForm.controls[field];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    if (!this.isAvatarStep()) {
      this.registerForm.markAllAsTouched();
      if (this.registerForm.invalid) {
        this.showToastMessage('Bitte alle Felder korrekt ausfuellen.');
        return;
      }

      this.isAvatarStep.set(true);
      this.showToast.set(false);
      return;
    }

    const { name, email, password } = this.registerForm.getRawValue();
    void this.registerWithFirebase(name, email, password);
  }

  private async registerWithFirebase(name: string, email: string, password: string): Promise<void> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email.trim().toLowerCase(), password);
      const firebaseUser = credential.user;
      await runInInjectionContext(this.injector, () => updateProfile(firebaseUser, { displayName: name.trim() }));

      const customImage = this.customAvatarImage();
      const avatarId = customImage ? null : this.selectedAvatarId() ?? 3;

      await runInInjectionContext(this.injector, () =>
        this.firebaseUsers.upsertCurrentUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? email,
          name: name.trim(),
          picture: null,
          avatarId,
          avatarImage: customImage,
        }),
      );

      this.database.registerUser(
        name,
        email,
        password,
        avatarId,
        customImage,
        this.isProfilePublic(),
      );

      this.showToast.set(false);
      this.showSuccessOverlay.set(true);
      this.clearSuccessOverlayTimer();
      this.successOverlayTimer = setTimeout(() => {
        this.showSuccessOverlay.set(false);
        this.router.navigate(['/home']);
      }, 1600);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        this.showToastMessage('Diese E-Mail-Adresse wird bereits verwendet.');
      } else {
        this.showToastMessage('Registrierung fehlgeschlagen. Bitte erneut versuchen.');
      }
    }
  }

  private clearSuccessOverlayTimer(): void {
    if (this.successOverlayTimer !== null) {
      clearTimeout(this.successOverlayTimer);
      this.successOverlayTimer = null;
    }
  }
}
