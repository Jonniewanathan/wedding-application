import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable } from 'rxjs';
import Papa from 'papaparse';
import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { AdminStateService } from '../../services/admin-state.service';
import { Guest } from '../../../../shared/models/guest.model';
import { GuestForm } from '../../../../shared/components/guest-form/guest-form';
import { InvitationForm } from '../../../../shared/components/invitation-form/invitation-form';
import {InputTextModule} from 'primeng/inputtext';
import {InputGroupModule} from 'primeng/inputgroup';
import {InputGroupAddonModule} from 'primeng/inputgroupaddon';

interface CsvGuestRow {
  FirstName: string;
  LastName: string;
  Country?: string; // Optional in CSV
  Notes?: string;   // Optional in CSV
}

interface CsvSkippedRow {
  reason: string;
  raw: CsvGuestRow;
}

@Component({
  selector: 'app-guest-pool',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule, DialogModule, InputTextModule, InputGroupModule, InputGroupAddonModule],
  templateUrl: './guest-pool.component.html',
})
export class GuestPool implements OnInit {
  private firestoreService = inject(FirestoreService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dialogService = inject(DialogService);
  public adminStateService = inject(AdminStateService);

  unassignedGuests$!: Observable<Guest[]>;
  dialogRef: DynamicDialogRef | null = null;

  // CSV preview state — populated by handleCsvUpload, consumed by the
  // preview dialog in the template, written through to Firestore only
  // when the admin confirms.
  csvPreviewOpen = false;
  csvPreviewFileName = '';
  csvPreviewValid: Partial<Guest>[] = [];
  csvPreviewSkipped: CsvSkippedRow[] = [];
  csvImportInProgress = false;

  ngOnInit(): void {
    this.unassignedGuests$ = this.firestoreService.getUnassignedGuests();
  }

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

  /**
   * Parses the uploaded CSV and opens the preview dialog. The actual
   * write to Firestore happens only after the admin confirms via
   * confirmCsvImport(). Reset the input here so re-uploading the same
   * file later is possible.
   */
  async handleCsvUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file: File = input.files[0];
    const text: string = await file.text();

    const parseResult = Papa.parse<CsvGuestRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (parseResult.errors.length > 0) {
      console.warn('CSV parse warnings', parseResult.errors);
    }

    const valid: Partial<Guest>[] = [];
    const skipped: CsvSkippedRow[] = [];

    for (const row of parseResult.data || []) {
      const firstName = row.FirstName?.trim() || '';
      const lastName = row.LastName?.trim() || '';
      if (!firstName || !lastName) {
        skipped.push({ reason: 'Missing first or last name', raw: row });
        continue;
      }
      valid.push({
        firstName,
        lastName,
        countryOfResidence: row.Country?.trim() || '',
        notes: row.Notes?.trim() || ''
      });
    }

    this.csvPreviewFileName = file.name;
    this.csvPreviewValid = valid;
    this.csvPreviewSkipped = skipped;
    this.csvPreviewOpen = true;

    // Reset the input so the same file can be re-uploaded later.
    input.value = '';
  }

  async confirmCsvImport(): Promise<void> {
    if (this.csvImportInProgress) return;
    if (this.csvPreviewValid.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No data',
        detail: 'CSV had no valid rows to import.'
      });
      this.cancelCsvImport();
      return;
    }
    this.csvImportInProgress = true;
    try {
      await this.firestoreService.addGuestsBatch(this.csvPreviewValid);
      this.messageService.add({
        severity: 'success',
        summary: 'Import successful',
        detail: `Imported ${this.csvPreviewValid.length} guest${this.csvPreviewValid.length === 1 ? '' : 's'}.`
      });
      this.cancelCsvImport();
    } catch (err) {
      this.handleError(err, 'CSV import failed');
    } finally {
      this.csvImportInProgress = false;
    }
  }

  cancelCsvImport(): void {
    this.csvPreviewOpen = false;
    this.csvPreviewFileName = '';
    this.csvPreviewValid = [];
    this.csvPreviewSkipped = [];
  }

  openAddGuestForm(): void {
    this.dialogRef = this.dialogService.open(GuestForm, {
      header: ' ',
      width: '90vw',
      styleClass: 'editorial-dialog max-w-[500px]',
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
    this.dialogRef = this.dialogService.open(GuestForm, {
      header: ' ',
      width: '90vw',
      styleClass: 'editorial-dialog max-w-[500px]',
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

    this.dialogRef = this.dialogService.open(InvitationForm, {
      header: ' ', // Handled in component
      width: '90vw',
      styleClass: 'editorial-dialog max-w-[500px]',
      contentStyle: { "padding": "0", "border-radius": "0" },
      data: { guests: currentSelection }
    });

    this.dialogRef?.onClose.subscribe(async (result) => {
      if (result) {
        try {
          const invitationRef = await this.firestoreService.createInvitation({
            displayName: result.displayName,
            email: result.email,
            phoneNumber: result.phoneNumber
          });
          const newInvitationId = invitationRef.id;

          // Note: orderedGuests comes from the drag-and-drop feature in the form
          const guestIds = result.orderedGuests.map((g: Guest) => g.id);

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
