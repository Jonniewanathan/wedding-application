import { Timestamp } from '@angular/fire/firestore';

export interface UnassignedGuest {
  id: string;
  firstName: string;
  lastName: string;
  countryOfResidence?: string;
  notes?: string;
  createdAt: Timestamp;
}
