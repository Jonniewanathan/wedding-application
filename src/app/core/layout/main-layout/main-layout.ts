import {Component, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import { MenuItem } from 'primeng/api';

// --- Import all necessary PrimeNG Modules ---
import { DialogModule } from 'primeng/dialog';
import { ToolbarModule } from 'primeng/toolbar';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    DialogModule,
    ToolbarModule,
    MenubarModule,
    ButtonModule,
    MenuModule,
    FormsModule
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit {
  navItems: MenuItem[] = [];
  currentYear = new Date().getFullYear();

  ngOnInit() {
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
