import { Component, input } from '@angular/core';

@Component({
  selector: 'app-sidebar-caret-icon',
  standalone: true,
  template: `
    <svg
      [class.channels-caret-icon]="variant() === 'channels'"
      [class.channel-sublist-caret]="variant() === 'sublist'"
      [class.dm-caret-icon]="variant() === 'dm'"
      [class.kontakte-caret-icon]="variant() === 'kontakte'"
      [attr.viewBox]="variant() === 'dm' ? '0 5 30 30' : '0 5 30 30'"
      [attr.width]="variant() === 'sublist' ? '16' : '22'"
      [attr.height]="variant() === 'sublist' ? '16' : '22'"
      aria-hidden="true"
    >
      <path [attr.d]="iconPath()"/>
    </svg>
  `,
})
export class SidebarCaretIconComponent {
  variant = input<'channels' | 'dm' | 'kontakte' | 'sublist'>('channels');

  protected iconPath() {

    const dmPath = 'M18.125 21.1564L14.7812 24.5002C14.2604 25.021 13.6667 25.146 13 24.8752C12.3333 24.6043 12 24.1043 12 23.3752V16.6252C12 15.896 12.3333 15.396 13 15.1252C13.6667 14.8543 14.2604 14.9793 14.7812 15.5002L18.125 18.8439C18.2917 19.0106 18.4112 19.1927 18.4837 19.3902C18.5571 19.5885 18.5937 19.7918 18.5937 20.0002C18.5937 20.2085 18.5571 20.4118 18.4837 20.6102C18.4112 20.8077 18.2917 20.9898 18.125 21.1564Z';
    const otherPath = 'M17.875 20.8752L14.625 24.1252C14.2292 24.521 13.7762 24.6093 13.2662 24.3902C12.7554 24.1718 12.5 23.7814 12.5 23.2189V16.7814C12.5 16.2189 12.7554 15.8285 13.2662 15.6102C13.7762 15.391 14.2292 15.4793 14.625 15.8752L17.875 19.1252C18 19.2502 18.0937 19.3856 18.1562 19.5314C18.2187 19.6773 18.25 19.8335 18.25 20.0002C18.25 20.1668 18.2187 20.3231 18.1562 20.4689C18.0937 20.6148 18 20.7502 17.875 20.8752Z';

    return this.variant() === 'dm' ? dmPath : otherPath;
  }
}
