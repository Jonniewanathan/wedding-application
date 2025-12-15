import {
  Component,
  AfterViewInit,
  ViewChildren,
  QueryList,
  ElementRef,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal';

interface AccommodationLocation {
  id: string;
  title: string;
  description: string;
  image: string;
  mobileImage: string | null;
}

@Component({
  selector: 'app-travel-info',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './travel-info.html',
  styleUrl: './travel-info.scss'
})
export class TravelInfo implements AfterViewInit, OnDestroy {
  // We access the DOM elements to track when they scroll into view
  @ViewChildren('locationBlock') locationBlocks!: QueryList<ElementRef>;

  private observer: IntersectionObserver | undefined;

  // --- ACCOMMODATION DATA ---
  locations: AccommodationLocation[] = [
    {
      id: 'punta',
      title: 'Punta Umbría',
      description: 'Our top recommendation. A beautiful coastal town perfect for a holiday vibe. Expect golden beaches, fresh seafood, and a relaxed atmosphere. It is the main pick-up point for the wedding bus.',
      image: 'assets/images/punta-umbria-beach.jpg',
      mobileImage: null
    },
    {
      id: 'valverde',
      title: 'Valverde Del Camino',
      description: 'For a truly authentic inland Andalusian experience. This is Marta\'s hometown—quiet, traditional, and full of local charm. A bus will also depart from here.',
      image: 'assets/images/valverde.jpeg',
      mobileImage: 'assets/images/valverde-del-camino-town.jpg'
    },
    {
      id: 'huelva',
      title: 'Huelva City',
      description: 'The provincial capital. Perfect if you prefer city conveniences, shopping, and historical sights. Explore the Plaza de las Monjas and enjoy vibrant evening tapas bars.',
      image: 'assets/images/huelva-city-centre.jpg',
      mobileImage: null
    }
  ];

  // Set default active location
  activeLocation: AccommodationLocation = this.locations[0];

  // --- TRANSPORT DATA ---
  transport = {
    heading: 'Wedding Day Shuttle',
    text: "We are arranging private transport to and from the venue to ensure everyone can relax.<br> We may add stops on route if needed for Huelva City",
    routes: [
      { from: 'Punta Umbría', to: 'Venue', time: 'TBA' },
      { from: 'Valverde / Huelva', to: 'Venue', time: 'TBA' }
    ],
    note: "Return shuttles will run at the end of the night."
  };

  // --- AIRPORT DATA ---
  airports = [
    {
      code: 'FAO',
      city: 'Faro, Portugal',
      driveTime: '1hr 20min drive',
      description: 'Often the most convenient option from Ireland. A straightforward drive across the border into Spain.',
      image: 'assets/images/aeroplane_taking_off.png'
    },
    {
      code: 'SVQ',
      city: 'Seville, Spain',
      driveTime: '1hr 30min drive',
      description: 'Perfect if you want to combine the wedding with a city break in the capital of Andalusia.',
      image: 'assets/images/aeroplane_taking_off.png'
    }
  ];

  otherInfo = {
    carRental: 'We highly recommend renting a car from the airport for the greatest flexibility.',
    publicTransport: 'If using Seville Airport, Buses run from Seville bus station to Huelva city and then from Huelva city various buses will depart to Punta Umbria',
    venueAddress: 'Convento de la Luz, Carretera A-494, s/n, 21820 Lucena del Puerto, Huelva'
  };

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    // SCROLL LOGIC:
    // This observer triggers when a text block hits the CENTER of the screen.
    // 'rootMargin: -50%...' essentially creates a trigger line in the exact middle of the viewport.
    const options = {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Find the location data that matches the ID of the div currently in the center
          const id = entry.target.getAttribute('id');
          const found = this.locations.find(l => l.id === id);

          if (found) {
            this.activeLocation = found;
            this.cdr.detectChanges(); // Manually trigger Angular to update the UI
          }
        }
      });
    }, options);

    // Start observing each text block
    this.locationBlocks.forEach(block => {
      this.observer?.observe(block.nativeElement);
    });
  }

  ngOnDestroy() {
    // Clean up observer to prevent memory leaks
    if (this.observer) this.observer.disconnect();
  }
}
