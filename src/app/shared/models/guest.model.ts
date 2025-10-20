import { Timestamp } from '@angular/fire/firestore';

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  countryOfResidence?: string;
  notes?: string;

  invitationId?: string | null;

  isAttending?: boolean | null;
  dietaryRestrictions?: string;
  type?: 'primary' | 'plus_one';

  // Timestamps
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}
