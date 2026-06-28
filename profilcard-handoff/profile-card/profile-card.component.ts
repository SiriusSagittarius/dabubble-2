import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
  untracked,
} from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';

import { MockDatabaseService } from '../../../core/database/mock-database.service';
import { MockUser, ProfileCategory } from '../../../core/database/mock-database.models';
import { ProfileDialogService } from '../../../core/services/profile-dialog.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { FirebaseUserService } from '../../../core/services/firebase-user.service';
import { DesignSystemService } from '../../../core/services/design-system.service';
import { ProfileCategoryService } from '../../../core/services/profile-category.service';
import { ProfileCategoriesDisplayComponent } from './profile-categories-display.component';
import { ProfileCategoriesEditComponent } from './profile-categories-edit.component';

@Component({
  selector: 'app-profile-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProfileCategoriesDisplayComponent, ProfileCategoriesEditComponent],
  templateUrl: './profile-card.component.html',
  styleUrls: [
    './profile-card.component.scss',
    './profile-card.details-form.scss',
    './profile-card.edit-form.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileCardComponent {
  private readonly database = inject(MockDatabaseService);
  private readonly profileDialog = inject(ProfileDialogService);
  private readonly uiState = inject(UiStateService);
  private readonly firebaseUsers = inject(FirebaseUserService);
  private readonly injector = inject(EnvironmentInjector);
  protected readonly designSystem = inject(DesignSystemService);
  private readonly categoryService = inject(ProfileCategoryService);

  protected readonly isEditing = signal(false);
  protected readonly editAvatarImage = signal<string | null>(null);
  protected readonly showCategoryEdit = signal(false);

  protected readonly profileUser = computed(() => {
    const userId = this.profileDialog.profileUserId();
    return userId ? this.database.findUser(userId) : null;
  });

  protected readonly isOpen = computed(() => !!this.profileUser());
  protected readonly isCurrentProfileUser = computed(() => {
    const user = this.profileUser();
    return !!user && user.id === this.database.currentUser()?.id;
  });

  protected readonly profileCategories = computed(() => {
    return this.profileUser()?.profileCategories ?? [];
  });

  protected readonly bioMaxLength = 280;

  protected readonly editForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
    isPublic: new FormControl(true, { nonNullable: true }),
    bio: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(this.bioMaxLength)],
    }),
  });

  constructor() {
    // WICHTIG: nur auf die ID des geoeffneten Profils reagieren (Dialog auf/zu/
    // Wechsel) – NICHT auf den kompletten Nutzer. Sonst feuert dieser Effect bei
    // jeder Hintergrund-Aktualisierung (Praesenz-Heartbeats, Firestore-Snapshots,
    // eigener Speichervorgang) und setzt isEditing/das Formular zurueck, wodurch
    // der Bearbeiten-Modus staendig "zurueckspringt".
    effect(() => {
      const userId = this.profileDialog.profileUserId();
      untracked(() => this.resetState(userId ? this.database.findUser(userId) : null));
    });
  }

  /** Setzt Edit-Zustand zurueck und befuellt das Formular aus dem Nutzer-Snapshot. */
  private resetState(user: MockUser | null): void {
    this.isEditing.set(false);
    this.showCategoryEdit.set(false);
    this.editAvatarImage.set(null);
    this.fillForm(user);
  }

  private fillForm(user: MockUser | null): void {
    this.editForm.reset(
      {
        name: user?.name ?? '',
        email: user?.email ?? '',
        isActive: user?.isOnline ?? false,
        isPublic: user?.isPublic ?? true,
        bio: user?.bio ?? '',
      },
      { emitEvent: false },
    );
  }

  protected closeCard(): void {
    this.profileDialog.close();
    this.isEditing.set(false);
  }

  protected startEditing(): void {
    if (!this.isCurrentProfileUser()) {
      return;
    }

    const user = this.profileUser();
    if (!user) {
      return;
    }

    this.fillForm(user);
    this.editAvatarImage.set(null);
    this.isEditing.set(true);
  }

  protected cancelEditing(): void {
    this.fillForm(this.profileUser());
    this.editAvatarImage.set(null);
    this.showCategoryEdit.set(false);
    this.isEditing.set(false);
  }

  protected onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.editAvatarImage.set(reader.result as string);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  protected saveChanges(): void {
    if (!this.isCurrentProfileUser()) {
      return;
    }

    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) {
      return;
    }

    const { name, email, isActive, isPublic, bio } = this.editForm.getRawValue();
    const avatarImage = this.editAvatarImage();
    const updated = this.database.updateCurrentUserProfile({
      name,
      email,
      isOnline: isActive,
      isPublic,
      bio: bio.trim(),
      ...(avatarImage ? { avatarImage } : {}),
    });

    if (updated) {
      // Aktuellen Profilstand (inkl. Avatar, Bio) nach Firestore spiegeln, damit er
      // auf allen Geraeten und fuer andere Nutzer gleich angezeigt wird.
      void runInInjectionContext(this.injector, () =>
        this.firebaseUsers.upsertCurrentUserProfile({
          uid: updated.id,
          email: updated.email,
          name: updated.name,
          bio: updated.bio ?? null,
          avatarImage: updated.avatarImage ?? null,
          avatarId: typeof updated.avatarId === 'number' ? updated.avatarId : null,
        }),
      );

      this.editAvatarImage.set(null);
      this.isEditing.set(false);
    }
  }

  protected messageProfileUser(): void {
    const user = this.profileUser();
    if (user) {
      this.uiState.openDirectMessage(user.id);
    }
    this.closeCard();
  }

  protected profileAvatarSrc(): string {
    if (this.isEditing() && this.editAvatarImage()) {
      return this.editAvatarImage()!;
    }

    const user = this.profileUser();
    if (user?.avatarImage) {
      return user.avatarImage;
    }

    const avatarId = this.userAvatarId(user);
    return `/assets/icons/${avatarId}.svg`;
  }

  private userAvatarId(user: MockUser | null): number {
    if (!user) return 1;
    if (typeof user.avatarId === 'number' && user.avatarId >= 1 && user.avatarId <= 6) return user.avatarId;
    const classMatch = user.avatarClass?.match(/avatar-(\d+)/);
    if (classMatch) {
      const id = Number(classMatch[1]);
      if (id >= 1 && id <= 6) return id;
    }
    return 1;
  }

  protected toggleCategoryEdit(): void {
    if (!this.isCurrentProfileUser()) {
      return;
    }
    this.showCategoryEdit.update((v) => !v);
  }

  protected saveCategoryChanges(categories: ProfileCategory[]): void {
    if (!this.isCurrentProfileUser()) {
      return;
    }

    const user = this.profileUser();
    if (!user) {
      return;
    }

    this.database.updateCurrentUserProfile({
      profileCategories: categories,
    });

    void runInInjectionContext(this.injector, () =>
      this.firebaseUsers.upsertCurrentUserProfile({
        uid: user.id,
        email: user.email,
        name: user.name,
        profileCategories: categories,
      }),
    );

    this.showCategoryEdit.set(false);
  }

  protected onAddCategory(data: { name: string; icon: string; color: string }): void {
    if (!this.isCurrentProfileUser()) {
      return;
    }

    this.categoryService.addCategory(data.name, data.icon, data.color);
  }
}
