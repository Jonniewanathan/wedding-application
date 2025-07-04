import { Component } from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router'; // For managing subscriptions to prevent memory leaks

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App{
  title = 'wedding-app';
  currentYear = new Date().getFullYear();
}
