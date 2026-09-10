import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { Guest } from '../../../shared/models/guest.model';
import { Table } from '../../../shared/models/table.model';

export interface SeatedTableView {
  table: Table;
  guests: Guest[];
  occupancy: number;
  isOverCapacity: boolean;
}

@Injectable()
export class TablePlannerStateService {
  private readonly firestoreService = inject(FirestoreService);

  readonly allGuests: Signal<Guest[]> = toSignal(
    this.firestoreService.getAllGuests(),
    { initialValue: [] }
  );

  readonly allTables: Signal<Table[]> = toSignal(
    this.firestoreService.getTables(),
    { initialValue: [] }
  );

  private readonly attendingGuests = computed(() =>
    this.allGuests().filter(g => g.isAttending === true)
  );

  private readonly tablesById = computed(() =>
    new Map(this.allTables().map(t => [t.id, t]))
  );

  /**
   * Each table entity paired with its currently seated guests.
   * Sorted by table name using natural order ("Table 2" before "Table 10").
   */
  readonly seatedTables = computed<SeatedTableView[]>(() => {
    const guests = this.attendingGuests();
    const byTableId = new Map<string, Guest[]>();

    for (const g of guests) {
      if (!g.tableId) continue;
      if (!byTableId.has(g.tableId)) byTableId.set(g.tableId, []);
      byTableId.get(g.tableId)!.push(g);
    }

    return this.allTables()
      .map(table => {
        const seated = (byTableId.get(table.id) ?? []).sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        );
        return {
          table,
          guests: seated,
          occupancy: seated.length,
          isOverCapacity: seated.length > table.capacity
        };
      })
      .sort((a, b) =>
        a.table.name.localeCompare(b.table.name, undefined, { numeric: true, sensitivity: 'base' })
      );
  });

  readonly unseatedGuests = computed(() =>
    this.attendingGuests().filter(g => !g.tableId)
  );

  readonly totalCapacity = computed(() =>
    this.allTables().reduce((sum, t) => sum + t.capacity, 0)
  );

  readonly totalSeated = computed(() =>
    this.attendingGuests().filter(g => !!g.tableId).length
  );

  // --- Selection state -------------------------------------------------------

  readonly selectedTableId = signal<string | null>(null);

  readonly selectedTable = computed(() => {
    const id = this.selectedTableId();
    return id ? (this.tablesById().get(id) ?? null) : null;
  });

  selectTable(tableId: string | null): void {
    this.selectedTableId.set(tableId);
  }
}