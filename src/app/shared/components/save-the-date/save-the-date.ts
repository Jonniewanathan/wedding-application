import {Component, OnDestroy, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';

// --- Import PrimeNG Modules for Standalone Components ---
import { CardModule } from 'primeng/card';
import { ImageModule } from 'primeng/image';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-save-the-date',
  standalone: true,
  // --- Add the required PrimeNG modules to the imports array ---
  imports: [
    CommonModule,
    CardModule,
    ImageModule,
    TagModule,
    ButtonModule
  ],
  templateUrl: './save-the-date.html',
  styleUrl: './save-the-date.scss'
})
export class SaveTheDate implements OnInit, OnDestroy{
  coupleNames = 'Marta & Jonathan';
  weddingDate = 'August 22, 2026';
  venueName = 'Convento de la Luz';
  venueLocation = 'Lucena del Puerto, Huelva, Spain';

  imageUrl = 'assets/images/our-photo-v2.jpeg';

  // --- Countdown Properties ---
  private intervalId: any;
  public days: number = 0;
  public hours: number = 0;
  public minutes: number = 0;
  public seconds: number = 0;
  public countdownFinished: boolean = false;

  ngOnInit(): void {
    const weddingDay = new Date('2026-08-22T19:00:00').getTime();

    this.intervalId = setInterval(() => {
      const now = new Date().getTime();
      const distance = weddingDay - now;

      if (distance < 0) {
        // Stop the countdown when the date is reached
        clearInterval(this.intervalId);
        this.countdownFinished = true;
      } else {
        // Time calculations
        this.days = Math.floor(distance / (1000 * 60 * 60 * 24));
        this.hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        this.minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        this.seconds = Math.floor((distance % (1000 * 60)) / 1000);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    // This is crucial to prevent memory leaks when the user navigates away
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  addToCalendar(): void {
    console.log('Add to Calendar button clicked!');
  }
}
