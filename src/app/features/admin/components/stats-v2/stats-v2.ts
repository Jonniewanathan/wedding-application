import { Component, Signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Timestamp } from '@angular/fire/firestore';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Ripple } from 'primeng/ripple';
import * as Papa from 'papaparse';

import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { Guest } from '../../../../shared/models/guest.model';
import { Invitation } from '../../../../shared/models/invitation.model';

interface FollowUpEntry {
  invitation: Invitation;
  reasonKey: 'not-sent' | 'first-reminder-due' | 'second-reminder-due' | 'no-response-after-reminders';
  reasonLabel: string;
  daysSinceLastContact: number | null;
}

@Component({
  selector: 'app-stats-v2',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, ButtonModule, TableModule, Ripple],
  templateUrl: './stats-v2.html'
})
export class StatsV2 {
  private firestoreService = inject(FirestoreService);

  // Tunables — when the follow-up panel decides a reminder is overdue.
  private readonly DAYS_AFTER_SEND_BEFORE_FIRST_REMINDER = 14;
  private readonly DAYS_AFTER_FIRST_BEFORE_SECOND_REMINDER = 7;

  readonly allGuests: Signal<Guest[]> = toSignal(
    this.firestoreService.getAllGuests(),
    { initialValue: [] }
  );
  readonly allInvitations: Signal<Invitation[]> = toSignal(
    this.firestoreService.getInvitations(),
    { initialValue: [] }
  );

  // -------------------------------------------------------------------------
  // Hero / KPI metrics
  // -------------------------------------------------------------------------

  readonly totalInvited = computed(() => this.allGuests().length);
  readonly attendingCount = computed(
    () => this.allGuests().filter(g => g.isAttending === true).length
  );
  readonly declinedCount = computed(
    () => this.allGuests().filter(g => g.isAttending === false).length
  );
  readonly pendingCount = computed(
    () => this.allGuests().filter(g => g.isAttending === null || g.isAttending === undefined).length
  );

  readonly responseRate = computed(() => {
    const total = this.totalInvited();
    if (total === 0) return 0;
    return Math.round(((this.attendingCount() + this.declinedCount()) / total) * 100);
  });

  /** Heuristic: a "Children's Meal" dietary chip implies the guest is a child. */
  readonly kidCount = computed(
    () =>
      this.allGuests().filter(
        g =>
          g.isAttending === true &&
          (g.dietaryPreferences || []).includes("Children's Meal")
      ).length
  );
  readonly adultCount = computed(() => this.attendingCount() - this.kidCount());

  // -------------------------------------------------------------------------
  // Follow-up panel
  // -------------------------------------------------------------------------

  readonly followUps = computed<FollowUpEntry[]>(() => {
    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;
    const entries: FollowUpEntry[] = [];

    for (const inv of this.allInvitations()) {
      // Already responded — nothing to do.
      if (this.isResponded(inv)) continue;

      const sentAt = this.tsToMs(inv.sentAt);
      const firstReminderAt = this.tsToMs(inv.firstReminderAt);
      const secondReminderAt = this.tsToMs(inv.secondReminderAt);

      if (sentAt === null) {
        entries.push({
          invitation: inv,
          reasonKey: 'not-sent',
          reasonLabel: 'Not yet sent',
          daysSinceLastContact: null
        });
        continue;
      }

      if (secondReminderAt !== null) {
        entries.push({
          invitation: inv,
          reasonKey: 'no-response-after-reminders',
          reasonLabel: 'No response after both reminders',
          daysSinceLastContact: Math.floor((now - secondReminderAt) / dayMs)
        });
        continue;
      }

      if (firstReminderAt !== null) {
        const daysSince = Math.floor((now - firstReminderAt) / dayMs);
        if (daysSince >= this.DAYS_AFTER_FIRST_BEFORE_SECOND_REMINDER) {
          entries.push({
            invitation: inv,
            reasonKey: 'second-reminder-due',
            reasonLabel: '2nd reminder due',
            daysSinceLastContact: daysSince
          });
        }
        continue;
      }

      const daysSinceSent = Math.floor((now - sentAt) / dayMs);
      if (daysSinceSent >= this.DAYS_AFTER_SEND_BEFORE_FIRST_REMINDER) {
        entries.push({
          invitation: inv,
          reasonKey: 'first-reminder-due',
          reasonLabel: '1st reminder due',
          daysSinceLastContact: daysSinceSent
        });
      }
    }

    // Sort by urgency: never-sent first, then by days-since-last-contact desc.
    const urgencyOrder: Record<FollowUpEntry['reasonKey'], number> = {
      'not-sent': 0,
      'no-response-after-reminders': 1,
      'second-reminder-due': 2,
      'first-reminder-due': 3
    };
    return entries.sort((a, b) => {
      const orderDelta = urgencyOrder[a.reasonKey] - urgencyOrder[b.reasonKey];
      if (orderDelta !== 0) return orderDelta;
      return (b.daysSinceLastContact ?? 0) - (a.daysSinceLastContact ?? 0);
    });
  });

