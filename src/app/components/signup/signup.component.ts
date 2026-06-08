import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MockDatabaseService } from '../../database/mock-database.service';

interface AvatarOption {
  id: number;
  label: string;
  thumbnailBackgroundPosition: string;
  previewBackgroundPosition: string;
}

@Component({
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignupComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly database = inject(MockDatabaseService);
  private successOverlayTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly registerForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    acceptTerms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  protected readonly showPassword = signal(false);
  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');
  protected readonly showSuccessOverlay = signal(false);
  protected readonly isAvatarStep = signal(false);
  protected readonly selectedAvatarId = signal<number | null>(null);
  protected readonly avatarOptions: AvatarOption[] = [
    { id: 1, label: 'Avatar 1', thumbnailBackgroundPosition: '-4px -99px', previewBackgroundPosition: '-10.5px -259.875px' },
    { id: 2, label: 'Avatar 2', thumbnailBackgroundPosition: '-84px -99px', previewBackgroundPosition: '-220.5px -259.875px' },
    { id: 3, label: 'Avatar 3', thumbnailBackgroundPosition: '-164px -99px', previewBackgroundPosition: '-430.5px -259.875px' },
    { id: 4, label: 'Avatar 4', thumbnailBackgroundPosition: '-244px -99px', previewBackgroundPosition: '-640.5px -259.875px' },
    { id: 5, label: 'Avatar 5', thumbnailBackgroundPosition: '-324px -99px', previewBackgroundPosition: '-850.5px -259.875px' },
    { id: 6, label: 'Avatar 6', thumbnailBackgroundPosition: '-404px -99px', previewBackgroundPosition: '-1060.5px -259.875px' },
  ];

  constructor() {
    this.registerForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.showToast()) {
        this.showToast.set(false);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.clearSuccessOverlayTimer();
    });
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

  protected selectAvatar(avatarId: number): void {
    this.selectedAvatarId.set(avatarId);
  }

  protected selectedAvatarOption(): AvatarOption | null {
    return this.avatarOptions.find((avatar) => avatar.id === this.selectedAvatarId()) ?? null;
  }

  protected avatarPreviewBackgroundImage(): string {
    return this.selectedAvatarOption() ? "url('/assets/avatar-sprite.svg')" : "url('/assets/person.svg')";
  }

  protected avatarPreviewBackgroundPosition(): string {
    return this.selectedAvatarOption()?.previewBackgroundPosition ?? 'center';
  }

  protected avatarPreviewBackgroundSize(): string {
    return this.selectedAvatarOption() ? '1239px 438.375px' : 'contain';
  }

  protected toggleTerms(): void {
    const current = this.registerForm.controls.acceptTerms.value;
    this.registerForm.controls.acceptTerms.setValue(!current);
    this.registerForm.controls.acceptTerms.markAsDirty();
    this.registerForm.controls.acceptTerms.markAsTouched();
  }

  protected openPrivacyPolicy(event: MouseEvent): void {
    event.preventDefault();
    this.toastMessage.set('Datenschutzerklaerung ist noch nicht verknuepft.');
    this.showToast.set(true);
  }

  protected isFieldInvalid(field: keyof typeof this.registerForm.controls): boolean {
    const control = this.registerForm.controls[field];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    if (!this.isAvatarStep()) {
      this.registerForm.markAllAsTouched();
      if (this.registerForm.invalid) {
        this.toastMessage.set('Bitte alle Felder korrekt ausfuellen.');
        this.showToast.set(true);
        return;
      }

      this.isAvatarStep.set(true);
      this.showToast.set(false);
      return;
    }

    const { name, email, password } = this.registerForm.getRawValue();
    const result = this.database.registerUser(name, email, password, this.selectedAvatarId() ?? 3);

    if (!result.ok) {
      this.toastMessage.set(result.message);
      this.showToast.set(true);
      return;
    }

    this.showToast.set(false);
    this.showSuccessOverlay.set(true);
    this.clearSuccessOverlayTimer();
    this.successOverlayTimer = setTimeout(() => {
      this.showSuccessOverlay.set(false);
      this.router.navigate(['/home']);
    }, 1600);
  }

  private clearSuccessOverlayTimer(): void {
    if (this.successOverlayTimer !== null) {
      clearTimeout(this.successOverlayTimer);
      this.successOverlayTimer = null;
    }
  }
}
