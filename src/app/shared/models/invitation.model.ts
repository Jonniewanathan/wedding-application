import { Timestamp } from '@angular/fire/firestore';

export interface Invitation {
  id: string;

  displayName: string;

  invitationCode: string;

  // Admin tracking
  email?: string;
  status: 'sent' | 'viewed' | 'responded';
  guestIds: string[];

  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}
