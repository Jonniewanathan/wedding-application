import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth';

export const authGuard: CanActivateFn = () => {
  const user = inject(AuthService).currentUser();
  if (user) {
    return true;
  }
  inject(Router).navigate(['/login']);
  return false;
};