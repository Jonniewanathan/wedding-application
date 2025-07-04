import { Component } from '@angular/core';

@Component({
  selector: 'app-save-the-date',
  imports: [],
  standalone: true,
  templateUrl: './save-the-date.html',
  styleUrl: './save-the-date.css'
})
export class SaveTheDate {
  // Data for the Save the Date page
  coupleNames = 'Marta & Jonathan';
  weddingDate = 'October 17, 2026';
  approxLocation = 'Seville, Spain';
  // Placeholder image URL for the Save the Date card.
  // Using a placehold.co image with neutral colors to match the aesthetic.
  imageUrl = 'https://placehold.co/1200x600/E8E8E8/666666?text=Elegant+Wedding+Photo';

  constructor() { } // Constructor for the component
}
