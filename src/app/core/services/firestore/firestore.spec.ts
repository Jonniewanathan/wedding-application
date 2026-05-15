import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { FirestoreService } from './firestore';

/**
 * FirestoreService is a façade over Firebase Firestore's modular SDK
 * (`collection`, `doc`, `addDoc`, `updateDoc`, `writeBatch`, etc.). Those
 * are tree-shaken named exports and cannot be reliably spied on in this
 * test harness without restructuring the service. The tests below verify
 * what is unit-testable: that the service can be constructed with a
 * mocked Firestore token, exposes the expected public surface, and
 * validates obvious preconditions (e.g. rejecting an RSVP update for an
 * unassigned guest).
 *
 * Behavioural coverage of read/write operations belongs in integration
 * tests against the Firestore emulator.
 */
describe('FirestoreService', () => {
  let service: FirestoreService;
  let firestoreMock: Partial<Firestore>;

  beforeEach(() => {
    firestoreMock = {};
    TestBed.configureTestingModule({
      providers: [
        FirestoreService,
        { provide: Firestore, useValue: firestoreMock }
      ]
    });
    service = TestBed.inject(FirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the expected public methods', () => {
    expect(typeof service.addGuest).toBe('function');
    expect(typeof service.getUnassignedGuests).toBe('function');
    expect(typeof service.deleteUnassignedGuest).toBe('function');
    expect(typeof service.updateGuestDetails).toBe('function');
    expect(typeof service.createInvitation).toBe('function');
    expect(typeof service.assignGuestsToInvitation).toBe('function');
    expect(typeof service.unassignGuest).toBe('function');
    expect(typeof service.getInvitations).toBe('function');
    expect(typeof service.getInvitationByCode).toBe('function');
    expect(typeof service.deleteInvitationAndUnassignGuests).toBe('function');
    expect(typeof service.getGuestsForInvitation).toBe('function');
    expect(typeof service.updateGuestRsvpDetails).toBe('function');
    expect(typeof service.submitRsvpForGuests).toBe('function');
    expect(typeof service.addGuestsBatch).toBe('function');
  });

  it('should reject updateGuestRsvpDetails when the guest has no invitationId', async () => {
    const unassignedGuest = {
      id: 'g1',
      firstName: 'A',
      lastName: 'B',
      invitationId: null,
      createdAt: {} as any
    };

    await expectAsync(
      service.updateGuestRsvpDetails(unassignedGuest as any)
    ).toBeRejected();
  });

  it('should reject updateGuestRsvpDetails when invitationId is undefined', async () => {
    const guestWithoutInvitation = {
      id: 'g1',
      firstName: 'A',
      lastName: 'B',
      createdAt: {} as any
    };

    await expectAsync(
      service.updateGuestRsvpDetails(guestWithoutInvitation as any)
    ).toBeRejected();
  });
});