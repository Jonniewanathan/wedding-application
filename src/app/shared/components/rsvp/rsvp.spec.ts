import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { Subject, of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Rsvp } from './rsvp';
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { GuestSessionService } from '../../../core/services/auth/guest-session/guest-session';
import { Guest } from '../../models/guest.model';
import { Invitation } from '../../models/invitation.model';

function makeGuest(id: string, firstName: string): Guest {
  return {
    id,
    firstName,
    lastName: 'Smith',
    isAttending: null,
    dietaryPreferences: [],
    allergies: [],
    dietaryNotes: '',
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp
  };
}

function makeInvitation(): Invitation {
  return {
    id: 'inv-1',
    displayName: 'The Smiths',
    invitationCode: 'ABC',
    status: 'sent',
    guestIds: ['g1', 'g2'],
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp
  };
}

function translateStub(): Partial<TranslateService> {
  return {
    instant: ((k: string) => k) as any,
    get: ((k: string) => of(k)) as any,
    stream: ((k: string) => of(k)) as any,
    onLangChange: new EventEmitter() as any,
    onTranslationChange: new EventEmitter() as any,
    onDefaultLangChange: new EventEmitter() as any,
    currentLang: 'en',
    addLangs: () => {},
    getLangs: () => ['en', 'es'],
    use: (() => of({})) as any,
    getBrowserLang: () => 'en'
  };
}

describe('Rsvp', () => {
  let component: Rsvp;
  let fixture: ComponentFixture<Rsvp>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let sessionSpy: jasmine.SpyObj<GuestSessionService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let guests$: Subject<Guest[]>;

  function setup(invitation: Invitation | null) {
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'getGuestsForInvitation',
      'submitRsvpForGuests'
    ]);
    guests$ = new Subject<Guest[]>();
    firestoreSpy.getGuestsForInvitation.and.returnValue(guests$.asObservable());
    firestoreSpy.submitRsvpForGuests.and.returnValue(Promise.resolve());

    sessionSpy = jasmine.createSpyObj<GuestSessionService>('GuestSessionService', [], {
      currentInvitationValue: invitation
    });
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [Rsvp],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: GuestSessionService, useValue: sessionSpy },
        { provide: Router, useValue: routerSpy },
        { provide: TranslateService, useValue: translateStub() }
      ]
    });

    fixture = TestBed.createComponent(Rsvp);
    component = fixture.componentInstance;
  }

  it('should create', () => {
    setup(null);
    expect(component).toBeTruthy();
  });

  it('should redirect to home when no invitation session exists', () => {
    setup(null);
    component.ngOnInit();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    expect(firestoreSpy.getGuestsForInvitation).not.toHaveBeenCalled();
  });

  it('should load guests for the invitation on init', () => {
    setup(makeInvitation());
    component.ngOnInit();
    expect(firestoreSpy.getGuestsForInvitation).toHaveBeenCalledWith('inv-1');
  });

  it('should build a form array with one group per guest', () => {
    setup(makeInvitation());
    component.ngOnInit();
    guests$.next([makeGuest('g1', 'Alice'), makeGuest('g2', 'Bob')]);
    expect(component.guestControls.length).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('should expose dietary and allergy options', () => {
    setup(null);
    expect(component.dietaryOptions.length).toBeGreaterThan(0);
    expect(component.allergyOptions.length).toBeGreaterThan(0);
  });

  it('should not submit when the form is invalid', async () => {
    setup(makeInvitation());
    component.ngOnInit();
    guests$.next([makeGuest('g1', 'Alice')]);
    await component.onSubmit();
    expect(firestoreSpy.submitRsvpForGuests).not.toHaveBeenCalled();
  });

  it('should submit the form when all guests have an isAttending value', async () => {
    setup(makeInvitation());
    component.ngOnInit();
    guests$.next([makeGuest('g1', 'Alice')]);
    const guestGroup = component.guestControls[0];
    guestGroup.patchValue({ isAttending: true });

    await component.onSubmit();
    expect(firestoreSpy.submitRsvpForGuests).toHaveBeenCalled();
    expect(component.submitted).toBeTrue();
    expect(component.isLoading).toBeFalse();
  });

  it('should keep submitted false if the submission rejects', async () => {
    setup(makeInvitation());
    component.ngOnInit();
    guests$.next([makeGuest('g1', 'Alice')]);
    component.guestControls[0].patchValue({ isAttending: true });
    firestoreSpy.submitRsvpForGuests.and.returnValue(Promise.reject(new Error('fail')));

    await component.onSubmit();
    expect(component.submitted).toBeFalse();
    expect(component.isLoading).toBeFalse();
  });

  it('should stop loading even if the guests query errors', () => {
    setup(makeInvitation());
    firestoreSpy.getGuestsForInvitation.and.returnValue(throwError(() => new Error('boom')));
    component.ngOnInit();
    expect(component.isLoading).toBeFalse();
  });
});