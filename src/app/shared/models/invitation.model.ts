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

  // Firestore-only metadata. Optional because a session-restored
  // invitation (read back from localStorage) has these stripped — they
  // do not survive a JSON round-trip as Timestamp instances.
  createdAt?: Timestamp;
  updatedAt?: Timestamp | null;
}
