import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth, confirmPasswordReset, sendPasswordResetEmail, verifyPasswordResetCode } from '@angular/fire/auth';

@Component({
  selector: 'app-reset',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.shell.scss', './reset.form.scss'],
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

  protected readonly newPasswordForm = new FormGroup({
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
  });

  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');
  protected readonly showSuccessOverlay = signal(false);
  protected readonly successMessage = signal('E-Mail gesendet');
  protected readonly isConfirmStep = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  private oobCode: string | null = null;

  constructor() {
    this.resetForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.showToast()) {
        this.showToast.set(false);
      }
    });

    this.newPasswordForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.showToast()) {
        this.showToast.set(false);
      }
    });

    const oobCode = this.route.snapshot.queryParamMap.get('oobCode');
    if (oobCode) {
      this.oobCode = oobCode;
      void this.verifyResetCode(oobCode);
    }

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

  protected toggleNewPassword(): void {
    this.showNewPassword.update((value) => !value);
  }

  protected toggleConfirmPassword(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  protected isNewPasswordFieldInvalid(field: keyof typeof this.newPasswordForm.controls): boolean {
    const control = this.newPasswordForm.controls[field];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected passwordsMismatch(): boolean {
    const { password, confirmPassword } = this.newPasswordForm.controls;
    if (!confirmPassword.dirty && !confirmPassword.touched) {
      return false;
    }

    return password.value.length > 0 && confirmPassword.value.length > 0 && password.value !== confirmPassword.value;
  }

  protected canSaveNewPassword(): boolean {
    const { password, confirmPassword } = this.newPasswordForm.getRawValue();
    return password.trim().length > 0 && confirmPassword.trim().length > 0;
  }

  protected onSubmitNewPassword(): void {
    this.clearFeedbackTimer();
    this.showSuccessOverlay.set(false);
    this.newPasswordForm.markAllAsTouched();

    if (this.newPasswordForm.invalid) {
      this.toastMessage.set('Das Passwort muss mindestens 6 Zeichen lang sein.');
      this.showToast.set(true);
      return;
    }

    if (this.passwordsMismatch()) {
      this.toastMessage.set('Die Passwörter stimmen nicht überein.');
      this.showToast.set(true);
      return;
    }

    const { password } = this.newPasswordForm.getRawValue();
    void this.saveNewPassword(password);
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
      await sendPasswordResetEmail(this.auth, email.trim().toLowerCase(), {
        url: `${window.location.origin}/reset`,
        handleCodeInApp: true,
      });
      this.showToast.set(false);
      this.successMessage.set('E-Mail gesendet');
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

  private async verifyResetCode(oobCode: string): Promise<void> {
    try {
      await verifyPasswordResetCode(this.auth, oobCode);
      this.isConfirmStep.set(true);
    } catch (error) {
      console.error('Reset code verification failed', error);
      this.oobCode = null;
      this.toastMessage.set('Dieser Link ist ungültig oder abgelaufen.');
      this.showToast.set(true);
    }
  }

  private async saveNewPassword(password: string): Promise<void> {
    if (!this.oobCode) {
      return;
    }

    try {
      await confirmPasswordReset(this.auth, this.oobCode, password);
      this.showToast.set(false);
      this.successMessage.set('Passwort geändert');
      this.showSuccessOverlay.set(true);
      this.feedbackTimer = setTimeout(() => {
        this.showSuccessOverlay.set(false);
        this.router.navigate(['/login']);
      }, 1600);
    } catch (error) {
      console.error('Password reset confirmation failed', error);
      this.toastMessage.set('Das Passwort konnte nicht geändert werden.');
      this.showToast.set(true);
    }
  }
}
