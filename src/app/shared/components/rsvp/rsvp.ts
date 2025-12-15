import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { FirestoreService } from '../../../core/services/firestore/firestore'; // Check path
import { Invitation } from '../../models/invitation.model';
import { Guest } from '../../models/guest.model';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox'; // We will style these as chips
import { RadioButtonModule } from 'primeng/radiobutton';

@Component({
  selector: 'app-rsvp',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    Textarea,
    CheckboxModule,
    RadioButtonModule
  ],
  standalone: true,
  templateUrl: './rsvp.html',
  styleUrl: './rsvp.scss'
})
export class Rsvp implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private firestoreService = inject(FirestoreService);

  invitation: Invitation | null = null;
  guests: Guest[] = [];
  rsvpForm!: FormGroup;
  isLoading = true;
  submitted = false;

  // Options for the chips
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
    const code = this.route.snapshot.paramMap.get('code');
    if (code) {
      this.loadInvitation(code);
    } else {
      // Handle missing code error
      this.isLoading = false;
    }
  }

  async loadInvitation(code: string) {
    try {
      const invite = await this.firestoreService.getInvitationByCode(code);
      if (invite) {
        this.invitation = invite;
        // Fetch the guests associated with this invite
        this.firestoreService.getGuestsForInvitation(invite.id).subscribe(guests => {
          this.guests = guests;
          this.initForm();
          this.isLoading = false;
        });
      } else {
        // Handle invalid code
        this.isLoading = false;
      }
    } catch (err) {
      console.error(err);
      this.isLoading = false;
    }
  }

  initForm() {
    this.rsvpForm = this.fb.group({
      guests: this.fb.array(this.guests.map(guest => this.createGuestGroup(guest))),
      message: [''] // Message for the couple
    });
  }

  createGuestGroup(guest: Guest): FormGroup {
    return this.fb.group({
      id: [guest.id],
      firstName: [guest.firstName], // Read-only mostly
      lastName: [guest.lastName],
      isAttending: [guest.isAttending, Validators.required],
      dietaryPreferences: [guest.dietaryPreferences || []],
      allergies: [guest.allergies || []],
      dietaryNotes: [guest.dietaryNotes || '']
    });
  }

  get guestControls() {
    return (this.rsvpForm.get('guests') as FormArray).controls;
  }

  async onSubmit() {
    if (this.rsvpForm.invalid || !this.invitation) return;

    const formValue = this.rsvpForm.value;
    const guestsToUpdate = formValue.guests as Guest[]; // Cast to Guest array

    try {
      await this.firestoreService.submitRsvpForGuests(this.invitation.id, guestsToUpdate);
      this.submitted = true;
    } catch (err) {
      console.error('RSVP Failed', err);
    }
  }
}
