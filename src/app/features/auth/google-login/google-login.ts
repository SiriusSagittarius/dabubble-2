import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Injector, OnInit, Output, inject, runInInjectionContext } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  UserCredential,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from '@angular/fire/auth';

export interface GoogleLoginSuccess {
  token: string;
  user: {
    email?: string;
    name?: string;
    picture?: string;
    sub?: string;
    uid?: string;
  } | null;
}

@Component({
  selector: 'app-google-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './google-login.html',
  styleUrl: './google-login.scss',
})
export class GoogleLoginComponent implements OnInit {
  private readonly auth = inject(Auth);
  private readonly injector = inject(Injector);
  @Output() loginSuccess = new EventEmitter<GoogleLoginSuccess>();
  @Output() loginError = new EventEmitter<string>();
  private readonly googleProvider = new GoogleAuthProvider();

  async ngOnInit(): Promise<void> {

    try {
      const result = await runInInjectionContext(this.injector, () => getRedirectResult(this.auth));
      if (result?.user) {
        await this.emitSuccess(result);
      }
    } catch (error) {
      this.emitError(error);
    }
  }

  protected async signInWithGoogle(): Promise<void> {
    try {
      const result = await runInInjectionContext(this.injector, () =>
        signInWithPopup(this.auth, this.googleProvider),
      );
      await this.emitSuccess(result);
    } catch (error) {

      if (this.shouldFallbackToRedirect(error)) {
        try {
          await runInInjectionContext(this.injector, () =>
            signInWithRedirect(this.auth, this.googleProvider),
          );
          return;
        } catch (redirectError) {
          this.emitError(redirectError);
          return;
        }
      }

      if (this.isUserCancellation(error)) {
        return;
      }
      this.emitError(error);
    }
  }

  private async emitSuccess(result: UserCredential): Promise<void> {
    const idToken = await result.user.getIdToken();

    this.loginSuccess.emit({
      token: idToken,
      user: {
        uid: result.user.uid,
        email: result.user.email ?? undefined,
        name: result.user.displayName ?? undefined,
        picture: result.user.photoURL ?? undefined,
        sub: result.user.uid,
      },
    });
  }

  private shouldFallbackToRedirect(error: unknown): boolean {
    const code = this.errorCode(error);
    return code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment';
  }

  private isUserCancellation(error: unknown): boolean {
    const code = this.errorCode(error);
    return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
  }

  private errorCode(error: unknown): string {
    return (error as { code?: string } | null)?.code ?? '';
  }

  private emitError(error: unknown): void {
    console.error('Google login failed', error);

    const code = this.errorCode(error);
    let message = 'Google-Anmeldung fehlgeschlagen. Bitte erneut versuchen.';
    if (code === 'auth/unauthorized-domain') {
      message = 'Diese Adresse ist nicht für die Google-Anmeldung freigegeben. Bitte die Domain in Firebase autorisieren.';
    } else if (code === 'auth/network-request-failed') {
      message = 'Netzwerkproblem bei der Google-Anmeldung. Bitte die Verbindung prüfen.';
    }

    this.loginError.emit(message);
  }
}
