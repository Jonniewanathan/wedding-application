import { Component, Signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Timestamp } from '@angular/fire/firestore';

import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { ActivityAction, ActivityLogEntry } from '../../../../shared/models/activity-log.model';

interface ActivityFeedRow extends ActivityLogEntry {
  /** Whether the surrounding band on the row should be shaded — alternates per actor. */
  isShaded: boolean;
  /** Pre-formatted relative time string for fast template rendering. */
  relativeTime: string;
}

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-log.html'
})
export class ActivityLog {
  private firestoreService = inject(FirestoreService);

  /** How many entries the feed loads. Pagination is a follow-up. */
  readonly FEED_LIMIT = 100;

  private readonly rawFeed: Signal<ActivityLogEntry[]> = toSignal(
    this.firestoreService.getRecentActivity(this.FEED_LIMIT),
    { initialValue: [] }
  );

  readonly feed = computed<ActivityFeedRow[]>(() => {
    const entries = this.rawFeed();
    const rows: ActivityFeedRow[] = [];
    let lastActor = '';
    let shaded = false;
    for (const entry of entries) {
      const actorKey = `${entry.actor.role}:${entry.actor.label}`;
      if (actorKey !== lastActor) {
        shaded = !shaded;
        lastActor = actorKey;
      }
      rows.push({
        ...entry,
        isShaded: shaded,
        relativeTime: this.formatRelative(entry.timestamp)
      });
    }
    return rows;
  });

  readonly totalCount = computed(() => this.feed().length);

  iconForAction(action: ActivityAction): string {
    switch (action) {
      case 'guest_added': return 'pi pi-user-plus';
      case 'guest_attendance_changed': return 'pi pi-check-circle';
      case 'guest_seated': return 'pi pi-tag';
      case 'guest_unseated': return 'pi pi-times';
      case 'guest_moved': return 'pi pi-arrow-right-arrow-left';
      case 'guest_updated': return 'pi pi-pencil';
      case 'invitation_created': return 'pi pi-id-card';
      case 'invitation_updated': return 'pi pi-pencil';
      case 'invitation_deleted': return 'pi pi-trash';
      case 'outreach_marked': return 'pi pi-send';
      case 'outreach_cleared': return 'pi pi-times-circle';
      case 'rsvp_submitted': return 'pi pi-envelope';
      case 'rsvp_timestamps_backfilled': return 'pi pi-history';
      default: return 'pi pi-circle';
    }
  }

  actorColorClass(role: 'admin' | 'guest' | 'system'): string {
    switch (role) {
      case 'guest': return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'admin': return 'text-slate-700 bg-slate-50 border-slate-200';
      case 'system': return 'text-amber-700 bg-amber-50 border-amber-100';
    }
  }

  /** "12 days ago" / "3 hours ago" / etc. */
  private formatRelative(value: Timestamp | undefined): string {
    if (!value) return '';
    const v = value as { toMillis?: () => number; seconds?: number };
    const ms = typeof v.toMillis === 'function'
      ? v.toMillis()
      : typeof v.seconds === 'number'
        ? v.seconds * 1000
        : null;
    if (ms === null) return '';
    const diff = Date.now() - ms;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour} hour${hour === 1 ? '' : 's'} ago`;
    const day = Math.floor(hour / 24);
    if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
    const date = new Date(ms);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}