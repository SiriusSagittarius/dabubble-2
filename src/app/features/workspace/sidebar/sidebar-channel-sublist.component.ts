import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockChannel } from '../../../core/database/mock-database.models';
import { MockDatabaseService } from '../../../core/database/mock-database.service';

/**
 * Wiederverwendbare Channel-Unterliste mit aufklappbarem Kopf (Caret + Label)
 * und einer Liste von Channel-Eintraegen. Wird im Channels-Reiter der Sidebar
 * fuer die Kategorien "Abonnierte" und "Eigene" (je oeffentlich/privat) genutzt,
 * damit das Haupt-Template kompakt bleibt (400-Zeilen-Regel) und der Markup
 * nicht mehrfach dupliziert wird.
 */
@Component({
  selector: 'app-sidebar-channel-sublist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-channel-sublist.component.html',
  styleUrls: ['./sidebar.channels.scss', './sidebar.channels-2.scss'],
})
export class SidebarChannelSublistComponent {
  protected readonly database = inject(MockDatabaseService);

  /** Anzeigename der Unterkategorie, z. B. "Öffentlich" oder "Privat". */
  label = input.required<string>();
  /** Die anzuzeigenden Channels. */
  channels = input.required<MockChannel[]>();
  /** Ob die Unterliste aufgeklappt ist. */
  expanded = input.required<boolean>();
  /** Text, wenn die Liste leer ist (optional). */
  emptyHint = input<string>('');

  /** Kopf wurde geklickt (auf-/zuklappen). */
  toggle = output<void>();
  /** Ein Channel wurde ausgewaehlt. */
  selectChannel = output<string>();

  protected isActive(channelId: string): boolean {
    return this.database.selectedChannelId() === channelId;
  }
}
