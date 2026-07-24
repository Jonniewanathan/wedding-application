import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';

import { MessageService } from 'primeng/api';

import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { TablePlannerStateService } from '../../services/table-planner-state.service';
import { LayoutDraftService } from '../../../../core/services/layout-draft/layout-draft.service';
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

// ── Print localisation ────────────────────────────────────────────────────────
//
// The print sheet is generated via window.print(), not a server-rendered PDF,
// so "translating the PDF" means rendering the print-root content in the
// chosen language before the browser print dialog opens. Kept as a small,
// self-contained dictionary (rather than routing through ngx-translate)
// because it must be available synchronously the instant Print is clicked —
// no async translation-file load to race against.

export type PrintLang = 'en' | 'es';

interface PrintStrings {
  floorPlanTitle: string;
  floorPlanSubtitle: string;
  cateringTitle: string;
  cateringSubtitle: string;
  tablesLabel: (n: number) => string;
  seatsFilledLabel: (seated: number, cap: number) => string;
  unseatedWarning: (n: number) => string;
  guestsLabel: (occupancy: number, capacity: number) => string;
  overCapacity: string;
  noGuestsAssigned: string;
  colGuestName: string;
  colSeat: string;
  colDietary: string;
  colAllergy: string;
  colNotes: string;
  unseatedSectionTitle: string;
  unseatedSectionMeta: (n: number) => string;
  none: string;
  shapeRound: string;
  shapeRectangle: string;
}

export const PRINT_STRINGS: Record<PrintLang, PrintStrings> = {
  en: {
    floorPlanTitle:      'Wedding Table Layout & Floor Plan',
    floorPlanSubtitle:   'For venue setup crew — do not distribute to guests',
    cateringTitle:       'Catering & Dietary Reference Sheet',
    cateringSubtitle:    'For catering team use only — confirm with planner on the day',
    tablesLabel:         n => `${n} table${n === 1 ? '' : 's'}`,
    seatsFilledLabel:    (seated, cap) => `${seated} / ${cap} seats filled`,
    unseatedWarning:     n => `${n} attending guest${n === 1 ? '' : 's'} not yet seated`,
    guestsLabel:         (occ, cap) => `${occ} / ${cap} guests`,
    overCapacity:        'OVER CAPACITY',
    noGuestsAssigned:    'No guests assigned to this table.',
    colGuestName:        'Guest Name',
    colSeat:             'Seat',
    colDietary:           'Dietary Preferences',
    colAllergy:          'Allergies',
    colNotes:            'Notes',
    unseatedSectionTitle: 'Unseated Attending Guests',
    unseatedSectionMeta: n => `${n} guest${n === 1 ? '' : 's'} without a table assignment`,
    none:                '—',
    shapeRound:          'Round',
    shapeRectangle:      'Rectangle'
  },
  es: {
    floorPlanTitle:      'Disposición de Mesas y Plano del Salón',
    floorPlanSubtitle:   'Para el equipo de montaje — no distribuir a los invitados',
    cateringTitle:       'Hoja de Referencia de Catering y Dietas',
    cateringSubtitle:    'Solo para el equipo de catering — confirmar con el organizador el día del evento',
    tablesLabel:         n => `${n} mesa${n === 1 ? '' : 's'}`,
    seatsFilledLabel:    (seated, cap) => `${seated} / ${cap} asientos ocupados`,
    unseatedWarning:     n => `${n} invitado${n === 1 ? '' : 's'} confirmado${n === 1 ? '' : 's'} sin asiento asignado`,
    guestsLabel:         (occ, cap) => `${occ} / ${cap} invitados`,
    overCapacity:        'AFORO EXCEDIDO',
    noGuestsAssigned:    'No hay invitados asignados a esta mesa.',
    colGuestName:        'Nombre del Invitado',
    colSeat:             'Asiento',
    colDietary:           'Preferencias Dietéticas',
    colAllergy:          'Alergias',
    colNotes:            'Notas',
    unseatedSectionTitle: 'Invitados Confirmados Sin Asiento',
    unseatedSectionMeta: n => `${n} invitado${n === 1 ? '' : 's'} sin mesa asignada`,
    none:                '—',
    shapeRound:          'Redonda',
    shapeRectangle:      'Rectangular'
  }
};

