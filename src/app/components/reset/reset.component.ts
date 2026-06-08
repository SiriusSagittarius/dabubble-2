import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';

@Component({
  selector: 'app-reset',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset.component.html',
  styleUrl: './reset.component.scss',
})
export class ResetComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(Auth);
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly resetForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');
  protected readonly showSuccessOverlay = signal(false);

  constructor() {
    this.resetForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.showToast()) {
        this.showToast.set(false);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.clearFeedbackTimer();
    });
  }

  protected goBack(): void {
    this.router.navigate(['/login']);
  }

  protected canSendEmail(): boolean {
    return this.resetForm.controls.email.value.trim().length > 0;
  }

  protected isFieldInvalid(field: keyof typeof this.resetForm.controls): boolean {
    const control = this.resetForm.controls[field];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    this.clearFeedbackTimer();
    this.showSuccessOverlay.set(false);
    this.resetForm.markAllAsTouched();

    if (this.resetForm.invalid) {
      this.toastMessage.set('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      this.showToast.set(true);
      return;
    }

    const { email } = this.resetForm.getRawValue();
    void this.sendResetEmail(email);
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer !== null) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  private async sendResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email.trim().toLowerCase());
      this.showToast.set(false);
      this.showSuccessOverlay.set(true);
      this.feedbackTimer = setTimeout(() => {
        this.showSuccessOverlay.set(false);
        this.router.navigate(['/login']);
      }, 1600);
    } catch (error) {
      console.error('Password reset failed', error);
      this.toastMessage.set('Die E-Mail konnte nicht gesendet werden.');
      this.showToast.set(true);
    }
  }
}
