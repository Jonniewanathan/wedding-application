import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GuestForm } from './guest-form';
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { Guest } from '../../models/guest.model';

function makeGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 'g1',
    firstName: 'Alice',
    lastName: 'Smith',
    countryOfResidence: 'UK',
    notes: 'VIP',
    isAttending: true,
    dietaryPreferences: ['Vegetarian'],
    allergies: ['Nuts'],
    dietaryNotes: 'No mushrooms',
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp,
    ...overrides
  };
}

describe('GuestForm', () => {
  let component: GuestForm;
  let fixture: ComponentFixture<GuestForm>;
  let dialogRef: jasmine.SpyObj<DynamicDialogRef>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let config: DynamicDialogConfig;

  function setup(guest: Guest | null = null) {
    dialogRef = jasmine.createSpyObj<DynamicDialogRef>('DynamicDialogRef', ['close']);
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'addGuest',
      'updateGuestDetails'
    ]);
    firestoreSpy.addGuest.and.returnValue(Promise.resolve());
    firestoreSpy.updateGuestDetails.and.returnValue(Promise.resolve());

    config = { data: { guest } } as DynamicDialogConfig;

    TestBed.configureTestingModule({
      imports: [GuestForm],
      providers: [
        { provide: DynamicDialogRef, useValue: dialogRef },
        { provide: DynamicDialogConfig, useValue: config },
        { provide: FirestoreService, useValue: firestoreSpy }
      ]
    });

    fixture = TestBed.createComponent(GuestForm);
    component = fixture.componentInstance;
    component.ngOnInit();
  }

  it('should create', () => {
    setup();
    expect(component).toBeTruthy();
  });

  describe('ADD mode (no guest in config)', () => {
    beforeEach(() => setup(null));

    it('should set isEditMode to false', () => {
      expect(component.isEditMode).toBeFalse();
      expect(component.guestToEdit).toBeNull();
    });

    it('should initialise the form with empty values', () => {
      expect(component.guestForm.value.firstName).toBe('');
      expect(component.guestForm.value.lastName).toBe('');
    });

    it('should require firstName and lastName', () => {
      expect(component.guestForm.valid).toBeFalse();
      component.guestForm.patchValue({ firstName: 'X', lastName: 'Y' });
      expect(component.guestForm.valid).toBeTrue();
    });

    it('should call firestoreService.addGuest on valid submit', async () => {
      component.guestForm.patchValue({
        firstName: 'Bob',
        lastName: 'Jones',
        countryOfResidence: 'IE',
        notes: 'note'
      });
      await component.onSubmit();
      expect(firestoreSpy.addGuest).toHaveBeenCalledWith('Bob', 'Jones', 'IE', 'note');
      expect(firestoreSpy.updateGuestDetails).not.toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });
  });

  describe('EDIT mode (guest in config)', () => {
    beforeEach(() => setup(makeGuest()));

    it('should set isEditMode to true and capture the guest', () => {
      expect(component.isEditMode).toBeTrue();
      expect(component.guestToEdit?.id).toBe('g1');
    });

    it('should prefill the form with the existing guest values', () => {
      expect(component.guestForm.value.firstName).toBe('Alice');
      expect(component.guestForm.value.lastName).toBe('Smith');
      expect(component.guestForm.value.countryOfResidence).toBe('UK');
      expect(component.guestForm.value.dietaryPreferences).toEqual(['Vegetarian']);
      expect(component.guestForm.value.allergies).toEqual(['Nuts']);
    });

    it('should call firestoreService.updateGuestDetails on valid submit', async () => {
      component.guestForm.patchValue({ notes: 'updated note' });
      await component.onSubmit();
      expect(firestoreSpy.updateGuestDetails).toHaveBeenCalled();
      const arg = firestoreSpy.updateGuestDetails.calls.mostRecent().args[0] as any;
      expect(arg.id).toBe('g1');
      expect(arg.notes).toBe('updated note');
      expect(firestoreSpy.addGuest).not.toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });
  });

  it('should not submit when the form is invalid', async () => {
    setup(null);
    // form is empty so invalid (firstName/lastName required)
    await component.onSubmit();
    expect(firestoreSpy.addGuest).not.toHaveBeenCalled();
    expect(firestoreSpy.updateGuestDetails).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should not close the dialog when firestore call rejects', async () => {
    setup(null);
    firestoreSpy.addGuest.and.returnValue(Promise.reject(new Error('boom')));
    component.guestForm.patchValue({ firstName: 'A', lastName: 'B' });
    await component.onSubmit();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.isLoading).toBeFalse();
  });

  it('should expose dietary and allergy options', () => {
    setup(null);
    expect(component.dietaryOptions.length).toBeGreaterThan(0);
    expect(component.allergyOptions.length).toBeGreaterThan(0);
  });
});