import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';

import { MessageService } from 'primeng/api';

import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { TablePlannerStateService } from '../../services/table-planner-state.service';
import { LayoutDraftService } from '../../../../core/services/layout-draft/layout-draft.service';
import { TableVisual } from '../../../../shared/components/table-visual/table-visual';
import { Table } from '../../../../shared/models/table.model';
import { Guest } from '../../../../shared/models/guest.model';
import { FloorPlanSettings } from '../../../../shared/models/floor-plan-settings.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

// ── Layout constants (exported for specs) ────────────────────────────────────

export const GRID_SIZE     = 20;

// ── Pure helpers (exported for specs) ────────────────────────────────────────

/**
 * Round `value` to the nearest multiple of `gridSize`.
 * Used both for live drag-end snapping and position initialisation.
 */
export function snap(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

const CM_PER_METER = 100;

/**
 * Convert a dimension entered in `unit` to canvas pixels. The canvas itself
 * always works in px (drag/snap/positions) — only the settings panel's
 * input/output is unit-aware. `scaleFactor` is always pixels-per-*meter*,
 * never pixels-per-selected-unit — cm is derived from meters via the fixed
 * 100:1 ratio so switching between m and cm can't drift onto independent,
 * inconsistent scales.
 */
export function toCanvasPx(value: number, unit: FloorPlanSettings['unit'], pxPerMeter: number): number {
  switch (unit) {
    case 'px': return value;
    case 'm':  return value * pxPerMeter;
    case 'cm': return (value / CM_PER_METER) * pxPerMeter;
  }
}

/** Inverse of {@link toCanvasPx} — canvas px back to the display unit. */
export function fromCanvasPx(px: number, unit: FloorPlanSettings['unit'], pxPerMeter: number): number {
  switch (unit) {
    case 'px': return px;
    case 'm':  return px / pxPerMeter;
    case 'cm': return (px / pxPerMeter) * CM_PER_METER;
  }
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
  imports: [CommonModule, DragDropModule, TableVisual, InputNumberModule, SelectModule, FormsModule, ButtonModule],
  templateUrl: './floor-plan-canvas.html',
  styleUrl:    './floor-plan-canvas.scss'
})
export class FloorPlanCanvas {
  private readonly plannerState     = inject(TablePlannerStateService);
  private readonly firestoreService = inject(FirestoreService);
  private readonly messageService   = inject(MessageService);
  private readonly layoutDraft      = inject(LayoutDraftService);

  // Floor plan settings — canvas always stays in px internally regardless
  // of the display unit chosen in the settings panel.
  floorPlanSettings = toSignal(this.firestoreService.getFloorPlanSettings(), {
    initialValue: { id: 'floorPlan', width: 1400, height: 800, unit: 'px', scaleFactor: 100 } as FloorPlanSettings
  });

  // Expose constants to template
  readonly GRID_SIZE = GRID_SIZE;
  readonly CANVAS_WIDTH = computed(() => this.floorPlanSettings().width);
  readonly CANVAS_HEIGHT = computed(() => this.floorPlanSettings().height);

  // Form state for editing dimensions, expressed in the selected display unit.
  editingWidth = signal(fromCanvasPx(this.floorPlanSettings().width, this.floorPlanSettings().unit, this.floorPlanSettings().scaleFactor));
  editingHeight = signal(fromCanvasPx(this.floorPlanSettings().height, this.floorPlanSettings().unit, this.floorPlanSettings().scaleFactor));
  editingUnit = signal(this.floorPlanSettings().unit);
  editingScaleFactor = signal(this.floorPlanSettings().scaleFactor);

  unitOptions = [
    { label: 'Pixels', value: 'px' },
    { label: 'Meters', value: 'm' },
    { label: 'Centimeters', value: 'cm' }
  ];

  // Bounds/step for the width & height inputs depend on the chosen unit —
  // "3000" means very different things in px vs. m. cm bounds are the exact
  // ×100 of the m bounds so both units cover the same physical range.
  readonly widthHeightBounds = computed(() => {
    switch (this.editingUnit()) {
      case 'm':  return { min: 1,   max: 50,   step: 0.5 };
      case 'cm': return { min: 100, max: 5000, step: 50 };
      default:   return { min: 100, max: 3000, step: 10 };
    }
  });

  /**
   * Switch the display unit while preserving the real-world size — e.g.
   * 8m becomes 800cm, not "8" reinterpreted as 8cm. Routes through canvas
   * px so it stays consistent with the single pixels-per-meter scale.
   */
  onUnitChange(newUnit: FloorPlanSettings['unit']): void {
    const oldUnit = this.editingUnit();
    const scaleFactor = this.editingScaleFactor();
    const widthPx = toCanvasPx(this.editingWidth(), oldUnit, scaleFactor);
    const heightPx = toCanvasPx(this.editingHeight(), oldUnit, scaleFactor);
    this.editingUnit.set(newUnit);
    this.editingWidth.set(fromCanvasPx(widthPx, newUnit, scaleFactor));
    this.editingHeight.set(fromCanvasPx(heightPx, newUnit, scaleFactor));
  }

  constructor() {
    // Re-sync the editing fields whenever the underlying Firestore document
    // changes — including the initial load, which arrives after the
    // fallback initialValue above has already been used to seed the signals.
    effect(() => {
      const settings = this.floorPlanSettings();
      this.editingWidth.set(fromCanvasPx(settings.width, settings.unit, settings.scaleFactor));
      this.editingHeight.set(fromCanvasPx(settings.height, settings.unit, settings.scaleFactor));
      this.editingUnit.set(settings.unit);
      this.editingScaleFactor.set(settings.scaleFactor);
    });
  }

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

    const snappedX = Math.max(0, Math.min(snap(raw.x), this.CANVAS_WIDTH()  - 60));
    const snappedY = Math.max(0, Math.min(snap(raw.y), this.CANVAS_HEIGHT() - 60));

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

  // ── Save Floor Plan Settings ─────────────────────────────────────────────
  async saveFloorPlanSettings(): Promise<void> {
    this.saving.set(true);
    try {
      const unit = this.editingUnit();
      const scaleFactor = this.editingScaleFactor();
      const settings: FloorPlanSettings = {
        id: 'floorPlan', // Fixed ID for the single document
        width: toCanvasPx(this.editingWidth(), unit, scaleFactor),
        height: toCanvasPx(this.editingHeight(), unit, scaleFactor),
        unit,
        scaleFactor
      };
      await this.firestoreService.updateFloorPlanSettings(settings);
      this.messageService.add({
        severity: 'success',
        summary: 'Settings Saved',
        detail: 'Floor plan dimensions updated.'
      });
    } catch (err) {
      console.error('Failed to save floor plan settings', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Save Failed',
        detail: 'Could not save floor plan dimensions. Please try again.'
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

  // The print sheet uses CSS `zoom` (not `transform: scale`, which doesn't
  // affect the layout box and causes blank overflow pages) to fit the
  // configured canvas size within the printable page width. 980px is the
  // width that previously fit at zoom 0.70 for the old fixed 1400px canvas;
  // larger canvases scale down further, smaller ones are shown at 100%.
  private static readonly PRINT_TARGET_WIDTH_PX = 980;
  readonly printZoom = computed(() =>
    Math.min(1, FloorPlanCanvas.PRINT_TARGET_WIDTH_PX / this.CANVAS_WIDTH())
  );

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
