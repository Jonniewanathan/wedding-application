import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { UnassignedGuest } from '../../models/unassigned-guest.model';

// PrimeNG Modules
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';

@Component({
  selector: 'app-invitation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, ChipModule],
  templateUrl: './invitation-form.html',
})
export class InvitationFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  public dialogRef = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);

  invitationForm!: FormGroup;
  guestsToAssign: UnassignedGuest[] = [];

  ngOnInit(): void {
    this.guestsToAssign = this.config.data?.guests || [];

    this.invitationForm = this.fb.group({
      displayName: ['', Validators.required],
      invitationCode: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    });
    console.log(this.guestsToAssign);
  }

  onSubmit(): void {
    if (this.invitationForm.invalid) {
      return;
    }
    // Close the dialog and pass the form data back to the admin component
    this.dialogRef.close(this.invitationForm.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
