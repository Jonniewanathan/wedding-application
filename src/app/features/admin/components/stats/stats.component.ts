import { Component, inject, Signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { Guest } from '../../../../shared/models/guest.model';
import { Invitation } from '../../../../shared/models/invitation.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import * as Papa from 'papaparse';
import {Ripple} from 'primeng/ripple';
import {TableModule} from 'primeng/table';
import { DialogModule } from 'primeng/dialog';

interface StatCard {
  title: string;
  value: number;
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, ButtonModule, Ripple, TableModule, DialogModule],
  templateUrl: './stats.component.html',
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
    responsive: true,
    maintainAspectRatio: false
  };

  allGuests: Signal<Guest[]> = toSignal(this.firestoreService.getAllGuests(), { initialValue: [] });
  allInvitations: Signal<Invitation[]> = toSignal(this.firestoreService.getInvitations(), { initialValue: [] });

  stats = computed<StatCard[]>(() => {
    const guests = this.allGuests();
    return [
      { title: 'Total Invited', value: guests.length },
      { title: 'Attending', value: guests.filter(g => g.isAttending === true).length },
      { title: 'Declined', value: guests.filter(g => g.isAttending === false).length },
      { title: 'Pending', value: guests.filter(g => g.isAttending === null).length },
    ];
  });

  // Modal State
  displayModal = false;
  modalTitle = '';
  modalGuests: Guest[] = [];

  openModal(statTitle: string) {
    this.modalTitle = statTitle;
    const guests = this.allGuests();

    switch (statTitle) {
      case 'Total Invited':
        this.modalGuests = guests;
        break;
      case 'Attending':
        this.modalGuests = guests.filter(g => g.isAttending === true);
        break;
      case 'Declined':
        this.modalGuests = guests.filter(g => g.isAttending === false);
        break;
      case 'Pending':
        this.modalGuests = guests.filter(g => g.isAttending === null);
        break;
      default:
        this.modalGuests = [];
    }

    this.displayModal = true;
  }

  attendanceChartData = computed(() => {
      const guests = this.allGuests();
      const counts = {
          Attending: guests.filter(g => g.isAttending === true).length,
          Declined: guests.filter(g => g.isAttending === false).length,
          Pending: guests.filter(g => g.isAttending === null).length
      };

      const backgroundColor = [
          '#10b981', // green for attending
          '#ef4444', // red for declined
          '#cbd5e1'  // slate-300 for pending
      ];

      const hoverBackgroundColor = [
          '#059669', // darker green
          '#dc2626', // darker red
          '#94a3b8'  // darker slate
      ];

      return {
          labels: Object.keys(counts),
          datasets: [{
              data: Object.values(counts),
              backgroundColor: backgroundColor,
              hoverBackgroundColor: hoverBackgroundColor
          }]
      };
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

  invitationsWithMessages = computed(() => {
    return this.allInvitations().filter(inv => inv.message && inv.message.trim().length > 0);
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

// --- Table Data: Dietary Requirements ---
  guestsByDietary = computed(() => {
    const guests = this.allGuests().filter(g => g.isAttending);
    const result: any[] = [];

    const categories = [...new Set(guests.flatMap(g => g.dietaryPreferences?.length ? g.dietaryPreferences : ['Standard/No Requirements']))];

    categories.sort().forEach(cat => {
      const guestsInCat = guests
        .filter(g => (g.dietaryPreferences?.includes(cat)) || (!g.dietaryPreferences?.length && cat === 'Standard/No Requirements'))
        .sort((a, b) => (a.invitationId || '').localeCompare(b.invitationId || ''));

      let currentInviteId = '';
      let shaded = false;

      guestsInCat.forEach(g => {
        if (g.invitationId !== currentInviteId) {
          shaded = !shaded;
          currentInviteId = g.invitationId || '';
        }
        result.push({
          dietaryCategory: cat,
          fullName: `${g.firstName} ${g.lastName}`,
          details: g.dietaryNotes || g.allergies?.join(', ') || '-',
          isShaded: shaded
        });
      });
    });
    return result;
  });

  // --- Table Data: Bus Manifest ---
  guestsByBus = computed(() => {
    const guests = this.allGuests().filter(g => g.isAttending && g.needsBus);
    const result: any[] = [];

    const locations = [...new Set(guests.map(g => g.busPickupLocation || 'Location Unspecified'))];

    locations.sort().forEach(loc => {
      const guestsInLoc = guests
        .filter(g => (g.busPickupLocation || 'Location Unspecified') === loc)
        .sort((a, b) => (a.invitationId || '').localeCompare(b.invitationId || ''));

      let currentInviteId = '';
      let shaded = false;

      guestsInLoc.forEach(g => {
        if (g.invitationId !== currentInviteId) {
          shaded = !shaded;
          currentInviteId = g.invitationId || '';
        }
        result.push({
          pickupLocation: loc,
          fullName: `${g.firstName} ${g.lastName}`,
          isShaded: shaded
        });
      });
    });
    return result;
  });

  // --- Table Data: Allergy List ---
  guestsByAllergy = computed(() => {
    const guests = this.allGuests().filter(g => g.isAttending);
    const result: any[] = [];

    // Only get guests that actually have an allergy
    const allergyCategories = [...new Set(guests.flatMap(g => g.allergies || []).filter(a => a.length > 0))];

    allergyCategories.sort().forEach(allergy => {
      const guestsWithAllergy = guests
        .filter(g => g.allergies?.includes(allergy))
        .sort((a, b) => (a.invitationId || '').localeCompare(b.invitationId || ''));

      let currentInviteId = '';
      let shaded = false;

      guestsWithAllergy.forEach(g => {
        if (g.invitationId !== currentInviteId) {
          shaded = !shaded;
          currentInviteId = g.invitationId || '';
        }
        result.push({
          allergyCategory: allergy,
          fullName: `${g.firstName} ${g.lastName}`,
          details: g.dietaryNotes || '-',
          isShaded: shaded
        });
      });
    });
    return result;
  });
}
