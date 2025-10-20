import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';
import {Fieldset} from 'primeng/fieldset';
import {Card} from 'primeng/card';
import {Divider} from 'primeng/divider';
import {Panel} from 'primeng/panel';
import {Button} from 'primeng/button';

@Component({
  selector: 'app-invitation',
  imports: [
    RouterLink,
    Fieldset,
    Card,
    Divider,
    Panel,
    Button
  ],
  standalone: true,
  templateUrl: './invitation.html',
  styleUrl: './invitation.scss'
})
export class Invitation {
  // Wedding details
  coupleNames = 'Marta and Jonathan';
  weddingDate = 'Saturday, September 15th, 2026';
  weddingTime = '2:00 PM';
  ceremonyLocation = 'Finca La Concepcion, Marbella, Spain';
  receptionLocation = 'Finca La Concepcion, Marbella, Spain'; // Often same as ceremony
  dressCode = 'Formal / Black Tie Optional';

  // Specific travel information for guests from Ireland
  irelandTravelDetails = {
    heading: 'For Our Wonderful Guests from Ireland',
    message: 'We are so excited to celebrate our special day with you in sunny Spain! Below is some information specifically tailored to help you plan your journey.',
    passportReminder: 'Please ensure your passport is valid for travel to Spain (Schengen Area) and has at least 6 months validity from your return date.',
    currency: 'The local currency in Spain is the Euro (€).',
    language: 'The official language is Spanish, but English is widely spoken in tourist areas.',
    driving: 'Driving is on the right-hand side of the road in Spain. An International Driving Permit is recommended if you plan to hire a car.'
  };

  // General invitation text
  invitationMessage = `
    The honour of your presence
    is requested at the marriage of
  `;
  invitationClosing = `
    Reception to follow immediately at the same location.
    We would be absolutely delighted if you could join us.
  `;

  constructor() { }

}
