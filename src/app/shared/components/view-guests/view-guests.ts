import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef, DialogService } from 'primeng/dynamicdialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { Guest } from '../../models/guest.model';
import { Invitation } from '../../models/invitation.model';
import { ConfirmationService, MessageService } from 'primeng/api';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { GuestForm } from '../guest-form/guest-form';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-view-guests',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    TagModule,
    SelectModule,
    FormsModule
  ],
  templateUrl: './view-guests.html',
})
export class ViewGuests implements OnInit {
  private firestoreService = inject(FirestoreService);
  public config = inject(DynamicDialogConfig);
  public dialogRef = inject(DynamicDialogRef);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dialogService = inject(DialogService);

  invitationId!: string;
  guests$!: Observable<Guest[]>;
  unassignedGuests$!: Observable<Guest[]>;
  otherInvitations$!: Observable<Invitation[]>;

  showAddDropdown = false;
  selectedUnassignedGuest: Guest | null = null;

  // Inline "move guest" state: when set, an inline panel opens above
  // the table letting the admin pick another invitation as the target.
  movingGuest: Guest | null = null;
  moveTarget: Invitation | null = null;
  moveInProgress = false;

  ngOnInit(): void {
    this.invitationId = this.config.data?.invitationId;
    if (this.invitationId) {
      this.guests$ = this.firestoreService.getGuestsForInvitation(this.invitationId);
      this.unassignedGuests$ = this.firestoreService.getUnassignedGuests();
      this.otherInvitations$ = this.firestoreService.getInvitations().pipe(
        map(invs => invs.filter(inv => inv.id !== this.invitationId))
      );
    }
  }

  toggleAddGuest(): void {
    this.showAddDropdown = !this.showAddDropdown;
    this.selectedUnassignedGuest = null; // Reset selection
  }

  async onAddGuest(): Promise<void> {
    if (!this.selectedUnassignedGuest || !this.invitationId) return;

    try {
      await this.firestoreService.assignGuestsToInvitation(
        this.invitationId,
        [this.selectedUnassignedGuest.id]
      );
      this.messageService.add({ severity: 'success', summary: 'Added', detail: 'Guest added to group.' });
      this.toggleAddGuest(); // Hide dropdown
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not add guest.' });
    }
  }

  onEditGuest(guest: Guest): void {
    const ref = this.dialogService.open(GuestForm, {
      header: 'Edit Guest Details',
      width: '40%',
      data: { guest: guest }
    });
    if (ref) {
      ref.onClose.subscribe((updated) => {
        if (updated) {
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Guest details saved.' });
        }
      });
    }
  }

  startMoveGuest(guest: Guest): void {
    this.movingGuest = guest;
    this.moveTarget = null;
    // Close the add-guest panel if it's open so only one inline panel is
    // active at a time.
    this.showAddDropdown = false;
  }

  cancelMoveGuest(): void {
    this.movingGuest = null;
    this.moveTarget = null;
  }

  async confirmMoveGuest(): Promise<void> {
    if (!this.movingGuest || !this.moveTarget || !this.invitationId) return;
    if (this.moveInProgress) return;
    this.moveInProgress = true;
    const guest = this.movingGuest;
    const target = this.moveTarget;
    try {
      await this.firestoreService.moveGuestToInvitation(
        guest.id,
        this.invitationId,
        target.id,
        {
          guestName: `${guest.firstName} ${guest.lastName}`,
          toName: target.displayName
        }
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Moved',
        detail: `${guest.firstName} ${guest.lastName} moved to ${target.displayName}.`
      });
      this.cancelMoveGuest();
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not move guest.'
      });
    } finally {
      this.moveInProgress = false;
    }
  }

  onUnassignGuest(guest: Guest): void {
    this.confirmationService.confirm({
      message: `Remove ${guest.firstName} ${guest.lastName} from this group?`,
      header: 'Confirm Removal',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'bg-slate-900 border-slate-900 text-white',
      rejectButtonStyleClass: 'p-button-text text-slate-500',
      accept: async () => {
        try {
          await this.firestoreService.unassignGuest(guest.id, this.invitationId);
          this.messageService.add({ severity: 'success', summary: 'Removed', detail: 'Guest unassigned.' });
        } catch (err) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not unassign guest.' });
        }
      }
    });
  }
}
