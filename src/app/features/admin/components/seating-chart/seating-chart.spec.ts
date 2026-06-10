import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { SeatingChart } from './seating-chart';
import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { TablePlannerStateService } from '../../services/table-planner-state.service';
import { Guest } from '../../../../shared/models/guest.model';
import { Invitation } from '../../../../shared/models/invitation.model';
import { Table } from '../../../../shared/models/table.model';

function ts(): Timestamp {
  return { seconds: 0, nanoseconds: 0 } as unknown as Timestamp;
}

function makeGuest(overrides: Partial<Guest>): Guest {
  return { id: 'g', firstName: 'A', lastName: 'B', isAttending: true, createdAt: ts(), ...overrides };
}

function makeTable(overrides: Partial<Table> & { id: string; name: string }): Table {
  return { shape: 'round', capacity: 10, createdAt: ts(), ...overrides };
}

function makeInvitation(id: string, displayName: string): Invitation {
  return { id, displayName, invitationCode: id, status: 'sent', guestIds: [], createdAt: ts() };
}

function makeDrop(guest: Guest): CdkDragDrop<Guest[]> {
  return {
    item: { data: guest } as any,
    previousContainer: { id: 'prev' } as any,
    container: { id: 'target' } as any,
    previousIndex: 0,
    currentIndex: 0,
    isPointerOverContainer: true,
    distance: { x: 0, y: 0 },
    dropPoint: { x: 0, y: 0 },
    event: new MouseEvent('drop')
  } as CdkDragDrop<Guest[]>;
}

