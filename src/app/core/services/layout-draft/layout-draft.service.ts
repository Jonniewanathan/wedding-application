import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutDraftService {
  private readonly _pending =
    signal<ReadonlyMap<string, { x: number; y: number }>>(new Map());

  readonly hasPendingChanges = computed(() => this._pending().size > 0);
  readonly pendingCount      = computed(() => this._pending().size);

  mark(tableId: string, pos: { x: number; y: number }): void {
    this._pending.update(m => new Map(m).set(tableId, pos));
  }

  drain(): { tableId: string; x: number; y: number }[] {
    return Array.from(this._pending().entries())
      .map(([tableId, { x, y }]) => ({ tableId, x, y }));
  }

  clear(): void {
    this._pending.set(new Map());
  }
}