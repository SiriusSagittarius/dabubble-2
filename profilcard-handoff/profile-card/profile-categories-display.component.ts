import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileCategory } from '../../../core/database/mock-database.models';
import { DesignSystemService } from '../../../core/services/design-system.service';

@Component({
  selector: 'app-profile-categories-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-categories-display.component.html',
  styleUrl: './profile-categories-display.component.scss',
})
export class ProfileCategoriesDisplayComponent {
  private readonly designSystem = inject(DesignSystemService);
  categories = input<ProfileCategory[]>([]);

  protected getGradientCSS(colorId: string): string {
    return this.designSystem.getGradientCSS(colorId);
  }
}
