import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

type InfoView = 'legal' | 'privacy';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [],
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

 active: InfoView = 'legal';

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const view = params.get('view');
      this.active = this.isInfoView(view) ? view : 'legal';
    });
  }

  wechsleAnsicht(ansicht: InfoView) {
    this.active = ansicht;
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/login']);
  }

  private isInfoView(view: string | null): view is InfoView {
    return view === 'legal' || view === 'privacy';
  }
}
