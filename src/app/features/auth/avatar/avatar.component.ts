import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface AvatarComponent {
  id: number;
  name: string;
  color: string;
  rawSvg: string;
  svgMarkup?: SafeHtml;
}

@Component({
  selector: 'app-avatar-selector',
  standalone: true,
  imports: [],
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
})
export class AvatarSelectorComponent implements OnInit {

  avatars: AvatarComponent[] = [
    {
      id: 1,
      name: 'Amelie Becker',
      color: '#444DF2',
      rawSvg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#1B1464" opacity="0.2"/><path d="M30 75C30 65 40 60 50 60C60 60 70 65 70 75" stroke="white" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="40" r="15" fill="white"/></svg>`
    },
    {
      id: 2,
      name: 'Lukas Meier',
      color: '#ADB0D9',
      rawSvg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#1B1464" opacity="0.2"/><path d="M30 75C30 65 40 60 50 60C60 60 70 65 70 75" stroke="white" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="40" r="15" fill="white"/></svg>`
    },
    {
      id: 3,
      name: 'Frederik Beck',
      color: '#ADB0D9',
      rawSvg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#1B1464" opacity="0.2"/><path d="M30 75C30 65 40 60 50 60C60 60 70 65 70 75" stroke="white" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="40" r="15" fill="white"/></svg>`
    },
    {
      id: 4,
      name: 'Markus Schmid',
      color: '#797EF3',
      rawSvg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#1B1464" opacity="0.2"/><path d="M30 75C30 65 40 60 50 60C60 60 70 65 70 75" stroke="white" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="40" r="15" fill="white"/></svg>`
    },
    {
      id: 5,
      name: 'Sarah Fischer',
      color: '#797EF3',
      rawSvg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#1B1464" opacity="0.2"/><path d="M30 75C30 65 40 60 50 60C60 60 70 65 70 75" stroke="white" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="40" r="15" fill="white"/></svg>`
    },
    {
      id: 6,
      name: 'Jonas Weber',
      color: '#444DF2',
      rawSvg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#1B1464" opacity="0.2"/><path d="M30 75C30 65 40 60 50 60C60 60 70 65 70 75" stroke="white" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="40" r="15" fill="white"/></svg>`
    }
  ];

  selectedAvatar!: AvatarComponent;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {

    this.avatars = this.avatars.map(avatar => ({
      ...avatar,
      svgMarkup: this.sanitizer.bypassSecurityTrustHtml(avatar.rawSvg)
    }));

    this.selectedAvatar = this.avatars.find(a => a.id === 3) || this.avatars[0];
  }

  selectAvatar(avatar: AvatarComponent): void {
    this.selectedAvatar = avatar;
  }

  onBack(): void {
    console.log('Zurück-Button geklickt');
  }

  onNext(): void {
    console.log('Ausgewählter Avatar:', this.selectedAvatar);
    alert(`Weiter mit Avatar: ${this.selectedAvatar.name}`);
  }
}