// Dietary/allergy chip values are stored as canonical English text (see
// shared/models/dietary-options.ts). Spanish labels mirror the ES strings
// already used for the same chips in assets/i18n/es.json.
const CHIP_LABELS_ES: Record<string, string> = {
  'Vegetarian':      'Vegetariano',
  'Vegan':           'Vegano',
  'Pescatarian':     'Pescetariano',
  "Children's Meal": 'Menú Infantil',
  'Nuts':            'Frutos Secos',
  'Shellfish':       'Marisco',
  'Eggs':            'Huevos',
  'Gluten Free':     'Gluten',
  'Dairy Free':      'Lácteos'
};

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-floor-plan-canvas',
  standalone: true,
  imports: [CommonModule, DragDropModule, TableVisual],
  templateUrl: './floor-plan-canvas.html',
  styleUrl:    './floor-plan-canvas.scss'
})
export class FloorPlanCanvas {
  private readonly plannerState     = inject(TablePlannerStateService);
  private readonly firestoreService = inject(FirestoreService);
  private readonly messageService   = inject(MessageService);
  private readonly layoutDraft      = inject(LayoutDraftService);

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
    signal<ReadonlyMap<string, { x: number; y: number }>>(
      new Map(this.layoutDraft.drain().map(({ tableId, x, y }) => [tableId, { x, y }]))
    );

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

  readonly tables           = computed(() => this.plannerState.seatedTables());
  readonly totalSeated      = computed(() => this.plannerState.totalSeated());
  readonly totalCap         = computed(() => this.plannerState.totalCapacity());
  readonly unseatedCount    = computed(() => this.plannerState.unseatedGuests().length);
  readonly hasPendingChanges = computed(() => this.layoutDraft.hasPendingChanges());
  readonly pendingCount      = computed(() => this.layoutDraft.pendingCount());

  readonly saving = signal(false);

  // ── Drag + snap ───────────────────────────────────────────────────────────

  onDragEnded(event: CdkDragEnd, table: Table): void {
    const raw = event.source.getFreeDragPosition();

    const snappedX = Math.max(0, Math.min(snap(raw.x), CANVAS_WIDTH  - 60));
    const snappedY = Math.max(0, Math.min(snap(raw.y), CANVAS_HEIGHT - 60));

    // 1. Optimistic UI — instant, no flicker.
    this._localPositions.update(m => {
      const next = new Map(m);
      next.set(table.id, { x: snappedX, y: snappedY });
      return next;
    });

    // 2. Mark as pending — Firestore write deferred until Save Layout is clicked.
    this.layoutDraft.mark(table.id, { x: snappedX, y: snappedY });
  }

  // ── Save layout ──────────────────────────────────────────────────────────

  async saveLayout(): Promise<void> {
    const allTables = this.plannerState.allTables();
    const updates = this.layoutDraft.drain().map(({ tableId, x, y }) => ({
      tableId,
      name: allTables.find(t => t.id === tableId)?.name ?? tableId,
      x,
      y
    }));

    this.saving.set(true);
    try {
      await this.firestoreService.saveTablePositions(updates);
      this.layoutDraft.clear();
      this.messageService.add({
        severity: 'success',
        summary:  'Layout saved',
        detail:   `${updates.length} table position${updates.length === 1 ? '' : 's'} saved.`
      });
    } catch (err) {
      console.error('Failed to save layout', err);
      this.messageService.add({
        severity: 'error',
        summary:  'Save failed',
        detail:   'Could not save the floor plan. Please try again.'
      });
    } finally {
      this.saving.set(false);
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.layoutDraft.hasPendingChanges()) {
      event.preventDefault();
    }
  }

  // ── Catering sheet ─────────────────────────────────────────────────────────

  readonly cateringViews = computed(() =>
    this.plannerState.seatedTables().map(view => ({
      ...view,
      // Sorted by seat number (not name) so the catering crew can walk the
      // table in physical order.
      rows: [...view.guests]
        .sort((a, b) => (a.seatNumber ?? Infinity) - (b.seatNumber ?? Infinity))
        .map(g => ({
          ...g,
          hasDietary: !!(g.dietaryPreferences?.length || g.allergies?.length || g.dietaryNotes)
        } as CateringRow))
    }))
  );

  readonly unseatedGuests = computed(() => this.plannerState.unseatedGuests());

  // ── Print ──────────────────────────────────────────────────────────────────

  readonly printLang    = signal<PrintLang>('en');
  readonly printStrings = computed(() => PRINT_STRINGS[this.printLang()]);

  shapeLabel(shape: Table['shape']): string {
    return shape === 'round' ? this.printStrings().shapeRound : this.printStrings().shapeRectangle;
  }

  formatChips(values: string[] | null | undefined): string {
    if (!values?.length) return this.printStrings().none;
    const lang = this.printLang();
    return values.map(v => (lang === 'es' ? (CHIP_LABELS_ES[v] ?? v) : v)).join(', ');
  }

  print(): void { window.print(); }
}
