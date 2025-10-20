import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Observable } from 'rxjs';
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { Guest } from '../../models/guest.model';
import {ConfirmationService, MessageService} from 'primeng/api';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import {FormsModule} from '@angular/forms';
import {Tooltip} from 'primeng/tooltip';

@Component({
  selector: 'app-view-guests',
  standalone: true,
  imports: [CommonModule, TableModule, InputTextModule, ButtonModule, ToastModule, FormsModule, Tooltip],
  providers: [MessageService],
  templateUrl: './view-guests.html',
})
export class ViewGuests implements OnInit {
  private firestoreService = inject(FirestoreService);
  public config = inject(DynamicDialogConfig);
  private messageService = inject(MessageService);

  // Inject ConfirmationService if not already done
  private confirmationService = inject(ConfirmationService);

  invitationId!: string;
  guests$!: Observable<Guest[]>;

  ngOnInit(): void {
    this.invitationId = this.config.data?.invitationId;
    if (this.invitationId) {
      this.guests$ = this.firestoreService.getGuestsForInvitation(this.invitationId);
    }
  }

  // --- New Unassign Method ---
  onUnassignGuest(guest: Guest): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to remove ${guest.firstName} ${guest.lastName} from this invitation and move them back to the unassigned pool?`,
      header: 'Unassign Guest',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        console.log('Accept callback started.');
        await this.firestoreService.unassignGuest(guest.id);
        this.messageService.add({ severity: 'success', summary: 'Unassigned', detail: 'Guest moved back to pool.' });
      },
      reject: () => {
        this.messageService.add({ severity: 'info', summary: 'Cancelled', detail: 'Unassign action cancelled.' });
      }
    });
  }


  onRowEditSave(guest: Guest) {
    this.firestoreService.updateGuestRsvpDetails(guest)
      .then(() => this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Guest updated' }))
      .catch(err => this.handleError(err, 'Could not update guest'));
  }

  private handleError(error: any, defaultMessage: string): void {
    console.error(error);
    this.messageService.add({ severity: 'error', summary: 'Error', detail: defaultMessage });
  }
}
