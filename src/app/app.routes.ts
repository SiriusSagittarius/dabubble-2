import { Routes } from '@angular/router';

import { Home } from './features/workspace/home/home.component';
import { AvatarSelectorComponent } from './features/auth/avatar/avatar.component';
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { AuthShell } from './features/auth/auth-shell/auth-shell.component';

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
      { path: 'reset', loadComponent: () => import('./features/auth/reset/reset.component').then((m) => m.ResetComponent) },
    ],
  },
  { path: 'info', redirectTo: 'info/legal', pathMatch: 'full' },
  { path: 'info/:view', loadComponent: () => import('./features/info/info/info.component').then((m) => m.InfoComponent) },
];
