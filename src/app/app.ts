import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FirebaseUserSyncService } from './services/firebase-user-sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly userSync = inject(FirebaseUserSyncService);
  protected readonly title = signal('dabubble');

  constructor() {
    this.userSync.start();
  }
}