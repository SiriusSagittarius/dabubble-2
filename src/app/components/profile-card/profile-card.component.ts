import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';

import { MockDatabaseService } from '../../database/mock-database.service';
import { MockUser } from '../../database/mock-database.models';
import { ProfileDialogService } from '../../services/profile-dialog.service';

@Component({
  selector: 'app-profile-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-card.component.html',
  styleUrls: ['./profile-card.component.scss', './profile-card.details-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileCardComponent {
  private readonly database = inject(MockDatabaseService);
  private readonly profileDialog = inject(ProfileDialogService);

  protected readonly isEditing = signal(false);
  protected readonly editAvatarImage = signal<string | null>(null);

  protected readonly profileUser = computed(() => {
    const userId = this.profileDialog.profileUserId();
    return userId ? this.database.findUser(userId) : null;
  });

  protected readonly isOpen = computed(() => !!this.profileUser());
  protected readonly isCurrentProfileUser = computed(() => {
    const user = this.profileUser();
    return !!user && user.id === this.database.currentUser()?.id;
  });

  protected readonly editForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const user = this.profileUser();
      if (!user) {
        this.isEditing.set(false);
        this.editForm.reset(
          {
            name: '',
            email: '',
            isActive: false,
          },
          { emitEvent: false },
        );
        return;
      }

      this.editForm.reset(
        {
          name: user.name,
          email: user.email,
          isActive: user.isOnline,
        },
        { emitEvent: false },
      );
      this.isEditing.set(false);
    });
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

    this.editForm.reset(
      {
        name: user.name,
        email: user.email,
        isActive: user.isOnline,
      },
      { emitEvent: false },
    );
    this.editAvatarImage.set(null);
    this.isEditing.set(true);
  }

  protected cancelEditing(): void {
    const user = this.profileUser();
    if (user) {
      this.editForm.reset(
        {
          name: user.name,
          email: user.email,
          isActive: user.isOnline,
        },
        { emitEvent: false },
      );
    }

    this.editAvatarImage.set(null);
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

    const { name, email, isActive } = this.editForm.getRawValue();
    const avatarImage = this.editAvatarImage();
    const updated = this.database.updateCurrentUserProfile({
      name,
      email,
      isOnline: isActive,
      ...(avatarImage ? { avatarImage } : {}),
    });

    if (updated) {
      this.editAvatarImage.set(null);
      this.isEditing.set(false);
    }
  }

  protected messageProfileUser(): void {
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
    return `/assets/${avatarId}.svg`;
  }

  private userAvatarId(user: MockUser | null): number {
    if (!user) {
      return 1;
    }

    if (typeof user.avatarId === 'number') {
      return user.avatarId;
    }

    if (typeof user.avatarId === 'string') {
      const parsed = Number.parseInt(user.avatarId, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    const classMatch = user.avatarClass?.match(/avatar-(\d)/);
    return classMatch ? Number(classMatch[1]) : 1;
  }
}
