import { TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { take } from 'rxjs/operators';
import { GuestSessionService } from './guest-session';
import { Invitation } from '../../../../shared/models/invitation.model';

function makeInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: 'inv-1',
    displayName: 'The Smiths',
    invitationCode: 'abc-123',
    status: 'sent',
    guestIds: [],
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp,
    ...overrides
  };
}

describe('GuestSessionService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function createService(): GuestSessionService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [GuestSessionService] });
    return TestBed.inject(GuestSessionService);
  }

  it('should be created', () => {
    const service = createService();
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should default to null when no session is stored', (done) => {
      const service = createService();
      service.invitation$.pipe(take(1)).subscribe(value => {
        expect(value).toBeNull();
        done();
      });
    });

    it('should restore the session from the new "wedding_invitation_code" key', (done) => {
      const invitation = makeInvitation();
      localStorage.setItem('wedding_invitation_code', JSON.stringify(invitation));

      const service = createService();
      service.invitation$.pipe(take(1)).subscribe(value => {
        expect(value?.invitationCode).toBe('abc-123');
        expect(value?.displayName).toBe('The Smiths');
        done();
      });
    });

    it('should migrate from the legacy "guest_session" key', (done) => {
      const invitation = makeInvitation({ invitationCode: 'legacy-code' });
      localStorage.setItem('guest_session', JSON.stringify(invitation));

      const service = createService();
      service.invitation$.pipe(take(1)).subscribe(value => {
        expect(value?.invitationCode).toBe('legacy-code');
        expect(localStorage.getItem('wedding_invitation_code')).toBeTruthy();
        expect(localStorage.getItem('guest_session')).toBeNull();
        done();
      });
    });

    it('should clear the session when stored value is malformed JSON', (done) => {
      localStorage.setItem('wedding_invitation_code', '{not valid json');

      const service = createService();
      service.invitation$.pipe(take(1)).subscribe(value => {
        expect(value).toBeNull();
        expect(localStorage.getItem('wedding_invitation_code')).toBeNull();
        done();
      });
    });

    it('should clear the session when stored value is a plain string (not an object)', (done) => {
      localStorage.setItem('wedding_invitation_code', 'plain-code-only');

      const service = createService();
      service.invitation$.pipe(take(1)).subscribe(value => {
        expect(value).toBeNull();
        done();
      });
    });
  });

  describe('login', () => {
    it('should persist the invitation to localStorage and emit it', (done) => {
      const service = createService();
      const invitation = makeInvitation();

      service.login(invitation);

      const stored = localStorage.getItem('wedding_invitation_code');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).invitationCode).toBe('abc-123');

      service.invitation$.pipe(take(1)).subscribe(value => {
        expect(value?.invitationCode).toBe('abc-123');
        done();
      });
    });

    it('should expose the latest value via currentInvitationValue', () => {
      const service = createService();
      const invitation = makeInvitation();
      service.login(invitation);
      expect(service.currentInvitationValue?.invitationCode).toBe('abc-123');
    });
  });

  describe('logout', () => {
    it('should clear both legacy and current localStorage keys', () => {
      localStorage.setItem('guest_session', 'old');
      localStorage.setItem('wedding_invitation_code', JSON.stringify(makeInvitation()));

      const service = createService();
      service.logout();

      expect(localStorage.getItem('guest_session')).toBeNull();
      expect(localStorage.getItem('wedding_invitation_code')).toBeNull();
    });

    it('should emit null after logout', (done) => {
      const service = createService();
      service.login(makeInvitation());
      service.logout();

      service.invitation$.pipe(take(1)).subscribe(value => {
        expect(value).toBeNull();
        done();
      });
    });

    it('should make currentInvitationValue return null after logout', () => {
      const service = createService();
      service.login(makeInvitation());
      service.logout();
      expect(service.currentInvitationValue).toBeNull();
    });
  });
});