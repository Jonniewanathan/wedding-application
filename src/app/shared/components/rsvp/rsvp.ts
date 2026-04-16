import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { GuestSessionService } from '../../../core/services/auth/guest-session/guest-session';
import { Invitation } from '../../models/invitation.model';
import { Guest } from '../../models/guest.model';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select'; // Fixed: Changed from DropdownModule

@Component({
  selector: 'app-rsvp',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    RadioButtonModule,
    ProgressSpinnerModule,
    TranslateModule,
    SelectModule // Fixed: Changed from DropdownModule
  ],
  templateUrl: './rsvp.html',
  styleUrl: './rsvp.scss'
})
export class Rsvp implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private firestoreService = inject(FirestoreService);
  private guestSession = inject(GuestSessionService);
  public translate = inject(TranslateService);

  invitation: Invitation | null = null;
  rsvpForm!: FormGroup;

  isLoading = true;
  submitted = false;

  // Options for the chips
  dietaryOptions = [
    { labelKey: 'RSVP.DIETARY_VEGETARIAN', value: 'Vegetarian' },
    { labelKey: 'RSVP.DIETARY_VEGAN', value: 'Vegan' },
    { labelKey: 'RSVP.DIETARY_PESCATARIAN', value: 'Pescatarian' },
    { labelKey: 'RSVP.DIETARY_CHILDRENS', value: 'Children\'s Meal' },
  ];

  allergyOptions = [
    { labelKey: 'RSVP.ALLERGY_NUTS', value: 'Nuts' },
    { labelKey: 'RSVP.ALLERGY_SHELLFISH', value: 'Shellfish' },
    { labelKey: 'RSVP.ALLERGY_EGGS', value: 'Eggs' },
    { labelKey: 'RSVP.ALLERGY_GLUTEN_FREE', value: 'Gluten Free' },
    { labelKey: 'RSVP.ALLERGY_DAIRY_FREE', value: 'Dairy Free' }
  ];

  // Options for bus pickup
  busPickupOptions = [
    { label: 'Punta Umbría', value: 'Punta Umbría' },
    { label: 'Valverde Del Camino', value: 'Valverde Del Camino' },
    { label: 'Huelva', value: 'Huelva' }
  ];

  ngOnInit(): void {
    // 1. Get the logged-in invitation from the session
    this.invitation = this.guestSession.currentInvitationValue;

    if (!this.invitation) {
      // If they somehow got here without logging in (guard should prevent this), redirect
      this.router.navigate(['/']);
      return;
    }

    // IMPORTANT FIX: Re-fetch the invitation from Firestore to ensure we have the absolute latest data,
    // including any newly saved messages, instead of relying on the potentially stale session data.
    this.firestoreService.getInvitationByCode(this.invitation.invitationCode).then(freshInvitation => {
        if(freshInvitation) {
            this.invitation = freshInvitation;
            // Also update the session with the fresh data
            this.guestSession.login(freshInvitation);
        }
        // 2. Load the guests for this invitation
        this.loadGuests(this.invitation!.id);
    });
  }

  loadGuests(invitationId: string) {
    this.firestoreService.getGuestsForInvitation(invitationId).subscribe({
      next: (guests) => {
        this.initForm(guests);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading guests', err);
        this.isLoading = false;
      }
    });
  }

  initForm(guests: Guest[]) {
    this.rsvpForm = this.fb.group({
      // Create a form group for EACH guest
      guests: this.fb.array(guests.map(guest => this.createGuestGroup(guest))),
      message: [this.invitation?.message || '', [Validators.maxLength(500)]] // Populate with the fresh message
    });
  }

  createGuestGroup(guest: Guest): FormGroup {
    const group = this.fb.group({
      id: [guest.id],
      firstName: [guest.firstName],
      lastName: [guest.lastName],

      // RSVP Logic
      isAttending: [guest.isAttending, Validators.required],

      // Bus Logic - populate with existing data!
      needsBus: [guest.needsBus ?? null],
      busPickupLocation: [guest.busPickupLocation ?? null],

      // Chips (Arrays)
      dietaryPreferences: [guest.dietaryPreferences || []],
      allergies: [guest.allergies || []],
      dietaryNotes: [guest.dietaryNotes || '', [Validators.maxLength(200)]] // Added character limit
    });

    // Dynamically manage busPickupLocation validator based on needsBus
    group.get('needsBus')?.valueChanges.subscribe(needsBus => {
      const pickupControl = group.get('busPickupLocation');
      if (needsBus === true) {
        pickupControl?.setValidators(Validators.required);
      } else {
        pickupControl?.clearValidators();
        // IMPORTANT FIX: Don't automatically clear the value when it changes to false if we are just initializing the form
        // We only want to clear it if the user interactively changes it to false.
        // pickupControl?.setValue(null);
      }
      pickupControl?.updateValueAndValidity({ emitEvent: false }); // Avoid infinite loops
    });

    // Trigger valueChanges once to set initial state correctly WITHOUT clearing the existing value
    const needsBusVal = group.get('needsBus')?.value;
    if (needsBusVal === true) {
       group.get('busPickupLocation')?.setValidators(Validators.required);
       group.get('busPickupLocation')?.updateValueAndValidity({ emitEvent: false });
    }

    return group;
  }

  // Helper to access the FormArray in HTML
  get guestControls() {
    return (this.rsvpForm.get('guests') as FormArray).controls;
  }

  async onSubmit() {
    if (this.rsvpForm.invalid || !this.invitation) return;

    this.isLoading = true;
    const formValue = this.rsvpForm.value;

    // Cleanup data before saving: If they said they don't need a bus, ensure the location is saved as null
    const guestsToUpdate = (formValue.guests as Guest[]).map(guest => {
        if(guest.needsBus === false || guest.needsBus === null) {
            guest.busPickupLocation = null;
        }
        return guest;
    });

    const message = formValue.message; // Extract message

    try {
      await this.firestoreService.submitRsvpForGuests(this.invitation.id, guestsToUpdate, message);
      this.submitted = true;
      this.isLoading = false;
    } catch (err) {
      console.error('RSVP Failed', err);
      this.isLoading = false;
    }
  }
}
