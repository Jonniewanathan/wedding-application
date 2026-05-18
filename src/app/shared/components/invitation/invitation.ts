import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

// Services
import { FirestoreService } from '../../../core/services/firestore/firestore';
import { GuestSessionService } from '../../../core/services/auth/guest-session/guest-session';

// PrimeNG
import { FieldsetModule } from 'primeng/fieldset';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import {Image} from 'primeng/image';
import { TranslateModule } from '@ngx-translate/core';
import {LanguageService} from '../../../core/services/language/language';
import {ScrollRevealDirective} from '../../../core/directives/scroll-reveal';

@Component({
  selector: 'app-invitation',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FieldsetModule,
    CardModule,
    DividerModule,
    PanelModule,
    ButtonModule,
    ProgressSpinnerModule,
    Image,
    TranslateModule,
    ScrollRevealDirective
  ],
  templateUrl: './invitation.html',
  styleUrl: './invitation.scss'
})
export class Invitation implements OnInit {
  private route = inject(ActivatedRoute);
  private firestore = inject(FirestoreService);
  private guestSession = inject(GuestSessionService);
  public languageService = inject(LanguageService);

  coupleNames = 'Marta & Jonathan';

  // State
  isLoading = true;
  hasError = false;
  errorMessage = '';

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code');

    if (code) {
      // 1. URL has a code -> Attempt Login
      this.handleLogin(code);
    } else {
      // 2. No code -> Check if already logged in from previous visit
      if (this.guestSession.currentInvitationValue) {
        this.isLoading = false;
      } else {
        // 3. No code & No session -> Error (User just typed /invitations manually)
        this.showError('No invitation code found. Please scan your QR code or use the link provided.');
      }
    }
  }

  async handleLogin(code: string) {
    try {
      const invitation = await this.firestore.getInvitationByCode(code);

      if (invitation) {
        // SUCCESS: Log them in
        this.guestSession.login(invitation);
        this.isLoading = false;
      } else {
        this.showError('We could not find an invitation with this code. Please check your link.');
      }
    } catch (e) {
      console.error(e);
      this.showError('Something went wrong loading your invitation. Please try again.');
    }
  }

  showError(msg: string) {
    this.hasError = true;
    this.errorMessage = msg;
    this.isLoading = false;
  }
}
