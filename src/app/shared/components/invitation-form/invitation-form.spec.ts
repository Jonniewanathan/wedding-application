import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InvitationForm } from './invitation-form';
import { Guest } from '../../models/guest.model';

function g(id: string, firstName: string, lastName: string): Guest {
  return {
    id,
    firstName,
    lastName,
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp
  };
}

describe('InvitationForm', () => {
  let component: InvitationForm;
  let fixture: ComponentFixture<InvitationForm>;
  let dialogRef: jasmine.SpyObj<DynamicDialogRef>;
  let config: DynamicDialogConfig;

  function setup(guests: Guest[] = []) {
    dialogRef = jasmine.createSpyObj<DynamicDialogRef>('DynamicDialogRef', ['close']);
    config = { data: { guests } } as DynamicDialogConfig;

    TestBed.configureTestingModule({
      imports: [InvitationForm],
      providers: [
        { provide: DynamicDialogRef, useValue: dialogRef },
        { provide: DynamicDialogConfig, useValue: config }
      ]
    });

    fixture = TestBed.createComponent(InvitationForm);
    component = fixture.componentInstance;
    component.ngOnInit();
  }

  it('should create', () => {
    setup();
    expect(component).toBeTruthy();
  });

  it('should default displayName to empty when no guests are supplied', () => {
    setup([]);
    expect(component.invitationForm.value.displayName).toBe('');
  });

  it('should require displayName', () => {
    setup([]);
    expect(component.invitationForm.valid).toBeFalse();
    component.invitationForm.patchValue({ displayName: 'The Smiths' });
    expect(component.invitationForm.valid).toBeTrue();
  });

  it('should auto-suggest "The {Family} Family" from the most common last name', () => {
    setup([g('1', 'Alice', 'Smith'), g('2', 'Bob', 'Smith'), g('3', 'Carol', 'Jones')]);
    expect(component.invitationForm.value.displayName).toBe('The Smith Family');
  });

  it('should handle a single guest by using their last name', () => {
    setup([g('1', 'Alice', 'Smith')]);
    expect(component.invitationForm.value.displayName).toBe('The Smith Family');
  });

  it('should expose the guests passed via config.data', () => {
    const guests = [g('1', 'A', 'B'), g('2', 'C', 'D')];
    setup(guests);
    expect(component.guestsToAssign).toEqual(guests);
  });

  it('should not close the dialog when the form is invalid', () => {
    setup([]);
    component.invitationForm.patchValue({ displayName: '' });
    component.onSubmit();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should close the dialog with the form value and ordered guests on submit', () => {
    setup([]);
    component.invitationForm.patchValue({ displayName: 'The Test Family' });
    component.onSubmit();
    expect(dialogRef.close).toHaveBeenCalledWith({
      displayName: 'The Test Family',
      email: null,
      phoneNumber: null,
      orderedGuests: []
    });
  });

  it('should include email and phoneNumber in the close payload when provided', () => {
    setup([]);
    component.invitationForm.patchValue({
      displayName: 'The Test Family',
      email: 'them@example.com',
      phoneNumber: '+353 85 1234567'
    });
    component.onSubmit();
    expect(dialogRef.close).toHaveBeenCalledWith({
      displayName: 'The Test Family',
      email: 'them@example.com',
      phoneNumber: '+353 85 1234567',
      orderedGuests: []
    });
  });

  it('should trim surrounding whitespace from the phoneNumber on submit', () => {
    setup([]);
    component.invitationForm.patchValue({
      displayName: 'The Test Family',
      phoneNumber: '  +353 85 1234567 '
    });
    component.onSubmit();
    const payload = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0];
    expect(payload.phoneNumber).toBe('+353 85 1234567');
  });

  it('should normalise whitespace-only email and phoneNumber to null on submit', () => {
    setup([]);
    component.invitationForm.patchValue({
      displayName: 'The Test Family',
      phoneNumber: '   '
    });
    component.onSubmit();
    const payload = (dialogRef.close as jasmine.Spy).calls.mostRecent().args[0];
    expect(payload.email).toBeNull();
    expect(payload.phoneNumber).toBeNull();
  });

  it('should block submission when the email field is invalid', () => {
    setup([]);
    component.invitationForm.patchValue({ displayName: 'X', email: 'not-an-email' });
    component.onSubmit();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should close the dialog with no argument on cancel', () => {
    setup([]);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});