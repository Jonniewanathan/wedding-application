import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  // Subscribe to authState and take the first emission. This matches the
  // pattern the guard had before the signal migration and avoids any race
  // between toSignal updates and the moment the guard runs after login.
  return authState(inject(Auth)).pipe(
    take(1),
    map(user => {
      if (user) {
        return true;
      }
      router.navigate(['/login']);
      return false;
    })
  );
};