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

  // Day-of seating. Free-text so the admin can use either numbers
  // ("Table 1") or named tables ("Sunflower"). Null/missing means the
  // guest hasn't been seated yet.
  tableName?: string | null;

  type?: string;

  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}
