import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);

  // Observable to track the current user's authentication state
  public readonly currentUser$: Observable<User | null>;

  constructor() {
    this.currentUser$ = new Observable(subscriber => {
      // onAuthStateChanged returns an unsubscribe function
      const unsubscribe = onAuthStateChanged(this.auth, user => {
        subscriber.next(user);
      });
      // This will be called when the observable is unsubscribed
      return unsubscribe;
    });
  }

  // Login method
  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  // Logout method
  logout() {
    return signOut(this.auth);
  }
}
