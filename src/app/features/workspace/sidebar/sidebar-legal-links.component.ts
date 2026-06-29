import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar-legal-links',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="sidebar-legal" aria-label="Rechtliches">
      <a class="sidebar-legal-link" routerLink="/info/legal" (click)="opened.emit()">Impressum</a>
      <a class="sidebar-legal-link" routerLink="/info/privacy" (click)="opened.emit()">Datenschutz</a>
    </nav>
  `,
  styleUrl: './sidebar.kontakte.scss',
  styles: [':host { margin-top: auto; }'],
})
export class SidebarLegalLinksComponent {
  @Output() opened = new EventEmitter<void>();
}
