import { Injectable, inject, computed, effect, signal } from '@angular/core';
import { ProfileCategory, ProfileCategoryEntry } from '../database/mock-database.models';
import { MockDatabaseService } from '../database/mock-database.service';
import { FirebaseUserService } from './firebase-user.service';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ProfileCategoryService {
  private readonly database = inject(MockDatabaseService);
  private readonly firebaseUsers = inject(FirebaseUserService);
  private readonly injector = inject(EnvironmentInjector);

  private readonly categories = signal<ProfileCategory[]>([]);
  private syncTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = signal(false);

  readonly profileCategories = this.categories.asReadonly();
  readonly isSyncingState = this.isSyncing.asReadonly();

  constructor() {
    effect(() => {
      const user = this.database.currentUser();
      if (user?.profileCategories) {
        this.categories.set([...user.profileCategories]);
      } else {
        this.categories.set([]);
      }
    });
  }

  addCategory(name: string, icon: string, color: string): void {
    const newCategory: ProfileCategory = {
      id: this.generateId(),
      name: name.trim(),
      icon,
      color,
      entries: [],
    };

    this.categories.update((cats) => [...cats, newCategory]);
    this.debouncedSync();
  }

  updateCategory(id: string, updates: Partial<Omit<ProfileCategory, 'id' | 'entries'>>): void {
    this.categories.update((cats) =>
      cats.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat)),
    );
    this.debouncedSync();
  }

  deleteCategory(id: string): void {
    this.categories.update((cats) => cats.filter((cat) => cat.id !== id));
    this.debouncedSync();
  }

  addEntryToCategory(categoryId: string, value: string, emoji?: string): void {
    this.categories.update((cats) =>
      cats.map((cat) => {
        if (cat.id === categoryId) {
          const newEntry: ProfileCategoryEntry = { value: value.trim(), emoji: emoji ?? '' };
          return { ...cat, entries: [...cat.entries, newEntry] };
        }
        return cat;
      }),
    );
    this.debouncedSync();
  }

  removeEntryFromCategory(categoryId: string, entryValue: string): void {
    this.categories.update((cats) =>
      cats.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            entries: cat.entries.filter((e) => e.value !== entryValue),
          };
        }
        return cat;
      }),
    );
    this.debouncedSync();
  }

  reorderCategories(newCategories: ProfileCategory[]): void {
    this.categories.set([...newCategories]);
    this.debouncedSync();
  }

  private debouncedSync(): void {
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
    }

    this.syncTimeoutId = setTimeout(() => {
      this.syncToFirebase();
    }, 500);
  }

  private async syncToFirebase(): Promise<void> {
    const user = this.database.currentUser();
    // Gaeste schreiben nicht nach Firebase (nur temporaer in der Sitzung).
    if (!user || this.database.isGuest()) return;

    this.isSyncing.set(true);
    try {
      await runInInjectionContext(this.injector, () =>
        this.firebaseUsers.upsertCurrentUserProfile({
          uid: user.id,
          email: user.email,
          name: user.name,
          profileCategories: this.categories(),
        }),
      );

      this.database.updateCurrentUserProfile({
        profileCategories: this.categories(),
      });
    } catch (error) {
      console.error('Failed to sync profile categories to Firebase:', error);
    } finally {
      this.isSyncing.set(false);
    }
  }

  private generateId(): string {
    return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
