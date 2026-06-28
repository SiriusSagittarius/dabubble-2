import { Injectable, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, doc, serverTimestamp, setDoc } from '@angular/fire/firestore';

import { MockDatabaseService } from '../database/mock-database.service';

const HEARTBEAT_INTERVAL_MS = 30_000;
const PRESENCE_REFRESH_MS = 20_000;

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly database = inject(MockDatabaseService);
  private readonly injector = inject(EnvironmentInjector);

  private authUnsubscribe: (() => void) | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private activityHandler: (() => void) | null = null;

  start(): void {
    if (this.authUnsubscribe || typeof window === 'undefined') {
      return;
    }

    this.authUnsubscribe = onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.beginHeartbeat();
      } else {
        this.stopHeartbeat();
      }
    });

    this.refreshTimer = setInterval(() => this.database.refreshPresence(), PRESENCE_REFRESH_MS);

    this.activityHandler = () => {
      if (document.visibilityState === 'visible') {
        void this.writeHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', this.activityHandler);
    window.addEventListener('focus', this.activityHandler);
  }

  private beginHeartbeat(): void {
    this.stopHeartbeat();
    void this.writeHeartbeat();
    this.heartbeatTimer = setInterval(() => void this.writeHeartbeat(), HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async writeHeartbeat(): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      return;
    }

    try {
      await runInInjectionContext(this.injector, () =>
        setDoc(doc(this.firestore, 'users', uid), { lastActive: serverTimestamp() }, { merge: true }),
      );
    } catch {

    }
  }
}
