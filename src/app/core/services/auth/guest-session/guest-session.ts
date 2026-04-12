import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Invitation } from '../../../../shared/models/invitation.model';

@Injectable({
  providedIn: 'root'
})
export class GuestSessionService {
  // Holds the current invitation data
  private invitationSubject = new BehaviorSubject<Invitation | null>(null);
  public invitation$ = this.invitationSubject.asObservable();

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    const stored = localStorage.getItem('wedding_invitation_code');

    if (stored) {
      try {
        // If it's a valid JSON string (our Invitation object)
        if (stored.startsWith('{') || stored.startsWith('[')) {
            const parsed = JSON.parse(stored);
            this.invitationSubject.next(parsed);
        } else {
             // If someone accidentally saved just the code string, we can't fully restore the session
             // without fetching from Firestore again. We will just clear it.
             console.warn('Found string instead of object in wedding_invitation_code');
             this.logout();
        }
      } catch (e) {
        console.error('Failed to parse wedding_invitation_code', e);
        this.logout();
      }
    } else {
        // Fallback for old key 'guest_session' to ensure seamless transition
        const storedOld = localStorage.getItem('guest_session');
        if(storedOld) {
            try {
                const parsed = JSON.parse(storedOld);
                this.invitationSubject.next(parsed);
                // Migrate to new key
                localStorage.setItem('wedding_invitation_code', storedOld);
                localStorage.removeItem('guest_session');
            } catch (e) {
                console.error('Failed to parse guest_session', e);
                this.logout();
            }
        }
    }
  }

  /**
   * Logs the guest in by saving their invitation details.
   */
  login(invitation: Invitation): void {
    localStorage.setItem('wedding_invitation_code', JSON.stringify(invitation));
    this.invitationSubject.next(invitation);
  }

  /**
   * Clears the session.
   */
  logout(): void {
    localStorage.removeItem('wedding_invitation_code');
    localStorage.removeItem('guest_session');
    this.invitationSubject.next(null);
  }

  get currentInvitationValue(): Invitation | null {
    return this.invitationSubject.value;
  }
}
