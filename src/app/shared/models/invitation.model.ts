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

  // Outreach tracking — admin-managed flags for "have we sent this
  // invitation / nudged them yet?". Distinct from `status` above,
  // which tracks what the guest has done. Timestamps so the stats
  // page can compute "X days since last contact".
  sentAt?: Timestamp | null;
  firstReminderAt?: Timestamp | null;
  secondReminderAt?: Timestamp | null;

  // Set exactly once, when the guest submits their RSVP. Distinct from
  // updatedAt which is bumped by admin renames, outreach toggles, etc.
  // Use this for "responses over time" charts and message ordering.
  rsvpSubmittedAt?: Timestamp | null;

  // Firestore-only metadata. Optional because a session-restored
  // invitation (read back from localStorage) has these stripped — they
  // do not survive a JSON round-trip as Timestamp instances.
  createdAt?: Timestamp;
  updatedAt?: Timestamp | null;
}

/** The three outreach milestones the admin can tick off per invitation. */
export type InvitationOutreachStage = 'sentAt' | 'firstReminderAt' | 'secondReminderAt';
