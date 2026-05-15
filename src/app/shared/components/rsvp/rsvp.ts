import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { GuestSessionService } from '../../../core/services/auth/guest-session/guest-session';
import { Invitation } from '../../models/invitation.model';
import { Guest } from '../../models/guest.model';
import { ALLERGY_OPTIONS, DIETARY_OPTIONS } from '../../models/dietary-options';
import { take } from 'rxjs/operators';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select';

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
    SelectModule
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

  // Sourced from the shared list so admin and RSVP forms agree on what
  // values can appear in dietaryPreferences[] / allergies[].
  readonly dietaryOptions = DIETARY_OPTIONS;
  readonly allergyOptions = ALLERGY_OPTIONS;

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
      // If they somehow got here without logging in, redirect
      this.router.navigate(['/']).catch(err => console.error(err));
      return;
    }

    // IMPORTANT FIX: Re-fetch the invitation from Firestore to ensure we have the absolute latest data.
    this.firestoreService.getInvitationByCode(this.invitation.invitationCode).then(freshInvitation => {
        if(freshInvitation) {
            this.invitation = freshInvitation;
            this.guestSession.login(freshInvitation);
        }
        // 2. Load the guests for this invitation
        this.loadGuests(this.invitation!.id);
    });
  }

  loadGuests(invitationId: string) {
    // FIX: Use take(1) to prevent the form from completely rebuilding if an admin edits a guest while the user is filling out the form
    this.firestoreService.getGuestsForInvitation(invitationId).pipe(take(1)).subscribe({
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
    // FIX: Safely map the guest order using the guestIds array, handling cases where a guest might not be in the array yet
    const guestIds = this.invitation?.guestIds || [];
    const orderedGuests = [...guests].sort((a, b) => {
      let indexA = guestIds.indexOf(a.id);
      let indexB = guestIds.indexOf(b.id);

      // If a guest ID is missing from the array, put them at the end
      if (indexA === -1) indexA = 9999;
      if (indexB === -1) indexB = 9999;

      return indexA - indexB;
    });

    this.rsvpForm = this.fb.group({
      // Create a form group for EACH guest, matching the invitation's intended order
      guests: this.fb.array(orderedGuests.map(guest => this.createGuestGroup(guest))),
      message: [this.invitation?.message || '', [Validators.maxLength(500)]]
    });
  }

  createGuestGroup(guest: Guest): FormGroup {
    const group = this.fb.group({
      id: [guest.id],
      firstName: [guest.firstName],
      lastName: [guest.lastName],

      // RSVP Logic
      isAttending: [guest.isAttending, Validators.required],

      needsBus: [guest.needsBus ?? null],
      busPickupLocation: [guest.busPickupLocation ?? null],

      // Chips (Arrays) — clone to ensure each guest's FormControl owns its
      // own array reference. Otherwise a mutating consumer (e.g. an
      // accidental shared reference from Firestore cache) would cause one
      // guest's selection to leak into another's. The real bug that
      // triggered this defence was duplicate <label for="..."> ids in the
      // template; the clone is belt-and-braces.
      dietaryPreferences: [[...(guest.dietaryPreferences || [])]],
      allergies: [[...(guest.allergies || [])]],
      dietaryNotes: [guest.dietaryNotes || '', [Validators.maxLength(200)]]
    });

    // 1. Logic for isAttending -> needsBus
    group.get('isAttending')?.valueChanges.subscribe(isAttending => {
      const needsBusControl = group.get('needsBus');
      const pickupControl = group.get('busPickupLocation');
      if (isAttending === true) {
        needsBusControl?.setValidators(Validators.required);
      } else {
        needsBusControl?.clearValidators();
        needsBusControl?.setValue(null, { emitEvent: false }); // Clear value if not attending

        pickupControl?.clearValidators();
        pickupControl?.setValue(null, { emitEvent: false });
      }
      needsBusControl?.updateValueAndValidity({ emitEvent: false });
      pickupControl?.updateValueAndValidity({ emitEvent: false });
    });

    // 2. Logic for needsBus -> busPickupLocation
    group.get('needsBus')?.valueChanges.subscribe(needsBus => {
      const pickupControl = group.get('busPickupLocation');
      if (needsBus === true) {
        pickupControl?.setValidators(Validators.required);
      } else {
        pickupControl?.clearValidators();
        pickupControl?.setValue(null, { emitEvent: false });
      }
      pickupControl?.updateValueAndValidity({ emitEvent: false });
    });

    // 3. Run initial checks to set state based on existing data
    const initialAttending = group.get('isAttending')?.value;
    if (initialAttending === true) {
      group.get('needsBus')?.setValidators(Validators.required);
    }

    const initialNeedsBus = group.get('needsBus')?.value;
    if (initialNeedsBus === true) {
      group.get('busPickupLocation')?.setValidators(Validators.required);
    }

    return group;
  }

  get guestControls() {
    return (this.rsvpForm.get('guests') as FormArray).controls;
  }

  async onSubmit() {
    if (this.rsvpForm.invalid || !this.invitation) return;

    this.isLoading = true;
    const formValue = this.rsvpForm.value;

    const guestsToUpdate = (formValue.guests as Guest[]).map(guest => {
        if(guest.needsBus === false || guest.needsBus === null) {
            guest.busPickupLocation = null;
        }
        return guest;
    });

    const message = formValue.message;

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
