import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, serverTimestamp, setDoc } from '@angular/fire/firestore';

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  name: string;
  picture?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FirebaseUserService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  async upsertCurrentUserProfile(profile: FirebaseUserProfile): Promise<void> {
    const currentUser = this.auth.currentUser;
    const uid = currentUser?.uid ?? profile.uid;

    await setDoc(
      doc(this.firestore, 'users', uid),
      {
        uid,
        email: profile.email,
        name: profile.name,
        picture: profile.picture ?? null,
        lastLoginAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}
