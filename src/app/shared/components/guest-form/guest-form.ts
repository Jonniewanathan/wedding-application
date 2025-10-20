import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FirestoreService } from '../../../core/services/firestore/firestore'; // Correct service import
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Guest } from '../../models/guest.model'; // Correct model import

// PrimeNG Modules
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-guest-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    Textarea,
    ButtonModule
  ],
  templateUrl: './guest-form.html',
})
export class GuestFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestoreService = inject(FirestoreService);
  public dialogRef = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);

  guestForm!: FormGroup;
  // This component is now only for EDITING existing guests' details
  guestToEdit!: Guest; // Assuming it's always passed in for editing

  ngOnInit(): void {
    this.guestToEdit = this.config.data?.guest;
    if (!this.guestToEdit) {
      console.error("GuestFormComponent requires a guest object in config data.");
      this.dialogRef.close(); // Close if no guest is provided
      return;
    }

    // Initialize the form with fields from the unified Guest model
    this.guestForm = this.fb.group({
      firstName: [this.guestToEdit.firstName || '', Validators.required],
      lastName: [this.guestToEdit.lastName || '', Validators.required],
      countryOfResidence: [this.guestToEdit.countryOfResidence || ''],
      notes: [this.guestToEdit.notes || '']
      // Removed: name, invitationCode, isAttending, mealChoice, plusOneName
      // These are handled elsewhere (RSVP form or invitation assignment)
    });
  }

  onSubmit() {
    if (this.guestForm.invalid || !this.guestToEdit) {
      return;
    }

    const formValue = this.guestForm.value;

    // Prepare the updated guest object, including the ID
    const updatedGuestData: Partial<Guest> & { id: string } = {
      id: this.guestToEdit.id, // Include the ID
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      countryOfResidence: formValue.countryOfResidence,
      notes: formValue.notes
    };

    // Call the correct service method for updating general details
    this.firestoreService.updateGuestDetails(updatedGuestData)
      .then(() => {
        this.dialogRef.close(true); // Signal success
      })
      .catch(error => {
        console.error("Failed to update guest details:", error);
        // Optionally show an error message within the form
      });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
