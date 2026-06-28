import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { DesignSystemService } from '../../../core/services/design-system.service';

@Component({
  selector: 'app-profile-categories-add-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-category-modal.component.html',
  styleUrl: './add-category-modal.component.scss',
})
export class AddCategoryModalComponent {
  private readonly designSystem = inject(DesignSystemService);

  isOpen = input(false);
  close = output<void>();
  categoryCreated = output<{ name: string; icon: string; color: string }>();

  protected showEmojiPicker = signal(false);
  protected selectedEmoji = signal('💻');

  protected form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(30)]),
    color: new FormControl('gradient-sunset', { nonNullable: true, validators: [Validators.required] }),
  });

  protected getGradients() {
    return this.designSystem.getGradients();
  }

  protected getCommonEmojis(): string[] {
    return this.designSystem.getAllEmojis();
  }

  protected onEmojiSelect(emoji: string): void {
    this.selectedEmoji.set(emoji);
    this.showEmojiPicker.set(false);
  }

  protected onSubmit(): void {
    if (!this.form.valid) {
      return;
    }

    const { name, color } = this.form.getRawValue();
    this.categoryCreated.emit({
      name: name!,
      icon: this.selectedEmoji(),
      color: color!,
    });

    this.form.reset({ color: 'gradient-sunset' });
    this.selectedEmoji.set('💻');
  }

  protected onClose(): void {
    this.close.emit();
    this.form.reset({ color: 'gradient-sunset' });
    this.selectedEmoji.set('💻');
    this.showEmojiPicker.set(false);
  }

  protected getGradientCSS(colorId: string): string {
    return this.designSystem.getGradientCSS(colorId);
  }
}
