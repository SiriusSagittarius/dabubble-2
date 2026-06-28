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
import { MockUser } from '../../../core/database/mock-database.models';
import { ProfileDialogService } from '../../../core/services/profile-dialog.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { FirebaseUserService } from '../../../core/services/firebase-user.service';

export interface LinkTemplate {
  key: string;
  label: string;
  placeholder: string;
  svgIcon: string;
  buildHref: (value: string) => string;
}

const LINK_TEMPLATES: LinkTemplate[] = [
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/deinprofil',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M22 12c0-5.522-4.478-10-10-10S2 6.478 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.988H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33V21.878C18.343 21.128 22 16.991 22 12z"/></svg>`,
    buildHref: (v) => v,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/deinname',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.265.069 1.645.069 4.849s-.011 3.584-.069 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.265.058-1.645.069-4.85.069s-3.584-.011-4.849-.069c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.849c.062-1.366.334-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.053.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.085 1.856.6 3.698 1.942 5.038C3.355 23.327 5.197 23.843 7.053 23.928 8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.856-.085 3.698-.6 5.038-1.942 1.341-1.34 1.857-3.182 1.942-5.038C23.986 15.668 24 15.259 24 12s-.014-3.668-.072-4.947c-.085-1.857-.6-3.699-1.942-5.039C21.645.673 19.803.157 17.947.072 16.668.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`,
    buildHref: (v) => v,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/deinprofil',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    buildHref: (v) => v,
  },
  {
    key: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@deinkanal',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    buildHref: (v) => v,
  },
  {
    key: 'homepage',
    label: 'Homepage',
    placeholder: 'https://deine-website.de',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 17.93V18a1 1 0 0 0-1-1H8a3 3 0 0 1-3-3v-1l5 5v-.07zM18.93 13H18a1 1 0 0 0-1 1v2.93A8.003 8.003 0 0 1 13 19.93V18a3 3 0 0 0-3-3H8v-2a1 1 0 0 1 1-1h2a1 1 0 0 0 1-1V9a1 1 0 0 1 1-1h2.93A8.003 8.003 0 0 1 18.93 13zM17 8.07V9a3 3 0 0 1-3 3h-1V9a3 3 0 0 0-3-3H8.07A8.003 8.003 0 0 1 17 8.07z"/></svg>`,
    buildHref: (v) => v,
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    placeholder: 'https://portfolio.deine-domain.de',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 6h-2.18c.07-.44.18-.86.18-1.3C18 2.55 15.45 1 13.5 1c-1.8 0-2.96.88-3.96 2.34L12 6H8.18C7.07 4.8 5.62 4 4 4c-2.21 0-4 1.79-4 4 0 1.62.96 3.01 2.35 3.67L4 21h16l1.65-9.33C23.04 11.01 24 9.62 24 8c0-2.21-1.79-4-4-4zM13.5 3c1.07 0 2.5.87 2.5 1.7 0 .44-.11.85-.18 1.3H10.8c.64-1.56 1.57-3 2.7-3zM4 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm14.5 9H5.5l-1.24-7H19.74L18.5 19zM20 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>`,
    buildHref: (v) => v,
  },
  {
    key: 'github',
    label: 'GitHub',
    placeholder: 'https://github.com/deinname',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
    buildHref: (v) => v,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    placeholder: '+49 123 456789',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`,
    buildHref: (v) => {
      const digits = v.replace(/\D/g, '');
      return `https://wa.me/${digits}`;
    },
  },
  {
    key: 'phone',
    label: 'Telefon',
    placeholder: '+49 123 456789',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`,
    buildHref: (v) => `tel:${v.replace(/\s/g, '')}`,
  },
  {
    key: 'email',
    label: 'E-Mail (öffentlich)',
    placeholder: 'kontakt@beispiel.de',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
    buildHref: (v) => `mailto:${v}`,
  },
];

@Component({
  selector: 'app-profile-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  protected readonly isEditing = signal(false);
  protected readonly editAvatarImage = signal<string | null>(null);

  protected readonly editLinkValues = signal<Map<string, string>>(new Map());

  protected readonly linkTemplates: LinkTemplate[] = LINK_TEMPLATES;

  protected readonly profileUser = computed(() => {
    const userId = this.profileDialog.profileUserId();
    return userId ? this.database.findUser(userId) : null;
  });

  protected readonly isOpen = computed(() => !!this.profileUser());

  protected readonly isCurrentProfileUser = computed(() => {
    const user = this.profileUser();
    return !!user && user.id === this.database.currentUser()?.id;
  });

  protected readonly profileLinks = computed(() => {
    const user = this.profileUser();
    const rawLinks = user?.links ?? [];
    return LINK_TEMPLATES.flatMap((tpl) => {
      const stored = rawLinks.find((l) => l.label === tpl.key);
      if (!stored?.url?.trim()) return [];
      return [{ key: tpl.key, label: tpl.label, svgIcon: tpl.svgIcon, href: tpl.buildHref(stored.url.trim()) }];
    });
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
    effect(() => {
      const userId = this.profileDialog.profileUserId();
      untracked(() => this.resetState(userId ? this.database.findUser(userId) : null));
    });
  }

  private resetState(user: MockUser | null): void {
    this.isEditing.set(false);
    this.editAvatarImage.set(null);
    this.fillForm(user);
    this.fillLinkValues(user);
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

  private fillLinkValues(user: MockUser | null): void {
    const map = new Map<string, string>();
    const stored = user?.links ?? [];
    for (const tpl of LINK_TEMPLATES) {
      const found = stored.find((l) => l.label === tpl.key);
      map.set(tpl.key, found?.url ?? '');
    }
    this.editLinkValues.set(map);
  }

  protected getLinkValue(key: string): string {
    return this.editLinkValues().get(key) ?? '';
  }

  protected setLinkValue(key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const map = new Map(this.editLinkValues());
    map.set(key, value);
    this.editLinkValues.set(map);
  }

  protected closeCard(): void {
    this.profileDialog.close();
    this.isEditing.set(false);
  }

  protected startEditing(): void {
    if (!this.isCurrentProfileUser()) return;
    const user = this.profileUser();
    if (!user) return;
    this.fillForm(user);
    this.fillLinkValues(user);
    this.editAvatarImage.set(null);
    this.isEditing.set(true);
  }

  protected cancelEditing(): void {
    this.fillForm(this.profileUser());
    this.fillLinkValues(this.profileUser());
    this.editAvatarImage.set(null);
    this.isEditing.set(false);
  }

  protected onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.compressImage(file).then((dataUrl) => {
      this.editAvatarImage.set(dataUrl);
    });
    input.value = '';
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 800;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
            else { width = Math.round((width * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  protected saveChanges(): void {
    if (!this.isCurrentProfileUser()) return;
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) return;

    const { name, email, isActive, isPublic, bio } = this.editForm.getRawValue();
    const avatarImage = this.editAvatarImage();

    const links = LINK_TEMPLATES.flatMap((tpl) => {
      const v = (this.editLinkValues().get(tpl.key) ?? '').trim();
      if (!v) return [];
      return [{ label: tpl.key, url: v }];
    });

    const updated = this.database.updateCurrentUserProfile({
      name,
      email,
      isOnline: isActive,
      isPublic,
      bio: bio.trim(),
      links,
      ...(avatarImage ? { avatarImage } : {}),
    });

    if (updated) {

      if (!this.database.isGuest()) {
        void runInInjectionContext(this.injector, () =>
          this.firebaseUsers.upsertCurrentUserProfile({
            uid: updated.id,
            email: updated.email,
            name: updated.name,
            bio: updated.bio ?? null,
            avatarImage: updated.avatarImage ?? null,
            avatarId: typeof updated.avatarId === 'number' ? updated.avatarId : null,
            links,
          }),
        );
      }
      this.editAvatarImage.set(null);
      this.isEditing.set(false);
    }
  }

  protected messageProfileUser(): void {
    const user = this.profileUser();
    if (user) this.uiState.openDirectMessage(user.id);
    this.closeCard();
  }

  protected profileAvatarSrc(): string {
    if (this.isEditing() && this.editAvatarImage()) return this.editAvatarImage()!;
    const user = this.profileUser();
    if (user?.avatarImage) return user.avatarImage;
    return `/assets/icons/${this.userAvatarId(user)}.svg`;
  }

  private userAvatarId(user: MockUser | null): number {
    if (!user) return 1;
    if (typeof user.avatarId === 'number' && user.avatarId >= 1 && user.avatarId <= 6) return user.avatarId;
    const m = user.avatarClass?.match(/avatar-(\d+)/);
    if (m) { const id = Number(m[1]); if (id >= 1 && id <= 6) return id; }
    return 1;
  }
}
