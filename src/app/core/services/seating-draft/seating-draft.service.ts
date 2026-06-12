import { Injectable, computed, signal } from '@angular/core';

export interface GuestPendingChange {
  guestId:    string;
  tableId:    string | null;
  seatNumber: number | null;
}

@Injectable({ providedIn: 'root' })
export class SeatingDraftService {
  private readonly _pending =
    signal<ReadonlyMap<string, { tableId: string | null; seatNumber: number | null }>>(new Map());

  readonly hasPendingChanges = computed(() => this._pending().size > 0);
  readonly pendingCount      = computed(() => this._pending().size);
  readonly pendingMap        = computed(() => this._pending());

  markGuest(guestId: string, tableId: string | null, seatNumber: number | null): void {
    this._pending.update(m => new Map(m).set(guestId, { tableId, seatNumber }));
  }

  drain(): GuestPendingChange[] {
    return Array.from(this._pending().entries())
      .map(([guestId, { tableId, seatNumber }]) => ({ guestId, tableId, seatNumber }));
  }

  clear(): void {
    this._pending.set(new Map());
  }
}