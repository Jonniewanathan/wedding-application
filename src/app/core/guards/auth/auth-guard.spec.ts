import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { Auth, User } from '@angular/fire/auth';
import { firstValueFrom, isObservable, Observable } from 'rxjs';
import { authGuard } from './auth-guard';

/**
 * authGuard subscribes to authState(auth) and takes the first emission.
 * The tests mock the Auth token; the authState() module function reads
 * from it via Firebase's onAuthStateChanged under the hood. To exercise
 * the guard in isolation we provide an Auth mock whose onAuthStateChanged
 * synchronously invokes the listener with our fixture user.
 */
describe('authGuard', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let mockAuth: { onAuthStateChanged: (cb: (user: User | null) => void) => () => void };
  let currentUser: User | null;

  function runGuard(): Promise<boolean> {
    return TestBed.runInInjectionContext(() => {
      const result = authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot);
      return isObservable(result)
        ? firstValueFrom(result as Observable<boolean>)
        : Promise.resolve(result as boolean);
    });
  }

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    currentUser = null;
    mockAuth = {
      onAuthStateChanged: (cb) => {
        // Synchronous initial emission matches Firebase's behaviour when
        // the auth state has already settled.
        cb(currentUser);
        return () => {};
      }
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: Auth, useValue: mockAuth }
      ]
    });
  });

  it('should allow activation when a user is signed in', async () => {
    currentUser = { uid: 'user-1' } as User;
    await expectAsync(runGuard()).toBeResolvedTo(true);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should deny activation and redirect to /login when no user is signed in', async () => {
    currentUser = null;
    await expectAsync(runGuard()).toBeResolvedTo(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});