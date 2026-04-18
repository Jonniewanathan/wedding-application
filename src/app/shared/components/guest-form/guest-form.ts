import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Guest } from '../../models/guest.model';

// PrimeNG Modules
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-guest-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    RadioButtonModule,
    CheckboxModule,
    SelectModule
  ],
  templateUrl: './guest-form.html',
  styleUrl: './guest-form.scss'
})
export class GuestFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestoreService = inject(FirestoreService);
  public dialogRef = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);

  guestForm!: FormGroup;
  guestToEdit: Guest | null = null;
  isEditMode = false;
  isLoading = false;

  // Options matching the public RSVP page
  dietaryOptions = [
    { label: 'Vegetarian', value: 'Vegetarian' },
    { label: 'Vegan', value: 'Vegan' },
    { label: 'Pescatarian', value: 'Pescatarian' },
    { label: 'Children\'s Meal', value: 'Children\'s Meal' },
  ];

  allergyOptions = [
    { label: 'Nuts', value: 'Nuts' },
    { label: 'Shellfish', value: 'Shellfish' },
    { label: 'Eggs', value: 'Eggs' },
    { label: 'Gluten', value: 'Gluten Free' },
    { label: 'Dairy', value: 'Dairy Free' }
  ];

  busPickupOptions = [
    { label: 'Punta Umbría', value: 'Punta Umbría' },
    { label: 'Valverde Del Camino', value: 'Valverde Del Camino' },
    { label: 'Huelva', value: 'Huelva' }
  ];

  ngOnInit(): void {
    this.guestToEdit = this.config.data?.guest || null;
    this.isEditMode = !!this.guestToEdit;

    this.guestForm = this.fb.group({
      // Basic Info
      firstName: [this.guestToEdit?.firstName || '', Validators.required],
      lastName: [this.guestToEdit?.lastName || '', Validators.required],
      countryOfResidence: [this.guestToEdit?.countryOfResidence || ''],
      notes: [this.guestToEdit?.notes || ''],

      // RSVP Details
      isAttending: [this.guestToEdit?.isAttending ?? null],
      needsBus: [this.guestToEdit?.needsBus ?? null],
      busPickupLocation: [this.guestToEdit?.busPickupLocation ?? null],
      dietaryPreferences: [this.guestToEdit?.dietaryPreferences || []],
      allergies: [this.guestToEdit?.allergies || []],
      dietaryNotes: [this.guestToEdit?.dietaryNotes || '', Validators.maxLength(200)]
    });

    // Add dynamic validators based on attendance and bus needs
    this.setupConditionalValidators();
  }

  private setupConditionalValidators(): void {
    const isAttendingControl = this.guestForm.get('isAttending');
    const needsBusControl = this.guestForm.get('needsBus');
    const busPickupControl = this.guestForm.get('busPickupLocation');

    isAttendingControl?.valueChanges.subscribe(isAttending => {
      if (isAttending === true) {
        // If attending, they might need a bus
      } else {
        // If not attending, they definitely don't need a bus
        needsBusControl?.setValue(null, { emitEvent: false });
        busPickupControl?.setValue(null, { emitEvent: false });
        busPickupControl?.clearValidators();
      }
      needsBusControl?.updateValueAndValidity({ emitEvent: false });
    });

    needsBusControl?.valueChanges.subscribe(needsBus => {
      if (needsBus === true && isAttendingControl?.value === true) {
        busPickupControl?.setValidators(Validators.required);
      } else {
        busPickupControl?.clearValidators();
        busPickupControl?.setValue(null, { emitEvent: false });
      }
      busPickupControl?.updateValueAndValidity({ emitEvent: false });
    });

    // Initial check
    isAttendingControl?.updateValueAndValidity();
    needsBusControl?.updateValueAndValidity();
  }

  async onSubmit() {
    if (this.guestForm.invalid) return;

    this.isLoading = true;
    const formValue = this.guestForm.value;

    try {
      if (this.isEditMode && this.guestToEdit) {
        // --- EDIT MODE: Updates everything ---
        await this.firestoreService.updateGuestDetails({
          id: this.guestToEdit.id,
          ...formValue
        });
      } else {
        // --- ADD MODE: Adds basic info ---
        await this.firestoreService.addGuest(
          formValue.firstName,
          formValue.lastName,
          formValue.countryOfResidence,
          formValue.notes
        );
      }

      this.dialogRef.close(true);
    } catch (error) {
      console.error("Operation failed:", error);
    } finally {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
