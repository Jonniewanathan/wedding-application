import { Timestamp } from '@angular/fire/firestore';
import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GRID_SIZE,
  FloorPlanCanvas,
  snap
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

// ── FloorPlanCanvas component ─────────────────────────────────────────────────

describe('FloorPlanCanvas', () => {
  let component: FloorPlanCanvas;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let messageSpy:   jasmine.SpyObj<MessageService>;

  const table1 = makeTable({ id: 't1', positionX: 100, positionY: 60 });
  const table2 = makeTable({ id: 't2' }); // no saved position

  beforeEach(() => {
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'getAllGuests', 'getInvitations', 'getTables', 'updateTable'
    ]);
    firestoreSpy.getAllGuests.and.returnValue(of([]));
    firestoreSpy.getInvitations.and.returnValue(of([]));
    firestoreSpy.getTables.and.returnValue(of([table1, table2]));
    firestoreSpy.updateTable.and.returnValue(Promise.resolve());

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
    it('snaps the position and saves to Firestore', () => {
      component.onDragEnded(makeDragEnd(113, 47), table1);
      // snap(113, 20) = round(5.65) × 20 = 6 × 20 = 120
      // snap(47,  20) = round(2.35) × 20 = 2 × 20 = 40
      expect(firestoreSpy.updateTable).toHaveBeenCalledWith(
        't1',
        jasmine.objectContaining({ positionX: 120, positionY: 40 }),
        table1.name
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
      component.onDragEnded(makeDragEnd(CANVAS_WIDTH + 100, 40), table1);
      expect(component.tablePositions().get('t1')?.x).toBe(CANVAS_WIDTH - 60);
    });

    it('clamps y to CANVAS_HEIGHT - 60 when dragged past bottom edge', () => {
      component.onDragEnded(makeDragEnd(40, CANVAS_HEIGHT + 100), table1);
      expect(component.tablePositions().get('t1')?.y).toBe(CANVAS_HEIGHT - 60);
    });

    it('shows an error toast when Firestore save fails', async () => {
      firestoreSpy.updateTable.and.returnValue(Promise.reject(new Error('network error')));
      component.onDragEnded(makeDragEnd(100, 100), table1);
      await Promise.resolve(); // flush microtasks
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
});
