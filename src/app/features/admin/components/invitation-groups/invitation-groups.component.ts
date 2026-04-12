import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable } from 'rxjs';
import QRCode from 'qrcode';

import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { AdminStateService } from '../../services/admin-state.service';
import { Invitation } from '../../../../shared/models/invitation.model';
import { ViewGuests } from '../../../../shared/components/view-guests/view-guests';
import { QrCodeDisplay } from '../../../../shared/components/qr-code-display/qr-code-display';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-invitation-groups',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule],
  templateUrl: './invitation-groups.component.html',
})
export class InvitationGroupsComponent implements OnInit {
  private firestoreService = inject(FirestoreService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dialogService = inject(DialogService);
  public adminStateService = inject(AdminStateService);

  invitations$!: Observable<Invitation[]>;
  dialogRef: DynamicDialogRef | null = null;

  ngOnInit(): void {
    this.invitations$ = this.firestoreService.getInvitations();
  }

  get selectedGuests() {
    return this.adminStateService.selectedGuests();
  }

  filterInvitations(table: Table, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    table.filterGlobal(value, 'contains');
  }

  onAddGuestsToInvitation(invitation: Invitation): void {
    if (this.selectedGuests.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'No Guests Selected', detail: 'Please select guests from the unassigned list first.' });
      return;
    }

    const guestNames = this.selectedGuests.map(g => `${g.firstName} ${g.lastName}`).join(', ');
    const guestCount = this.selectedGuests.length;

    this.confirmationService.confirm({
      message: `Add ${guestCount} selected guest(s) (${guestNames}) to the invitation for "${invitation.displayName}"?`,
      header: 'Confirm Assignment',
      icon: 'pi pi-user-plus',
      accept: () => {
        const guestIds = this.selectedGuests.map(g => g.id);
        this.firestoreService.assignGuestsToInvitation(invitation.id, guestIds)
          .then(() => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: `${guestCount} guest(s) assigned to ${invitation.displayName}.` });
            this.adminStateService.clearSelection();
          })
          .catch(err => this.handleError(err, 'Could not assign guests.'));
      }
    });
  }

  openViewGuests(invitation: Invitation): void {
    this.dialogRef = this.dialogService.open(ViewGuests, {
      header: `Guests for: ${invitation.displayName}`,
      width: '60%',
      closable: true,
      closeOnEscape: true,
      data: { invitationId: invitation.id }
    });
  }

  async showQrCodeDialog(invitation: Invitation) {
    const url = `https://wedding.jonathanquirke.com/invite/${invitation.invitationCode}`;
    try {
      let qrCodeDataUrl = '';
      await QRCode.toDataURL(url, { errorCorrectionLevel: 'H', width: 256 })
        .then((dataUrl) => {qrCodeDataUrl = dataUrl});

      // Fetch the guests for this invitation to display in the modal/print
      this.firestoreService.getGuestsForInvitation(invitation.id).pipe(take(1)).subscribe((guests) => {
        this.dialogRef = this.dialogService.open(QrCodeDisplay, {
          header: 'Invitation Link',
          width: '40%',
          closable: true,
          data: {
            url: url,
            qrCodeDataUrl: qrCodeDataUrl,
            invitationName: invitation.displayName,
            guests: guests // Pass the guests array
          }
        });
      });

    } catch (err) {
      this.handleError(err, 'Could not generate or display QR code');
    }
  }

  onDeleteInvitation(invitation: Invitation): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the invitation for "${invitation.displayName}"? Guests assigned to it will be moved back to the unassigned pool.`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.firestoreService.deleteInvitationAndUnassignGuests(invitation.id)
          .then(() => this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Invitation removed, guests unassigned.' }))
          .catch(err => this.handleError(err, 'Could not delete invitation.'));
      }
    });
  }

  private handleError(error: any, defaultMessage: string): void {
    console.error(error);
    this.messageService.add({ severity: 'error', summary: 'Error', detail: defaultMessage });
  }
}
