import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { of } from 'rxjs';
import {
  ConfirmationService,
  MessageService
} from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GuestPool } from './guest-pool.component';
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

describe('GuestPool', () => {
  let component: GuestPool;
  let fixture: ComponentFixture<GuestPool>;
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
      imports: [GuestPool],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MessageService, useValue: messageSpy },
        { provide: ConfirmationService, useValue: confirmSpy },
        { provide: DialogService, useValue: dialogSpy },
        AdminStateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GuestPool);
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

  describe('handleCsvUpload', () => {
    function makeUploadEvent(csv: string): Event {
      const file = new File([csv], 'guests.csv', { type: 'text/csv' });
      const input = { files: [file], value: 'something' };
      return { target: input } as unknown as Event;
    }

    it('should do nothing when no file is selected', async () => {
      const event = { target: { files: null } } as unknown as Event;
      await component.handleCsvUpload(event);
      expect(firestoreSpy.addGuestsBatch).not.toHaveBeenCalled();
    });

    it('should parse a simple CSV and call addGuestsBatch', async () => {
      const csv = 'FirstName,LastName,Country,Notes\nAlice,Smith,UK,VIP\nBob,Jones,IE,';
      await component.handleCsvUpload(makeUploadEvent(csv));
      expect(firestoreSpy.addGuestsBatch).toHaveBeenCalled();
      const rows = firestoreSpy.addGuestsBatch.calls.mostRecent().args[0];
      expect(rows.length).toBe(2);
      expect(rows[0].firstName).toBe('Alice');
      expect(rows[0].lastName).toBe('Smith');
      expect(rows[0].countryOfResidence).toBe('UK');
      expect(rows[0].notes).toBe('VIP');
    });

    it('should correctly parse quoted fields containing commas', async () => {
      const csv = 'FirstName,LastName,Country,Notes\nAlice,Smith,UK,"Loves cake, wine, and dancing"';
      await component.handleCsvUpload(makeUploadEvent(csv));
      const rows = firestoreSpy.addGuestsBatch.calls.mostRecent().args[0];
      expect(rows.length).toBe(1);
      expect(rows[0].notes).toBe('Loves cake, wine, and dancing');
    });

    it('should tolerate whitespace in headers', async () => {
      const csv = ' FirstName , LastName ,Country,Notes\nAlice,Smith,UK,note';
      await component.handleCsvUpload(makeUploadEvent(csv));
      const rows = firestoreSpy.addGuestsBatch.calls.mostRecent().args[0];
      expect(rows.length).toBe(1);
      expect(rows[0].firstName).toBe('Alice');
      expect(rows[0].lastName).toBe('Smith');
    });

    it('should filter out rows missing FirstName or LastName', async () => {
      const csv = 'FirstName,LastName,Country,Notes\nAlice,Smith,UK,\n,Jones,IE,\nBob,,US,';
      await component.handleCsvUpload(makeUploadEvent(csv));
      const rows = firestoreSpy.addGuestsBatch.calls.mostRecent().args[0];
      expect(rows.length).toBe(1);
      expect(rows[0].firstName).toBe('Alice');
    });

    it('should default optional fields to empty strings when omitted', async () => {
      const csv = 'FirstName,LastName\nAlice,Smith';
      await component.handleCsvUpload(makeUploadEvent(csv));
      const rows = firestoreSpy.addGuestsBatch.calls.mostRecent().args[0];
      expect(rows[0].countryOfResidence).toBe('');
      expect(rows[0].notes).toBe('');
    });

    it('should add a success toast when guests are imported', async () => {
      const csv = 'FirstName,LastName\nAlice,Smith';
      await component.handleCsvUpload(makeUploadEvent(csv));
      const last = messageSpy.add.calls.mostRecent().args[0] as any;
      expect(last.severity).toBe('success');
      expect(last.detail).toContain('1');
    });

    it('should add a warn toast when no valid rows are present', async () => {
      const csv = 'FirstName,LastName\n,';
      await component.handleCsvUpload(makeUploadEvent(csv));
      expect(firestoreSpy.addGuestsBatch).not.toHaveBeenCalled();
      const last = messageSpy.add.calls.mostRecent().args[0] as any;
      expect(last.severity).toBe('warn');
    });

    it('should add an error toast when the firestore batch write rejects', async () => {
      firestoreSpy.addGuestsBatch.and.returnValue(Promise.reject(new Error('boom')));
      const csv = 'FirstName,LastName\nAlice,Smith';
      await component.handleCsvUpload(makeUploadEvent(csv));
      const last = messageSpy.add.calls.mostRecent().args[0] as any;
      expect(last.severity).toBe('error');
    });

    it('should reset the input value after handling', async () => {
      const csv = 'FirstName,LastName\nAlice,Smith';
      const event = makeUploadEvent(csv);
      await component.handleCsvUpload(event);
      const input = (event.target as any) as { value: string };
      expect(input.value).toBe('');
    });
  });
});