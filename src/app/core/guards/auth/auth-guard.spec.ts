import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { User } from '@angular/fire/auth';
import { authGuard } from './auth-guard';
import { AuthService } from '../../services/auth/auth';

describe('authGuard', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let currentUser: User | null;
  let authService: { currentUser: () => User | null };

  function runGuard(): boolean {
    return TestBed.runInInjectionContext(
      () => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as boolean;
  }

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    currentUser = null;
    authService = { currentUser: () => currentUser };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authService }
      ]
    });
  });

  it('should allow activation when a user is signed in', () => {
    currentUser = { uid: 'user-1' } as User;
    expect(runGuard()).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should deny activation and redirect to /login when no user is signed in', () => {
    currentUser = null;
    expect(runGuard()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});