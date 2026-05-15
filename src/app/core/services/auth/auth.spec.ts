import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { AuthService } from './auth';

/**
 * AuthService is a thin wrapper over Firebase modular-SDK functions
 * (signInWithEmailAndPassword, signOut, authState). Those are tree-shaken
 * module imports and cannot be reliably spied on without restructuring the
 * service. The tests below cover what is unit-testable: construction, the
 * shape of the public API, and that currentUser is a callable signal.
 *
 * Behavioural coverage (login/logout side effects, auth-state propagation)
 * belongs in integration tests against the Firebase Auth emulator.
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

  it('should expose currentUser as a callable signal', () => {
    expect(typeof service.currentUser).toBe('function');
  });

  it('should default currentUser to null before the auth state resolves', () => {
    expect(service.currentUser()).toBeNull();
  });

  it('should expose login() as a function', () => {
    expect(typeof service.login).toBe('function');
  });

  it('should expose logout() as a function', () => {
    expect(typeof service.logout).toBe('function');
  });

  it('should not throw when constructed with an incomplete Auth mock', () => {
    expect(() => TestBed.inject(AuthService)).not.toThrow();
  });
});