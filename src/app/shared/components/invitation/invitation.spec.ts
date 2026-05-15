import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Invitation } from './invitation';
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { GuestSessionService } from '../../../core/services/auth/guest-session/guest-session';
import { Invitation as InvitationModel } from '../../models/invitation.model';

function makeInvitation(code = 'ABC'): InvitationModel & { id: string } {
  return {
    id: 'inv-1',
    displayName: 'The Smiths',
    invitationCode: code,
    status: 'sent',
    guestIds: [],
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

describe('Invitation', () => {
  let component: Invitation;
  let fixture: ComponentFixture<Invitation>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let sessionSpy: jasmine.SpyObj<GuestSessionService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRoute: { snapshot: { paramMap: { get: jasmine.Spy } } };

  function setup(routeCode: string | null, sessionInvitation: InvitationModel | null) {
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', ['getInvitationByCode']);
    sessionSpy = jasmine.createSpyObj<GuestSessionService>('GuestSessionService', ['login'], {
      currentInvitationValue: sessionInvitation
    });
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    activatedRoute = {
      snapshot: { paramMap: { get: jasmine.createSpy('get').and.returnValue(routeCode) } }
    };

    TestBed.configureTestingModule({
      imports: [Invitation],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: GuestSessionService, useValue: sessionSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: TranslateService, useValue: translateStub() }
      ]
    });

    fixture = TestBed.createComponent(Invitation);
    component = fixture.componentInstance;
  }

  it('should create', () => {
    setup(null, null);
    expect(component).toBeTruthy();
  });

  it('should default to loading state', () => {
    setup(null, null);
    expect(component.isLoading).toBeTrue();
    expect(component.hasError).toBeFalse();
  });

  it('should attempt login when a code is in the route', async () => {
    setup('ABC', null);
    firestoreSpy.getInvitationByCode.and.returnValue(Promise.resolve(makeInvitation('ABC')));
    component.ngOnInit();
    await Promise.resolve();
    await Promise.resolve();
    expect(firestoreSpy.getInvitationByCode).toHaveBeenCalledWith('ABC');
  });

  it('should call guestSession.login with the resolved invitation', async () => {
    setup('ABC', null);
    const inv = makeInvitation('ABC');
    firestoreSpy.getInvitationByCode.and.returnValue(Promise.resolve(inv));
    component.ngOnInit();
    await Promise.resolve();
    await Promise.resolve();
    expect(sessionSpy.login).toHaveBeenCalledWith(inv);
    expect(component.isLoading).toBeFalse();
    expect(component.hasError).toBeFalse();
  });

  it('should show an error when the code does not match any invitation', async () => {
    setup('UNKNOWN', null);
    firestoreSpy.getInvitationByCode.and.returnValue(Promise.resolve(null));
    component.ngOnInit();
    await Promise.resolve();
    await Promise.resolve();
    expect(component.hasError).toBeTrue();
    expect(component.errorMessage).toContain('could not find');
    expect(component.isLoading).toBeFalse();
  });

  it('should show an error when Firestore lookup rejects', async () => {
    setup('ABC', null);
    firestoreSpy.getInvitationByCode.and.returnValue(Promise.reject(new Error('boom')));
    component.ngOnInit();
    await Promise.resolve();
    await Promise.resolve();
    expect(component.hasError).toBeTrue();
    expect(component.isLoading).toBeFalse();
  });

  it('should use the existing session when no code is in the route', () => {
    setup(null, makeInvitation('OLD'));
    component.ngOnInit();
    expect(component.isLoading).toBeFalse();
    expect(component.hasError).toBeFalse();
    expect(firestoreSpy.getInvitationByCode).not.toHaveBeenCalled();
  });

  it('should show an error when no code and no session exist', () => {
    setup(null, null);
    component.ngOnInit();
    expect(component.hasError).toBeTrue();
    expect(component.errorMessage).toContain('No invitation code');
    expect(component.isLoading).toBeFalse();
  });
});