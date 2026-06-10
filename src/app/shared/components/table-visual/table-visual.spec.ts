import { Timestamp } from '@angular/fire/firestore';
import { Guest } from '../../models/guest.model';
import { Table } from '../../models/table.model';
import {
  SEAT_SIZE,
  computeDimensions,
  computeSeats,
  rectDistribution
} from './table-visual';

function ts(): Timestamp {
  return { seconds: 0, nanoseconds: 0 } as unknown as Timestamp;
}

function makeTable(overrides: Partial<Table> & { capacity: number }): Table {
  return {
    id: 't1',
    name: 'Test Table',
    shape: 'round',
    createdAt: ts(),
    ...overrides
  };
}

function makeGuest(id: string, first: string, last: string): Guest {
  return { id, firstName: first, lastName: last, isAttending: true, createdAt: ts() };
}

// ── computeDimensions ─────────────────────────────────────────────────────────

describe('computeDimensions', () => {
  describe('round tables', () => {
    it('should return a square container', () => {
      const d = computeDimensions('round', 8);
      expect(d.containerWidth).toBe(d.containerHeight);
    });

    it('tableWidth should equal tableHeight (it is a circle)', () => {
      const d = computeDimensions('round', 8);
      expect(d.tableWidth).toBe(d.tableHeight);
    });

    it('container should be strictly larger than the table surface', () => {
      for (const cap of [4, 8, 12, 16]) {
        const d = computeDimensions('round', cap);
        expect(d.containerWidth).toBeGreaterThan(d.tableWidth);
      }
    });

    it('a larger capacity should produce a larger container', () => {
      const small  = computeDimensions('round', 4);
      const large  = computeDimensions('round', 16);
      expect(large.containerWidth).toBeGreaterThan(small.containerWidth);
    });
  });

  describe('rectangle tables', () => {
    it('container should be wider than the table surface', () => {
      const d = computeDimensions('rectangle', 10);
      expect(d.containerWidth).toBeGreaterThan(d.tableWidth);
      expect(d.containerHeight).toBeGreaterThan(d.tableHeight);
    });

    it('a larger capacity should produce a wider table', () => {
      const small = computeDimensions('rectangle', 4);
      const large = computeDimensions('rectangle', 12);
      expect(large.tableWidth).toBeGreaterThanOrEqual(small.tableWidth);
    });

    it('table width should be greater than or equal to table height (landscape)', () => {
      for (const cap of [4, 8, 12]) {
        const d = computeDimensions('rectangle', cap);
        expect(d.tableWidth).toBeGreaterThanOrEqual(d.tableHeight);
      }
    });
  });
});

// ── rectDistribution ──────────────────────────────────────────────────────────

