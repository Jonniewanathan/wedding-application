import { Injectable, signal } from '@angular/core';
import { Guest } from '../../../shared/models/guest.model';

@Injectable()
export class AdminStateService {
  selectedGuests = signal<Guest[]>([]);

  setSelectedGuests(guests: Guest[]) {
    this.selectedGuests.set(guests);
  }

  clearSelection() {
    this.selectedGuests.set([]);
  }
}
