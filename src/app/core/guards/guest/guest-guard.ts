import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GuestSessionService } from '../../services/auth/guest-session/guest-session';

export const guestGuard: CanActivateFn = (route, state) => {
  const session = inject(GuestSessionService);
  const router = inject(Router);

  // 1. Check if we have a valid invitation session
  if (session.currentInvitationValue) {
    return true;
  }

  // 2. If not, redirect them to the home page
  return router.createUrlTree(['/save-the-date']);
};
