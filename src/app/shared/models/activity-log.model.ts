import { Timestamp } from '@angular/fire/firestore';

/**
 * One entry in the admin activity log. Stored in the top-level
 * `activity_log` Firestore collection.
 *
 * The `details` map carries action-specific context (e.g. before/after
 * values, target invitation name, RSVP message). It's deliberately
 * loosely typed because we want this to be a write-many-evolve-often
 * audit stream rather than a strict schema.
 */
export interface ActivityLogEntry {
  id: string;

  /** Server-side time the action occurred. */
  timestamp?: Timestamp;

  /** Who performed the action. */
  actor: ActivityActor;

  /** Coarse-grained type of event — used for filtering and rendering. */
  action: ActivityAction;

  /** What the action touched. */
  subject: ActivitySubject;

  /** Free-form human-readable summary suitable for direct display. */
  summary: string;

  /** Optional structured context. */
  details?: Record<string, unknown> | null;
}

export interface ActivityActor {
  /** 'admin' for an authenticated couple member, 'guest' for an RSVP submission. */
  role: 'admin' | 'guest' | 'system';
  /** Email of the signed-in admin, display label of the invitation, or 'system'. */
  label: string;
}

export interface ActivitySubject {
  type: 'guest' | 'invitation' | 'table';
  id: string;
  /** Denormalised display label so the feed renders fast without joins. */
  name: string;
}

export type ActivityAction =
  | 'guest_added'
  | 'guest_attendance_changed'
  | 'guest_seated'
  | 'guest_unseated'
  | 'guest_seat_assigned'
  | 'guest_moved'
  | 'guest_updated'
  | 'invitation_created'
  | 'invitation_updated'
  | 'invitation_deleted'
  | 'outreach_marked'
  | 'outreach_cleared'
  | 'rsvp_submitted'
  | 'rsvp_timestamps_backfilled'
  | 'invitation_codes_backfilled'
  | 'table_created'
  | 'table_updated'
  | 'table_deleted'
  | 'layout_saved'
  | 'seating_saved';