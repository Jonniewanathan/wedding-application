import { Component, HostListener, Signal, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { ConfirmationService, MessageService } from 'primeng/api';

import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { TablePlannerStateService, SeatedTableView } from '../../services/table-planner-state.service';
import { SeatingDraftService } from '../../../../core/services/seating-draft/seating-draft.service';
import { TableVisual, SeatDropEvent } from '../../../../shared/components/table-visual/table-visual';
import { Guest } from '../../../../shared/models/guest.model';
import { Table, TableShape } from '../../../../shared/models/table.model';
import { Invitation } from '../../../../shared/models/invitation.model';

interface UnseatedRow {
  guest: Guest;
  invitationDisplayName: string;
  isShaded: boolean;
}

@Component({
  selector: 'app-seating-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, ButtonModule, TooltipModule, SelectModule, TableVisual],
  templateUrl: './seating-chart.html'
})
export class SeatingChart {
  private readonly firestoreService  = inject(FirestoreService);
  private readonly messageService    = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly plannerState              = inject(TablePlannerStateService);
  private readonly seatingDraft      = inject(SeatingDraftService);

  private readonly allInvitations: Signal<Invitation[]> = toSignal(
    this.firestoreService.getInvitations(),
    { initialValue: [] }
  );

  // ── Draft-aware effective state ───────────────────────────────────────────────

  /**
   * All guests with any pending draft changes applied on top of the
   * Firestore values. Used as the source of truth for all UI rendering.
   */
  private readonly effectiveGuests = computed<Guest[]>(() => {
    const guests  = this.plannerState.allGuests();
    const pending = this.seatingDraft.pendingMap();
    if (pending.size === 0) return guests;
    return guests.map(g => {
      if (!pending.has(g.id)) return g;
      const { tableId, seatNumber } = pending.get(g.id)!;
      return { ...g, tableId, seatNumber };
    });
  });

  private readonly effectiveSeatedTables = computed<SeatedTableView[]>(() => {
    const allTables = this.plannerState.allTables();
    const attending = this.effectiveGuests().filter(g => g.isAttending === true);
    const byTableId = new Map<string, Guest[]>();

    for (const g of attending) {
      if (!g.tableId) continue;
      if (!byTableId.has(g.tableId)) byTableId.set(g.tableId, []);
      byTableId.get(g.tableId)!.push(g);
    }

    return allTables.map(table => {
      const seated = (byTableId.get(table.id) ?? []).sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      );
      return {
        table,
        guests: seated,
        occupancy: seated.length,
        isOverCapacity: seated.length > table.capacity
      };
    }).sort((a, b) =>
      a.table.name.localeCompare(b.table.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  });

  private readonly effectiveUnseated = computed<Guest[]>(() =>
    this.effectiveGuests().filter(g => g.isAttending === true && !g.tableId)
  );

  // ── Derived signals ───────────────────────────────────────────────────────────

  readonly unseatedGuests = computed<UnseatedRow[]>(() => {
    const guests = this.effectiveUnseated()
      .slice()
      .sort((a, b) => {
        const invA = a.invitationId ?? '￿';
        const invB = b.invitationId ?? '￿';
        const cmp = invA.localeCompare(invB);
        if (cmp !== 0) return cmp;
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });

    const invitationsById = new Map(this.allInvitations().map(inv => [inv.id, inv]));
    const rows: UnseatedRow[] = [];
    let currentInvId = '';
    let shaded = false;

    for (const guest of guests) {
      const invId = guest.invitationId ?? '';
      if (invId !== currentInvId) { shaded = !shaded; currentInvId = invId; }
      rows.push({
        guest,
        invitationDisplayName: invitationsById.get(invId)?.displayName ?? '(unassigned)',
        isShaded: shaded
      });
    }
    return rows;
  });

  readonly tables           = computed<SeatedTableView[]>(() => this.effectiveSeatedTables());
  readonly totalSeatedCount = computed(() =>
    this.effectiveGuests().filter(g => g.isAttending === true && g.tableId != null).length
  );

  readonly hasPendingChanges = computed(() => this.seatingDraft.hasPendingChanges());
  readonly pendingCount      = computed(() => this.seatingDraft.pendingCount());
  readonly savingSeating     = signal(false);

  readonly tableSelectOptions = computed(() =>
    this.plannerState.allTables().map(t => ({ label: t.name, value: t.id }))
  );

  readonly tableListIds = computed(() => this.plannerState.allTables().map(t => t.id));

  readonly allSeatSlotIds = computed(() =>
    this.plannerState.allTables().flatMap(t =>
      Array.from({ length: t.capacity }, (_, i) => `seat-${t.id}-${i + 1}`)
    )
  );

  readonly unseatedPoolConnectedTo = computed(() =>
    [...this.tableListIds(), ...this.allSeatSlotIds()]
  );

  connectedListIds(excludeTableId: string): string[] {
    return [
      'unseated-pool',
      ...this.tableListIds().filter(id => id !== excludeTableId),
      ...this.allSeatSlotIds()
    ];
  }

  // ── Add table form ────────────────────────────────────────────────────────────

  readonly showAddForm = signal(false);
  readonly newTableName = signal('');
  readonly newTableShape = signal<TableShape>('round');
  readonly newTableCapacity = signal(10);
  readonly saving = signal(false);

  openAddForm(): void {
    this.newTableName.set('');
    this.newTableShape.set('round');
    this.newTableCapacity.set(10);
    this.showAddForm.set(true);
  }

  cancelAddForm(): void { this.showAddForm.set(false); }

  async submitAddForm(): Promise<void> {
    const name = this.newTableName().trim();
    if (!name || this.saving()) return;
    this.saving.set(true);
    try {
      await this.firestoreService.createTable({
        name,
        shape: this.newTableShape(),
        capacity: this.newTableCapacity(),
        positionX: null,
        positionY: null,
        notes: null
      });
      this.showAddForm.set(false);
      this.messageService.add({ severity: 'success', summary: 'Table created', detail: `"${name}" added.` });
    } catch (err) {
      console.error('Failed to create table', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not create table.' });
    } finally {
      this.saving.set(false);
    }
  }

  // ── Edit table ────────────────────────────────────────────────────────────────

  readonly editingTableId = signal<string | null>(null);
  readonly editTableName = signal('');
  readonly editTableShape = signal<TableShape>('round');
  readonly editTableCapacity = signal(10);

  beginEditTable(table: Table): void {
    this.editingTableId.set(table.id);
    this.editTableName.set(table.name);
    this.editTableShape.set(table.shape);
    this.editTableCapacity.set(table.capacity);
  }

  cancelEditTable(): void { this.editingTableId.set(null); }

  async saveEditTable(): Promise<void> {
    const id = this.editingTableId();
    const name = this.editTableName().trim();
    if (!id || !name || this.saving()) return;
    this.saving.set(true);
    try {
      await this.firestoreService.updateTable(id, {
        name,
        shape: this.editTableShape(),
        capacity: this.editTableCapacity()
      }, name);
      this.cancelEditTable();
      this.messageService.add({ severity: 'success', summary: 'Table updated', detail: `"${name}" saved.` });
    } catch (err) {
      console.error('Failed to update table', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not update table.' });
    } finally {
      this.saving.set(false);
    }
  }

  confirmDeleteTable(table: Table, event: Event): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `Delete "${table.name}"?${table.capacity > 0 ? ' Seated guests will be unseated.' : ''}`,
      header: 'Delete table',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteTable(table)
    });
  }

  private async deleteTable(table: Table): Promise<void> {
    try {
      await this.firestoreService.deleteTable(table.id, table.name);
      this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${table.name}" removed.` });
    } catch (err) {
      console.error('Failed to delete table', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not delete table.' });
    }
  }

  // ── Guest assignment (writes to draft; nothing hits Firestore until Save) ─────

  private effectiveTableIdOf(guest: Guest): string | null {
    const override = this.seatingDraft.pendingMap().get(guest.id);
    return override !== undefined ? override.tableId : (guest.tableId ?? null);
  }

  onDrop(event: CdkDragDrop<Guest[]>, targetTableId: string | null): void {
    const guest: Guest = event.item.data;
    if (this.effectiveTableIdOf(guest) === targetTableId) return;
    this.seatingDraft.markGuest(guest.id, targetTableId, null);
  }

  assignGuestToTable(guest: Guest, tableId: string | null): void {
    if (this.effectiveTableIdOf(guest) === tableId) return;
    this.seatingDraft.markGuest(guest.id, tableId, null);
  }

  onSeatAssigned({ guest, seatNumber }: SeatDropEvent, table: Table): void {
    const currentOccupant = this.effectiveSeatedTables()
      .find(v => v.table.id === table.id)
      ?.guests.find(g => g.seatNumber === seatNumber && g.id !== guest.id) ?? null;

    this.seatingDraft.markGuest(guest.id, table.id, seatNumber);

    if (currentOccupant) {
      this.seatingDraft.markGuest(currentOccupant.id, this.effectiveTableIdOf(currentOccupant), null);
    }
  }

  unseatGuest(guest: Guest): void {
    this.seatingDraft.markGuest(guest.id, null, null);
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async saveSeating(): Promise<void> {
    const changes = this.seatingDraft.drain();
    this.savingSeating.set(true);
    try {
      await this.firestoreService.saveSeatingChanges(changes);
      this.seatingDraft.clear();
      this.messageService.add({
        severity: 'success',
        summary:  'Seating saved',
        detail:   `${changes.length} guest assignment${changes.length === 1 ? '' : 's'} saved.`
      });
    } catch (err) {
      console.error('Failed to save seating', err);
      this.messageService.add({
        severity: 'error',
        summary:  'Save failed',
        detail:   'Could not save seating changes. Please try again.'
      });
    } finally {
      this.savingSeating.set(false);
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.seatingDraft.hasPendingChanges()) {
      event.preventDefault();
    }
  }
}