  // -------------------------------------------------------------------------
  // Charts
  // -------------------------------------------------------------------------

  readonly chartBaseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { usePointStyle: true, font: { size: 11 } } }
    }
  };

  readonly attendanceStackedBarData = computed(() => ({
    labels: ['Attendance'],
    datasets: [
      { label: 'Attending', data: [this.attendingCount()], backgroundColor: '#10b981' },
      { label: 'Declined', data: [this.declinedCount()], backgroundColor: '#ef4444' },
      { label: 'Pending', data: [this.pendingCount()], backgroundColor: '#cbd5e1' }
    ]
  }));

  readonly attendanceStackedBarOptions = {
    ...this.chartBaseOptions,
    indexAxis: 'y' as const,
    scales: {
      x: { stacked: true, ticks: { precision: 0 } },
      y: { stacked: true, display: false }
    }
  };

  /** Daily cumulative responses, bucketed by Guest.updatedAt (approx submission time). */
  readonly dailyResponsesData = computed(() => {
    const respondedGuests = this.allGuests().filter(
      g => g.isAttending === true || g.isAttending === false
    );
    const updates = respondedGuests
      .map(g => this.tsToMs(g.updatedAt))
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);

    if (updates.length === 0) return null;

    const dayMs = 1000 * 60 * 60 * 24;
    const startDay = Math.floor(updates[0] / dayMs);
    const endDay = Math.floor(Date.now() / dayMs);

    const labels: string[] = [];
    const data: number[] = [];
    let cumulative = 0;
    let updateIdx = 0;

    for (let day = startDay; day <= endDay; day++) {
      while (updateIdx < updates.length && Math.floor(updates[updateIdx] / dayMs) === day) {
        cumulative++;
        updateIdx++;
      }
      labels.push(new Date(day * dayMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
      data.push(cumulative);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Cumulative responses',
          data,
          borderColor: '#0f172a',
          backgroundColor: 'rgba(15, 23, 42, 0.08)',
          tension: 0.3,
          fill: true
        }
      ]
    };
  });

  readonly dailyResponsesOptions = {
    ...this.chartBaseOptions,
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }
    }
  };

  /** Bus pickup locations as ranked horizontal bar, with absolute total. */
  readonly busTotalSeats = computed(
    () => this.allGuests().filter(g => g.isAttending === true && g.needsBus === true).length
  );

  readonly busLocationsBarData = computed(() => {
    const counts = this.allGuests()
      .filter(g => g.isAttending === true && g.needsBus === true && g.busPickupLocation)
      .reduce((acc, g) => {
        const loc = g.busPickupLocation as string;
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;

    return {
      labels: sorted.map(([loc]) => loc),
      datasets: [
        {
          data: sorted.map(([, count]) => count),
          backgroundColor: '#0f172a',
          borderRadius: 2
        }
      ]
    };
  });

  readonly rankedBarOptions = {
    ...this.chartBaseOptions,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
  };

  /**
   * Dietary chart — fixes the v1 bug where guests with no preference were
   * silently excluded. Includes a "No preference" bar so proportions tell
   * the truth.
   */
  readonly dietaryBarData = computed(() => {
    const attending = this.allGuests().filter(g => g.isAttending === true);
    const counts: Record<string, number> = {};

    let noPreference = 0;
    for (const g of attending) {
      const prefs = g.dietaryPreferences || [];
      if (prefs.length === 0) {
        noPreference++;
      } else {
        for (const p of prefs) counts[p] = (counts[p] || 0) + 1;
      }
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (noPreference > 0) sorted.push(['No preference', noPreference]);

    if (sorted.length === 0) return null;

    return {
      labels: sorted.map(([k]) => k),
      datasets: [
        {
          data: sorted.map(([, v]) => v),
          backgroundColor: sorted.map(([k]) =>
            k === 'No preference' ? '#cbd5e1' : '#475569'
          ),
          borderRadius: 2
        }
      ]
    };
  });

  /** Country of origin ranked bar (attending only). */
  readonly countryBarData = computed(() => {
    const counts = this.allGuests()
      .filter(g => g.isAttending === true && g.countryOfResidence)
      .reduce((acc, g) => {
        const country = g.countryOfResidence as string;
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;

    return {
      labels: sorted.map(([k]) => k),
      datasets: [
        {
          data: sorted.map(([, v]) => v),
          backgroundColor: '#475569',
          borderRadius: 2
        }
      ]
    };
  });

  // -------------------------------------------------------------------------
  // Existing tables, ported verbatim from v1
  // -------------------------------------------------------------------------

  readonly guestsByDietary = computed(() => {
    const guests = this.allGuests().filter(g => g.isAttending === true);
    const result: { dietaryCategory: string; fullName: string; details: string; isShaded: boolean }[] = [];

    const categories = [
      ...new Set(
        guests.flatMap(g =>
          g.dietaryPreferences?.length ? g.dietaryPreferences : ['No preference']
        )
      )
    ];

    categories.sort().forEach(cat => {
      const guestsInCat = guests
        .filter(
          g =>
            g.dietaryPreferences?.includes(cat) ||
            (!g.dietaryPreferences?.length && cat === 'No preference')
        )
        .sort((a, b) => (a.invitationId || '').localeCompare(b.invitationId || ''));

      let currentInviteId = '';
      let shaded = false;
      guestsInCat.forEach(g => {
        if (g.invitationId !== currentInviteId) {
          shaded = !shaded;
          currentInviteId = g.invitationId || '';
        }
        result.push({
          dietaryCategory: cat,
          fullName: `${g.firstName} ${g.lastName}`,
          details: g.dietaryNotes || g.allergies?.join(', ') || '-',
          isShaded: shaded
        });
      });
    });
    return result;
  });

  readonly guestsByAllergy = computed(() => {
    const guests = this.allGuests().filter(g => g.isAttending === true);
    const result: { allergyCategory: string; fullName: string; details: string; isShaded: boolean }[] = [];

    const allergyCategories = [
      ...new Set(guests.flatMap(g => g.allergies || []).filter(a => a.length > 0))
    ];

    allergyCategories.sort().forEach(allergy => {
      const guestsWithAllergy = guests
        .filter(g => g.allergies?.includes(allergy))
        .sort((a, b) => (a.invitationId || '').localeCompare(b.invitationId || ''));

      let currentInviteId = '';
      let shaded = false;
      guestsWithAllergy.forEach(g => {
        if (g.invitationId !== currentInviteId) {
          shaded = !shaded;
          currentInviteId = g.invitationId || '';
        }
        result.push({
          allergyCategory: allergy,
          fullName: `${g.firstName} ${g.lastName}`,
          details: g.dietaryNotes || '-',
          isShaded: shaded
        });
      });
    });
    return result;
  });

  readonly guestsByBus = computed(() => {
    const guests = this.allGuests().filter(g => g.isAttending === true && g.needsBus === true);
    const result: { pickupLocation: string; fullName: string; isShaded: boolean }[] = [];

    const locations = [...new Set(guests.map(g => g.busPickupLocation || 'Location unspecified'))];

    locations.sort().forEach(loc => {
      const guestsInLoc = guests
        .filter(g => (g.busPickupLocation || 'Location unspecified') === loc)
        .sort((a, b) => (a.invitationId || '').localeCompare(b.invitationId || ''));

      let currentInviteId = '';
      let shaded = false;
      guestsInLoc.forEach(g => {
        if (g.invitationId !== currentInviteId) {
          shaded = !shaded;
          currentInviteId = g.invitationId || '';
        }
        result.push({
          pickupLocation: loc,
          fullName: `${g.firstName} ${g.lastName}`,
          isShaded: shaded
        });
      });
    });
    return result;
  });

  readonly invitationsWithMessages = computed(() =>
    this.allInvitations()
      .filter(inv => inv.message && inv.message.trim().length > 0)
      .sort((a, b) => {
        // Newest first. Falls back to createdAt if updatedAt is missing
        // (which only happens for session-restored data, but be defensive).
        // Caveat: updatedAt is also touched by admin renames and outreach
        // chip toggles, so this isn't a pure "message-submitted-at" sort.
        const aTime = this.tsToMs(a.updatedAt) ?? this.tsToMs(a.createdAt) ?? 0;
        const bTime = this.tsToMs(b.updatedAt) ?? this.tsToMs(b.createdAt) ?? 0;
        return bTime - aTime;
      })
  );

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  exportRsvpData(): void {
    const attendingGuests = this.allGuests().filter(g => g.isAttending === true);

    const csvData = attendingGuests.map(guest => ({
      'First Name': guest.firstName,
      'Last Name': guest.lastName,
      Country: guest.countryOfResidence || '',
      'Dietary Preferences': guest.dietaryPreferences?.length
        ? guest.dietaryPreferences.join(', ')
        : 'None',
      Allergies: guest.allergies?.length ? guest.allergies.join(', ') : 'None',
      'Dietary Notes': guest.dietaryNotes || '',
      'Needs Bus': guest.needsBus ? 'Yes' : 'No',
      'Bus Pickup Location': guest.busPickupLocation || 'N/A',
      'Specific Notes / Message': guest.notes || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'wedding_rsvp_export.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private isResponded(inv: Invitation): boolean {
    // Treat 'responded' status (set on RSVP submit) as authoritative.
    return inv.status === 'responded';
  }

  private tsToMs(value: Timestamp | null | undefined): number | null {
    if (!value) return null;
    // Firestore Timestamp has .toMillis(); session-restored values may be a
    // plain {seconds, nanoseconds} object — handle both.
    const maybeTimestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof maybeTimestamp.toMillis === 'function') {
      return maybeTimestamp.toMillis();
    }
    if (typeof maybeTimestamp.seconds === 'number') {
      return maybeTimestamp.seconds * 1000;
    }
    return null;
  }
}