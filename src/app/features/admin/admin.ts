import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth';
import { AdminStateService } from './services/admin-state.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';

// Components
import { GuestPoolComponent } from './components/guest-pool/guest-pool.component';
import { InvitationGroupsComponent } from './components/invitation-groups/invitation-groups.component';
import { StatsComponent } from './components/stats/stats.component';

// PrimeNG Modules
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, ToastModule, ConfirmDialogModule,
    GuestPoolComponent, InvitationGroupsComponent, StatsComponent
  ],
  providers: [
    DialogService, ConfirmationService, MessageService, AdminStateService
  ],
  templateUrl: './admin.html',
})
export class AdminComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  activeTabIndex = 0;

  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']).catch(err => console.error(err));
    });
  }
}
