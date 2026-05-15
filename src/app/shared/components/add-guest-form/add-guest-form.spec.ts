import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { AddGuestForm } from './add-guest-form';

describe('AddGuestForm', () => {
  let component: AddGuestForm;
  let fixture: ComponentFixture<AddGuestForm>;
  let dialogRef: jasmine.SpyObj<DynamicDialogRef>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<DynamicDialogRef>('DynamicDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [AddGuestForm],
      providers: [{ provide: DynamicDialogRef, useValue: dialogRef }]
    }).compileComponents();

    fixture = TestBed.createComponent(AddGuestForm);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialise the form with empty fields', () => {
    expect(component.addGuestForm.value).toEqual({
      firstName: '',
      lastName: '',
      countryOfResidence: '',
      notes: ''
    });
  });

  it('should require firstName and lastName', () => {
    expect(component.addGuestForm.get('firstName')?.valid).toBeFalse();
    expect(component.addGuestForm.get('lastName')?.valid).toBeFalse();
  });

  it('should be valid once firstName and lastName are populated', () => {
    component.addGuestForm.patchValue({ firstName: 'A', lastName: 'B' });
    expect(component.addGuestForm.valid).toBeTrue();
  });

  it('should not close the dialog when the form is invalid', () => {
    component.onSubmit();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should close the dialog with the form value when valid', () => {
    component.addGuestForm.setValue({
      firstName: 'Alice',
      lastName: 'Smith',
      countryOfResidence: 'UK',
      notes: 'VIP'
    });
    component.onSubmit();
    expect(dialogRef.close).toHaveBeenCalledWith({
      firstName: 'Alice',
      lastName: 'Smith',
      countryOfResidence: 'UK',
      notes: 'VIP'
    });
  });

  it('should close the dialog with no argument on cancel', () => {
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});