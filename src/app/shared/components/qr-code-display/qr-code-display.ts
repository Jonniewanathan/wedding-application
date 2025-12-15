import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import {Tooltip} from 'primeng/tooltip';

@Component({
  selector: 'app-qr-code-display',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, Tooltip],
  templateUrl: './qr-code-display.html',
})
export class QrCodeDisplay implements OnInit {
  public config = inject(DynamicDialogConfig);
  public dialogRef = inject(DynamicDialogRef);

  invitationUrl: string = '';
  qrCodeDataUrl: string = '';

  ngOnInit(): void {
    // Get the data passed in from the admin component
    this.invitationUrl = this.config.data?.url || 'URL not provided';
    this.qrCodeDataUrl = this.config.data?.qrCodeDataUrl || '';
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  // Optional: Function to copy URL to clipboard
  copyUrl(inputElement: HTMLInputElement): void {
    inputElement.select();
    document.execCommand('copy');
    // Optional: Add a visual feedback like a tooltip or message
  }
}
