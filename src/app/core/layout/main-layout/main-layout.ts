import { Component, OnInit, inject, Renderer2, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../services/auth/auth';
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
  private guestSession = inject(GuestSessionService);
  private destroyRef = inject(DestroyRef);
  private renderer = inject(Renderer2);

  public languageService = inject(LanguageService);
  private translate = inject(TranslateService);

  /** Signal alias exposed to the template (was previously currentUser$ | async). */
  readonly currentUser = this.authService.currentUser;

  navItems: MenuItem[] = [];
  currentYear = new Date().getFullYear();
  isMobileMenuOpen = false;
  coupleNames = "Marta & Jonathan";

  /**
   * Rebuild the nav items whenever the guest invitation signal changes
   * (login / logout). The effect also runs once on construction with the
   * initial signal value; that pre-init call is harmless because
   * updateNavItems falls back to translation keys when translations are
   * not yet loaded, and ngOnInit will call it again after initLanguage().
   */
  private invitationEffect = effect(() => {
    this.guestSession.invitation();
    this.updateNavItems();
  });

  ngOnInit() {
    this.languageService.initLanguage();

    this.updateNavItems();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.updateNavItems();
    });

    this.translate.onLangChange.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.updateNavItems();
    });
  }

  updateNavItems() {
    const currentInvitation = this.guestSession.currentInvitationValue;
    const hasStoredInvite = !!currentInvitation;

    const baseNavItems: MenuItem[] = [
      { label: this.translate.instant('NAV.SAVE_THE_DATE'), routerLink: '/save-the-date' },
      { label: this.translate.instant('NAV.TRAVEL_INFO'), routerLink: '/travel-info' },
      { label: this.translate.instant('NAV.LOCAL_GUIDE'), routerLink: '/local-attractions' },
    ];

    if (hasStoredInvite && currentInvitation?.invitationCode) {
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