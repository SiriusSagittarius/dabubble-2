import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';

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
export class GoogleLoginComponent {
  private readonly auth = inject(Auth);
  @Output() loginSuccess = new EventEmitter<GoogleLoginSuccess>();
  private readonly googleProvider = new GoogleAuthProvider();

  protected async signInWithGoogle(): Promise<void> {
    try {
      const result = await signInWithPopup(this.auth, this.googleProvider);
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
    } catch (error) {
      console.error('Google login failed', error);
    }
  }
}
