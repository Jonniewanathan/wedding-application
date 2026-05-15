import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter } from '@angular/core';
import { NavigationEnd, Router, Routes, provideRouter } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { Subject, of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { User } from '@angular/fire/auth';
import { MainLayout } from './main-layout';
import { AuthService } from '../../services/auth/auth';
import { GuestSessionService } from '../../services/auth/guest-session/guest-session';
import { LanguageService } from '../../services/language/language';
import { Invitation } from '../../../shared/models/invitation.model';

@Component({ selector: 'app-dummy', template: '', standalone: true })
class DummyComponent {}

function makeInvitation(): Invitation {
  return {
    id: 'inv-1',
    displayName: 'Test',
    invitationCode: 'ABC',
    status: 'sent',
    guestIds: [],
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp
  };
}

describe('MainLayout', () => {
  let component: MainLayout;
  let fixture: ComponentFixture<MainLayout>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerEvents$: Subject<any>;
  let sessionInvitation$: Subject<Invitation | null>;
  let session: { invitation$: any; currentInvitationValue: Invitation | null };
  let languageSpy: jasmine.SpyObj<LanguageService>;
  let translate: any;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout'], {
      currentUser$: of(null as User | null)
    });
    authSpy.logout.and.returnValue(Promise.resolve());

    routerEvents$ = new Subject();
    sessionInvitation$ = new Subject<Invitation | null>();
    session = {
      invitation$: sessionInvitation$.asObservable(),
      currentInvitationValue: null
    };

    languageSpy = jasmine.createSpyObj<LanguageService>(
      'LanguageService',
      ['initLanguage', 'switchLanguage'],
      { currentLang: 'en' }
    );

    translate = {
      instant: (k: string) => k,
      onLangChange: new EventEmitter()
    };

    const routes: Routes = [{ path: '**', component: DummyComponent }];

    await TestBed.configureTestingModule({
      imports: [MainLayout, DummyComponent],
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: authSpy },
        { provide: GuestSessionService, useValue: session },
        { provide: LanguageService, useValue: languageSpy },
        { provide: TranslateService, useValue: translate }
      ]
    }).compileComponents();

    // Override Router.events with our controlled subject
    const router = TestBed.inject(Router);
    Object.defineProperty(router, 'events', { value: routerEvents$.asObservable() });

    fixture = TestBed.createComponent(MainLayout);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the couple names', () => {
    expect(component.coupleNames).toBe('Marta & Jonathan');
  });

  it('should call languageService.initLanguage on init', () => {
    component.ngOnInit();
    expect(languageSpy.initLanguage).toHaveBeenCalled();
  });

  it('should build the base nav items when no invitation session exists', () => {
    session.currentInvitationValue = null;
    component.ngOnInit();
    expect(component.navItems.length).toBe(3);
    expect(component.navItems.map(i => i['routerLink'])).toEqual([
      '/save-the-date',
      '/travel-info',
      '/local-attractions'
    ]);
  });

  it('should append "My Invitation" when an invitation session exists', () => {
    session.currentInvitationValue = makeInvitation();
    component.ngOnInit();
    expect(component.navItems.length).toBe(4);
    expect(component.navItems[3]['routerLink']).toBe('/invite/ABC');
  });

  it('should rebuild nav items on NavigationEnd events', () => {
    component.ngOnInit();
    const initialCount = component.navItems.length;
    session.currentInvitationValue = makeInvitation();
    routerEvents$.next(new NavigationEnd(1, '/x', '/x'));
    expect(component.navItems.length).toBeGreaterThan(initialCount);
  });

  it('should rebuild nav items when language changes', () => {
    component.ngOnInit();
    spyOn(component, 'updateNavItems').and.callThrough();
    translate.onLangChange.emit({ lang: 'es' });
    expect(component.updateNavItems).toHaveBeenCalled();
  });

  it('should rebuild nav items when the guest session changes', () => {
    component.ngOnInit();
    spyOn(component, 'updateNavItems').and.callThrough();
    sessionInvitation$.next(makeInvitation());
    expect(component.updateNavItems).toHaveBeenCalled();
  });

  it('should delegate language switching to LanguageService', () => {
    component.switchLanguage('es');
    expect(languageSpy.switchLanguage).toHaveBeenCalledWith('es');
  });

  it('should toggle the mobile menu and lock body scroll when open', () => {
    expect(component.isMobileMenuOpen).toBeFalse();
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBeTrue();
    expect(document.body.style.overflow).toBe('hidden');
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBeFalse();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('should close the mobile menu via closeMobileMenu', () => {
    component.toggleMobileMenu();
    component.closeMobileMenu();
    expect(component.isMobileMenuOpen).toBeFalse();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('should logout and navigate home', async () => {
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.logout();
    await Promise.resolve();
    await Promise.resolve();
    expect(authSpy.logout).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });
});