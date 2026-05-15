import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService, SelectItem } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import QRCode from 'qrcode';

import { FirestoreService } from '../../../../core/services/firestore/firestore';
import { AdminStateService } from '../../services/admin-state.service';
import { Invitation, InvitationOutreachStage } from '../../../../shared/models/invitation.model';
import { ViewGuests } from '../../../../shared/components/view-guests/view-guests';
import { QrCodeDisplay } from '../../../../shared/components/qr-code-display/qr-code-display';
import { take } from 'rxjs/operators';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InvitationForm } from '../../../../shared/components/invitation-form/invitation-form';
import { Guest } from '../../../../shared/models/guest.model';
import {InputGroupAddon} from 'primeng/inputgroupaddon';
import {InputGroup} from 'primeng/inputgroup';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-invitation-groups',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule, SelectModule, FormsModule, InputTextModule, InputGroupAddon, InputGroup],
  templateUrl: './invitation-groups.component.html',
})
export class InvitationGroups implements OnInit {
  private firestoreService = inject(FirestoreService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dialogService = inject(DialogService);
  public adminStateService = inject(AdminStateService);

  invitations$!: Observable<Invitation[]>;
  dialogRef: DynamicDialogRef | null = null;

  statusOptions: SelectItem[] = [
    { label: 'All Statuses', value: null },
    { label: 'Responded', value: true },
    { label: 'Pending', value: false }
  ];

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

  onStatusFilterChange(table: Table, event: any) {
    table.filter(event.value, 'hasResponded', 'equals');
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
        const existingGuestIds = invitation.guestIds || [];
        const newGuestIds = this.selectedGuests.map(g => g.id);
        const combinedIds = [...existingGuestIds, ...newGuestIds];

        this.firestoreService.assignGuestsToInvitation(invitation.id, combinedIds)
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

  editInvitation(invitation: Invitation): void {
    this.firestoreService.getGuestsForInvitation(invitation.id).pipe(take(1)).subscribe(guests => {

      const sortedGuests = guests.sort((a, b) => {
        const indexA = invitation.guestIds.indexOf(a.id);
        const indexB = invitation.guestIds.indexOf(b.id);
        return indexA - indexB;
      });

      this.dialogRef = this.dialogService.open(InvitationForm, {
        header: ' ',
        width: '90vw',
        styleClass: 'editorial-dialog max-w-[500px]',
        contentStyle: { "padding": "0", "border-radius": "0" },
        data: {
          guests: sortedGuests,
          invitation: invitation
        }
      });

      this.dialogRef?.onClose.subscribe(async (result) => {
        if (result) {
          try {
            await this.firestoreService.updateInvitation(invitation.id, {
              displayName: result.displayName
            });

            const newOrderIds = result.orderedGuests.map((g: Guest) => g.id);

            if (JSON.stringify(newOrderIds) !== JSON.stringify(invitation.guestIds)) {
               await this.firestoreService.assignGuestsToInvitation(invitation.id, newOrderIds);
            }

            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Invitation Updated' });

          } catch (err) {
            this.handleError(err, 'Could not update invitation.');
          }
        }
      });
    });
  }

  async showQrCodeDialog(invitation: Invitation) {
    const url = `${environment.siteBaseUrl}/invite/${invitation.invitationCode}`;
    try {
      let qrCodeDataUrl = '';
      await QRCode.toDataURL(url, { errorCorrectionLevel: 'H', width: 256 })
        .then((dataUrl) => {qrCodeDataUrl = dataUrl});

      this.firestoreService.getGuestsForInvitation(invitation.id).pipe(take(1)).subscribe((guests) => {
        this.dialogRef = this.dialogService.open(QrCodeDisplay, {
          header: 'Invitation Link',
          width: '40%',
          breakpoints: {
            '960px': '75vw',
            '640px': '90vw'
          },
          closable: true,
          data: {
            url: url,
            qrCodeDataUrl: qrCodeDataUrl,
            invitationName: invitation.displayName,
            guests: guests
          }
        });
      });

    } catch (err) {
      this.handleError(err, 'Could not generate or display QR code');
    }
  }

  /**
   * Build the tooltip for an outreach chip. When the stage has happened we
   * surface both the absolute date and a relative "X days ago" so the
   * couple can scan the table for stale follow-ups at a glance.
   */
  outreachTooltip(value: Timestamp | null | undefined, stageLabel: string): string {
    const ms = this.tsToMs(value);
    if (ms === null) {
      return `Mark ${stageLabel.toLowerCase()}`;
    }
    const date = new Date(ms);
    const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const daysAgo = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
    const ago = daysAgo <= 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
    return `${stageLabel} ${formatted} · ${ago} — click to clear`;
  }

  private tsToMs(value: Timestamp | null | undefined): number | null {
    if (!value) return null;
    const v = value as { toMillis?: () => number; seconds?: number };
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    return null;
  }

  /**
   * Toggle an outreach milestone (sent / first reminder / second reminder)
   * on an invitation. Optimistic UI — the table is bound to the live
   * Firestore stream, so flipping the field server-side re-renders the
   * row automatically.
   */
  toggleOutreach(invitation: Invitation, stage: InvitationOutreachStage): void {
    const isCurrentlyActive = !!invitation[stage];
    this.firestoreService
      .setInvitationOutreachStage(invitation.id, stage, !isCurrentlyActive)
      .catch(err => this.handleError(err, 'Could not update outreach status.'));
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
