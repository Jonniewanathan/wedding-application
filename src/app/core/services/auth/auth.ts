import { Injectable, Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Auth,
  User,
  authState,
  signInWithEmailAndPassword,
  signOut
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);

  /**
   * Signal mirror of the Firebase auth state. Null while auth is still
   * initialising; the User object once a session is restored or signed in.
   *
   * For synchronous decisions (e.g. route guards) read auth.currentUser
   * directly after `await auth.authStateReady()` — the signal updates
   * asynchronously when authState emits, which lags signInWithEmailAndPassword
   * resolving.
   */
  readonly currentUser: Signal<User | null> = toSignal(authState(this.auth), {
    initialValue: null
  });

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    return signOut(this.auth);
  }
}