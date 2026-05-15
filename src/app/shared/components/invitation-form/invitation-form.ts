import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Guest } from '../../models/guest.model';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';

// PrimeNG Modules
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';

@Component({
  selector: 'app-invitation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, ChipModule, DragDropModule],
  templateUrl: './invitation-form.html',
})
export class InvitationForm implements OnInit {
  private fb = inject(FormBuilder);
  public dialogRef = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);

  invitationForm!: FormGroup;
  guestsToAssign: Guest[] = [];
  isEditMode = false;
  invitationId: string | null = null;

  ngOnInit(): void {
    this.guestsToAssign = this.config.data?.guests ? [...this.config.data.guests] : [];

    // Check if we were passed an existing invitation to edit
    const existingInvitation = this.config.data?.invitation;

    let defaultName = '';

    if (existingInvitation) {
      this.isEditMode = true;
      this.invitationId = existingInvitation.id;
      defaultName = existingInvitation.displayName;
    } else {
      // Add Mode: Auto-suggest a display name based on the most common last name
      if (this.guestsToAssign.length > 0) {
        const lastNames = this.guestsToAssign.map(g => g.lastName?.trim()).filter(Boolean);

        if (lastNames.length > 0) {
          const nameCounts = lastNames.reduce((acc, name) => {
            acc[name] = (acc[name] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const mostCommon = Object.keys(nameCounts).reduce((a, b) =>
            nameCounts[a] > nameCounts[b] ? a : b
          );

          defaultName = `The ${mostCommon} Family`;
        }
      }
    }

    this.invitationForm = this.fb.group({
      displayName: [defaultName, Validators.required],
      email: [existingInvitation?.email ?? '', Validators.email],
      phoneNumber: [existingInvitation?.phoneNumber ?? '']
    });
  }

  drop(event: CdkDragDrop<string[]>) {
    // This method handles the re-ordering of the guestsToAssign array
    // when a drag and drop event finishes
    moveItemInArray(this.guestsToAssign, event.previousIndex, event.currentIndex);
  }

  onSubmit(): void {
    if (this.invitationForm.invalid) {
      return;
    }

    // Normalise empty strings to null so the persisted shape stays
    // consistent with Firestore's "field present but empty" vs "field
    // missing" distinction.
    const { displayName, email, phoneNumber } = this.invitationForm.value;
    this.dialogRef.close({
      displayName,
      email: email?.trim() ? email.trim() : null,
      phoneNumber: phoneNumber?.trim() ? phoneNumber.trim() : null,
      orderedGuests: this.guestsToAssign
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
