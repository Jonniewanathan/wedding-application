import { Component, OnInit, inject, Renderer2, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../services/auth/auth';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';
import { filter } from 'rxjs/operators';
import { GuestSessionService } from '../../services/auth/guest-session/guest-session';
import { LanguageService } from '../../services/language/language';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    TranslateModule
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private guestSession = inject(GuestSessionService); // Inject GuestSessionService
  private destroyRef = inject(DestroyRef);
  private renderer = inject(Renderer2);

  // Inject Language Services
  public languageService = inject(LanguageService); // Must be public for template access
  private translate = inject(TranslateService);

  navItems: MenuItem[] = [];
  currentYear = new Date().getFullYear();

  isMobileMenuOpen = false;
  coupleNames = "Marta & Jonathan";

  currentUser$: Observable<User | null>;

  constructor() {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit() {
    // Initialize Language Service
    this.languageService.initLanguage();

    // Set initial nav items
    this.updateNavItems();

    // Subscribe to router events to update nav on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.updateNavItems();
    });

    // Subscribe to the guest session to update the UI instantly when they log in/out
    this.guestSession.invitation$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.updateNavItems();
    });

    // CRITICAL: Rebuild nav when language changes so titles update
    this.translate.onLangChange.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.updateNavItems();
    });
  }

  updateNavItems() {
    // Check GuestSessionService for the invitation code instead of a raw localStorage key
    const currentInvitation = this.guestSession.currentInvitationValue;
    const hasStoredInvite = !!currentInvitation;

    // Use TranslateService.instant() to fetch translations synchronously if available
    // or fallback to the key. In onLangChange, these will be re-evaluated.
    const baseNavItems: MenuItem[] = [
      { label: this.translate.instant('NAV.SAVE_THE_DATE'), routerLink: '/save-the-date' },
      { label: this.translate.instant('NAV.TRAVEL_INFO'), routerLink: '/travel-info' },
      { label: this.translate.instant('NAV.LOCAL_GUIDE'), routerLink: '/local-attractions' },
    ];

    if (hasStoredInvite && currentInvitation?.invitationCode) {
      // Ensure "My Invitation" is the last item
      this.navItems = [
        ...baseNavItems,
        {
          label: this.translate.instant('NAV.MY_INVITATION'),
          routerLink: `/invite/${currentInvitation.invitationCode}`
        }
      ];
    } else {
      this.navItems = baseNavItems;
    }
  }

  // Expose language switching to the template
  switchLanguage(lang: string) {
    this.languageService.switchLanguage(lang);
  }

  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/']).catch(err => console.error(err));
      this.closeMobileMenu();
    });
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      this.renderer.setStyle(document.body, 'overflow', 'hidden');
    } else {
      this.renderer.setStyle(document.body, 'overflow', 'auto');
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    this.renderer.setStyle(document.body, 'overflow', 'auto');
  }
}
