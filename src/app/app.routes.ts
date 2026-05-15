import { Routes } from '@angular/router';
import { SaveTheDate } from './shared/components/save-the-date/save-the-date';
import { authGuard } from './core/guards/auth/auth-guard';
import { MainLayout } from './core/layout/main-layout/main-layout';
import { guestGuard } from './core/guards/guest/guest-guard';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/login/login').then(m => m.Login)
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/admin/admin').then(m => m.Admin),
        canActivate: [authGuard]
      },
      // SaveTheDate stays eager — it's the default landing route, so its
      // bundle is fetched on first paint anyway. Lazy-loading it would
      // only add a microsecond of redirect overhead with no payload win.
      { path: 'save-the-date', component: SaveTheDate },
      {
        path: 'invite/:code',
        loadComponent: () =>
          import('./shared/components/invitation/invitation').then(m => m.Invitation)
      },
      {
        path: 'rsvp',
        loadComponent: () =>
          import('./shared/components/rsvp/rsvp').then(m => m.Rsvp),
        canActivate: [guestGuard]
      },
      {
        path: 'travel-info',
        loadComponent: () =>
          import('./shared/components/travel-info/travel-info').then(m => m.TravelInfo)
      },
      {
        path: 'local-attractions',
        loadComponent: () =>
          import('./shared/components/local-attractions/local-attractions').then(m => m.LocalAttractions)
      },
      {
        path: 'photo-share',
        loadComponent: () =>
          import('./shared/components/photo-share/photo-share').then(m => m.PhotoShare)
      },
      { path: '', redirectTo: '/save-the-date', pathMatch: 'full' },
      { path: '**', redirectTo: '/save-the-date' }
    ]
  }
];