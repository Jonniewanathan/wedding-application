import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable } from 'rxjs';

import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { AdminStateService } from '../../services/admin-state.service';
import { Guest } from '../../../../shared/models/guest.model';
import { GuestFormComponent } from '../../../../shared/components/guest-form/guest-form';
import { InvitationFormComponent } from '../../../../shared/components/invitation-form/invitation-form';
import {InputText} from 'primeng/inputtext';
import {InputGroup} from 'primeng/inputgroup';
import {InputGroupAddon} from 'primeng/inputgroupaddon';

interface CsvGuestRow {
  FirstName: string;
  LastName: string;
  Country?: string; // Optional in CSV
  Notes?: string;   // Optional in CSV
}

@Component({
  selector: 'app-guest-pool',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule, InputText, InputGroup, InputGroupAddon],
  templateUrl: './guest-pool.component.html',
})
export class GuestPoolComponent implements OnInit {
  private firestoreService = inject(FirestoreService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dialogService = inject(DialogService);
  public adminStateService = inject(AdminStateService);

  unassignedGuests$!: Observable<Guest[]>;
  dialogRef: DynamicDialogRef<any> | null = null;

  ngOnInit(): void {
    this.unassignedGuests$ = this.firestoreService.getUnassignedGuests();
  }

  // --- FIX: Use simple getter/setter pointing to the signal ---
  get selectedGuests(): Guest[] {
    return this.adminStateService.selectedGuests();
  }

  set selectedGuests(val: Guest[]) {
    this.adminStateService.setSelectedGuests(val);
  }

  filterGuests(table: Table, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    table.filterGlobal(value, 'contains');
  }

  async handleCsvUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file: File = input.files[0];
    const text: string = await file.text();

    const csvData: CsvGuestRow[] = this.parseCSV<CsvGuestRow>(text);

    const newGuests: Partial<Guest>[] = csvData
      .filter(row => row.FirstName && row.LastName) // Safety check
      .map(row => ({
        firstName: row.FirstName.trim(),
        lastName: row.LastName.trim(),
        countryOfResidence: row.Country?.trim() || '',
        notes: row.Notes?.trim() || ''
      }));

    if (newGuests.length > 0) {
      try {
        await this.firestoreService.addGuestsBatch(newGuests);
        this.messageService.add({
          severity: 'success',
          summary: 'Import Successful',
          detail: `Successfully imported ${newGuests.length} guests.`
        });
      } catch (err) {
        this.handleError(err, 'CSV Import Failed');
      }
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Data',
        detail: 'No valid guests found in CSV. Check headers.'
      });
    }

    // Reset input
    input.value = '';
  }

  private parseCSV<T>(text: string): T[] {
    const lines: string[] = text.split('\n');
    const headers: string[] = lines[0].split(',').map(h => h.trim().replace(/['"]+/g, '')); // Clean headers

    const results: T[] = [];

    // Start from index 1 to skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const currentLine = line.split(',');
      const obj: any = {};

      headers.forEach((header, index) => {
        // Clean quotes from values if present
        let value = currentLine[index]?.trim();
        if (value && value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        obj[header] = value;
      });

      results.push(obj as T);
    }

    return results;
  }

  openAddGuestForm(): void {
    this.dialogRef = this.dialogService.open(GuestFormComponent, {
      header: ' ',
      width: '40%',
      styleClass: 'editorial-dialog',
      contentStyle: { "padding": "0", "border-radius": "0" },
      data: { guest: null }
    });

    this.dialogRef?.onClose.subscribe((success) => {
      if (success) {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Guest added successfully' });
      }
    });
  }

  onEditGuest(guest: Guest): void {
    this.dialogRef = this.dialogService.open(GuestFormComponent, {
      header: ' ',
      width: '40%',
      styleClass: 'editorial-dialog',
      closable: true,
      closeOnEscape: true,
      contentStyle: { "padding": "0", "border-radius": "0" },
      data: { guest: guest }
    });

    this.dialogRef?.onClose.subscribe((success) => {
      if (success) {
        this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Guest details updated.' });
      }
    });
  }

  onDeleteUnassignedGuest(guest: Guest): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${guest.firstName} ${guest.lastName}? This action cannot be undone.`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.firestoreService.deleteUnassignedGuest(guest.id)
          .then((deleted) => {
            if (deleted) {
              this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Guest removed.' });
            } else {
              this.messageService.add({ severity: 'warn', summary: 'Not Deleted', detail: 'Guest might already be assigned or was not found.' });
            }
          })
          .catch(err => this.handleError(err, 'Could not remove guest.'));
      }
    });
  }

  openInvitationForm(): void {
    const currentSelection = this.selectedGuests; // Cache to avoid multiple reads
    if (!currentSelection || currentSelection.length === 0) return;

    this.dialogRef = this.dialogService.open(InvitationFormComponent, {
      header: 'New Invitation Details',
      width: '40%',
      data: { guests: currentSelection }
    });

    this.dialogRef?.onClose.subscribe(async (invitationDetails) => {
      if (invitationDetails) {
        try {
          const invitationRef = await this.firestoreService.createInvitation({
            displayName: invitationDetails.displayName
          });
          const newInvitationId = invitationRef.id;

          const guestIds = currentSelection.map(g => g.id);
          await this.firestoreService.assignGuestsToInvitation(newInvitationId, guestIds);

          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Invitation Created' });
          this.adminStateService.clearSelection();

        } catch (err) {
          this.handleError(err, 'Could not create invitation.');
        }
      }
    });
  }

  private handleError(error: any, defaultMessage: string): void {
    console.error(error);
    this.messageService.add({ severity: 'error', summary: 'Error', detail: defaultMessage });
  }
}
