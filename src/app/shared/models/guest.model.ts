import { Timestamp } from '@angular/fire/firestore';

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;

  // FIX: Explicitly allow null
  invitationId?: string | null;

  // FIX: Explicitly allow null
  isAttending?: boolean | null;

  dietaryPreferences?: string[];
  allergies?: string[];
  dietaryNotes?: string;

  countryOfResidence?: string;
  notes?: string;

  type?: string; // Added this to satisfy the overlap check

  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}
