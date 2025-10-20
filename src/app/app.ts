import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';

// Import PrimeNG Modules for Standalone Components
import { ToolbarModule } from 'primeng/toolbar';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ToolbarModule,
    MenubarModule,
    ButtonModule,
    MenuModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  title = 'wedding-app';
  currentYear = new Date().getFullYear();

  // Property to hold the navigation links
  navItems: MenuItem[] = [];

  // Property to control the mobile sidebar's visibility
  sidebarVisible: boolean = false;

  ngOnInit() {
    // Define the navigation menu items here
    this.navItems = [
      {
        label: 'Save the Date',
        routerLink: '/save-the-date',
      },
      {
        label: 'Invitations',
        routerLink: '/invitations',
      },
      {
        label: 'RSVP',
        routerLink: '/rsvp',
      },
      {
        label: 'Travel Info',
        routerLink: '/travel-info',
      },
      {
        label: 'Local Guide',
        routerLink: '/local-attractions',
      },
      {
        label: 'Photo Share',
        routerLink: '/photo-share',
      }
    ];
  }
}
