import { Component, Signal, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { Guest } from '../../../../shared/models/guest.model';
import { Invitation } from '../../../../shared/models/invitation.model';

interface TableGroup {
  name: string;
  guests: Guest[];
}

/**
 * One row in the unseated panel. Shaded alternates as the
 * invitationId changes so consecutive same-invitation rows share a
 * background band — mirrors the bus pickup manifest's grouping
 * pattern.
 */
interface UnseatedRow {
  guest: Guest;
  invitationDisplayName: string;
  isShaded: boolean;
}

@Component({
  selector: 'app-seating-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TooltipModule],
  templateUrl: './seating-chart.html'
})
export class SeatingChart {
  private firestoreService = inject(FirestoreService);
  private messageService = inject(MessageService);

  readonly allGuests: Signal<Guest[]> = toSignal(
    this.firestoreService.getAllGuests(),
    { initialValue: [] }
  );

  private readonly allInvitations: Signal<Invitation[]> = toSignal(
    this.firestoreService.getInvitations(),
    { initialValue: [] }
  );

  // Only attending guests can be seated.
  private readonly attendingGuests = computed(() =>
    this.allGuests().filter(g => g.isAttending === true)
  );

  /**
   * Unseated attending guests, grouped by invitation. Consecutive
   * rows from the same invitation share a shaded band so the admin
   * can spot families/parties at a glance — same shading pattern as
   * the stats-page bus manifest.
   */
  readonly unseatedGuests = computed<UnseatedRow[]>(() => {
    // Sort by invitationId first so same-invitation rows are consecutive
    // (the shaded toggle relies on this). Then alphabetical within a group.
    const guests = this.attendingGuests()
      .filter(g => !g.tableName || g.tableName.trim().length === 0)
      .sort((a, b) => {
        const inviteA = a.invitationId || '￿'; // unassigned to end
        const inviteB = b.invitationId || '￿';
        const inviteCmp = inviteA.localeCompare(inviteB);
        if (inviteCmp !== 0) return inviteCmp;
        return `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        );
      });

    const invitationsById = new Map(
      this.allInvitations().map(inv => [inv.id, inv])
    );

    const rows: UnseatedRow[] = [];
    let currentInvitationId = '';
    let shaded = false;
    for (const guest of guests) {
      const invId = guest.invitationId || '';
      if (invId !== currentInvitationId) {
        shaded = !shaded;
        currentInvitationId = invId;
      }
      const invitation = invId ? invitationsById.get(invId) : null;
      rows.push({
        guest,
        invitationDisplayName: invitation?.displayName ?? '(unassigned)',
        isShaded: shaded
      });
    }
    return rows;
  });

  readonly tables = computed<TableGroup[]>(() => {
    const seated = this.attendingGuests().filter(
      g => g.tableName && g.tableName.trim().length > 0
    );

    const byTable = new Map<string, Guest[]>();
    for (const g of seated) {
      const t = g.tableName!.trim();
      if (!byTable.has(t)) byTable.set(t, []);
      byTable.get(t)!.push(g);
    }

    return [...byTable.entries()]
      .map(([name, guests]) => ({
        name,
        guests: guests.sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        )
      }))
      .sort((a, b) => this.naturalCompare(a.name, b.name));
  });

  readonly totalSeatedCount = computed(() =>
    this.tables().reduce((sum, t) => sum + t.guests.length, 0)
  );

  // Per-guest edit state. Holds the guest id currently being edited and
  // the in-flight draft text. Using a signal so the template reacts.
  readonly editingGuestId = signal<string | null>(null);
  readonly editingDraft = signal<string>('');

  beginEdit(guest: Guest): void {
    this.editingGuestId.set(guest.id);
    this.editingDraft.set(guest.tableName ?? '');
  }

  cancelEdit(): void {
    this.editingGuestId.set(null);
    this.editingDraft.set('');
  }

  async saveEdit(guest: Guest): Promise<void> {
    const draft = this.editingDraft().trim();
    const normalized = draft.length === 0 ? null : draft;

    // No-op if unchanged
    if ((guest.tableName ?? null) === normalized) {
      this.cancelEdit();
      return;
    }

    try {
      await this.firestoreService.setGuestTable(
        guest.id,
        normalized,
        `${guest.firstName} ${guest.lastName}`
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Seating updated',
        detail: normalized
          ? `${guest.firstName} ${guest.lastName} → ${normalized}`
          : `${guest.firstName} ${guest.lastName} unseated`
      });
      this.cancelEdit();
    } catch (err) {
      console.error('Failed to update seating', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not save seating change.'
      });
    }
  }

  async unseatGuest(guest: Guest): Promise<void> {
    try {
      await this.firestoreService.setGuestTable(
        guest.id,
        null,
        `${guest.firstName} ${guest.lastName}`
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Unseated',
        detail: `${guest.firstName} ${guest.lastName} removed from ${guest.tableName}.`
      });
    } catch (err) {
      console.error('Failed to unseat guest', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not unseat guest.'
      });
    }
  }

  /**
   * Sort "Table 2" before "Table 10" rather than "Table 10" before
   * "Table 2". Falls back to alpha for fully alphabetic names.
   */
  private naturalCompare(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }
}