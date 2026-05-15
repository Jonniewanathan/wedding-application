import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { of } from 'rxjs';
import {
  ConfirmationService,
  MessageService
} from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { InvitationGroups } from './invitation-groups.component';
import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { AdminStateService } from '../../services/admin-state.service';
import { Guest } from '../../../../shared/models/guest.model';
import { Invitation } from '../../../../shared/models/invitation.model';

function makeGuest(id: string): Guest {
  return {
    id,
    firstName: 'A',
    lastName: 'B',
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp
  };
}

function makeInvitation(id = 'inv-1'): Invitation {
  return {
    id,
    displayName: 'The Smiths',
    invitationCode: 'ABC',
    status: 'sent',
    guestIds: [],
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp
  };
}

describe('InvitationGroups', () => {
  let component: InvitationGroups;
  let fixture: ComponentFixture<InvitationGroups>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let messageSpy: jasmine.SpyObj<MessageService>;
  let confirmSpy: jasmine.SpyObj<ConfirmationService>;
  let dialogSpy: jasmine.SpyObj<DialogService>;
  let adminState: AdminStateService;

  beforeEach(async () => {
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'getInvitations',
      'getGuestsForInvitation',
      'assignGuestsToInvitation',
      'deleteInvitationAndUnassignGuests',
      'setInvitationOutreachStage'
    ]);
    firestoreSpy.getInvitations.and.returnValue(of([makeInvitation()]));
    firestoreSpy.getGuestsForInvitation.and.returnValue(of([]));
    firestoreSpy.assignGuestsToInvitation.and.returnValue(Promise.resolve());
    firestoreSpy.deleteInvitationAndUnassignGuests.and.returnValue(Promise.resolve());
    firestoreSpy.setInvitationOutreachStage.and.returnValue(Promise.resolve());

    messageSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
    confirmSpy = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']);
    dialogSpy = jasmine.createSpyObj<DialogService>('DialogService', ['open']);

    await TestBed.configureTestingModule({
      imports: [InvitationGroups],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MessageService, useValue: messageSpy },
        { provide: ConfirmationService, useValue: confirmSpy },
        { provide: DialogService, useValue: dialogSpy },
        AdminStateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InvitationGroups);
    component = fixture.componentInstance;
    adminState = TestBed.inject(AdminStateService);
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should subscribe to the invitations stream on init', () => {
    expect(firestoreSpy.getInvitations).toHaveBeenCalled();
  });

  it('should warn the user when adding guests with no selection', () => {
    adminState.clearSelection();
    component.onAddGuestsToInvitation(makeInvitation());
    const call = messageSpy.add.calls.mostRecent().args[0] as any;
    expect(call.severity).toBe('warn');
    expect(confirmSpy.confirm).not.toHaveBeenCalled();
  });

  it('should request confirmation when guests are selected', () => {
    adminState.setSelectedGuests([makeGuest('g1')]);
    component.onAddGuestsToInvitation(makeInvitation());
    expect(confirmSpy.confirm).toHaveBeenCalled();
  });

  it('should call assignGuestsToInvitation when confirmation is accepted', async () => {
    adminState.setSelectedGuests([makeGuest('g1')]);
    confirmSpy.confirm.and.callFake((opts: any) => { opts.accept(); return confirmSpy; });
    component.onAddGuestsToInvitation(makeInvitation('inv-x'));
    await Promise.resolve();
    expect(firestoreSpy.assignGuestsToInvitation).toHaveBeenCalledWith('inv-x', ['g1']);
  });

  it('should clear the selection after a successful assignment', async () => {
    adminState.setSelectedGuests([makeGuest('g1')]);
    confirmSpy.confirm.and.callFake((opts: any) => { opts.accept(); return confirmSpy; });
    component.onAddGuestsToInvitation(makeInvitation('inv-x'));
    await Promise.resolve();
    await Promise.resolve();
    expect(adminState.selectedGuests().length).toBe(0);
  });

  it('should request confirmation before deleting an invitation', () => {
    component.onDeleteInvitation(makeInvitation());
    expect(confirmSpy.confirm).toHaveBeenCalled();
  });

  it('should delete the invitation when confirmation is accepted', async () => {
    confirmSpy.confirm.and.callFake((opts: any) => { opts.accept(); return confirmSpy; });
    component.onDeleteInvitation(makeInvitation('inv-x'));
    await Promise.resolve();
    expect(firestoreSpy.deleteInvitationAndUnassignGuests).toHaveBeenCalledWith('inv-x');
  });

  describe('toggleOutreach', () => {
    it('should activate a stage that was previously inactive', () => {
      const invitation = makeInvitation();
      component.toggleOutreach(invitation, 'sentAt');
      expect(firestoreSpy.setInvitationOutreachStage).toHaveBeenCalledWith(
        invitation.id,
        'sentAt',
        true
      );
    });

    it('should clear a stage that was already active', () => {
      const invitation = makeInvitation();
      invitation.sentAt = { seconds: 1, nanoseconds: 0 } as unknown as Timestamp;
      component.toggleOutreach(invitation, 'sentAt');
      expect(firestoreSpy.setInvitationOutreachStage).toHaveBeenCalledWith(
        invitation.id,
        'sentAt',
        false
      );
    });

    it('should toggle each of the three stages independently', () => {
      const invitation = makeInvitation();
      component.toggleOutreach(invitation, 'firstReminderAt');
      component.toggleOutreach(invitation, 'secondReminderAt');
      const calls = firestoreSpy.setInvitationOutreachStage.calls.allArgs();
      expect(calls).toEqual([
        [invitation.id, 'firstReminderAt', true],
        [invitation.id, 'secondReminderAt', true]
      ]);
    });

    it('should surface an error toast when the firestore write rejects', async () => {
      firestoreSpy.setInvitationOutreachStage.and.returnValue(Promise.reject(new Error('boom')));
      component.toggleOutreach(makeInvitation(), 'sentAt');
      await Promise.resolve();
      await Promise.resolve();
      const last = messageSpy.add.calls.mostRecent().args[0] as any;
      expect(last.severity).toBe('error');
    });
  });

  describe('outreachTooltip', () => {
    function tsSecondsAgo(secs: number): Timestamp {
      return { seconds: Math.floor(Date.now() / 1000) - secs, nanoseconds: 0 } as unknown as Timestamp;
    }

    it('should return a "mark" prompt when the stage is not set', () => {
      expect(component.outreachTooltip(null, 'Sent')).toBe('Mark sent');
      expect(component.outreachTooltip(undefined, '1st reminder')).toBe('Mark 1st reminder');
    });

    it('should describe a today-set stage as today', () => {
      const tooltip = component.outreachTooltip(tsSecondsAgo(60), 'Sent');
      expect(tooltip).toContain('today');
      expect(tooltip).toContain('— click to clear');
    });

    it('should describe a yesterday-set stage as yesterday', () => {
      const tooltip = component.outreachTooltip(tsSecondsAgo(60 * 60 * 30), 'Sent');
      expect(tooltip).toContain('yesterday');
    });

    it('should describe stages set days ago with the day count', () => {
      const tooltip = component.outreachTooltip(tsSecondsAgo(60 * 60 * 24 * 12), '1st reminder');
      expect(tooltip).toContain('12 days ago');
    });
  });

  it('should open the view-guests dialog with the right invitation id', () => {
    dialogSpy.open.and.returnValue({ onClose: of(null) } as any);
    component.openViewGuests(makeInvitation('inv-x'));
    const args = dialogSpy.open.calls.mostRecent().args;
    const cfg = args[1] as any;
    expect(cfg.data.invitationId).toBe('inv-x');
  });
});