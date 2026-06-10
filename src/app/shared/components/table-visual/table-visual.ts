import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Guest } from '../../models/guest.model';
import { Table, TableShape } from '../../models/table.model';

// ── Layout constants ─────────────────────────────────────────────────────────

/** Diameter of each seat circle in px. */
export const SEAT_SIZE = 32;

/** Gap between the table edge and the nearest edge of a seat circle. */
const ORBIT_GAP = 10;

/** Minimum margin from table corners when distributing seats along an edge. */
const EDGE_PADDING = 10;

/** Minimum space between seat centres along a rect edge. */
const MIN_SEAT_PITCH = SEAT_SIZE + 4;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Pre-computed render slot for one seat position. */
export interface SeatSlot {
  /** 0-based index matching guest assignment order. */
  index: number;
  /** Pixel offset from the left edge of the component container. */
  left: number;
  /** Pixel offset from the top edge of the component container. */
  top: number;
  /** Assigned guest, or null for an empty slot. */
  guest: Guest | null;
  /** Two-letter initials, or empty string for empty slots. */
  initials: string;
}

/** Bounding box dimensions used by the template for container + table surface. */
export interface TableDimensions {
  containerWidth: number;
  containerHeight: number;
  /** Rendered width of the table surface (diameter for round). */
  tableWidth: number;
  /** Rendered height of the table surface (diameter for round). */
  tableHeight: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-table-visual',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-visual.html'
})
export class TableVisual {
  readonly table  = input.required<Table>();
  readonly guests = input<Guest[]>([]);

  readonly SEAT_SIZE = SEAT_SIZE;

  readonly dimensions = computed<TableDimensions>(() =>
    computeDimensions(this.table().shape, this.table().capacity)
  );

  readonly seats = computed<SeatSlot[]>(() =>
    computeSeats(this.table(), this.guests(), this.dimensions())
  );

  /** CSS border-radius string for the table surface. */
  readonly tableRadiusStyle = computed(() =>
    this.table().shape === 'round' ? '50%' : '6px'
  );

  /** Pixel offset to centre the table surface within its container. */
  readonly tableSurfaceLeft = computed(() =>
    (this.dimensions().containerWidth  - this.dimensions().tableWidth)  / 2
  );
  readonly tableSurfaceTop = computed(() =>
    (this.dimensions().containerHeight - this.dimensions().tableHeight) / 2
  );
}

// ── Pure layout functions (exported for specs) ────────────────────────────────

export function computeDimensions(shape: TableShape, capacity: number): TableDimensions {
  if (shape === 'round') {
    // Orbit radius: large enough that seats placed at equal angles never overlap.
    // seats need circumference >= capacity * MIN_SEAT_PITCH
    const minOrbit  = (capacity * MIN_SEAT_PITCH) / (2 * Math.PI);
    const orbit     = Math.max(44, minOrbit);          // centre of seat circles
    const tableR    = Math.max(36, orbit - ORBIT_GAP - SEAT_SIZE / 2);
    const outerR    = tableR + ORBIT_GAP + SEAT_SIZE;  // outer edge of seats
    const size      = Math.ceil(outerR * 2);

    return {
      containerWidth:  size,
      containerHeight: size,
      tableWidth:      tableR * 2,
      tableHeight:     tableR * 2
    };
  }

  // Rectangle: distribute seats ~2:1 long-side/short-side
  const dist   = rectDistribution(capacity);
  const longN  = Math.max(dist.top, dist.bottom);
  const shortN = Math.max(dist.left, dist.right);

  const tableWidth  = Math.max(80,  longN  * MIN_SEAT_PITCH + EDGE_PADDING * 2);
  const tableHeight = Math.max(54, (shortN > 0 ? shortN * MIN_SEAT_PITCH : 1) + EDGE_PADDING * 2);

  return {
    containerWidth:  tableWidth  + (ORBIT_GAP + SEAT_SIZE) * 2,
    containerHeight: tableHeight + (ORBIT_GAP + SEAT_SIZE) * 2,
    tableWidth,
    tableHeight
  };
}

export function computeSeats(table: Table, guests: Guest[], dims: TableDimensions): SeatSlot[] {
  const cx = dims.containerWidth  / 2;
  const cy = dims.containerHeight / 2;
  const cap = table.capacity;

  const makeSlot = (index: number, x: number, y: number): SeatSlot => {
    const g = guests[index] ?? null;
    return {
      index,
      left:     cx + x - SEAT_SIZE / 2,
      top:      cy + y - SEAT_SIZE / 2,
      guest:    g,
      initials: g ? `${g.firstName[0]}${g.lastName[0]}`.toUpperCase() : ''
    };
  };

  if (table.shape === 'round') {
    const tableR  = dims.tableWidth / 2;
    const orbit   = tableR + ORBIT_GAP + SEAT_SIZE / 2;
    return Array.from({ length: cap }, (_, i) => {
      // Start at 12 o'clock (−π/2) and advance clockwise.
      const angle = (i / cap) * 2 * Math.PI - Math.PI / 2;
      return makeSlot(i, orbit * Math.cos(angle), orbit * Math.sin(angle));
    });
  }

  // Rectangle
  return computeRectSlots(cap, dims, makeSlot);
}

// ── Rectangle helpers ─────────────────────────────────────────────────────────

/** Edge seat counts for a 2:1 aspect-ratio rectangle. */
export function rectDistribution(capacity: number): {
  top: number; right: number; bottom: number; left: number
} {
  // Perimeter ratio: long side = 2 units, short side = 1 unit → total = 6 units
  const topN    = Math.round(capacity * 2 / 6);
  const rightN  = Math.round(capacity * 1 / 6);
  const bottomN = Math.round(capacity * 2 / 6);
  const leftN   = capacity - topN - rightN - bottomN;
  return { top: topN, right: rightN, bottom: Math.max(0, bottomN), left: Math.max(0, leftN) };
}

function computeRectSlots(
  capacity: number,
  dims: TableDimensions,
  makeSlot: (index: number, x: number, y: number) => SeatSlot
): SeatSlot[] {
  const { tableWidth, tableHeight } = dims;
  const hw = tableWidth  / 2;
  const hh = tableHeight / 2;
  const seatOrbit = ORBIT_GAP + SEAT_SIZE / 2;   // distance from table edge to seat centre

  const dist = rectDistribution(capacity);
  const slots: SeatSlot[] = [];
  let idx = 0;

  /** Evenly spread `n` values across `[-span/2, +span/2]` with edge padding. */
  const spread = (n: number, span: number): number[] => {
    if (n === 0) return [];
    const usable = span - EDGE_PADDING * 2 - SEAT_SIZE;
    if (n === 1) return [0];
    return Array.from({ length: n }, (_, i) => -usable / 2 + i * usable / (n - 1));
  };

  // Top edge — left to right
  for (const x of spread(dist.top, tableWidth)) {
    slots.push(makeSlot(idx++, x, -(hh + seatOrbit)));
  }

  // Right edge — top to bottom
  for (const y of spread(dist.right, tableHeight)) {
    slots.push(makeSlot(idx++, hw + seatOrbit, y));
  }

  // Bottom edge — right to left (mirror top so seat order wraps the table)
  for (const x of spread(dist.bottom, tableWidth).reverse()) {
    slots.push(makeSlot(idx++, x, hh + seatOrbit));
  }

  // Left edge — bottom to top
  for (const y of spread(dist.left, tableHeight).reverse()) {
    slots.push(makeSlot(idx++, -(hw + seatOrbit), y));
  }

  return slots;
}