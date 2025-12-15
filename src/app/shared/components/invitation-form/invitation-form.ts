import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Guest } from '../../models/guest.model';

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
  guestsToAssign: Guest[] = [];

  ngOnInit(): void {
    this.guestsToAssign = this.config.data?.guests || [];

    this.invitationForm = this.fb.group({
      displayName: ['', Validators.required]
      // Removed invitationCode field - it is now auto-generated in the service
    });
  }

  onSubmit(): void {
    if (this.invitationForm.invalid) {
      return;
    }
    this.dialogRef.close(this.invitationForm.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
