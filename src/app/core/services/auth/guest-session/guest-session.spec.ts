import { TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
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
    it('should default to null when no session is stored', () => {
      const service = createService();
      expect(service.invitation()).toBeNull();
    });

    it('should restore the session from the new "wedding_invitation_code" key', () => {
      const invitation = makeInvitation();
      localStorage.setItem('wedding_invitation_code', JSON.stringify(invitation));

      const service = createService();
      const value = service.invitation();
      expect(value?.invitationCode).toBe('abc-123');
      expect(value?.displayName).toBe('The Smiths');
    });

    it('should migrate from the legacy "guest_session" key', () => {
      const invitation = makeInvitation({ invitationCode: 'legacy-code' });
      localStorage.setItem('guest_session', JSON.stringify(invitation));

      const service = createService();
      expect(service.invitation()?.invitationCode).toBe('legacy-code');
      expect(localStorage.getItem('wedding_invitation_code')).toBeTruthy();
      expect(localStorage.getItem('guest_session')).toBeNull();
    });

    it('should clear the session when stored value is malformed JSON', () => {
      localStorage.setItem('wedding_invitation_code', '{not valid json');

      const service = createService();
      expect(service.invitation()).toBeNull();
      expect(localStorage.getItem('wedding_invitation_code')).toBeNull();
    });

    it('should clear the session when stored value is a plain string (not an object)', () => {
      localStorage.setItem('wedding_invitation_code', 'plain-code-only');

      const service = createService();
      expect(service.invitation()).toBeNull();
    });
  });

  describe('login', () => {
    it('should persist the invitation to localStorage and update the signal', () => {
      const service = createService();
      const invitation = makeInvitation();

      service.login(invitation);

      const stored = localStorage.getItem('wedding_invitation_code');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).invitationCode).toBe('abc-123');
      expect(service.invitation()?.invitationCode).toBe('abc-123');
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

    it('should reset the signal to null after logout', () => {
      const service = createService();
      service.login(makeInvitation());
      service.logout();
      expect(service.invitation()).toBeNull();
    });

    it('should make currentInvitationValue return null after logout', () => {
      const service = createService();
      service.login(makeInvitation());
      service.logout();
      expect(service.currentInvitationValue).toBeNull();
    });
  });
});