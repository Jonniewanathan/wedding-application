import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { of } from 'rxjs';
import { User } from '@angular/fire/auth';
import { firstValueFrom, isObservable, Observable } from 'rxjs';
import { authGuard } from './auth-guard';
import { AuthService } from '../../services/auth/auth';

describe('authGuard', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let authService: { currentUser$: Observable<User | null> };

  function runGuard(): Promise<boolean> {
    return TestBed.runInInjectionContext(() => {
      const result = authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot);
      return isObservable(result) ? firstValueFrom(result as Observable<boolean>) : Promise.resolve(result as boolean);
    });
  }

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    authService = { currentUser$: of(null) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authService }
      ]
    });
  });

  it('should allow activation when a user is signed in', async () => {
    authService.currentUser$ = of({ uid: 'user-1' } as User);
    const result = await runGuard();
    expect(result).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should deny activation and redirect to /login when no user is signed in', async () => {
    authService.currentUser$ = of(null);
    const result = await runGuard();
    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});