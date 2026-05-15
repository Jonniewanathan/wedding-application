import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { of } from 'rxjs';
import {
  ConfirmationService,
  MessageService
} from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GuestPoolComponent } from './guest-pool.component';
import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { AdminStateService } from '../../services/admin-state.service';
import { Guest } from '../../../../shared/models/guest.model';

function makeGuest(id: string, firstName = 'A', lastName = 'B'): Guest {
  return {
    id,
    firstName,
    lastName,
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp
  };
}

describe('GuestPoolComponent', () => {
  let component: GuestPoolComponent;
  let fixture: ComponentFixture<GuestPoolComponent>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let messageSpy: jasmine.SpyObj<MessageService>;
  let confirmSpy: jasmine.SpyObj<ConfirmationService>;
  let dialogSpy: jasmine.SpyObj<DialogService>;
  let adminState: AdminStateService;

  beforeEach(async () => {
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'getUnassignedGuests',
      'addGuestsBatch',
      'deleteUnassignedGuest',
      'createInvitation',
      'assignGuestsToInvitation'
    ]);
    firestoreSpy.getUnassignedGuests.and.returnValue(of([makeGuest('1'), makeGuest('2')]));
    firestoreSpy.addGuestsBatch.and.returnValue(Promise.resolve());
    firestoreSpy.deleteUnassignedGuest.and.returnValue(Promise.resolve(true));
    firestoreSpy.createInvitation.and.returnValue(Promise.resolve({ id: 'inv-1' } as any));
    firestoreSpy.assignGuestsToInvitation.and.returnValue(Promise.resolve());

    messageSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
    confirmSpy = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']);
    dialogSpy = jasmine.createSpyObj<DialogService>('DialogService', ['open']);

    await TestBed.configureTestingModule({
      imports: [GuestPoolComponent],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MessageService, useValue: messageSpy },
        { provide: ConfirmationService, useValue: confirmSpy },
        { provide: DialogService, useValue: dialogSpy },
        AdminStateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GuestPoolComponent);
    component = fixture.componentInstance;
    adminState = TestBed.inject(AdminStateService);
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should subscribe to the unassigned guests stream on init', () => {
    expect(firestoreSpy.getUnassignedGuests).toHaveBeenCalled();
  });

  it('should reflect AdminStateService.selectedGuests via the getter', () => {
    adminState.setSelectedGuests([makeGuest('1')]);
    expect(component.selectedGuests.length).toBe(1);
    expect(component.selectedGuests[0].id).toBe('1');
  });

  it('should write through to AdminStateService when selectedGuests is set', () => {
    component.selectedGuests = [makeGuest('1'), makeGuest('2')];
    expect(adminState.selectedGuests().length).toBe(2);
  });

  it('should request confirmation before deleting an unassigned guest', () => {
    component.onDeleteUnassignedGuest(makeGuest('1'));
    expect(confirmSpy.confirm).toHaveBeenCalled();
  });

  it('should call deleteUnassignedGuest when confirmation is accepted', async () => {
    confirmSpy.confirm.and.callFake((opts: any) => { opts.accept(); return confirmSpy; });
    component.onDeleteUnassignedGuest(makeGuest('g1'));
    await Promise.resolve();
    expect(firestoreSpy.deleteUnassignedGuest).toHaveBeenCalledWith('g1');
  });

  it('should not call createInvitation when no guests are selected', () => {
    adminState.clearSelection();
    component.openInvitationForm();
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('should open invitation form when at least one guest is selected', () => {
    adminState.setSelectedGuests([makeGuest('1')]);
    dialogSpy.open.and.returnValue({ onClose: of(null) } as any);
    component.openInvitationForm();
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should open the add-guest dialog and listen for close events', () => {
    dialogSpy.open.and.returnValue({ onClose: of(true) } as any);
    component.openAddGuestForm();
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should add a success toast when the add-guest dialog closes with truthy result', () => {
    dialogSpy.open.and.returnValue({ onClose: of(true) } as any);
    component.openAddGuestForm();
    const last = messageSpy.add.calls.mostRecent().args[0] as any;
    expect(last.severity).toBe('success');
  });
});