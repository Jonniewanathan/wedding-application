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
import { TranslateModule } from '@ngx-translate/core';

interface AccommodationLocation {
  id: string;
  titleKey: string;
  descriptionKey: string;
  image: string;
  mobileImage: string | null;
}

@Component({
  selector: 'app-travel-info',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective, TranslateModule],
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
      titleKey: 'TRAVEL_INFO.PUNTA_UMBRIA.TITLE',
      descriptionKey: 'TRAVEL_INFO.PUNTA_UMBRIA.DESC',
      image: 'assets/images/punta-umbria-beach.jpg',
      mobileImage: null
    },
    {
      id: 'valverde',
      titleKey: 'TRAVEL_INFO.VALVERDE.TITLE',
      descriptionKey: 'TRAVEL_INFO.VALVERDE.DESC',
      image: 'assets/images/valverde.jpeg',
      mobileImage: 'assets/images/valverde-del-camino-town.jpg'
    },
    {
      id: 'huelva',
      titleKey: 'TRAVEL_INFO.HUELVA_CITY.TITLE',
      descriptionKey: 'TRAVEL_INFO.HUELVA_CITY.DESC',
      image: 'assets/images/huelva-city-centre.jpg',
      mobileImage: null
    }
  ];

  // Set default active location
  activeLocation: AccommodationLocation = this.locations[0];

  // --- TRANSPORT DATA ---
  transport = {
    routes: [
      { from: 'Punta Umbría', to: 'Venue', time: 'TBA' },
      { from: 'Valverde', to: 'Venue', time: 'TBA' }
    ]
  };

  // --- AIRPORT DATA ---
  airports = [
    {
      code: 'FAO',
      cityKey: 'TRAVEL_INFO.AIRPORT_FAO.CITY',
      driveTimeKey: 'TRAVEL_INFO.AIRPORT_FAO.DRIVE_TIME',
      descriptionKey: 'TRAVEL_INFO.AIRPORT_FAO.DESC',
      image: 'assets/images/aeroplane_taking_off.png'
    },
    {
      code: 'SVQ',
      cityKey: 'TRAVEL_INFO.AIRPORT_SVQ.CITY',
      driveTimeKey: 'TRAVEL_INFO.AIRPORT_SVQ.DRIVE_TIME',
      descriptionKey: 'TRAVEL_INFO.AIRPORT_SVQ.DESC',
      image: 'assets/images/aeroplane_taking_off.png'
    }
  ];

  // --- NEW: HOTEL OFFER DATA ---
  hotelOffer = {
    code: 'Boda Marta',
    contacts: [
      { label: 'Email', value: 'ventas@hotelespato.com', icon: 'pi pi-envelope', link: 'mailto:ventas@hotelespato.com' },
      { label: 'Phone', value: '+34 959 31 12 50', icon: 'pi pi-phone', link: 'tel:+34959311250' },
      { label: 'WhatsApp', value: '+34 682 666 310', icon: 'pi pi-whatsapp', link: 'https://wa.me/34682666310' }
    ],
    hotels: [
      {
        name: 'Hotel Pato Amarillo',
        tagKey: 'TRAVEL_INFO.HOTEL_OFFER.HOTEL_AMARILLO_TAG',
        descriptionKey: 'TRAVEL_INFO.HOTEL_OFFER.HOTEL_AMARILLO_DESC',
        image: 'assets/images/hotel_pato_amarillo.jpg'
      },
      {
        name: 'Hotel Pato Rojo',
        tagKey: 'TRAVEL_INFO.HOTEL_OFFER.HOTEL_ROJO_TAG',
        descriptionKey: 'TRAVEL_INFO.HOTEL_OFFER.HOTEL_ROJO_DESC',
        image: 'assets/images/hotel_pato_rojo.jpg'
      }
    ]
  };

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    // SCROLL LOGIC:
    const options = {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          const found = this.locations.find(l => l.id === id);

          if (found) {
            this.activeLocation = found;
            this.cdr.detectChanges();
          }
        }
      });
    }, options);

    this.locationBlocks.forEach(block => {
      this.observer?.observe(block.nativeElement);
    });
  }

  ngOnDestroy() {
    if (this.observer) this.observer.disconnect();
  }
}
