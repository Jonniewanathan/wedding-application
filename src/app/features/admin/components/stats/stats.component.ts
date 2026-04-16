import { Component, inject, Signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { Guest } from '../../../../shared/models/guest.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import * as Papa from 'papaparse';

interface StatCard {
  title: string;
  value: number;
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, ButtonModule],
  templateUrl: './stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsComponent {
  private firestoreService = inject(FirestoreService);

  options = {
    plugins: {
      legend: {
        labels: {
          usePointStyle: true
        }
      }
    },
    // Add responsive properties to force chart to re-render correctly
    responsive: true,
    maintainAspectRatio: false
  };

  allGuests: Signal<Guest[]> = toSignal(this.firestoreService.getAllGuests(), { initialValue: [] });

  stats = computed<StatCard[]>(() => {
    const guests = this.allGuests();
    return [
      { title: 'Total Invited', value: guests.length },
      { title: 'Attending', value: guests.filter(g => g.isAttending === true).length },
      { title: 'Declined', value: guests.filter(g => g.isAttending === false).length },
      { title: 'Pending', value: guests.filter(g => g.isAttending === null).length },
    ];
  });

  dietaryChartData = computed(() => {
    const guests = this.allGuests();
    const counts = guests
      .filter(g => g.isAttending)
      .flatMap(g => g.dietaryPreferences || [])
      .reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    if(labels.length === 0) return null;

    return {
      labels: labels,
      datasets: [{ data: data }]
    };
  });

  busChartData = computed(() => {
    const guests = this.allGuests();
    const counts = guests
      .filter(g => g.isAttending && g.needsBus && g.busPickupLocation)
      .map(g => g.busPickupLocation as string)
      .reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    if(labels.length === 0) return null;

    return {
      labels: labels,
      datasets: [{ data: data }]
    };
  });

  exportRsvpData(): void {
    const attendingGuests = this.allGuests().filter(g => g.isAttending);

    const csvData = attendingGuests.map(guest => ({
      'First Name': guest.firstName,
      'Last Name': guest.lastName,
      'Dietary Preferences': guest.dietaryPreferences?.length ? guest.dietaryPreferences.join(', ') : 'None',
      'Allergies': guest.allergies?.length ? guest.allergies.join(', ') : 'None',
      'Dietary Notes': guest.dietaryNotes || '',
      'Needs Bus': guest.needsBus ? 'Yes' : 'No',
      'Bus Pickup Location': guest.busPickupLocation || 'N/A',
      'Specific Notes / Message': guest.notes || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'wedding_rsvp_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
