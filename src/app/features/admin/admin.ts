import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth';
import { AdminStateService } from './services/admin-state.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';

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

  activeTabIndex = 0;

  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']).catch(err => console.error(err));
    });
  }
}
