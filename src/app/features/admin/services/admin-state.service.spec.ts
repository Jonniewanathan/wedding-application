import { TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { AdminStateService } from './admin-state.service';
import { Guest } from '../../../shared/models/guest.model';

function makeGuest(id: string, firstName = 'A', lastName = 'B'): Guest {
  return {
    id,
    firstName,
    lastName,
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp
  };
}

describe('AdminStateService', () => {
  let service: AdminStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminStateService]
    });
    service = TestBed.inject(AdminStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default selectedGuests to an empty array', () => {
    expect(service.selectedGuests()).toEqual([]);
  });

  it('should update selectedGuests when setSelectedGuests is called', () => {
    const guests = [makeGuest('1'), makeGuest('2')];
    service.setSelectedGuests(guests);
    expect(service.selectedGuests()).toEqual(guests);
    expect(service.selectedGuests().length).toBe(2);
  });

  it('should replace the previous selection on subsequent calls', () => {
    service.setSelectedGuests([makeGuest('1')]);
    service.setSelectedGuests([makeGuest('2'), makeGuest('3')]);
    expect(service.selectedGuests().map(g => g.id)).toEqual(['2', '3']);
  });

  it('should empty the selection when clearSelection is called', () => {
    service.setSelectedGuests([makeGuest('1'), makeGuest('2')]);
    service.clearSelection();
    expect(service.selectedGuests()).toEqual([]);
  });

  it('should accept an empty array', () => {
    service.setSelectedGuests([]);
    expect(service.selectedGuests()).toEqual([]);
  });
});