describe('rectDistribution', () => {
  it('should always sum to the requested capacity', () => {
    for (const cap of [2, 4, 6, 8, 10, 12, 16]) {
      const d = rectDistribution(cap);
      expect(d.top + d.right + d.bottom + d.left).toBe(cap);
    }
  });

  it('top and bottom should receive more seats than left and right for a 2:1 table', () => {
    const d = rectDistribution(12);
    expect(d.top + d.bottom).toBeGreaterThan(d.left + d.right);
  });

  it('all values should be non-negative', () => {
    for (const cap of [1, 2, 3, 4, 8, 10, 12]) {
      const d = rectDistribution(cap);
      expect(d.top).toBeGreaterThanOrEqual(0);
      expect(d.right).toBeGreaterThanOrEqual(0);
      expect(d.bottom).toBeGreaterThanOrEqual(0);
      expect(d.left).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── computeSeats — round ──────────────────────────────────────────────────────

describe('computeSeats — round', () => {
  it('should return exactly capacity seats', () => {
    const table = makeTable({ capacity: 8 });
    const dims  = computeDimensions('round', 8);
    expect(computeSeats(table, [], dims).length).toBe(8);
  });

  it('all seat positions should be finite numbers', () => {
    const table = makeTable({ capacity: 12 });
    const dims  = computeDimensions('round', 12);
    for (const s of computeSeats(table, [], dims)) {
      expect(isFinite(s.left)).toBeTrue();
      expect(isFinite(s.top)).toBeTrue();
    }
  });

  it('first seat should be near the top of the container (12 o\'clock start)', () => {
    const table  = makeTable({ capacity: 8 });
    const dims   = computeDimensions('round', 8);
    const seats  = computeSeats(table, [], dims);
    const cx     = dims.containerWidth  / 2;
    const cy     = dims.containerHeight / 2;
    // Seat 0 centre should be above container centre
    const seat0CentreY = seats[0].top + SEAT_SIZE / 2;
    expect(seat0CentreY).toBeLessThan(cy);
    // And approximately horizontally centred
    const seat0CentreX = seats[0].left + SEAT_SIZE / 2;
    expect(Math.abs(seat0CentreX - cx)).toBeLessThan(2); // within 2px of centre
  });

  it('seats should be evenly spaced (equal arc between each pair)', () => {
    const table  = makeTable({ capacity: 6 });
    const dims   = computeDimensions('round', 6);
    const seats  = computeSeats(table, [], dims);
    const cx     = dims.containerWidth  / 2;
    const cy     = dims.containerHeight / 2;

    // Normalise to [0, 2π) then sort so the wrap edge is handled explicitly.
    const angles = seats
      .map(s => {
        const x = s.left + SEAT_SIZE / 2 - cx;
        const y = s.top  + SEAT_SIZE / 2 - cy;
        const a = Math.atan2(y, x);
        return a < 0 ? a + 2 * Math.PI : a;
      })
      .sort((a, b) => a - b);

    // Consecutive diffs including the wrap from last back to first.
    const TAU = 2 * Math.PI;
    const diffs = [
      ...angles.slice(1).map((a, i) => a - angles[i]),
      angles[0] + TAU - angles[angles.length - 1]
    ];

    const expected = TAU / 6;
    for (const d of diffs) {
      expect(Math.abs(d - expected)).toBeLessThan(0.02);
    }
  });

  it('all seats should lie outside the table radius', () => {
    const cap    = 10;
    const table  = makeTable({ capacity: cap });
    const dims   = computeDimensions('round', cap);
    const seats  = computeSeats(table, [], dims);
    const cx     = dims.containerWidth  / 2;
    const cy     = dims.containerHeight / 2;
    const tableR = dims.tableWidth / 2;

    for (const s of seats) {
      const dist = Math.hypot(s.left + SEAT_SIZE / 2 - cx, s.top + SEAT_SIZE / 2 - cy);
      expect(dist).toBeGreaterThan(tableR);
    }
  });

  it('should assign guests to slots in order and expose initials', () => {
    const table  = makeTable({ capacity: 3 });
    const dims   = computeDimensions('round', 3);
    const guests = [
      makeGuest('1', 'Alice', 'Smith'),
      makeGuest('2', 'Bob',   'Jones')
    ];
    const seats = computeSeats(table, guests, dims);
    expect(seats[0].guest?.id).toBe('1');
    expect(seats[0].initials).toBe('AS');
    expect(seats[1].guest?.id).toBe('2');
    expect(seats[1].initials).toBe('BJ');
    expect(seats[2].guest).toBeNull();
    expect(seats[2].initials).toBe('');
  });
});

// ── computeSeats — rectangle ──────────────────────────────────────────────────

describe('computeSeats — rectangle', () => {
  it('should return exactly capacity seats', () => {
    for (const cap of [4, 6, 8, 10, 12]) {
      const table = makeTable({ capacity: cap, shape: 'rectangle' });
      const dims  = computeDimensions('rectangle', cap);
      expect(computeSeats(table, [], dims).length).withContext(`capacity ${cap}`).toBe(cap);
    }
  });

  it('all seat positions should be finite', () => {
    const table = makeTable({ capacity: 10, shape: 'rectangle' });
    const dims  = computeDimensions('rectangle', 10);
    for (const s of computeSeats(table, [], dims)) {
      expect(isFinite(s.left)).toBeTrue();
      expect(isFinite(s.top)).toBeTrue();
    }
  });

  it('all seats should lie outside the table surface', () => {
    const cap   = 10;
    const table = makeTable({ capacity: cap, shape: 'rectangle' });
    const dims  = computeDimensions('rectangle', cap);
    const seats = computeSeats(table, [], dims);

    const cx  = dims.containerWidth  / 2;
    const cy  = dims.containerHeight / 2;
    const hw  = dims.tableWidth  / 2;
    const hh  = dims.tableHeight / 2;

    for (const s of seats) {
      const sx = s.left + SEAT_SIZE / 2;
      const sy = s.top  + SEAT_SIZE / 2;
      // Seat centre must be outside the table rectangle on at least one axis
      const outsideX = Math.abs(sx - cx) > hw + 1;
      const outsideY = Math.abs(sy - cy) > hh + 1;
      expect(outsideX || outsideY).withContext(`seat ${s.index} at (${sx},${sy})`).toBeTrue();
    }
  });

  it('all seats should be within the container bounds', () => {
    for (const cap of [4, 8, 12]) {
      const table = makeTable({ capacity: cap, shape: 'rectangle' });
      const dims  = computeDimensions('rectangle', cap);
      for (const s of computeSeats(table, [], dims)) {
        expect(s.left).toBeGreaterThanOrEqual(0);
        expect(s.top).toBeGreaterThanOrEqual(0);
        expect(s.left + SEAT_SIZE).toBeLessThanOrEqual(dims.containerWidth  + 1);
        expect(s.top  + SEAT_SIZE).toBeLessThanOrEqual(dims.containerHeight + 1);
      }
    }
  });
});