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
  contactUserIds?: string[] | null;
}

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

    if (profile.avatarImage && profile.avatarImage.length <= MAX_AVATAR_IMAGE_LENGTH) {
      data['avatarImage'] = profile.avatarImage;
      data['avatarId'] = null;
    } else if (typeof profile.avatarId === 'number') {
      data['avatarId'] = profile.avatarId;
      data['avatarImage'] = null;
    }

    if (typeof profile.bio === 'string') {
      data['bio'] = profile.bio;
    }
    if (Array.isArray(profile.links)) {
      data['links'] = profile.links;
    }
    if (Array.isArray(profile.profileCategories)) {
      data['profileCategories'] = profile.profileCategories;
    }
    if (Array.isArray(profile.contactUserIds)) {
      data['contactUserIds'] = profile.contactUserIds;
    }

    await runInInjectionContext(this.injector, () =>
      setDoc(doc(this.firestore, 'users', uid), data, { merge: true }),
    );
  }

  async updateContactIds(contactUserIds: string[]): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      return;
    }

    await runInInjectionContext(this.injector, () =>
      setDoc(doc(this.firestore, 'users', uid), { contactUserIds }, { merge: true }),
    );
  }
}
