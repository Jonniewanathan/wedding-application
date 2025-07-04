import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-rsvp',
  imports: [
    FormsModule
  ],
  standalone: true,
  templateUrl: './rsvp.html',
  styleUrl: './rsvp.css'
})
export class Rsvp {
  pageTitle = 'Kindly RSVP';
  introText = 'Please let us know if you can join us on our special day by filling out the form below. We kindly request that you RSVP by [Your RSVP Date, e.g., July 1st, 2026].';

  // Mock form data (will be replaced by actual data model for backend integration)
  guestName: string = '';
  attending: string = ''; // 'yes' or 'no'
  plusOne: boolean = false;
  plusOneName: string = '';
  dietaryRestrictions: string = '';
  message: string = '';

  constructor() { }

  // Mock method for form submission (no actual backend call)
  submitRsvp(): void {
    console.log('Mock RSVP Submitted:', {
      guestName: this.guestName,
      attending: this.attending,
      plusOne: this.plusOne,
      plusOneName: this.plusOneName,
      dietaryRestrictions: this.dietaryRestrictions,
      message: this.message
    });
    // In a real application, this would send data to Firebase
    alert('Thank you for your mock RSVP! We will be in touch with a confirmation.'); // Using alert for mock feedback
    // Reset form for mock
    this.guestName = '';
    this.attending = '';
    this.plusOne = false;
    this.plusOneName = '';
    this.dietaryRestrictions = '';
    this.message = '';
  }

}
