import { Timestamp } from '@angular/fire/firestore';
import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import {
  GRID_SIZE,
  FloorPlanCanvas,
  snap,
  toCanvasPx,
  fromCanvasPx
} from './floor-plan-canvas';
import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { TablePlannerStateService } from '../../services/table-planner-state.service';
import { Table } from '../../../../shared/models/table.model';
import { Guest } from '../../../../shared/models/guest.model';

function ts(): Timestamp {
  return { seconds: 0, nanoseconds: 0 } as unknown as Timestamp;
}

function makeTable(overrides: Partial<Table> & { id: string }): Table {
  return { name: 'T', shape: 'round', capacity: 8, createdAt: ts(), ...overrides };
}

function makeGuest(overrides: Partial<Guest> & { id: string }): Guest {
  return {
    firstName: 'Guest',
    lastName: overrides.id,
    isAttending: true,
    createdAt: ts(),
    ...overrides
  };
}

function makeDragEnd(x: number, y: number): CdkDragEnd {
  return {
    source: { getFreeDragPosition: () => ({ x, y }) } as any,
    distance:   { x, y },
    dropPoint:  { x, y },
    event:      new MouseEvent('mouseup')
  } as unknown as CdkDragEnd;
}

// ── snap() ────────────────────────────────────────────────────────────────────

describe('snap', () => {
  it('returns 0 for 0', () => expect(snap(0)).toBe(0));

  it('rounds down when below half-grid', () => {
    expect(snap(9)).toBe(0);
    expect(snap(9, GRID_SIZE)).toBe(0);
  });

  it('rounds up at half-grid', () => {
    expect(snap(10)).toBe(20);
  });

  it('returns exact multiples unchanged', () => {
    expect(snap(20)).toBe(20);
    expect(snap(40)).toBe(40);
    expect(snap(100)).toBe(100);
  });

  it('rounds to nearest multiple for arbitrary values', () => {
    expect(snap(31)).toBe(40);
    expect(snap(29)).toBe(20);
    expect(snap(150)).toBe(160);
  });

  it('respects a custom grid size', () => {
    expect(snap(14, 15)).toBe(15);
    expect(snap(7, 15)).toBe(0);
    expect(snap(23, 15)).toBe(30);
  });

  it('clamps negative values toward zero', () => {
    // Math.round(-0.5) = 0 in JS (rounds toward +∞)
    expect(snap(-10)).toBe(0);
    // -30/20 = -1.5 → Math.round → -1 × 20 = -20
    expect(snap(-30)).toBe(-20);
  });
});

// ── toCanvasPx / fromCanvasPx ──────────────────────────────────────────────────

describe('toCanvasPx', () => {
  it('passes px values through unchanged', () => {
    expect(toCanvasPx(500, 'px', 100)).toBe(500);
  });

  it('multiplies meters by pixels-per-meter', () => {
    expect(toCanvasPx(8, 'm', 100)).toBe(800);
  });

  it('derives cm from meters via the fixed 100:1 ratio, using the same pixels-per-meter scale', () => {
    // 150cm = 1.5m, at 200px/m
    expect(toCanvasPx(150, 'cm', 200)).toBe(300);
  });

  it('gives the same result for an equivalent m and cm value at the same scale', () => {
    expect(toCanvasPx(8, 'm', 100)).toBe(toCanvasPx(800, 'cm', 100));
  });
});

describe('fromCanvasPx', () => {
  it('passes px values through unchanged', () => {
    expect(fromCanvasPx(500, 'px', 100)).toBe(500);
  });

  it('divides px by pixels-per-meter for meters', () => {
    expect(fromCanvasPx(800, 'm', 100)).toBe(8);
  });

  it('derives cm from meters via the fixed 100:1 ratio, using the same pixels-per-meter scale', () => {
    // 300px at 200px/m = 1.5m = 150cm
    expect(fromCanvasPx(300, 'cm', 200)).toBe(150);
  });
});

// ── FloorPlanCanvas component ─────────────────────────────────────────────────

