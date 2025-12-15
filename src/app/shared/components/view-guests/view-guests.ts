import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef, DialogService } from 'primeng/dynamicdialog'; // Import DialogService
import { Observable } from 'rxjs';
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { Guest } from '../../models/guest.model';
import { ConfirmationService, MessageService } from 'primeng/api';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import {GuestFormComponent} from '../guest-form/guest-form';
import {ConfirmDialog} from 'primeng/confirmdialog';

@Component({
  selector: 'app-view-guests',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    TagModule,
    ConfirmDialog
  ],
  providers: [MessageService, ConfirmationService, DialogService], // Provide DialogService
  templateUrl: './view-guests.html',
})
export class ViewGuests implements OnInit {
  private firestoreService = inject(FirestoreService);
  public config = inject(DynamicDialogConfig);
  public dialogRef = inject(DynamicDialogRef);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dialogService = inject(DialogService); // Inject it

  invitationId!: string;
  guests$!: Observable<Guest[]>;

  ngOnInit(): void {
    this.invitationId = this.config.data?.invitationId;
    if (this.invitationId) {
      this.guests$ = this.firestoreService.getGuestsForInvitation(this.invitationId);
    }
  }

  // --- NEW: Edit Functionality ---
  onEditGuest(guest: Guest): void {
    const ref = this.dialogService.open(GuestFormComponent, {
      header: 'Edit Guest Details',
      width: '40%',
      data: { guest: guest } // Pass the guest to the form
    });
    if (ref) {
      ref.onClose.subscribe((updated) => {
        if (updated) {
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Guest details saved.' });
        }
      });
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
