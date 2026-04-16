import { Timestamp } from '@angular/fire/firestore';

export interface Invitation {
  id: string;

  displayName: string;

  invitationCode: string;

  // Admin tracking
  email?: string;
  status: 'sent' | 'viewed' | 'responded';
  guestIds: string[];

  // Add message field
  message?: string | null;

  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}
