import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

// Services & Models
import { FirestoreService } from '../../core/services/firestore/firestore';
import { AuthService } from '../../core/services/auth/auth';
// No longer need UnassignedGuest model
import { Invitation } from '../../shared/models/invitation.model';
import { Guest } from '../../shared/models/guest.model'; // Use the unified Guest model
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

// Components
import { InvitationFormComponent } from '../../shared/components/invitation-form/invitation-form';
import { ViewGuests } from '../../shared/components/view-guests/view-guests';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { PanelModule } from 'primeng/panel';
import { TooltipModule } from 'primeng/tooltip';
import {getDoc} from '@angular/fire/firestore'; // Correct import for TooltipModule
import QRCode from 'qrcode';
import {QrCodeDisplay} from '../../shared/components/qr-code-display/qr-code-display';
import {TabsModule} from 'primeng/tabs';
import {StyleClass} from 'primeng/styleclass';
import {GuestFormComponent} from '../../shared/components/guest-form/guest-form';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, TableModule, ButtonModule,
    ToastModule, ConfirmDialogModule, DynamicDialogModule,
    PanelModule, TooltipModule, TabsModule, StyleClass, // Use TooltipModule here
  ],
  providers: [DialogService, ConfirmationService, MessageService],
  templateUrl: './admin.html',
})
export class AdminComponent implements OnInit {
  private firestoreService = inject(FirestoreService);
  private authService = inject(AuthService);
  private router = inject(Router);
  public dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  unassignedGuests$!: Observable<Guest[]>; // Now uses Guest model
  invitations$!: Observable<Invitation[]>;

  selectedGuests: Guest[] = []; // Now uses Guest model
  // Keep separate refs if needed for specific closing logic, otherwise one might suffice
  dialogRef: DynamicDialogRef<any> | null = null; // Can use 'any' for general dialogs

  ngOnInit(): void {
    this.unassignedGuests$ = this.firestoreService.getUnassignedGuests();
    this.invitations$ = this.firestoreService.getInvitations();
  }

  // --- Guest Management ---

  openAddGuestForm(): void {
    this.dialogRef = this.dialogService.open(GuestFormComponent, {
      header: ' ', // Empty header (we use our custom one in HTML)
      width: '40%',
      styleClass: 'editorial-dialog', // Optional: if you added the global styles
      contentStyle: { "padding": "0", "border-radius": "0" }, // Removes default padding
      data: { guest: null } // Explicitly null for Add Mode
    });

    this.dialogRef?.onClose.subscribe((success) => {
      if (success) {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Guest added successfully' });
      }
    });
  }

  onDeleteUnassignedGuest(guest: Guest): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${guest.firstName} ${guest.lastName}? This action cannot be undone.`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Use the refactored deleteUnassignedGuest method
        this.firestoreService.deleteUnassignedGuest(guest.id)
          .then((deleted) => {
            if (deleted) {
              this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Guest removed.' });
            } else {
              // This case shouldn't happen if getUnassignedGuests() works correctly,
              // but good to keep a safeguard message.
              this.messageService.add({ severity: 'warn', summary: 'Not Deleted', detail: 'Guest might already be assigned or was not found.' });
            }
          })
          .catch(err => this.handleError(err, 'Could not remove guest.'));
      }
    });
  }

  // --- Invitation Management ---

  openInvitationForm(): void {
    if (this.selectedGuests.length === 0) return;

    this.dialogRef = this.dialogService.open(InvitationFormComponent, {
      header: 'New Invitation Details',
      width: '40%',
      data: { guests: this.selectedGuests }
    });

    this.dialogRef?.onClose.subscribe(async (invitationDetails) => {
      if (invitationDetails) {
        try {
          // Pass only displayName
          const invitationRef = await this.firestoreService.createInvitation({
            displayName: invitationDetails.displayName
          });
          const newInvitationId = invitationRef.id;
          const newInvitationCode = (await getDoc(invitationRef)).data()?.invitationCode; // Get the generated code back

          // Assign guests (remains the same)
          const guestIds = this.selectedGuests.map(g => g.id);
          await this.firestoreService.assignGuestsToInvitation(newInvitationId, guestIds);

          this.messageService.add({ /* Success message */ });
          this.selectedGuests = [];

          // --- Optional: Show QR Code ---
          // You could open another small dialog here showing the QR code
          // and the full URL: `https://your-domain.web.app/invite/${newInvitationCode}`
          console.log(`Invitation created with code: ${newInvitationCode}`);
          // this.showQrCodeDialog(newInvitationCode);

        } catch (err) {
          this.handleError(err, 'Could not create invitation.');
        }
      }
    });
  }

  openViewGuests(invitation: Invitation): void {
    this.dialogRef = this.dialogService.open(ViewGuests, {
      header: `Guests for: ${invitation.displayName}`,
      width: '60%',
      closable: true,
      closeOnEscape: true,
      data: { invitationId: invitation.id } // Pass invitation ID
    });
  }

  onDeleteInvitation(invitation: Invitation): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the invitation for "${invitation.displayName}"? Guests assigned to it will be moved back to the unassigned pool.`, // Updated message
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Use the refactored deleteInvitationAndUnassignGuests method
        this.firestoreService.deleteInvitationAndUnassignGuests(invitation.id)
          .then(() => this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Invitation removed, guests unassigned.' }))
          .catch(err => this.handleError(err, 'Could not delete invitation.'));
      }
    });
  }

  onAddGuestsToInvitation(invitation: Invitation): void {
    // Double-check just in case the button wasn't disabled correctly
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
            this.selectedGuests = []; // Clear selection after assigning
          })
          .catch(err => this.handleError(err, 'Could not assign guests.'));
      }
    });
  }

  async showQrCodeDialog(invitationCode: string) {
    const url = `https://wedding-website-marta-jonathan.web.app/invite/${invitationCode}`;
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: 'H', width: 256 }); // Generate QR

      // Open the new dialog component
      this.dialogRef = this.dialogService.open(QrCodeDisplay, {
        header: 'Invitation Link',
        width: '40%', // Let dialog size itself
        closable: true,
        data: {
          url: url,
          qrCodeDataUrl: qrCodeDataUrl
        }
      });

    } catch (err) {
      this.handleError(err, 'Could not generate or display QR code');
    }
  }

  // --- Utility ---

  logout(): void {
    this.authService.logout().then(() => this.router.navigate(['/login']));
  }

  private handleError(error: any, defaultMessage: string): void {
    console.error(error);
    this.messageService.add({ severity: 'error', summary: 'Error', detail: defaultMessage });
  }
}
