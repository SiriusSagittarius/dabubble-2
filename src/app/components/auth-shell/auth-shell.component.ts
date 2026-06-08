import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.scss',
})
export class AuthShell implements OnInit, OnDestroy {
  protected introVisible = false;
  protected introLeaving = false;

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