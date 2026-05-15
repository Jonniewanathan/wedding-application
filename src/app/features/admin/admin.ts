import { Component, Signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth/auth';
import { FirestoreService } from '../../core/services/firestore/firestore';
import { AdminStateService } from './services/admin-state.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { Guest } from '../../shared/models/guest.model';
import { Invitation } from '../../shared/models/invitation.model';

// Components
import { GuestPool } from './components/guest-pool/guest-pool.component';
import { InvitationGroups } from './components/invitation-groups/invitation-groups.component';
import { StatsComponent } from './components/stats/stats.component';
import { StatsV2 } from './components/stats-v2/stats-v2';

// PrimeNG Modules
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, ToastModule, ConfirmDialogModule,
    GuestPool, InvitationGroups, StatsComponent, StatsV2
  ],
  providers: [
    DialogService, ConfirmationService, MessageService, AdminStateService
  ],
  templateUrl: './admin.html',
})
export class Admin {
  private authService = inject(AuthService);
  private router = inject(Router);
  private firestoreService = inject(FirestoreService);

  activeTabIndex = 0;

  // Live counts surfaced on the tab labels so the admin sees outstanding
  // work at a glance without switching tabs.
  private readonly unassignedGuests: Signal<Guest[]> = toSignal(
    this.firestoreService.getUnassignedGuests(),
    { initialValue: [] }
  );
  private readonly allInvitations: Signal<Invitation[]> = toSignal(
    this.firestoreService.getInvitations(),
    { initialValue: [] }
  );

  readonly unassignedCount = computed(() => this.unassignedGuests().length);
  readonly invitationCount = computed(() => this.allInvitations().length);
  readonly pendingInvitationCount = computed(
    () => this.allInvitations().filter(inv => inv.status !== 'responded').length
  );

  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']).catch(err => console.error(err));
    });
  }
}
