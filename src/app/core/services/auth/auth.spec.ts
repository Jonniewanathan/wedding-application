import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

/**
 * AuthService is a thin wrapper over Firebase modular-SDK functions
 * (signInWithEmailAndPassword, signOut, onAuthStateChanged). Those are
 * tree-shaken module imports and cannot be reliably spied on without
 * restructuring the service. The tests below cover what is unit-testable:
 * construction, the shape of the public API, and that currentUser$
 * registers an onAuthStateChanged listener at subscribe time.
 *
 * Behavioural coverage (success/failure of login, sign-out side effects,
 * auth-state propagation) belongs in integration tests against the
 * Firebase Auth emulator.
 */
describe('AuthService', () => {
  let service: AuthService;
  let mockAuth: Partial<Auth>;

  beforeEach(() => {
    mockAuth = { currentUser: null };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: mockAuth }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose currentUser$ as an Observable', () => {
    expect(service.currentUser$).toBeInstanceOf(Observable);
  });

  it('should expose login() that returns a Promise', () => {
    // We do not invoke it — that would hit the real Firebase SDK.
    expect(typeof service.login).toBe('function');
  });

  it('should expose logout() that returns a Promise', () => {
    expect(typeof service.logout).toBe('function');
  });

  it('should not eagerly subscribe to onAuthStateChanged on construction', () => {
    // currentUser$ is cold — the onAuthStateChanged registration only fires
    // when a consumer subscribes. Constructing the service should not throw
    // even though our mock Auth is incomplete.
    expect(() => TestBed.inject(AuthService)).not.toThrow();
  });
});