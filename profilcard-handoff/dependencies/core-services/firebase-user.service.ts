import { Injectable, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { ProfileCategory } from '../database/mock-database.models';

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  name: string;
  picture?: string | null;
  avatarId?: number | null;
  avatarImage?: string | null;
  bio?: string | null;
  links?: Array<{ label: string; url: string }> | null;
  profileCategories?: ProfileCategory[] | null;
}

// Firestore-Dokumente sind auf 1 MB begrenzt. Sehr grosse Custom-Bilder (Data-URLs)
// werden daher NICHT synchronisiert (bleiben lokal), damit der restliche Profil-
// Schreibvorgang (Name/E-Mail/Avatar-ID) nie fehlschlaegt.
const MAX_AVATAR_IMAGE_LENGTH = 900_000;

@Injectable({ providedIn: 'root' })
export class FirebaseUserService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  async upsertCurrentUserProfile(profile: FirebaseUserProfile): Promise<void> {
    const currentUser = this.auth.currentUser;
    const uid = currentUser?.uid ?? profile.uid;

    const data: Record<string, unknown> = {
      uid,
      email: profile.email,
      name: profile.name,
      picture: profile.picture ?? null,
      lastLoginAt: serverTimestamp(),
    };

    // Avatar nur schreiben, wenn er hier mitgegeben wird. Logins ohne Avatar
    // lassen die gespeicherte Auswahl dank merge:true unangetastet.
    if (profile.avatarImage && profile.avatarImage.length <= MAX_AVATAR_IMAGE_LENGTH) {
      data['avatarImage'] = profile.avatarImage;
      data['avatarId'] = null;
    } else if (typeof profile.avatarId === 'number') {
      data['avatarId'] = profile.avatarId;
      data['avatarImage'] = null;
    }

    // Frei beschreibbares Profil (Ueber mich + Links) nur schreiben, wenn angegeben.
    if (typeof profile.bio === 'string') {
      data['bio'] = profile.bio;
    }
    if (Array.isArray(profile.links)) {
      data['links'] = profile.links;
    }
    if (Array.isArray(profile.profileCategories)) {
      data['profileCategories'] = profile.profileCategories;
    }

    await runInInjectionContext(this.injector, () =>
      setDoc(doc(this.firestore, 'users', uid), data, { merge: true }),
    );
  }
}
