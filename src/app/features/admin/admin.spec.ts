import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import {
  ConfirmationService,
  MessageService
} from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { Admin } from './admin';
import { AuthService } from '../../core/services/auth/auth';
import { FirestoreService } from '../../core/services/firestore/firestore';
import { AdminStateService } from './services/admin-state.service';
import { Guest } from '../../shared/models/guest.model';
import { Invitation } from '../../shared/models/invitation.model';

@Component({
  selector: 'app-guest-pool',
  template: '<div data-test="stub-guest-pool"></div>',
  standalone: true
})
class GuestPoolStubComponent {}

@Component({
  selector: 'app-invitation-groups',
  template: '<div data-test="stub-invitation-groups"></div>',
  standalone: true
})
class InvitationGroupsStubComponent {}

function ts(): Timestamp {
  return { seconds: 0, nanoseconds: 0 } as unknown as Timestamp;
}

function makeGuest(id: string): Guest {
  return { id, firstName: 'A', lastName: 'B', createdAt: ts() };
}

function makeInv(id: string, status: Invitation['status'] = 'sent'): Invitation {
  return {
    id,
    displayName: id,
    invitationCode: id,
    status,
    guestIds: [],
    createdAt: ts()
  };
}

describe('Admin', () => {
  let component: Admin;
  let fixture: ComponentFixture<Admin>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;

  function build(unassigned: Guest[], invitations: Invitation[], allGuests: Guest[] = []) {
    firestoreSpy.getUnassignedGuests.and.returnValue(of(unassigned));
    firestoreSpy.getInvitations.and.returnValue(of(invitations));
    firestoreSpy.getAllGuests.and.returnValue(of(allGuests));
    fixture = TestBed.createComponent(Admin);
    component = fixture.componentInstance;
  }

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    authSpy.logout.and.returnValue(Promise.resolve());
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'getUnassignedGuests',
      'getInvitations',
      'getAllGuests'
    ]);
    firestoreSpy.getUnassignedGuests.and.returnValue(of([]));
    firestoreSpy.getInvitations.and.returnValue(of([]));
    firestoreSpy.getAllGuests.and.returnValue(of([]));

    const realMessage = new MessageService();
    const realConfirm = new ConfirmationService();
    const dialogSpy = jasmine.createSpyObj<DialogService>('DialogService', ['open']);

    await TestBed.configureTestingModule({
      imports: [Admin, GuestPoolStubComponent, InvitationGroupsStubComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        { provide: FirestoreService, useValue: firestoreSpy }
      ]
    })
      .overrideComponent(Admin, {
        set: {
          imports: [
            CommonModule,
            ToastModule,
            ConfirmDialogModule,
            GuestPoolStubComponent,
            InvitationGroupsStubComponent
          ],
          providers: [
            { provide: DialogService, useValue: dialogSpy },
            { provide: ConfirmationService, useValue: realConfirm },
            { provide: MessageService, useValue: realMessage },
            AdminStateService
          ]
        }
      })
      .compileComponents();

    build([], []);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default activeTabIndex to 0', () => {
    expect(component.activeTabIndex).toBe(0);
  });

  it('should logout and navigate to /login', async () => {
    component.logout();
    await Promise.resolve();
    await Promise.resolve();
    expect(authSpy.logout).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should prompt for confirmation before running the invitation_codes backfill', () => {
    // The actual backfill runs from inside the ConfirmationService accept
    // callback — we just verify the confirm() was requested with the right
    // copy. The backfill method itself is covered in the FirestoreService
    // spec. ConfirmationService is provided at the component level via
    // overrideComponent, so it must be resolved from the component's
    // injector rather than the root TestBed injector.
    const confirmService = fixture.debugElement.injector.get(ConfirmationService);
    const confirmSpy = spyOn(confirmService, 'confirm');
    component.runBackfillInvitationCodes();
    expect(confirmSpy).toHaveBeenCalled();
    const args = confirmSpy.calls.mostRecent().args[0];
    expect(args.header).toContain('Backfill');
  });

  it('should switch tab index when activeTabIndex is set', () => {
    component.activeTabIndex = 1;
    expect(component.activeTabIndex).toBe(1);
  });

  describe('tab counts', () => {
    it('should report unassignedCount from the live unassigned-guests stream', () => {
      build([makeGuest('1'), makeGuest('2'), makeGuest('3')], []);
      expect(component.unassignedCount()).toBe(3);
    });

    it('should report invitationCount and pendingInvitationCount independently', () => {
      build([], [makeInv('a', 'sent'), makeInv('b', 'responded'), makeInv('c', 'viewed')]);
      expect(component.invitationCount()).toBe(3);
      expect(component.pendingInvitationCount()).toBe(2);
    });

    it('should report zero pending when every invitation has responded', () => {
      build([], [makeInv('a', 'responded'), makeInv('b', 'responded')]);
      expect(component.invitationCount()).toBe(2);
      expect(component.pendingInvitationCount()).toBe(0);
    });

    it('should count attending guests with no tableName as unseated', () => {
      build(
        [],
        [],
        [
          { id: '1', firstName: 'A', lastName: 'A', isAttending: true, tableName: 'T1', createdAt: ts() },
          { id: '2', firstName: 'B', lastName: 'B', isAttending: true, tableName: null, createdAt: ts() },
          { id: '3', firstName: 'C', lastName: 'C', isAttending: true, tableName: '   ', createdAt: ts() },
          { id: '4', firstName: 'D', lastName: 'D', isAttending: false, tableName: null, createdAt: ts() }
        ]
      );
      expect(component.unseatedAttendingCount()).toBe(2);
    });
  });
});