import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ProfileCategory } from '../../../core/database/mock-database.models';
import { DesignSystemService } from '../../../core/services/design-system.service';
import { AddCategoryModalComponent } from './add-category-modal.component';

@Component({
  selector: 'app-profile-categories-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AddCategoryModalComponent],
  templateUrl: './profile-categories-edit.component.html',
  styleUrl: './profile-categories-edit.component.scss',
})
export class ProfileCategoriesEditComponent {
  private readonly designSystem = inject(DesignSystemService);

  categories = input<ProfileCategory[]>([]);
  categoriesChange = output<ProfileCategory[]>();
  onAddCategory = output<{ name: string; icon: string; color: string }>();

  protected showAddModal = false;
  protected localCategories: ProfileCategory[] = [];
  protected newEntryValues: Map<string, string> = new Map();

  ngOnInit(): void {
    this.localCategories = [...this.categories()];
  }

  protected openAddModal(): void {
    this.showAddModal = true;
  }

  protected closeAddModal(): void {
    this.showAddModal = false;
  }

  protected onNewCategoryCreated(data: { name: string; icon: string; color: string }): void {
    this.onAddCategory.emit(data);
    this.showAddModal = false;

    setTimeout(() => {
      this.localCategories = [...this.categories()];
    }, 100);
  }

  protected deleteCategory(id: string): void {
    this.localCategories = this.localCategories.filter((cat) => cat.id !== id);
    this.categoriesChange.emit(this.localCategories);
  }

  protected deleteEntry(categoryId: string, entryValue: string): void {
    this.localCategories = this.localCategories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          entries: cat.entries.filter((e) => e.value !== entryValue),
        };
      }
      return cat;
    });
    this.categoriesChange.emit(this.localCategories);
  }

  protected getNewEntryValue(categoryId: string): string {
    return this.newEntryValues.get(categoryId) || '';
  }

  protected setNewEntryValue(categoryId: string, value: string | Event): void {
    let actualValue = '';
    if (typeof value === 'string') {
      actualValue = value;
    } else if (value instanceof Event) {
      actualValue = (value.target as HTMLInputElement).value;
    }
    this.newEntryValues.set(categoryId, actualValue);
  }

  protected addEntry(categoryId: string, emoji?: string): void {
    const value = (this.newEntryValues.get(categoryId) || '').trim();
    if (!value) return;

    this.localCategories = this.localCategories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          entries: [...cat.entries, { value, emoji: emoji || '' }],
        };
      }
      return cat;
    });

    this.newEntryValues.delete(categoryId);
    this.categoriesChange.emit(this.localCategories);
  }

  protected getGradientCSS(colorId: string): string {
    return this.designSystem.getGradientCSS(colorId);
  }

  protected getCommonEmojis(): string[] {
    return this.designSystem.getCommonEmojis();
  }
}
