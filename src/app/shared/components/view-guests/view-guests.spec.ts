import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { of } from 'rxjs';
import {
  ConfirmationService,
  MessageService
} from 'primeng/api';
import {
  DialogService,
  DynamicDialogConfig,
  DynamicDialogRef
} from 'primeng/dynamicdialog';
import { ViewGuests } from './view-guests';
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { Guest } from '../../models/guest.model';

function makeGuest(id: string): Guest {
  return {
    id,
    firstName: 'A',
    lastName: 'B',
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp
  };
}

describe('ViewGuests', () => {
  let component: ViewGuests;
  let fixture: ComponentFixture<ViewGuests>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let messageSpy: jasmine.SpyObj<MessageService>;
  let confirmSpy: jasmine.SpyObj<ConfirmationService>;
  let dialogServiceSpy: jasmine.SpyObj<DialogService>;
  let dialogRef: jasmine.SpyObj<DynamicDialogRef>;
  let config: DynamicDialogConfig;

  beforeEach(async () => {
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'getGuestsForInvitation',
      'getUnassignedGuests',
      'assignGuestsToInvitation',
      'unassignGuest'
    ]);
    firestoreSpy.getGuestsForInvitation.and.returnValue(of([makeGuest('g1')]));
    firestoreSpy.getUnassignedGuests.and.returnValue(of([makeGuest('u1')]));
    firestoreSpy.assignGuestsToInvitation.and.returnValue(Promise.resolve());
    firestoreSpy.unassignGuest.and.returnValue(Promise.resolve());

    messageSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
    confirmSpy = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']);
    dialogServiceSpy = jasmine.createSpyObj<DialogService>('DialogService', ['open']);
    dialogRef = jasmine.createSpyObj<DynamicDialogRef>('DynamicDialogRef', ['close']);
    config = { data: { invitationId: 'inv-1' } } as DynamicDialogConfig;

    await TestBed.configureTestingModule({
      imports: [ViewGuests],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: DynamicDialogRef, useValue: dialogRef },
        { provide: DynamicDialogConfig, useValue: config },
        { provide: MessageService, useValue: messageSpy },
        { provide: ConfirmationService, useValue: confirmSpy },
        { provide: DialogService, useValue: dialogServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewGuests);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should capture the invitationId from config.data', () => {
    expect(component.invitationId).toBe('inv-1');
  });

  it('should subscribe to assigned and unassigned guest streams on init', () => {
    expect(firestoreSpy.getGuestsForInvitation).toHaveBeenCalledWith('inv-1');
    expect(firestoreSpy.getUnassignedGuests).toHaveBeenCalled();
  });

  it('should toggle the add-guest dropdown', () => {
    expect(component.showAddDropdown).toBeFalse();
    component.toggleAddGuest();
    expect(component.showAddDropdown).toBeTrue();
    component.toggleAddGuest();
    expect(component.showAddDropdown).toBeFalse();
  });

  it('should reset selectedUnassignedGuest when toggling', () => {
    component.selectedUnassignedGuest = makeGuest('u1');
    component.toggleAddGuest();
    expect(component.selectedUnassignedGuest).toBeNull();
  });

  it('should not call firestore.assignGuestsToInvitation when no guest is selected', async () => {
    component.selectedUnassignedGuest = null;
    await component.onAddGuest();
    expect(firestoreSpy.assignGuestsToInvitation).not.toHaveBeenCalled();
  });

  it('should call firestore.assignGuestsToInvitation with the selected guest id', async () => {
    component.selectedUnassignedGuest = makeGuest('u1');
    await component.onAddGuest();
    expect(firestoreSpy.assignGuestsToInvitation).toHaveBeenCalledWith('inv-1', ['u1']);
    expect(messageSpy.add).toHaveBeenCalled();
  });

  it('should show an error toast when assignment fails', async () => {
    component.selectedUnassignedGuest = makeGuest('u1');
    firestoreSpy.assignGuestsToInvitation.and.returnValue(Promise.reject(new Error('fail')));
    await component.onAddGuest();
    const lastCall = messageSpy.add.calls.mostRecent().args[0] as any;
    expect(lastCall.severity).toBe('error');
  });

  it('should call dialogService.open with GuestFormComponent on edit', () => {
    dialogServiceSpy.open.and.returnValue({ onClose: of(true) } as any);
    component.onEditGuest(makeGuest('g1'));
    expect(dialogServiceSpy.open).toHaveBeenCalled();
  });

  it('should show a success toast when edit dialog closes with truthy result', () => {
    dialogServiceSpy.open.and.returnValue({ onClose: of(true) } as any);
    component.onEditGuest(makeGuest('g1'));
    const lastCall = messageSpy.add.calls.mostRecent().args[0] as any;
    expect(lastCall.severity).toBe('success');
  });

  it('should request confirmation before unassigning a guest', () => {
    component.onUnassignGuest(makeGuest('g1'));
    expect(confirmSpy.confirm).toHaveBeenCalled();
  });

  it('should call firestore.unassignGuest when confirmation is accepted', async () => {
    confirmSpy.confirm.and.callFake((opts: any) => { opts.accept(); return confirmSpy; });
    component.onUnassignGuest(makeGuest('g1'));
    await Promise.resolve();
    expect(firestoreSpy.unassignGuest).toHaveBeenCalledWith('g1', 'inv-1');
  });
});