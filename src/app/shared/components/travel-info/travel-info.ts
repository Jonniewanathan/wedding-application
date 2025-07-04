import { Component } from '@angular/core';

@Component({
  selector: 'app-travel-info',
  imports: [],
  standalone: true,
  templateUrl: './travel-info.html',
  styleUrl: './travel-info.css'
})
export class TravelInfo {
// Data for Airport and Flight Information
  airportInfo = {
    heading: 'Airport & Flight Information',
    intro: 'For our international guests, especially those flying from Ireland, Malaga-Costa del Sol Airport (AGP) is the most convenient gateway to our wedding location.',
    malagaAirport: {
      name: 'Malaga-Costa del Sol Airport (AGP)',
      details: 'Malaga Airport is well-connected with direct flights from Dublin, Cork, Shannon, and Belfast. It is approximately a 45-minute drive to Marbella.',
      airlines: [
        { name: 'Aer Lingus', routes: 'Dublin (DUB), Cork (ORK), Shannon (SNN)' },
        { name: 'Ryanair', routes: 'Dublin (DUB), Cork (ORK), Shannon (SNN), Knock (NOC), Belfast (BFS)' },
        { name: 'Transavia', routes: 'Various European cities' } // General example
      ],
      transport: 'From AGP, you can take a taxi (approx. €70-€85 to Marbella), pre-booked private transfer, or a bus to Marbella bus station (approx. €8-€10, then taxi to hotel).'
    },
    otherAirports: {
      heading: 'Alternative Airports (less convenient)',
      details: 'While Malaga is highly recommended, Granada Airport (GRX) or Jerez Airport (XRY) are alternatives but require longer transfers.',
    }
  };

  // Data for Hotel Recommendations
  hotelInfo = {
    heading: 'Recommended Accommodation',
    intro: 'We recommend staying in or around Marbella/San Pedro de Alcántara for easy access to the wedding venue. Here are a few suggestions ranging from luxury to more budget-friendly options.',
    hotels: [
      {
        name: 'Puente Romano Beach Resort',
        description: 'Luxury 5-star resort with stunning gardens and multiple dining options. Close to Marbella Golden Mile.',
        link: 'https://www.puenteromano.com/',
        priceRange: '€€€€'
      },
      {
        name: 'Nobu Hotel Marbella',
        description: 'Boutique hotel with a vibrant atmosphere, located within Puente Romano. Adults-only option.',
        link: 'https://www.nobuhotels.com/marbella/',
        priceRange: '€€€€'
      },
      {
        name: 'Amare Beach Hotel Marbella',
        description: 'Adults-only hotel right on the beach, offering a chic and lively experience. Central Marbella location.',
        link: 'https://www.amarehotels.com/amare-marbella/',
        priceRange: '€€€'
      },
      {
        name: 'Occidental Puerto Banús',
        description: 'A more budget-friendly option located in the heart of Puerto Banús, offering easy access to shops and nightlife.',
        link: 'https://www.barcelo.com/en-gb/occidental-puerto-banus/',
        priceRange: '€€'
      }
    ],
    note: 'We do not have a room block, so please book your accommodation early as September is a popular time in Marbella!'
  };

  constructor() { }
}
