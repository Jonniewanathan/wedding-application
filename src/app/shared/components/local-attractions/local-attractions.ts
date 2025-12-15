import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMap } from '@angular/google-maps';
import { MapLoaderService } from '../../../core/services/map-loader/map-loader';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal';

@Component({
  selector: 'app-local-attractions',
  standalone: true,
  imports: [
    CommonModule,
    GoogleMap,
    ScrollRevealDirective
  ],
  templateUrl: './local-attractions.html',
  styleUrl: './local-attractions.scss'
})
export class LocalAttractions implements OnInit {
  private mapLoader = inject(MapLoaderService);

  mapReady = false;

  pageTitle = 'The Local Area';
  introText = 'Huelva Province offers a perfect blend of golden coastlines and rich Andalusian history. Here are a few of our favourite spots to explore while you are here.';

  mapCenter: google.maps.LatLngLiteral = { lat: 37.2185, lng: -6.9585 };
  mapZoom = 12;

  mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    scrollwheel: false,
    mapTypeId: 'roadmap',
  };

  attractions = [
    {
      name: 'Town of Punta Umbria',
      description: 'Experience the electric energy of Punta Umbría, where golden sands are lined with lively chiringuitos perfect for sunset drinks and fresh seafood. As night falls, this coastal paradise transforms into a premier nightlife destination, boasting pulsating nightclubs and an atmosphere that invites you to dance until dawn.',
      image: 'assets/images/playa-de-punta-umbria.jpg',
      link: 'https://maps.app.goo.gl/y2F3gYfSExjRz3kR7'
    },
    {
      name: 'Valverde Del Camino',
      description: 'Immerse yourself in the artisan heart of Huelva at Valverde del Camino, a town world-renowned for its exquisite leatherwork and the iconic boto riding boot. This welcoming destination offers a unique mix of master craftsmanship, rich British railway history, and authentic Andalusian gastronomy.',
      image: 'assets/images/valverde-square.jpeg',
      link: 'https://maps.app.goo.gl/y2F3gYfSExjRz3kR7'
    },
    {
      name: 'Monument Fe Descubridora',
      description: 'Stand in awe beneath the towering Monumento a la Fe Descubridora, a colossal Cubist tribute at the water\'s edge that immortalizes Huelva’s pivotal role in the discovery of the New World. This historic port city blends maritime grandeur with deep heritage, serving as the majestic gateway where the Odiel and Tinto rivers meet',
      image: 'assets/images/monument.jpeg',
      link: 'https://maps.app.goo.gl/rNqPGrJq7Gv3o7tq9'
    },
    {
      name: 'Rio Tinto',
      description: 'Discover the otherworldly beauty of the Rio Tinto, where striking crimson waters flow through a surreal, Mars-like landscape shaped by five thousand years of mining history. This unique geological wonder offers an unforgettable visual experience and a fascinating glimpse into Spain\'s ancient industrial past.',
      image: 'assets/images/Rio-Tinto.jpg',
      link: 'https://maps.app.goo.gl/M4gL2Xk6cE49KzUq9'
    },
    {
      name: 'Muelle de las Carabelas',
      description: 'Step back into 1492 at the Muelle de las Carabelas, where you can board full-scale replicas of the Niña, Pinta, and Santa María to relive the voyage that changed the world. This immersive open-air museum offers a tangible connection to history, allowing you to walk the decks of the legendary fleet right where the adventure began.',
      image: 'assets/images/muelle-de-las-carabelas.jpg',
      link: 'https://maps.app.goo.gl/34g7wT8oDsqrMhsm6'
    },
    {
      name: 'Sevilla City',
      description: 'Lose yourself in the soulful magic of Sevilla, where the scent of orange blossoms mingles with the passion of flamenco and world-class tapas culture. Home to the majestic Real Alcázar and the vibrant Plaza de España, the Andalusian capital offers a dazzling blend of Moorish heritage and lively modern energy.',
      image: 'assets/images/Sevilla.jpeg',
      link: 'https://www.andalucia.org/en/huelva'
    },
  ];

  ngOnInit(): void {
    this.mapLoader.load().then(() => {
      this.mapReady = true;
    });
  }

  navigateTo(url: string): void {
    window.open(url, '_blank');
  }
}