describe('SeatingChart', () => {
  let component: SeatingChart;
  let fixture: ComponentFixture<SeatingChart>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let messageSpy: jasmine.SpyObj<MessageService>;
  let confirmSpy: jasmine.SpyObj<ConfirmationService>;

  function build(guests: Guest[], invitations: Invitation[] = [], tables: Table[] = []) {
    firestoreSpy.getAllGuests.and.returnValue(of(guests));
    firestoreSpy.getInvitations.and.returnValue(of(invitations));
    firestoreSpy.getTables.and.returnValue(of(tables));
    fixture = TestBed.createComponent(SeatingChart);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'getAllGuests', 'getInvitations', 'getTables',
      'setGuestTableById', 'createTable', 'updateTable', 'deleteTable'
    ]);
    firestoreSpy.getAllGuests.and.returnValue(of([]));
    firestoreSpy.getInvitations.and.returnValue(of([]));
    firestoreSpy.getTables.and.returnValue(of([]));
    firestoreSpy.setGuestTableById.and.returnValue(Promise.resolve());
    firestoreSpy.createTable.and.returnValue(Promise.resolve({} as any));
    firestoreSpy.updateTable.and.returnValue(Promise.resolve());
    firestoreSpy.deleteTable.and.returnValue(Promise.resolve());

    messageSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
    confirmSpy = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']);

    TestBed.configureTestingModule({
      imports: [SeatingChart],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MessageService, useValue: messageSpy },
        { provide: ConfirmationService, useValue: confirmSpy },
        TablePlannerStateService
      ]
    });
  });

  // ── Grouping ──────────────────────────────────────────────────────────────────

  describe('grouping', () => {
    it('should ignore non-attending guests entirely', () => {
      const t1 = makeTable({ id: 't1', name: 'Table 1' });
      build([
        makeGuest({ id: '1', isAttending: false, tableId: 't1' }),
        makeGuest({ id: '2', isAttending: null, tableId: 't1' })
      ], [], [t1]);
      expect(component.tables()[0].guests.length).toBe(0);
      expect(component.unseatedGuests().length).toBe(0);
    });

    it('should list attending guests with no tableId as unseated', () => {
      const t1 = makeTable({ id: 't1', name: 'Table 1' });
      build([
        makeGuest({ id: '1', firstName: 'Alice', tableId: null }),
        makeGuest({ id: '2', firstName: 'Bob' }),
        makeGuest({ id: '3', firstName: 'Carol', tableId: 't1' })
      ], [], [t1]);
      const unseated = component.unseatedGuests();
      expect(unseated.length).toBe(2);
      expect(unseated.map(r => r.guest.firstName).sort()).toEqual(['Alice', 'Bob']);
    });

    it('should attach the invitation displayName to each unseated row', () => {
      build(
        [
          makeGuest({ id: '1', firstName: 'Alice', invitationId: 'inv-a', tableId: null }),
          makeGuest({ id: '2', firstName: 'Bob', invitationId: 'inv-b', tableId: null })
        ],
        [makeInvitation('inv-a', 'Smith family'), makeInvitation('inv-b', 'Jones family')]
      );
      const rows = component.unseatedGuests();
      expect(rows[0].invitationDisplayName).toBe('Smith family');
      expect(rows[1].invitationDisplayName).toBe('Jones family');
    });

    it('should label rows without a matching invitation as "(unassigned)"', () => {
      build([makeGuest({ id: '1', firstName: 'Alice', invitationId: 'inv-missing', tableId: null })]);
      expect(component.unseatedGuests()[0].invitationDisplayName).toBe('(unassigned)');
    });

    it('should alternate isShaded by invitation group', () => {
      build(
        [
          makeGuest({ id: '1', firstName: 'Alice', invitationId: 'inv-a', tableId: null }),
          makeGuest({ id: '2', firstName: 'Bob',   invitationId: 'inv-a', tableId: null }),
          makeGuest({ id: '3', firstName: 'Carol', invitationId: 'inv-b', tableId: null }),
          makeGuest({ id: '4', firstName: 'Dan',   invitationId: 'inv-c', tableId: null }),
          makeGuest({ id: '5', firstName: 'Eve',   invitationId: 'inv-c', tableId: null })
        ],
        [makeInvitation('inv-a', 'A'), makeInvitation('inv-b', 'B'), makeInvitation('inv-c', 'C')]
      );
      const rows = component.unseatedGuests();
      expect(rows[0].isShaded).toBe(rows[1].isShaded);
      expect(rows[1].isShaded).not.toBe(rows[2].isShaded);
      expect(rows[2].isShaded).not.toBe(rows[3].isShaded);
      expect(rows[3].isShaded).toBe(rows[4].isShaded);
    });

    it('should group seated attending guests by their table entity', () => {
      const t1 = makeTable({ id: 't1', name: 'Table 1' });
      const t2 = makeTable({ id: 't2', name: 'Table 2' });
      build([
        makeGuest({ id: '1', firstName: 'Alice', tableId: 't1' }),
        makeGuest({ id: '2', firstName: 'Bob',   tableId: 't1' }),
        makeGuest({ id: '3', firstName: 'Carol', tableId: 't2' })
      ], [], [t1, t2]);
      const tables = component.tables();
      expect(tables.length).toBe(2);
      expect(tables[0].table.name).toBe('Table 1');
      expect(tables[0].guests.length).toBe(2);
      expect(tables[1].table.name).toBe('Table 2');
    });

    it('should sort tables naturally (Table 2 before Table 10)', () => {
      const t1  = makeTable({ id: 't1',  name: 'Table 1' });
      const t2  = makeTable({ id: 't2',  name: 'Table 2' });
      const t10 = makeTable({ id: 't10', name: 'Table 10' });
      build([
        makeGuest({ id: '1', tableId: 't10' }),
        makeGuest({ id: '2', tableId: 't2' }),
        makeGuest({ id: '3', tableId: 't1' })
      ], [], [t10, t2, t1]);
      expect(component.tables().map(t => t.table.name)).toEqual(['Table 1', 'Table 2', 'Table 10']);
    });

    it('should sort guests within a table alphabetically', () => {
      const t1 = makeTable({ id: 't1', name: 'Table 1' });
      build([
        makeGuest({ id: '1', firstName: 'Carol', lastName: 'A', tableId: 't1' }),
        makeGuest({ id: '2', firstName: 'Alice', lastName: 'A', tableId: 't1' }),
        makeGuest({ id: '3', firstName: 'Bob',   lastName: 'A', tableId: 't1' })
      ], [], [t1]);
      expect(component.tables()[0].guests.map(g => g.firstName)).toEqual(['Alice', 'Bob', 'Carol']);
    });

    it('should compute totalSeatedCount across all tables', () => {
      const t1 = makeTable({ id: 't1', name: 'Table 1' });
      const t2 = makeTable({ id: 't2', name: 'Table 2' });
      build([
        makeGuest({ id: '1', tableId: 't1' }),
        makeGuest({ id: '2', tableId: 't1' }),
        makeGuest({ id: '3', tableId: 't2' }),
        makeGuest({ id: '4', tableId: null })
      ], [], [t1, t2]);
      expect(component.totalSeatedCount()).toBe(3);
    });

    it('should flag a table as over capacity', () => {
      const t1 = makeTable({ id: 't1', name: 'Table 1', capacity: 2 });
      build([
        makeGuest({ id: '1', tableId: 't1' }),
        makeGuest({ id: '2', tableId: 't1' }),
        makeGuest({ id: '3', tableId: 't1' })
      ], [], [t1]);
      expect(component.tables()[0].isOverCapacity).toBeTrue();
    });
  });

  // ── Add table form ────────────────────────────────────────────────────────────

  describe('add table form', () => {
    beforeEach(() => build([]));

    it('should open the form with defaults', () => {
      component.openAddForm();
      expect(component.showAddForm()).toBeTrue();
      expect(component.newTableName()).toBe('');
      expect(component.newTableShape()).toBe('round');
      expect(component.newTableCapacity()).toBe(10);
    });

    it('should hide the form on cancel', () => {
      component.openAddForm();
      component.cancelAddForm();
      expect(component.showAddForm()).toBeFalse();
    });

    it('should call createTable with trimmed name and chosen shape/capacity', async () => {
      component.openAddForm();
      component.newTableName.set('  Garden  ');
      component.newTableShape.set('rectangle');
      component.newTableCapacity.set(8);
      await component.submitAddForm();
      expect(firestoreSpy.createTable).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'Garden', shape: 'rectangle', capacity: 8 })
      );
      expect(component.showAddForm()).toBeFalse();
    });

    it('should not call createTable when name is blank', async () => {
      component.openAddForm();
      component.newTableName.set('   ');
      await component.submitAddForm();
      expect(firestoreSpy.createTable).not.toHaveBeenCalled();
    });

    it('should show an error toast when createTable rejects', async () => {
      firestoreSpy.createTable.and.returnValue(Promise.reject(new Error('boom')));
      component.openAddForm();
      component.newTableName.set('Oops');
      await component.submitAddForm();
      const last = messageSpy.add.calls.mostRecent().args[0] as any;
      expect(last.severity).toBe('error');
    });
  });

  // ── Edit table ────────────────────────────────────────────────────────────────

  describe('edit table', () => {
    const t1 = makeTable({ id: 't1', name: 'Table 1', shape: 'round', capacity: 10 });

    beforeEach(() => build([], [], [t1]));

    it('should seed edit signals with the table values', () => {
      component.beginEditTable(t1);
      expect(component.editingTableId()).toBe('t1');
      expect(component.editTableName()).toBe('Table 1');
      expect(component.editTableShape()).toBe('round');
      expect(component.editTableCapacity()).toBe(10);
    });

    it('should clear edit state on cancel', () => {
      component.beginEditTable(t1);
      component.cancelEditTable();
      expect(component.editingTableId()).toBeNull();
    });

    it('should call updateTable with trimmed name', async () => {
      component.beginEditTable(t1);
      component.editTableName.set('  Roses  ');
      component.editTableShape.set('rectangle');
      component.editTableCapacity.set(12);
      await component.saveEditTable();
      expect(firestoreSpy.updateTable).toHaveBeenCalledWith(
        't1',
        jasmine.objectContaining({ name: 'Roses', shape: 'rectangle', capacity: 12 }),
        'Roses'
      );
      expect(component.editingTableId()).toBeNull();
    });

    it('should not call updateTable when name is blank', async () => {
      component.beginEditTable(t1);
      component.editTableName.set('   ');
      await component.saveEditTable();
      expect(firestoreSpy.updateTable).not.toHaveBeenCalled();
    });
  });

  // ── Delete table ──────────────────────────────────────────────────────────────

  describe('confirmDeleteTable', () => {
    it('should open a confirmation dialog', () => {
      build([], [], [makeTable({ id: 't1', name: 'Table 1' })]);
      const t1 = component.tables()[0].table;
      component.confirmDeleteTable(t1, new MouseEvent('click'));
      expect(confirmSpy.confirm).toHaveBeenCalled();
    });
  });

  // ── Guest assignment (drag-drop) ──────────────────────────────────────────────

  describe('onDrop', () => {
    it('should call setGuestTableById with the target table id', async () => {
      const t1 = makeTable({ id: 't1', name: 'Table 1' });
      build([makeGuest({ id: '1', firstName: 'Alice', tableId: null })], [], [t1]);
      const guest = component.unseatedGuests()[0].guest;
      await component.onDrop(makeDrop(guest), 't1');
      expect(firestoreSpy.setGuestTableById).toHaveBeenCalledWith(
        '1', 't1', jasmine.objectContaining({ guestName: 'Alice B' })
      );
    });

    it('should call setGuestTableById with null to return to unseated', async () => {
      const t1 = makeTable({ id: 't1', name: 'Table 1' });
      build([makeGuest({ id: '1', firstName: 'Alice', tableId: 't1' })], [], [t1]);
      const guest = component.tables()[0].guests[0];
      await component.onDrop(makeDrop(guest), null);
      expect(firestoreSpy.setGuestTableById).toHaveBeenCalledWith(
        '1', null, jasmine.objectContaining({ guestName: 'Alice B' })
      );
    });

    it('should skip the write when the guest is already on the target table', async () => {
      const t1 = makeTable({ id: 't1', name: 'Table 1' });
      build([makeGuest({ id: '1', tableId: 't1' })], [], [t1]);
      const guest = component.tables()[0].guests[0];
      await component.onDrop(makeDrop(guest), 't1');
      expect(firestoreSpy.setGuestTableById).not.toHaveBeenCalled();
    });

    it('should show an error toast when the write rejects', async () => {
      firestoreSpy.setGuestTableById.and.returnValue(Promise.reject(new Error('boom')));
      build([makeGuest({ id: '1', firstName: 'Alice', tableId: null })]);
      const guest = component.unseatedGuests()[0].guest;
      await component.onDrop(makeDrop(guest), 't1');
      const last = messageSpy.add.calls.mostRecent().args[0] as any;
      expect(last.severity).toBe('error');
    });
  });

  // ── Mobile assignment ─────────────────────────────────────────────────────────

  describe('assignGuestToTable', () => {
    it('should call setGuestTableById with the chosen table id', async () => {
      const t1 = makeTable({ id: 't1', name: 'Table 1' });
      build([makeGuest({ id: '1', firstName: 'Alice', tableId: null })], [], [t1]);
      const guest = component.unseatedGuests()[0].guest;
      await component.assignGuestToTable(guest, 't1');
      expect(firestoreSpy.setGuestTableById).toHaveBeenCalledWith(
        '1', 't1', jasmine.objectContaining({ guestName: 'Alice B' })
      );
    });

    it('should skip the write when already on the same table', async () => {
      const t1 = makeTable({ id: 't1', name: 'Table 1' });
      build([makeGuest({ id: '1', tableId: 't1' })], [], [t1]);
      const guest = component.tables()[0].guests[0];
      await component.assignGuestToTable(guest, 't1');
      expect(firestoreSpy.setGuestTableById).not.toHaveBeenCalled();
    });
  });

  // ── Unseat ────────────────────────────────────────────────────────────────────

  describe('unseatGuest', () => {
    beforeEach(() => {
      const t1 = makeTable({ id: 't1', name: 'Table 1' });
      build([makeGuest({ id: '1', firstName: 'Alice', tableId: 't1' })], [], [t1]);
    });

    it('should call setGuestTableById with null', async () => {
      const guest = component.tables()[0].guests[0];
      await component.unseatGuest(guest);
      expect(firestoreSpy.setGuestTableById).toHaveBeenCalledWith('1', null, { guestName: 'Alice B' });
    });

    it('should surface an error toast when the write rejects', async () => {
      firestoreSpy.setGuestTableById.and.returnValue(Promise.reject(new Error('boom')));
      const guest = component.tables()[0].guests[0];
      await component.unseatGuest(guest);
      const last = messageSpy.add.calls.mostRecent().args[0] as any;
      expect(last.severity).toBe('error');
    });
  });
});