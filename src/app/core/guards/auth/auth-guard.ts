import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1), // Take the first value emitted and complete
    map(user => {
      // Check if the user object exists
      if (user) {
        return true; // User is logged in, allow access
      } else {
        // User is not logged in, redirect to the login page
        router.navigate(['/login']);
        return false;
      }
    })
  );
};
