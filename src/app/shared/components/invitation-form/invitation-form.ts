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

    // Auto-suggest a display name based on the most common last name
    let defaultName = '';
    if (this.guestsToAssign.length > 0) {
      const lastNames = this.guestsToAssign.map(g => g.lastName?.trim()).filter(Boolean);

      if (lastNames.length > 0) {
        // Count occurrences of each last name
        const nameCounts = lastNames.reduce((acc, name) => {
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Find the most frequent last name
        const mostCommon = Object.keys(nameCounts).reduce((a, b) =>
          nameCounts[a] > nameCounts[b] ? a : b
        );

        defaultName = `The ${mostCommon} Family`;
      }
    }

    this.invitationForm = this.fb.group({
      displayName: [defaultName, Validators.required]
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
