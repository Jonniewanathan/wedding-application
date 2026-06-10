import { Component, Signal, computed, inject, signal } from '@angular/core';
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
import { TableVisual } from '../../../../shared/components/table-visual/table-visual';
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
  private readonly firestoreService = inject(FirestoreService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly plannerState = inject(TablePlannerStateService);

  private readonly allInvitations: Signal<Invitation[]> = toSignal(
    this.firestoreService.getInvitations(),
    { initialValue: [] }
  );

  // ── Derived signals ──────────────────────────────────────────────────────────

  readonly unseatedGuests = computed<UnseatedRow[]>(() => {
    const guests = this.plannerState.unseatedGuests()
      .slice()
      .sort((a, b) => {
        const invA = a.invitationId ?? '�';
        const invB = b.invitationId ?? '�';
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

  readonly tables = computed<SeatedTableView[]>(() => this.plannerState.seatedTables());
  readonly totalSeatedCount = computed(() => this.plannerState.totalSeated());

  readonly tableSelectOptions = computed(() =>
    this.plannerState.allTables().map(t => ({ label: t.name, value: t.id }))
  );

  readonly tableListIds = computed(() => this.plannerState.allTables().map(t => t.id));

  connectedListIds(excludeTableId: string): string[] {
    return ['unseated-pool', ...this.tableListIds().filter(id => id !== excludeTableId)];
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

  // ── Guest assignment ──────────────────────────────────────────────────────────

  async onDrop(event: CdkDragDrop<Guest[]>, targetTableId: string | null): Promise<void> {
    const guest: Guest = event.item.data;
    if (guest.tableId === targetTableId) return;
    const table = targetTableId
      ? this.plannerState.allTables().find(t => t.id === targetTableId)
      : null;
    try {
      await this.firestoreService.setGuestTableById(
        guest.id, targetTableId,
        { guestName: `${guest.firstName} ${guest.lastName}`, tableName: table?.name }
      );
    } catch (err) {
      console.error('Failed to update seating', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not update seating.' });
    }
  }

  async assignGuestToTable(guest: Guest, tableId: string | null): Promise<void> {
    if (guest.tableId === tableId) return;
    const table = tableId
      ? this.plannerState.allTables().find(t => t.id === tableId)
      : null;
    try {
      await this.firestoreService.setGuestTableById(
        guest.id, tableId,
        { guestName: `${guest.firstName} ${guest.lastName}`, tableName: table?.name }
      );
    } catch (err) {
      console.error('Failed to assign guest', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not assign guest.' });
    }
  }

  async unseatGuest(guest: Guest): Promise<void> {
    try {
      await this.firestoreService.setGuestTableById(
        guest.id, null,
        { guestName: `${guest.firstName} ${guest.lastName}` }
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Unseated',
        detail: `${guest.firstName} ${guest.lastName} removed from their table.`
      });
    } catch (err) {
      console.error('Failed to unseat guest', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not unseat guest.' });
    }
  }
}