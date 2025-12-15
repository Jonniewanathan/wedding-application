import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common'; // Required for ngClass/ngIf
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit {
  navItems: MenuItem[] = [];
  currentYear = new Date().getFullYear();

  // State for the mobile menu overlay
  isMobileMenuOpen = false;

  // The couple's names for the header
  coupleNames = "Marta & Jonathan"; // Replace with your names

  ngOnInit() {
    this.navItems = [
      { label: 'Save the Date', routerLink: '/save-the-date' },
      // { label: 'Invitations', routerLink: '/invitations' },
      // { label: 'RSVP', routerLink: '/rsvp' },
      { label: 'Travel Info', routerLink: '/travel-info' },
      { label: 'Local Guide', routerLink: '/local-attractions' },
      // { label: 'Photo Share', routerLink: '/photo-share' }
    ];
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    // Prevent background scrolling when menu is open
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    document.body.style.overflow = 'auto';
  }
}
