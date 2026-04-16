import { Timestamp } from '@angular/fire/firestore';

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;

  invitationId?: string | null;
  isAttending?: boolean | null;

  // New bus fields
  needsBus?: boolean | null;
  busPickupLocation?: string | null;

  dietaryPreferences?: string[];
  allergies?: string[];
  dietaryNotes?: string;

  countryOfResidence?: string;
  notes?: string;

  type?: string;

  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}
