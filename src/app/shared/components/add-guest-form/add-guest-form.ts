import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

// PrimeNG Modules
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import {Textarea} from 'primeng/textarea';

@Component({
  selector: 'app-add-guest-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    Textarea
  ],
  templateUrl: './add-guest-form.html',
})
export class AddGuestForm implements OnInit {
  private fb = inject(FormBuilder);
  public dialogRef = inject(DynamicDialogRef);

  addGuestForm!: FormGroup;

  ngOnInit(): void {
    this.addGuestForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      countryOfResidence: [''],
      notes: [''],
    });
  }

  onSubmit(): void {
    if (this.addGuestForm.invalid) {
      return;
    }
    // Close the dialog and pass the form data back to the admin component
    this.dialogRef.close(this.addGuestForm.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
