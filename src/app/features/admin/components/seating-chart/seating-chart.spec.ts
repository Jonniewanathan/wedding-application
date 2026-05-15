import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { SeatingChart } from './seating-chart';
import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { Guest } from '../../../../shared/models/guest.model';

function ts(): Timestamp {
  return { seconds: 0, nanoseconds: 0 } as unknown as Timestamp;
}

function makeGuest(overrides: Partial<Guest>): Guest {
  return {
    id: 'g',
    firstName: 'A',
    lastName: 'B',
    isAttending: true,
    createdAt: ts(),
    ...overrides
  };
}

describe('SeatingChart', () => {
  let component: SeatingChart;
  let fixture: ComponentFixture<SeatingChart>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let messageSpy: jasmine.SpyObj<MessageService>;

  function build(guests: Guest[]) {
    firestoreSpy.getAllGuests.and.returnValue(of(guests));
    fixture = TestBed.createComponent(SeatingChart);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'getAllGuests',
      'setGuestTable'
    ]);
    firestoreSpy.getAllGuests.and.returnValue(of([]));
    firestoreSpy.setGuestTable.and.returnValue(Promise.resolve());
    messageSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add']);

    TestBed.configureTestingModule({
      imports: [SeatingChart],
      providers: [
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: MessageService, useValue: messageSpy }
      ]
    });
  });

  describe('grouping', () => {
    it('should ignore non-attending guests entirely', () => {
      build([
        makeGuest({ id: '1', isAttending: false, tableName: 'Table 1' }),
        makeGuest({ id: '2', isAttending: null, tableName: 'Table 1' })
      ]);
      expect(component.tables().length).toBe(0);
      expect(component.unseatedGuests().length).toBe(0);
    });

    it('should list attending guests with no table as unseated', () => {
      build([
        makeGuest({ id: '1', firstName: 'Alice', tableName: null }),
        makeGuest({ id: '2', firstName: 'Bob', tableName: '' }),
        makeGuest({ id: '3', firstName: 'Carol', tableName: 'Table 1' })
      ]);
      const unseated = component.unseatedGuests();
      expect(unseated.length).toBe(2);
      expect(unseated.map(g => g.firstName)).toEqual(['Alice', 'Bob']);
    });

    it('should group seated attending guests by tableName', () => {
      build([
        makeGuest({ id: '1', firstName: 'Alice', tableName: 'Table 1' }),
        makeGuest({ id: '2', firstName: 'Bob', tableName: 'Table 1' }),
        makeGuest({ id: '3', firstName: 'Carol', tableName: 'Table 2' })
      ]);
      const tables = component.tables();
      expect(tables.length).toBe(2);
      expect(tables[0].name).toBe('Table 1');
      expect(tables[0].guests.length).toBe(2);
      expect(tables[1].name).toBe('Table 2');
    });

    it('should sort tables naturally (Table 2 before Table 10)', () => {
      build([
        makeGuest({ id: '1', tableName: 'Table 10' }),
        makeGuest({ id: '2', tableName: 'Table 2' }),
        makeGuest({ id: '3', tableName: 'Table 1' })
      ]);
      expect(component.tables().map(t => t.name)).toEqual(['Table 1', 'Table 2', 'Table 10']);
    });

    it('should sort guests within a table alphabetically', () => {
      build([
        makeGuest({ id: '1', firstName: 'Carol', lastName: 'A', tableName: 'Table 1' }),
        makeGuest({ id: '2', firstName: 'Alice', lastName: 'A', tableName: 'Table 1' }),
        makeGuest({ id: '3', firstName: 'Bob', lastName: 'A', tableName: 'Table 1' })
      ]);
      const names = component.tables()[0].guests.map(g => g.firstName);
      expect(names).toEqual(['Alice', 'Bob', 'Carol']);
    });

    it('should compute totalSeatedCount across all tables', () => {
      build([
        makeGuest({ id: '1', tableName: 'Table 1' }),
        makeGuest({ id: '2', tableName: 'Table 1' }),
        makeGuest({ id: '3', tableName: 'Table 2' }),
        makeGuest({ id: '4', tableName: null })
      ]);
      expect(component.totalSeatedCount()).toBe(3);
    });
  });

  describe('edit lifecycle', () => {
    beforeEach(() => {
      build([makeGuest({ id: '1', firstName: 'Alice', tableName: 'Table 1' })]);
    });

    it('should seed the draft with the guest\'s current table on beginEdit', () => {
      const guest = component.tables()[0].guests[0];
      component.beginEdit(guest);
      expect(component.editingGuestId()).toBe('1');
      expect(component.editingDraft()).toBe('Table 1');
    });

    it('should clear edit state on cancelEdit', () => {
      component.beginEdit(component.tables()[0].guests[0]);
      component.cancelEdit();
      expect(component.editingGuestId()).toBeNull();
      expect(component.editingDraft()).toBe('');
    });

    it('should call setGuestTable with the trimmed draft on saveEdit', async () => {
      const guest = component.tables()[0].guests[0];
      component.beginEdit(guest);
      component.editingDraft.set('  Garden Table  ');
      await component.saveEdit(guest);
      expect(firestoreSpy.setGuestTable).toHaveBeenCalledWith('1', 'Garden Table');
    });

    it('should clear the assignment when the draft is empty', async () => {
      const guest = component.tables()[0].guests[0];
      component.beginEdit(guest);
      component.editingDraft.set('   ');
      await component.saveEdit(guest);
      expect(firestoreSpy.setGuestTable).toHaveBeenCalledWith('1', null);
    });

    it('should skip the write when the draft matches the current value', async () => {
      const guest = component.tables()[0].guests[0];
      component.beginEdit(guest);
      component.editingDraft.set('Table 1');
      await component.saveEdit(guest);
      expect(firestoreSpy.setGuestTable).not.toHaveBeenCalled();
      expect(component.editingGuestId()).toBeNull();
    });

    it('should surface an error toast when saveEdit rejects', async () => {
      firestoreSpy.setGuestTable.and.returnValue(Promise.reject(new Error('boom')));
      const guest = component.tables()[0].guests[0];
      component.beginEdit(guest);
      component.editingDraft.set('Table 9');
      await component.saveEdit(guest);
      const last = messageSpy.add.calls.mostRecent().args[0] as any;
      expect(last.severity).toBe('error');
    });
  });

  describe('unseatGuest', () => {
    beforeEach(() => {
      build([makeGuest({ id: '1', firstName: 'Alice', tableName: 'Table 1' })]);
    });

    it('should write null to setGuestTable', async () => {
      const guest = component.tables()[0].guests[0];
      await component.unseatGuest(guest);
      expect(firestoreSpy.setGuestTable).toHaveBeenCalledWith('1', null);
    });

    it('should surface an error toast when the write rejects', async () => {
      firestoreSpy.setGuestTable.and.returnValue(Promise.reject(new Error('boom')));
      const guest = component.tables()[0].guests[0];
      await component.unseatGuest(guest);
      const last = messageSpy.add.calls.mostRecent().args[0] as any;
      expect(last.severity).toBe('error');
    });
  });
});