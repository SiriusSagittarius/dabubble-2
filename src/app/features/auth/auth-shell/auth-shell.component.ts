import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.scss',
})
export class AuthShell implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  protected introVisible = false;
  protected introLeaving = false;

  protected get isSignupRoute(): boolean {
    return this.router.url.startsWith('/signup');
  }

  protected get isLoginRoute(): boolean {
    return this.router.url.startsWith('/login');
  }

  private introTimers: number[] = [];

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    setTimeout(() => {
      if (!this.shouldPlayIntro()) {
        return;
      }

      this.startIntro();
    }, 0);
  }

  ngOnDestroy(): void {
    this.clearIntroTimers();
  }

  private shouldPlayIntro(): boolean {
    return false;
  }

  private startIntro(): void {
    this.clearIntroTimers();

    this.introVisible = true;
    this.introLeaving = false;

    this.introTimers.push(
      setTimeout(() => {
        this.introLeaving = true;
      }, 2850),
    );

    this.introTimers.push(
      setTimeout(() => {
        this.introVisible = false;
        this.introLeaving = false;
      }, 3250),
    );
  }

  private clearIntroTimers(): void {
    for (const timerId of this.introTimers) {
      clearTimeout(timerId);
    }

    this.introTimers = [];
  }
}