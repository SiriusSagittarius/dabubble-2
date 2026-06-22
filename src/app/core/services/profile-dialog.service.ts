import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ProfileDialogService {
  readonly profileUserId = signal<string | null>(null);

  open(userId: string): void {
    this.profileUserId.set(userId);
  }

  close(): void {
    this.profileUserId.set(null);
  }
}
