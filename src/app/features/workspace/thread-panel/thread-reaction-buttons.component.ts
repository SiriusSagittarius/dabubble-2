import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-thread-reaction-buttons',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="message-hover-action-btn"
      aria-label="Mit Haken reagieren"
      (click)="onReaction.emit({ messageId: messageId(), emoji: 'check' })"
    >
      <span class="message-hover-action-emoji">✅</span>
    </button>
    <button
      type="button"
      class="message-hover-action-btn"
      aria-label="Mit Daumen hoch reagieren"
      (click)="onReaction.emit({ messageId: messageId(), emoji: 'thumbs_up' })"
    >
      <span class="message-hover-action-emoji">👍</span>
    </button>
    <button
      type="button"
      class="message-hover-action-btn action-button-emoji"
      aria-label="Weitere Reaktion hinzufuegen"
      (click)="onPickerToggle.emit(messageId())"
    >
      <img src="/assets/add-reaction.png" alt="" class="message-hover-action-icon" />
    </button>
  `,
})
export class ThreadReactionButtonsComponent {
  messageId = input.required<string>();
  onReaction = output<{ messageId: string; emoji: string }>();
  onPickerToggle = output<string>();
}
