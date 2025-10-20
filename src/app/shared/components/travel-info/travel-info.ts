import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// --- Import PrimeNG Modules ---
import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import {Image} from 'primeng/image'; // Add DividerModule

@Component({
  selector: 'app-travel-info',
  standalone: true,
  imports: [CommonModule, PanelModule, CardModule, DividerModule, Image], // Add DividerModule
  templateUrl: './travel-info.html',
  styleUrl: './travel-info.scss'
})
export class TravelInfo {

  // --- Introduction Section ---
  introInfo = {
    heading: 'Welcome & Where to Stay',
    location: "Our wedding will take place in the charming village of Lucena Del Puerto in the province of Huelva, Andalusia.",
    recommendation: "Due to high summer temperatures, accessibility, transport options, and accommodation availability, we highly suggest staying near the beautiful coast of Huelva, particularly in the coastal town of Punta Umbría.",
    alternative: "Another option is Marta's lovely hometown, Valverde Del Camino. It offers a different, more inland Andalusian experience.",
  };

  // --- Bus Information ---
  busInfo = {
    heading: 'Wedding Day Transportation 🚌',
    details: "To make transportation to and from the wedding venue easier for everyone, we will arrange a private bus.",
    routes: "The bus will depart from Punta Umbría and also from Valverde Del Camino, returning to both locations after the celebration.",
    rsvp: "More specific details about timings and exact pickup points will follow closer to the date. An RSVP for the bus will be needed.",
  };

  // --- Airport Information ---
  airportInfo = {
    heading: 'Getting Here - Airports ✈️',
    intro: "There are two main airport options we recommend for travelling from Ireland:",
    faro: {
      name: "Faro Airport, Portugal (FAO)",
      details: "Often the most convenient and cost-effective option with many direct flights from Ireland. It is approximately a 1 hour 20 minute drive to Punta Umbría and Huelva city.",
    },
    sevilla: {
      name: "Seville Airport, Spain (SVQ)",
      details: "A great alternative, especially if you plan to explore the beautiful city of Seville. It is approximately a 1 hour 30 minute drive to Punta Umbría and Huelva city.",
    },
    searchTip: "Use the flight search tool below to find the best options for your dates."
  };

  // --- Getting Around & Venue Address ---
  otherInfo = {
    heading: 'Getting Around & Venue Address',
    carRental: 'We highly recommend renting a car from the airport (Faro or Seville) for the greatest flexibility during your stay and for travelling between the airport, your accommodation, and potential sightseeing spots. All major rental companies operate at both airports.',
    venueAddress: 'Convento de la Luz, Carretera A-494, s/n, 21820 Lucena del Puerto, Huelva, Spain'
  };

  locationPhotos = [
    {
      name: 'Lucena Del Puerto',
      description: 'The charming village where the wedding venue is located.',
      imageUrl: 'assets/images/lucena-del-puerto-village.jpg'
    },
    {
      name: 'Punta Umbría',
      description: 'Our recommended coastal town for accommodation, known for its beaches.',
      imageUrl: 'assets/images/punta-umbria-beach.jpg'
    },
    {
      name: 'Huelva City',
      description: 'The nearby provincial capital with historical sites and local flavour.',
      imageUrl: 'assets/images/huelva-city-image.jpg'
    },
    {
      name: 'Valverde Del Camino',
      description: 'Marta\'s hometown, offering an inland Andalusian experience.',
      imageUrl: 'assets/images/valverde-del-camino-town.jpg'
    },
    {
      name: 'Faro, Portugal',
      description: 'A key arrival airport with a picturesque old town.',
      imageUrl: 'assets/images/faro-portugal-old-town.jpg'
    },
    {
      name: 'Seville, Spain',
      description: 'A major city, easily accessible and rich in culture and history.',
      imageUrl: 'assets/images/seville-spain-cathedral.jpg'
    }
  ];
}
