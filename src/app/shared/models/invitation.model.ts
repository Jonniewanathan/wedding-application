import { Timestamp } from '@angular/fire/firestore';

export interface Invitation {
  id: string; // Firestore document ID
  invitationCode: string;
  displayName: string;
  hasResponded: boolean;
  respondedAt?: Timestamp | null;
  notes?: string;
}
