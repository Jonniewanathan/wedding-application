import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';

import { MessageService } from 'primeng/api';

import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { TablePlannerStateService } from '../../services/table-planner-state.service';
import { TableVisual } from '../../../../shared/components/table-visual/table-visual';
import { Table } from '../../../../shared/models/table.model';
import { Guest } from '../../../../shared/models/guest.model';

// ── Layout constants (exported for specs) ────────────────────────────────────

export const GRID_SIZE     = 20;
export const CANVAS_WIDTH  = 1400;
export const CANVAS_HEIGHT = 800;

// ── Pure helper (exported for specs) ─────────────────────────────────────────

/**
 * Round `value` to the nearest multiple of `gridSize`.
 * Used both for live drag-end snapping and position initialisation.
 */
export function snap(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

// ── Catering sheet type ───────────────────────────────────────────────────────

interface CateringRow extends Guest {
  hasDietary: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-floor-plan-canvas',
  standalone: true,
  imports: [CommonModule, DragDropModule, TableVisual],
  templateUrl: './floor-plan-canvas.html',
  styleUrl:    './floor-plan-canvas.scss'
})
export class FloorPlanCanvas {
  private readonly plannerState    = inject(TablePlannerStateService);
  private readonly firestoreService = inject(FirestoreService);
  private readonly messageService   = inject(MessageService);

  // Expose constants to template
  readonly GRID_SIZE     = GRID_SIZE;
  readonly CANVAS_WIDTH  = CANVAS_WIDTH;
  readonly CANVAS_HEIGHT = CANVAS_HEIGHT;

  // ── Optimistic position state ─────────────────────────────────────────────

  /**
   * Local position overrides written on drag-end, before the Firestore
   * round-trip completes. Prevents any flicker between drop and confirmation.
   */
  private readonly _localPositions =
    signal<ReadonlyMap<string, { x: number; y: number }>>(new Map());

  /**
   * Resolved display position per table.
   * Priority: local override → Firestore value → default (40, 40).
   */
  readonly tablePositions = computed<ReadonlyMap<string, { x: number; y: number }>>(() => {
    const local  = this._localPositions();
    const result = new Map<string, { x: number; y: number }>();
    const tables = this.plannerState.allTables();

    tables.forEach((t, i) => {
      if (local.has(t.id)) {
        result.set(t.id, local.get(t.id)!);
      } else if (t.positionX != null && t.positionY != null) {
        result.set(t.id, { x: t.positionX, y: t.positionY });
      } else {
        // Stagger unpositioned tables in a 4-column grid so they don't stack.
        const col = i % 4;
        const row = Math.floor(i / 4);
        result.set(t.id, { x: 40 + col * 240, y: 40 + row * 240 });
      }
    });

    return result;
  });

  readonly tables       = computed(() => this.plannerState.seatedTables());
  readonly totalSeated  = computed(() => this.plannerState.totalSeated());
  readonly totalCap     = computed(() => this.plannerState.totalCapacity());
  readonly unseatedCount = computed(() => this.plannerState.unseatedGuests().length);

  // ── Drag + snap ───────────────────────────────────────────────────────────

  onDragEnded(event: CdkDragEnd, table: Table): void {
    // getFreeDragPosition() returns the accumulated CDK position (initial + delta).
    const raw = event.source.getFreeDragPosition();

    const snappedX = Math.max(0, Math.min(snap(raw.x), CANVAS_WIDTH  - 60));
    const snappedY = Math.max(0, Math.min(snap(raw.y), CANVAS_HEIGHT - 60));

    // 1. Optimistic UI — instant, no flicker.
    this._localPositions.update(m => {
      const next = new Map(m);
      next.set(table.id, { x: snappedX, y: snappedY });
      return next;
    });

    // 2. Persist asynchronously.
    this.firestoreService
      .updateTable(table.id, { positionX: snappedX, positionY: snappedY }, table.name)
      .catch(err => {
        console.error('Failed to save table position', err);
        this.messageService.add({
          severity: 'error',
          summary:  'Position not saved',
          detail:   `Could not save position for "${table.name}".`
        });
      });
  }

  // ── Catering sheet ─────────────────────────────────────────────────────────

  readonly cateringViews = computed(() =>
    this.plannerState.seatedTables().map(view => ({
      ...view,
      rows: view.guests.map(g => ({
        ...g,
        hasDietary: !!(g.dietaryPreferences?.length || g.allergies?.length || g.dietaryNotes)
      } as CateringRow))
    }))
  );

  readonly unseatedGuests = computed(() => this.plannerState.unseatedGuests());

  // ── Print ──────────────────────────────────────────────────────────────────

  print(): void { window.print(); }
}
