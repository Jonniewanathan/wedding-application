import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { FirestoreService } from './firestore';
import { AuthService } from '../auth/auth';

/**
 * FirestoreService is a façade over Firebase Firestore's modular SDK
 * (`collection`, `doc`, `addDoc`, `updateDoc`, `writeBatch`, etc.). Those
 * are tree-shaken named exports and cannot be reliably spied on in this
 * test harness without restructuring the service. The tests below verify
 * what is unit-testable: that the service can be constructed with a
 * mocked Firestore token and exposes the expected public surface.
 *
 * Behavioural coverage of read/write operations belongs in integration
 * tests against the Firestore emulator.
 */
describe('FirestoreService', () => {
  let service: FirestoreService;
  let firestoreMock: Partial<Firestore>;

  beforeEach(() => {
    firestoreMock = {};
    const authMock = { currentUser: () => null };
    TestBed.configureTestingModule({
      providers: [
        FirestoreService,
        { provide: Firestore, useValue: firestoreMock },
        { provide: AuthService, useValue: authMock }
      ]
    });
    service = TestBed.inject(FirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should resolve immediately when backfillRsvpSubmittedAt is called with no updates', async () => {
    await expectAsync(service.backfillRsvpSubmittedAt([])).toBeResolved();
  });

  it('should no-op moveGuestToInvitation when source and target match', async () => {
    await expectAsync(service.moveGuestToInvitation('g1', 'inv-x', 'inv-x')).toBeResolved();
  });

  it('should expose the expected public methods', () => {
    expect(typeof service.addGuest).toBe('function');
    expect(typeof service.getUnassignedGuests).toBe('function');
    expect(typeof service.deleteUnassignedGuest).toBe('function');
    expect(typeof service.updateGuestDetails).toBe('function');
    expect(typeof service.createInvitation).toBe('function');
    expect(typeof service.updateInvitation).toBe('function');
    expect(typeof service.setInvitationOutreachStage).toBe('function');
    expect(typeof service.backfillRsvpSubmittedAt).toBe('function');
    expect(typeof service.moveGuestToInvitation).toBe('function');
    expect(typeof service.setGuestTable).toBe('function');
    expect(typeof service.logActivity).toBe('function');
    expect(typeof service.getRecentActivity).toBe('function');
    expect(typeof service.assignGuestsToInvitation).toBe('function');
    expect(typeof service.unassignGuest).toBe('function');
    expect(typeof service.getInvitations).toBe('function');
    expect(typeof service.getInvitationByCode).toBe('function');
    expect(typeof service.deleteInvitationAndUnassignGuests).toBe('function');
    expect(typeof service.getGuestsForInvitation).toBe('function');
    expect(typeof service.getGuestsForInvitationByIds).toBe('function');
    expect(typeof service.getAllGuests).toBe('function');
    expect(typeof service.submitRsvpForGuests).toBe('function');
    expect(typeof service.addGuestsBatch).toBe('function');
    expect(typeof service.backfillInvitationCodes).toBe('function');
  });

  it('should resolve to an empty array when getGuestsForInvitationByIds is called with no ids', async () => {
    await expectAsync(service.getGuestsForInvitationByIds([])).toBeResolvedTo([]);
  });
});
