import { Component, OnInit, inject, computed, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Guest } from '../../models/guest.model';
import { LanguageService } from '../../../core/services/language/language';
import { TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import {Tooltip} from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-qr-code-display',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, Tooltip],
  templateUrl: './qr-code-display.html',
  styleUrls: ['./qr-code-display.scss']
})
export class QrCodeDisplay implements OnInit {
  public config = inject(DynamicDialogConfig);
  public dialogRef = inject(DynamicDialogRef);
  private messageService = inject(MessageService);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  invitationUrl: string = '';
  qrCodeDataUrl: string = '';
  invitationName: string = '';
  /** Optional pre-fill for the WhatsApp deep-link. Empty = contact picker. */
  phoneNumber: string = '';
  guests: Guest[] = [];

  // Create a signal for the current language
  currentLang = signal(this.languageService.currentLang);

  /**
   * wa.me deep link with the generated message pre-filled. When the
   * invitation carries a phoneNumber, the URL prefills the recipient
   * (skipping the contact picker). The phone is normalised to digits
   * only — wa.me rejects formatting like spaces, dashes and '+'.
   */
  whatsappUrl = computed(() => {
    const digitsOnly = (this.phoneNumber || '').replace(/\D/g, '');
    const path = digitsOnly.length > 0 ? digitsOnly : '';
    return `https://wa.me/${path}?text=${encodeURIComponent(this.generatedMessage())}`;
  });

  // Make the message a computed signal that reacts to language changes
  generatedMessage = computed(() => {
    if (this.currentLang() === 'es') {
      return `Hola ${this.invitationName}\n\n¡Estáis invitados a la boda de Marta & Jonathan!\n\nNos encantaría contar con vuestra presencia en un día tan especial para nosotros.\n\nPor favor, acceda a la invitación a través del siguiente enlace:\n${this.invitationUrl}\n\nEsperamos vuestra respuesta.`;
    } else {
      // Default to English
      const guestListSection = this.guests.length > 0 ? `\n\nThis invitation admits:\n• ${this.guests.map(g => `${g.firstName} ${g.lastName}`).join('\n• ')}` : '';
      return `Hi ${this.invitationName}!\n\nYou're invited to Marta & Jonathan's wedding!${guestListSection}\n\nPlease view your formal invitation and RSVP by clicking the secure link below:\n\n${this.invitationUrl}\n\nWe hope you can make it!`;
    }
  });

  ngOnInit(): void {
    // Get the data passed in from the admin component
    this.invitationUrl = this.config.data?.url || 'URL not provided';
    this.qrCodeDataUrl = this.config.data?.qrCodeDataUrl || '';
    this.invitationName = this.config.data?.invitationName || '';
    this.phoneNumber = this.config.data?.phoneNumber || '';
    this.guests = this.config.data?.guests || [];

    // Subscribe to language changes to update our local signal
    this.translate.onLangChange.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      this.currentLang.set(event.lang);
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.invitationUrl).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Copied', detail: 'URL copied to clipboard' });
    }).catch(err => {
      console.error('Could not copy URL: ', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to copy URL' });
    });
  }

  copyMessage(): void {
    navigator.clipboard.writeText(this.generatedMessage()).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Copied', detail: 'Full message copied to clipboard' });
    }).catch(err => {
      console.error('Could not copy text: ', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to copy message' });
    });
  }

  printInvite(): void {
    const printWindow = window.open('', '', 'width=600,height=800');
    if (!printWindow) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Pop-ups blocked. Please allow pop-ups to print.' });
      return;
    }

    // Escape all user-controlled values to prevent HTML injection — guests
    // and invitation names may originate from CSV uploads or admin input.
    const safeName = this.escapeHtml(this.invitationName);
    const safeUrl = this.escapeHtml(this.invitationUrl);
    const safeQr = this.escapeHtml(this.qrCodeDataUrl);
    const guestListHtml = this.guests
      .map(g => `<li>${this.escapeHtml(`${g.firstName} ${g.lastName}`)}</li>`)
      .join('');

    // Styles are inlined so the print works offline and does not depend on a CDN.
    const htmlContent = `
      <html>
        <head>
          <title>Print Invitation - ${safeName}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
              background: #ffffff;
              color: #0f172a;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            @media print {
              body { padding: 0; min-height: auto; }
            }
            .invite-card {
              max-width: 24rem;
              width: 100%;
              margin: 0 auto;
              padding: 2rem;
              border: 1px solid #e2e8f0;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              box-sizing: border-box;
            }
            .invite-header { margin-bottom: 1.5rem; width: 100%; }
            .invite-eyebrow {
              display: block;
              font-size: 0.75rem;
              text-transform: uppercase;
              letter-spacing: 0.3em;
              color: #94a3b8;
              margin-bottom: 0.5rem;
            }
            .invite-name {
              font-family: ui-serif, Georgia, serif;
              font-size: 1.875rem;
              font-style: italic;
              font-weight: 500;
              color: #0f172a;
              margin: 0 0 1rem 0;
            }
            .invite-guests {
              font-size: 0.875rem;
              color: #475569;
              border-top: 1px solid #f1f5f9;
              border-bottom: 1px solid #f1f5f9;
              padding: 0.75rem 0;
              margin-bottom: 0.5rem;
            }
            .invite-guests-label {
              font-size: 0.625rem;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #94a3b8;
              margin: 0 0 0.5rem 0;
            }
            .invite-guests ul { list-style: none; padding: 0; margin: 0; }
            .invite-guests li { margin-bottom: 0.25rem; }
            .invite-qr {
              padding: 1rem;
              border: 1px solid #f1f5f9;
              margin-bottom: 1.5rem;
            }
            .invite-qr img {
              width: 12rem;
              height: 12rem;
              object-fit: contain;
              display: block;
              margin: 0 auto;
            }
            .invite-scan { margin-bottom: 1.5rem; }
            .invite-scan-title {
              font-size: 0.875rem;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #475569;
              font-weight: bold;
              margin: 0 0 0.25rem 0;
            }
            .invite-scan-help {
              font-size: 0.75rem;
              color: #64748b;
              margin: 0;
            }
            .invite-url-section {
              padding-top: 1.5rem;
              border-top: 1px solid #e2e8f0;
              width: 100%;
            }
            .invite-url-label {
              font-size: 0.75rem;
              color: #64748b;
              margin: 0 0 0.5rem 0;
            }
            .invite-url {
              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
              font-size: 0.875rem;
              color: #1e293b;
              word-break: break-all;
              background: #f8fafc;
              padding: 0.5rem;
              border: 1px solid #f1f5f9;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="invite-card">

            <div class="invite-header">
              <span class="invite-eyebrow">You're Invited</span>
              <h2 class="invite-name">${safeName}</h2>

              <div class="invite-guests">
                <p class="invite-guests-label">Admitting:</p>
                <ul>
                  ${guestListHtml}
                </ul>
              </div>
            </div>

            <div class="invite-qr">
              <img src="${safeQr}" alt="QR Code">
            </div>

            <div class="invite-scan">
              <p class="invite-scan-title">Scan to RSVP</p>
              <p class="invite-scan-help">Open your phone's camera and point it at the code above.</p>
            </div>

            <div class="invite-url-section">
              <p class="invite-url-label">Or visit this link directly:</p>
              <p class="invite-url">${safeUrl}</p>
            </div>

          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
