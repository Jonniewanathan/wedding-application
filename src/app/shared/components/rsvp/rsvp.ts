import { Component } from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Button} from 'primeng/button';
import {Card} from 'primeng/card';
import {InputText} from 'primeng/inputtext';
import {RadioButton} from 'primeng/radiobutton';
import {Textarea} from 'primeng/textarea';
import {ToggleSwitch} from 'primeng/toggleswitch';

@Component({
  selector: 'app-rsvp',
  imports: [
    FormsModule,
    Button,
    ReactiveFormsModule,
    Card,
    InputText,
    RadioButton,
    Textarea,
    ToggleSwitch
  ],
  standalone: true,
  templateUrl: './rsvp.html',
  styleUrl: './rsvp.scss'
})
export class Rsvp {
  pageTitle = 'Kindly Respond';
  introText = 'We are so excited to celebrate with you! Please let us know your plans by August 1st, 2026.';

  rsvpForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.rsvpForm = this.fb.group({
      guestName: ['', Validators.required],
      attending: [null, Validators.required],
      plusOne: [false],
      plusOneName: [''],
      dietaryRestrictions: [''],
      message: ['']
    });

    // Add logic to make plusOneName required if plusOne is true
    this.rsvpForm.get('plusOne')?.valueChanges.subscribe(isPlusOne => {
      const plusOneNameControl = this.rsvpForm.get('plusOneName');
      if (isPlusOne) {
        plusOneNameControl?.setValidators([Validators.required]);
      } else {
        plusOneNameControl?.clearValidators();
      }
      plusOneNameControl?.updateValueAndValidity();
    });
  }

  submitRsvp(): void {
    if (this.rsvpForm.valid) {
      console.log('RSVP Submitted:', this.rsvpForm.value);
      // Here you would send the data to your Firebase service
      // e.g., this.firestoreService.submitRsvp(this.rsvpForm.value);
    } else {
      console.log('Form is invalid.');
      // Mark all fields as touched to show validation errors
      this.rsvpForm.markAllAsTouched();
    }
  }
}
