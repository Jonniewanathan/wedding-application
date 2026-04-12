import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Guest } from '../../models/guest.model';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import {Tooltip} from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-qr-code-display',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, Tooltip],
  providers: [MessageService],
  templateUrl: './qr-code-display.html',
  styleUrls: ['./qr-code-display.scss']
})
export class QrCodeDisplay implements OnInit {
  public config = inject(DynamicDialogConfig);
  public dialogRef = inject(DynamicDialogRef);
  private messageService = inject(MessageService);

  invitationUrl: string = '';
  qrCodeDataUrl: string = '';
  invitationName: string = '';
  whatsappMessage: string = '';
  guests: Guest[] = [];

  ngOnInit(): void {
    // Get the data passed in from the admin component
    this.invitationUrl = this.config.data?.url || 'URL not provided';
    this.qrCodeDataUrl = this.config.data?.qrCodeDataUrl || '';
    this.invitationName = this.config.data?.invitationName || '';
    this.guests = this.config.data?.guests || [];

    // Build the guest list for the whatsapp message
    const guestNames = this.guests.map(g => `${g.firstName} ${g.lastName}`).join('\n• ');
    const guestListSection = this.guests.length > 0 ? `\n\nThis invitation admits:\n• ${guestNames}` : '';

    this.whatsappMessage = `Hi ${this.invitationName}!\n\nYou're invited to Marta & Jonathan's wedding!${guestListSection}\n\nPlease view your formal invitation and RSVP by clicking the secure link below:\n\n${this.invitationUrl}\n\nWe hope you can make it!`;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  // Function to copy URL to clipboard
  copyUrl(inputElement: HTMLInputElement): void {
    inputElement.select();
    document.execCommand('copy');
    this.messageService.add({ severity: 'success', summary: 'Copied', detail: 'URL copied to clipboard' });
  }

  // Function to copy full message
  copyMessage(): void {
    navigator.clipboard.writeText(this.whatsappMessage).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Copied', detail: 'Full message copied to clipboard' });
    }).catch(err => {
      console.error('Could not copy text: ', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to copy message' });
    });
  }

  // Function to trigger print for the specific invite using a new window
  printInvite(): void {
    // 1. Create a new invisible window/iframe specifically for printing
    const printWindow = window.open('', '', 'width=600,height=800');
    if (!printWindow) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Pop-ups blocked. Please allow pop-ups to print.' });
      return;
    }

    // Build the guest list HTML snippet
    const guestListHtml = this.guests.map(g => `<li class="mb-1">${g.firstName} ${g.lastName}</li>`).join('');

    // 2. Build the HTML content for the print window
    // We inject tailwind via a CDN just for the print layout so it looks exactly the same
    const htmlContent = `
      <html>
        <head>
          <title>Print Invitation - ${this.invitationName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            /* Reset body margins for printing */
            body { margin: 0; padding: 20px; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body class="flex items-center justify-center min-h-screen bg-white">
          <div class="p-8 flex flex-col items-center justify-center text-center max-w-sm w-full mx-auto border border-slate-200">

            <div class="mb-6">
              <span class="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">You're Invited</span>
              <h2 class="text-3xl font-serif font-medium italic text-slate-900 mb-4">${this.invitationName}</h2>

              <!-- Included Guests List on Print -->
              <div class="text-sm text-slate-600 font-sans border-t border-b border-slate-100 py-3 mb-2">
                <p class="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Admitting:</p>
                <ul class="list-none p-0 m-0">
                  ${guestListHtml}
                </ul>
              </div>
            </div>

            <div class="p-4 bg-white border border-slate-100 mb-6">
              <img src="${this.qrCodeDataUrl}" alt="QR Code" class="w-48 h-48 object-contain mx-auto">
            </div>

            <div class="mb-6">
              <p class="text-sm uppercase tracking-widest text-slate-600 font-bold mb-1">Scan to RSVP</p>
              <p class="text-xs text-slate-500">Open your phone's camera and point it at the code above.</p>
            </div>

            <div class="pt-6 border-t border-slate-200 w-full">
              <p class="text-xs text-slate-500 mb-2">Or visit this link directly:</p>
              <p class="text-sm font-mono text-slate-800 break-all bg-slate-50 p-2 border border-slate-100">${this.invitationUrl}</p>
            </div>

          </div>

          <script>
            // Wait for images to load before printing
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close(); // Automatically close the popup after printing
              }, 250);
            }
          </script>
        </body>
      </html>
    `;

    // 3. Write the content and print
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
