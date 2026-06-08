import { Routes } from '@angular/router';

import { Home } from './components/home/home.component';
import { AvatarSelectorComponent } from './components/avatar/avatar.component';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { AuthShell } from './components/auth-shell/auth-shell.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'home', component: Home },
  { path: 'avatar', component: AvatarSelectorComponent },
  {
    path: '',
    component: AuthShell,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'signup', component: SignupComponent },
      { path: 'reset', loadComponent: () => import('./components/reset/reset.component').then((m) => m.ResetComponent) },
    ],
  },
  { path: 'info', redirectTo: 'info/legal', pathMatch: 'full' },
  { path: 'info/:view', loadComponent: () => import('./components/info/info.component').then((m) => m.InfoComponent) },
];
