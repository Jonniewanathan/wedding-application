import { Component } from '@angular/core';

@Component({
  selector: 'app-photo-share',
  imports: [],
  standalone: true,
  templateUrl: './photo-share.html',
  styleUrl: './photo-share.css'
})
export class PhotoShare {
  pageTitle = 'Share Your Moments';
  introText = 'We would love to see your favorite captured moments from our wedding day! After the celebration, you can share your photos here, and they will be added to our shared album.';
  disclaimerText = 'Note: This is a design mock-up. The actual photo upload functionality will be implemented after the wedding, allowing you to easily contribute to our memories.';

  // Mock data for recently uploaded photos (placeholders for aesthetic demonstration)
  mockPhotos = [
    'https://placehold.co/300x200/FBF8F4/6B7280?text=Photo+1',
    'https://placehold.co/300x200/FBF8F4/6B7280?text=Photo+2',
    'https://placehold.co/300x200/FBF8F4/6B7280?text=Photo+3',
    'https://placehold.co/300x200/FBF8F4/6B7280?text=Photo+4',
    'https://placehold.co/300x200/FBF8F4/6B7280?text=Photo+5',
    'https://placehold.co/300x200/FBF8F4/6B7280?text=Photo+6'
  ];

  constructor() {
  }
}
