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

  // Day-of seating. References tables/{id}. Null/missing means unseated.
  tableId?: string | null;
  // 1-based seat position within the table (seat 1 = 12 o'clock for round tables).
  seatNumber?: number | null;

  type?: string;

  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}
