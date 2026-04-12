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
    CheckboxModule
  ],
  templateUrl: './guest-form.html',
  styleUrl: './guest-form.scss' // Ensure you have the chip styles here
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
    { label: 'Gluten Free', value: 'Gluten Free' },
    { label: 'Dairy Free', value: 'Dairy Free' }
  ];

  allergyOptions = [
    { label: 'Peanuts', value: 'Peanuts' },
    { label: 'Tree Nuts', value: 'Tree Nuts' },
    { label: 'Shellfish', value: 'Shellfish' },
    { label: 'Eggs', value: 'Eggs' }
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

      // RSVP Details (Only relevant if editing, but safe to init for adding too)
      isAttending: [this.guestToEdit?.isAttending ?? null], // null = pending
      dietaryPreferences: [this.guestToEdit?.dietaryPreferences || []],
      allergies: [this.guestToEdit?.allergies || []],
      dietaryNotes: [this.guestToEdit?.dietaryNotes || '']
    });
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
        // --- ADD MODE: Adds basic info (RSVP usually null here) ---
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
