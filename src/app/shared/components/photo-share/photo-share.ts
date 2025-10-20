import {Component, inject} from '@angular/core';
import {MessageService} from 'primeng/api';
import {GalleriaModule} from 'primeng/galleria';
import {Card} from 'primeng/card';
import {FileUpload} from 'primeng/fileupload';
import {Toast} from 'primeng/toast';

@Component({
  selector: 'app-photo-share',
  imports: [
    GalleriaModule,
    Card,
    FileUpload,
    Toast
  ],
  providers: [MessageService],
  standalone: true,
  templateUrl: './photo-share.html',
  styleUrl: './photo-share.scss'
})
export class PhotoShare {
  pageTitle = 'Share Your Moments';
  introText = 'Help us capture the joy of our special day! Please upload your favorite photos from the celebration here.';
  disclaimerText = 'By uploading, you agree to let us share these photos with our guests.';

  // Data for the mock photo gallery
  mockPhotos = [
    { itemImageSrc: 'https://images.unsplash.com/photo-1523438943888-2131c1800175?q=80&w=800&auto=format&fit=crop', alt: 'Guests celebrating' },
    { itemImageSrc: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800&auto=format&fit=crop', alt: 'Wedding details' },
    { itemImageSrc: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop', alt: 'Dancing at the reception' },
    { itemImageSrc: 'https://images.unsplash.com/photo-1519225421980-715cb0215a0d?q=80&w=800&auto=format&fit=crop', alt: 'Couple smiling' },
  ];

  messageService = inject(MessageService);

  constructor() {}

  // --- Component Methods ---
  /**
   * Handles the file upload event. In a real app, this would send
   * the files to a Firebase Storage service.
   */
  onUpload(event: any): void {
    // In a real application, you would loop through event.files and upload them.
    const fileCount = event.files.length;
    console.log(`${fileCount} files selected for upload.`);

    // Provide user feedback with a Toast message
    this.messageService.add({
      severity: 'info',
      summary: 'Files Selected',
      detail: `${fileCount} photo(s) are ready for upload.`
    });

    // Here, you would call your service to upload the files to Firebase.
    // e.g., this.storageService.uploadFiles(event.files);
  }
}