describe('FloorPlanCanvas', () => {
  let component: FloorPlanCanvas;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let messageSpy:   jasmine.SpyObj<MessageService>;

  const table1 = makeTable({ id: 't1', positionX: 100, positionY: 60 });
  const table2 = makeTable({ id: 't2' }); // no saved position

  beforeEach(() => {
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'getAllGuests', 'getInvitations', 'getTables', 'updateTable', 'saveTablePositions',
      'getFloorPlanSettings', 'updateFloorPlanSettings'
    ]);
    firestoreSpy.getAllGuests.and.returnValue(of([]));
    firestoreSpy.getInvitations.and.returnValue(of([]));
    firestoreSpy.getTables.and.returnValue(of([table1, table2]));
    firestoreSpy.getFloorPlanSettings.and.returnValue(of({ id: 'floorPlan', width: 800, height: 1400, unit: 'px', scaleFactor: 1 }));
    firestoreSpy.updateTable.and.returnValue(Promise.resolve());
    firestoreSpy.saveTablePositions.and.returnValue(Promise.resolve());
    firestoreSpy.updateFloorPlanSettings.and.returnValue(Promise.resolve());

    messageSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add']);

    TestBed.configureTestingModule({
      imports:   [FloorPlanCanvas],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MessageService,   useValue: messageSpy },
        TablePlannerStateService
      ]
    });

    const fixture = TestBed.createComponent(FloorPlanCanvas);
    component = fixture.componentInstance;
  });

  // ── tablePositions ──────────────────────────────────────────────────────────

  describe('tablePositions', () => {
    it('returns Firestore position when no local override exists', () => {
      const pos = component.tablePositions().get('t1');
      expect(pos).toEqual({ x: 100, y: 60 });
    });

    it('staggers tables with no saved position instead of stacking them at (40,40)', () => {
      // t2 is index 1 in allTables → col 1, row 0 → x = 40 + 1*240 = 280, y = 40
      const pos = component.tablePositions().get('t2');
      expect(pos).toEqual({ x: 280, y: 40 });
    });
  });

  // ── onDragEnded ─────────────────────────────────────────────────────────────

  describe('onDragEnded', () => {
    it('saves snapped position to Firestore when saveLayout is called', async () => {
      component.onDragEnded(makeDragEnd(113, 47), table1);
      // snap(113, 20) = round(5.65) × 20 = 6 × 20 = 120
      // snap(47,  20) = round(2.35) × 20 = 2 × 20 = 40
      await component.saveLayout();
      expect(firestoreSpy.saveTablePositions).toHaveBeenCalledWith(
        jasmine.arrayContaining([
          jasmine.objectContaining({ tableId: 't1', x: 120, y: 40 })
        ])
      );
    });

    it('updates local position optimistically before Firestore responds', () => {
      component.onDragEnded(makeDragEnd(113, 47), table1);
      const pos = component.tablePositions().get('t1');
      expect(pos?.x).toBe(120);
      expect(pos?.y).toBe(40);
    });

    it('clamps x to 0 when drag position is negative', () => {
      component.onDragEnded(makeDragEnd(-50, 40), table1);
      expect(component.tablePositions().get('t1')?.x).toBe(0);
    });

    it('clamps y to 0 when drag position is negative', () => {
      component.onDragEnded(makeDragEnd(40, -50), table1);
      expect(component.tablePositions().get('t1')?.y).toBe(0);
    });

    it('clamps x to CANVAS_WIDTH - 60 when dragged past right edge', () => {
      component.onDragEnded(makeDragEnd(component.CANVAS_WIDTH() + 100, 40), table1);
      expect(component.tablePositions().get('t1')?.x).toBe(component.CANVAS_WIDTH() - 60);
    });

    it('clamps y to CANVAS_HEIGHT - 60 when dragged past bottom edge', () => {
      component.onDragEnded(makeDragEnd(40, component.CANVAS_HEIGHT() + 100), table1);
      expect(component.tablePositions().get('t1')?.y).toBe(component.CANVAS_HEIGHT() - 60);
    });

    it('shows an error toast when saveLayout Firestore write fails', async () => {
      firestoreSpy.saveTablePositions.and.returnValue(Promise.reject(new Error('network error')));
      component.onDragEnded(makeDragEnd(100, 100), table1);
      await component.saveLayout();
      expect(messageSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'error' })
      );
    });

    it('each snapped position is a multiple of GRID_SIZE', () => {
      const rawValues = [13, 27, 53, 108, 215];
      for (const v of rawValues) {
        component.onDragEnded(makeDragEnd(v, v), table1);
        const pos = component.tablePositions().get('t1')!;
        expect(pos.x % GRID_SIZE).withContext(`x=${pos.x} from raw=${v}`).toBe(0);
        expect(pos.y % GRID_SIZE).withContext(`y=${pos.y} from raw=${v}`).toBe(0);
      }
    });
  });

  // ── cateringViews ────────────────────────────────────────────────────────────
  //
  // These need a guest list present at TablePlannerStateService construction
  // time, which the shared `component` from the outer beforeEach already
  // locked in as empty. Each test rebuilds the testing module from scratch
  // with its own guest data instead of mutating the shared singleton.

  describe('cateringViews', () => {
    function createWithGuests(guests: Guest[]): FloorPlanCanvas {
      TestBed.resetTestingModule();

      const spy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
        'getAllGuests', 'getInvitations', 'getTables', 'updateTable', 'saveTablePositions', 'getFloorPlanSettings'
      ]);
      spy.getAllGuests.and.returnValue(of(guests));
      spy.getTables.and.returnValue(of([table1]));
      spy.getInvitations.and.returnValue(of([]));
      spy.getFloorPlanSettings.and.returnValue(of({ id: 'floorPlan', width: 800, height: 1400, unit: 'px', scaleFactor: 1 }));

      TestBed.configureTestingModule({
        imports: [FloorPlanCanvas],
        providers: [
          { provide: FirestoreService, useValue: spy },
          { provide: MessageService, useValue: jasmine.createSpyObj<MessageService>('MessageService', ['add']) },
          TablePlannerStateService
        ]
      });

      return TestBed.createComponent(FloorPlanCanvas).componentInstance;
    }

    it('sorts seated guests by seat number rather than name', () => {
      const c = createWithGuests([
        makeGuest({ id: 'g1', firstName: 'Zara', tableId: 't1', seatNumber: 3 }),
        makeGuest({ id: 'g2', firstName: 'Amir', tableId: 't1', seatNumber: 1 }),
        makeGuest({ id: 'g3', firstName: 'Beth', tableId: 't1', seatNumber: 2 })
      ]);

      const view = c.cateringViews().find(v => v.table.id === 't1')!;
      expect(view.rows.map(r => r.firstName)).toEqual(['Amir', 'Beth', 'Zara']);
    });

    it('places guests without a seat number last', () => {
      const c = createWithGuests([
        makeGuest({ id: 'g1', firstName: 'NoSeat', tableId: 't1', seatNumber: null }),
        makeGuest({ id: 'g2', firstName: 'HasSeat', tableId: 't1', seatNumber: 1 })
      ]);

      const view = c.cateringViews().find(v => v.table.id === 't1')!;
      expect(view.rows.map(r => r.firstName)).toEqual(['HasSeat', 'NoSeat']);
    });
  });

  // ── formatChips / printLang ────────────────────────────────────────────────

  describe('formatChips', () => {
    it('returns the placeholder dash when there are no values', () => {
      expect(component.formatChips(undefined)).toBe('—');
      expect(component.formatChips([])).toBe('—');
    });

    it('returns English values unchanged when printLang is en', () => {
      expect(component.formatChips(['Vegetarian', 'Nuts'])).toBe('Vegetarian, Nuts');
    });

    it('translates known chip values to Spanish when printLang is es', () => {
      component.printLang.set('es');
      expect(component.formatChips(['Vegetarian', 'Nuts'])).toBe('Vegetariano, Frutos Secos');
    });

    it('falls back to the raw value for an unrecognised chip in Spanish', () => {
      component.printLang.set('es');
      expect(component.formatChips(['Custom request'])).toBe('Custom request');
    });
  });

  describe('shapeLabel', () => {
    it('translates table shape according to printLang', () => {
      expect(component.shapeLabel('round')).toBe('Round');
      expect(component.shapeLabel('rectangle')).toBe('Rectangle');
      component.printLang.set('es');
      expect(component.shapeLabel('round')).toBe('Redonda');
      expect(component.shapeLabel('rectangle')).toBe('Rectangular');
    });
  });

  // ── Floor plan settings ────────────────────────────────────────────────────

  describe('floor plan settings', () => {
    it('displays width/height converted from canvas px into the saved unit', () => {
      TestBed.resetTestingModule();

      const spy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
        'getAllGuests', 'getInvitations', 'getTables', 'updateTable', 'saveTablePositions', 'getFloorPlanSettings'
      ]);
      spy.getAllGuests.and.returnValue(of([]));
      spy.getInvitations.and.returnValue(of([]));
      spy.getTables.and.returnValue(of([]));
      // 800px wide canvas, saved as 8m at a scale of 100px/m.
      spy.getFloorPlanSettings.and.returnValue(of({ id: 'floorPlan', width: 800, height: 400, unit: 'm', scaleFactor: 100 }));

      TestBed.configureTestingModule({
        imports:   [FloorPlanCanvas],
        providers: [
          { provide: FirestoreService, useValue: spy },
          { provide: MessageService,   useValue: jasmine.createSpyObj<MessageService>('MessageService', ['add']) },
          TablePlannerStateService
        ]
      });

      const c = TestBed.createComponent(FloorPlanCanvas).componentInstance;
      expect(c.editingUnit()).toBe('m');
      expect(c.editingWidth()).toBe(8);
      expect(c.editingHeight()).toBe(4);
      // The canvas itself stays in px regardless of the display unit.
      expect(c.CANVAS_WIDTH()).toBe(800);
      expect(c.CANVAS_HEIGHT()).toBe(400);
    });

    it('converts editing values back to canvas px when saving', async () => {
      component.editingUnit.set('m');
      component.editingScaleFactor.set(100);
      component.editingWidth.set(10);
      component.editingHeight.set(6);

      await component.saveFloorPlanSettings();

      expect(firestoreSpy.updateFloorPlanSettings).toHaveBeenCalledWith(
        jasmine.objectContaining({ width: 1000, height: 600, unit: 'm', scaleFactor: 100 })
      );
    });

    it('converts cm using the same pixels-per-meter scale as m, not an independent per-unit scale', async () => {
      component.editingUnit.set('cm');
      component.editingScaleFactor.set(100); // 100px/m
      component.editingWidth.set(800);  // 8m
      component.editingHeight.set(400); // 4m

      await component.saveFloorPlanSettings();

      expect(firestoreSpy.updateFloorPlanSettings).toHaveBeenCalledWith(
        jasmine.objectContaining({ width: 800, height: 400, unit: 'cm', scaleFactor: 100 })
      );
    });

    describe('onUnitChange', () => {
      it('preserves the real-world size when switching from meters to centimeters', () => {
        component.editingUnit.set('m');
        component.editingScaleFactor.set(100);
        component.editingWidth.set(8);
        component.editingHeight.set(4);

        component.onUnitChange('cm');

        expect(component.editingUnit()).toBe('cm');
        expect(component.editingWidth()).toBe(800);
        expect(component.editingHeight()).toBe(400);
      });

      it('preserves the real-world size when switching from centimeters back to meters', () => {
        component.editingUnit.set('cm');
        component.editingScaleFactor.set(100);
        component.editingWidth.set(800);
        component.editingHeight.set(400);

        component.onUnitChange('m');

        expect(component.editingUnit()).toBe('m');
        expect(component.editingWidth()).toBe(8);
        expect(component.editingHeight()).toBe(4);
      });

      it('preserves the canvas px size when switching to and from px', () => {
        component.editingUnit.set('m');
        component.editingScaleFactor.set(100);
        component.editingWidth.set(8);

        component.onUnitChange('px');
        expect(component.editingWidth()).toBe(800);

        component.onUnitChange('m');
        expect(component.editingWidth()).toBe(8);
      });
    });
  });
});
