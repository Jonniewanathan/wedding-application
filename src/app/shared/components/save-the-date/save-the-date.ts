import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {ScrollRevealDirective} from '../../../core/directives/scroll-reveal';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-save-the-date',
  standalone: true,
  imports: [
    CommonModule,
    ScrollRevealDirective,
    TranslateModule
  ],
  templateUrl: './save-the-date.html',
  styleUrl: './save-the-date.scss'
})
export class SaveTheDate implements OnInit, OnDestroy {
  coupleNames = 'Marta & Jonathan';

  // Images
  heroImage = 'assets/images/our-photo-v5.jpeg'; // Portrait prefered
  venueImage = 'assets/images/convento_de_la_luz_courtyard.jpg'; // Wide landscape preferred

  // --- Countdown Logic ---
  private intervalId: any;
  public days: number = 0;
  public hours: number = 0;
  public minutes: number = 0;
  public seconds: number = 0;
  public countdownFinished: boolean = false;

  ngOnInit(): void {
    const weddingDay = new Date('2026-08-22T19:00:00').getTime();
    this.calculateTime(weddingDay);
    this.intervalId = setInterval(() => {
      this.calculateTime(weddingDay);
    }, 1000);
  }

  private calculateTime(weddingDay: number) {
    const now = new Date().getTime();
    const distance = weddingDay - now;

    if (distance < 0) {
      clearInterval(this.intervalId);
      this.countdownFinished = true;
    } else {
      this.days = Math.floor(distance / (1000 * 60 * 60 * 24));
      this.hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      this.minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      this.seconds = Math.floor((distance % (1000 * 60)) / 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  // Smooth scroll helper
  scrollToContent() {
    document.getElementById('welcome-note')?.scrollIntoView({ behavior: 'smooth' });
  }
}
