import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { of } from 'rxjs';
import { StatsV2 } from './stats-v2';
import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { Guest } from '../../../../shared/models/guest.model';
import { Invitation } from '../../../../shared/models/invitation.model';

function ts(secondsAgo: number): Timestamp {
  return { seconds: Math.floor(Date.now() / 1000) - secondsAgo, nanoseconds: 0 } as unknown as Timestamp;
}

function makeGuest(overrides: Partial<Guest>): Guest {
  return {
    id: 'g',
    firstName: 'A',
    lastName: 'B',
    createdAt: ts(0),
    ...overrides
  };
}

function makeInv(overrides: Partial<Invitation>): Invitation {
  return {
    id: 'i',
    displayName: 'Group',
    invitationCode: 'CODE',
    status: 'sent',
    guestIds: [],
    createdAt: ts(0),
    ...overrides
  };
}

describe('StatsV2', () => {
  let component: StatsV2;
  let fixture: ComponentFixture<StatsV2>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let guests: Guest[];
  let invitations: Invitation[];

  function build(g: Guest[], i: Invitation[]) {
    guests = g;
    invitations = i;
    firestoreSpy.getAllGuests.and.returnValue(of(guests));
    firestoreSpy.getInvitations.and.returnValue(of(invitations));
    fixture = TestBed.createComponent(StatsV2);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'getAllGuests',
      'getInvitations',
      'backfillRsvpSubmittedAt'
    ]);
    firestoreSpy.getAllGuests.and.returnValue(of([]));
    firestoreSpy.getInvitations.and.returnValue(of([]));
    firestoreSpy.backfillRsvpSubmittedAt.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      imports: [StatsV2],
      providers: [{ provide: FirestoreService, useValue: firestoreSpy }]
    });
  });

  describe('hero metrics', () => {
    it('should count attending, declined and pending guests separately', () => {
      build(
        [
          makeGuest({ id: '1', isAttending: true }),
          makeGuest({ id: '2', isAttending: true }),
          makeGuest({ id: '3', isAttending: false }),
          makeGuest({ id: '4', isAttending: null }),
          makeGuest({ id: '5' })
        ],
        []
      );
      expect(component.totalInvited()).toBe(5);
      expect(component.attendingCount()).toBe(2);
      expect(component.declinedCount()).toBe(1);
      expect(component.pendingCount()).toBe(2);
    });

    it('should compute responseRate as percentage of resolved (attending + declined) responses', () => {
      build(
        [
          makeGuest({ id: '1', isAttending: true }),
          makeGuest({ id: '2', isAttending: false }),
          makeGuest({ id: '3', isAttending: null }),
          makeGuest({ id: '4', isAttending: null })
        ],
        []
      );
      expect(component.responseRate()).toBe(50);
    });

    it('should split adults vs kids using the Children\'s Meal heuristic', () => {
      build(
        [
          makeGuest({ id: '1', isAttending: true, dietaryPreferences: ["Children's Meal"] }),
          makeGuest({ id: '2', isAttending: true, dietaryPreferences: ['Vegetarian'] }),
          makeGuest({ id: '3', isAttending: true })
        ],
        []
      );
      expect(component.kidCount()).toBe(1);
      expect(component.adultCount()).toBe(2);
    });

    it('should not count non-attending guests as kids even if they have Children\'s Meal', () => {
      build(
        [makeGuest({ id: '1', isAttending: false, dietaryPreferences: ["Children's Meal"] })],
        []
      );
      expect(component.kidCount()).toBe(0);
    });
  });

  describe('follow-up panel', () => {
    it('should flag invitations that have never been sent', () => {
      build([], [makeInv({ id: 'i1', displayName: 'Not yet' })]);
      const followUps = component.followUps();
      expect(followUps.length).toBe(1);
      expect(followUps[0].reasonKey).toBe('not-sent');
    });

    it('should skip invitations that already responded', () => {
      build([], [makeInv({ id: 'i1', status: 'responded' })]);
      expect(component.followUps().length).toBe(0);
    });

    it('should not flag freshly-sent invitations as needing a reminder yet', () => {
      build([], [makeInv({ id: 'i1', sentAt: ts(60 * 60 * 24 * 3) })]); // 3 days ago
      expect(component.followUps().length).toBe(0);
    });

    it('should flag an invitation sent long ago without a first reminder', () => {
      build([], [makeInv({ id: 'i1', sentAt: ts(60 * 60 * 24 * 20) })]); // 20 days ago
      const followUps = component.followUps();
      expect(followUps.length).toBe(1);
      expect(followUps[0].reasonKey).toBe('first-reminder-due');
      expect(followUps[0].daysSinceLastContact).toBe(20);
    });

    it('should flag an invitation where the first reminder is stale enough for a second', () => {
      build([], [
        makeInv({
          id: 'i1',
          sentAt: ts(60 * 60 * 24 * 30),
          firstReminderAt: ts(60 * 60 * 24 * 10)
        })
      ]);
      const followUps = component.followUps();
      expect(followUps.length).toBe(1);
      expect(followUps[0].reasonKey).toBe('second-reminder-due');
    });

    it('should flag invitations where both reminders were sent and there is still no response', () => {
      build([], [
        makeInv({
          id: 'i1',
          sentAt: ts(60 * 60 * 24 * 30),
          firstReminderAt: ts(60 * 60 * 24 * 20),
          secondReminderAt: ts(60 * 60 * 24 * 5)
        })
      ]);
      const followUps = component.followUps();
      expect(followUps.length).toBe(1);
      expect(followUps[0].reasonKey).toBe('no-response-after-reminders');
    });

    it('should sort never-sent ahead of overdue reminders', () => {
      build([], [
        makeInv({ id: 'i1', displayName: 'Stale', sentAt: ts(60 * 60 * 24 * 30) }),
        makeInv({ id: 'i2', displayName: 'Never sent' })
      ]);
      const followUps = component.followUps();
      expect(followUps[0].reasonKey).toBe('not-sent');
      expect(followUps[1].reasonKey).toBe('first-reminder-due');
    });
  });

  describe('rsvpSubmittedAt backfill', () => {
    it('should list responded invitations that are missing rsvpSubmittedAt', () => {
      build([], [
        makeInv({
          id: 'a',
          status: 'responded',
          updatedAt: ts(60 * 60 * 24 * 5),
          rsvpSubmittedAt: null
        }),
        makeInv({
          id: 'b',
          status: 'responded',
          updatedAt: ts(60 * 60 * 24 * 10),
          rsvpSubmittedAt: ts(60 * 60 * 24 * 10)
        }),
        makeInv({ id: 'c', status: 'sent', updatedAt: ts(60 * 60 * 24 * 2) })
      ]);
      const targets = component.invitationsMissingRsvpTimestamp();
      expect(targets.length).toBe(1);
      expect(targets[0].id).toBe('a');
    });

    it('should skip the backfill call when nothing needs updating', async () => {
      build([], [makeInv({ id: 'b', status: 'responded', rsvpSubmittedAt: ts(0) })]);
      await component.runRsvpTimestampBackfill();
      expect(firestoreSpy.backfillRsvpSubmittedAt).not.toHaveBeenCalled();
    });

    it('should copy each target invitation\'s updatedAt into rsvpSubmittedAt', async () => {
      const updatedAt = ts(60 * 60 * 24 * 5);
      build([], [
        makeInv({ id: 'a', status: 'responded', updatedAt, rsvpSubmittedAt: null })
      ]);
      await component.runRsvpTimestampBackfill();
      expect(firestoreSpy.backfillRsvpSubmittedAt).toHaveBeenCalledWith([
        { id: 'a', rsvpSubmittedAt: updatedAt }
      ]);
    });

    it('should ignore concurrent backfill clicks while one is running', async () => {
      build([], [
        makeInv({ id: 'a', status: 'responded', updatedAt: ts(0), rsvpSubmittedAt: null })
      ]);
      let resolveBackfill!: () => void;
      firestoreSpy.backfillRsvpSubmittedAt.and.returnValue(
        new Promise<void>(res => { resolveBackfill = res; })
      );
      const first = component.runRsvpTimestampBackfill();
      const second = component.runRsvpTimestampBackfill();
      resolveBackfill();
      await first;
      await second;
      expect(firestoreSpy.backfillRsvpSubmittedAt).toHaveBeenCalledTimes(1);
    });
  });

  describe('charts', () => {
    it('should include "No preference" in the dietary breakdown when applicable', () => {
      build(
        [
          makeGuest({ id: '1', isAttending: true, dietaryPreferences: ['Vegetarian'] }),
          makeGuest({ id: '2', isAttending: true }),
          makeGuest({ id: '3', isAttending: true })
        ],
        []
      );
      const data = component.dietaryBarData();
      expect(data).toBeTruthy();
      expect(data!.labels).toContain('No preference');
    });

    it('should return null dietary data when no attending guests have any preferences and none are attending', () => {
      build([], []);
      expect(component.dietaryBarData()).toBeNull();
    });

    it('should sum total bus seats from attending guests who need a bus', () => {
      build(
        [
          makeGuest({ id: '1', isAttending: true, needsBus: true, busPickupLocation: 'A' }),
          makeGuest({ id: '2', isAttending: true, needsBus: true, busPickupLocation: 'A' }),
          makeGuest({ id: '3', isAttending: true, needsBus: false }),
          makeGuest({ id: '4', isAttending: false, needsBus: true })
        ],
        []
      );
      expect(component.busTotalSeats()).toBe(2);
    });

    it('should prefer rsvpSubmittedAt over updatedAt when sorting messages', () => {
      build([], [
        // updatedAt is RECENT (admin just renamed it), but rsvp was submitted long ago
        makeInv({
          id: 'submitted-long-ago',
          displayName: 'Submitted long ago',
          message: 'old reply',
          rsvpSubmittedAt: ts(60 * 60 * 24 * 20),
          updatedAt: ts(60 * 60)
        }),
        // Submitted recently — should appear first
        makeInv({
          id: 'submitted-recently',
          displayName: 'Submitted recently',
          message: 'fresh reply',
          rsvpSubmittedAt: ts(60 * 60),
          updatedAt: ts(60 * 60 * 24 * 5)
        })
      ]);
      const ordered = component.invitationsWithMessages().map(inv => inv.id);
      expect(ordered).toEqual(['submitted-recently', 'submitted-long-ago']);
    });

    it('should sort guest messages newest-first by updatedAt', () => {
      build([], [
        makeInv({
          id: 'older',
          displayName: 'Older',
          message: 'first',
          updatedAt: ts(60 * 60 * 24 * 10) // 10 days ago
        }),
        makeInv({
          id: 'newest',
          displayName: 'Newest',
          message: 'latest',
          updatedAt: ts(60 * 60) // 1h ago
        }),
        makeInv({
          id: 'middle',
          displayName: 'Middle',
          message: 'mid',
          updatedAt: ts(60 * 60 * 24 * 3) // 3 days ago
        }),
        makeInv({ id: 'no-msg', displayName: 'No message' })
      ]);
      const ordered = component.invitationsWithMessages().map(inv => inv.id);
      expect(ordered).toEqual(['newest', 'middle', 'older']);
    });

    it('should build the response curve from rsvpSubmittedAt when present', () => {
      build([], [
        makeInv({ id: '1', status: 'responded', rsvpSubmittedAt: ts(60 * 60 * 24) }),
        makeInv({ id: '2', status: 'responded', rsvpSubmittedAt: ts(60 * 60) })
      ]);
      const data = component.dailyResponsesData();
      expect(data).toBeTruthy();
      // Cumulative — last value equals total responses
      expect(data!.datasets[0].data[data!.datasets[0].data.length - 1]).toBe(2);
    });

    it('should ignore non-responded invitations in the response curve', () => {
      build([], [
        makeInv({ id: '1', status: 'responded', rsvpSubmittedAt: ts(60 * 60) }),
        makeInv({ id: '2', status: 'sent', rsvpSubmittedAt: ts(60 * 60) })
      ]);
      const data = component.dailyResponsesData();
      expect(data!.datasets[0].data[data!.datasets[0].data.length - 1]).toBe(1);
    });

    it('should rank countries by attending guest count', () => {
      build(
        [
          makeGuest({ id: '1', isAttending: true, countryOfResidence: 'Ireland' }),
          makeGuest({ id: '2', isAttending: true, countryOfResidence: 'Ireland' }),
          makeGuest({ id: '3', isAttending: true, countryOfResidence: 'Spain' })
        ],
        []
      );
      const data = component.countryBarData();
      expect(data).toBeTruthy();
      expect(data!.labels).toEqual(['Ireland', 'Spain']);
      expect(data!.datasets[0].data).toEqual([2, 1]);
    });
  });
});