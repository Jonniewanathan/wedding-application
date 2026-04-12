import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMap } from '@angular/google-maps';
import { MapLoaderService } from '../../../core/services/map-loader/map-loader';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-local-attractions',
  standalone: true,
  imports: [
    CommonModule,
    GoogleMap,
    ScrollRevealDirective,
    TranslateModule
  ],
  templateUrl: './local-attractions.html',
  styleUrl: './local-attractions.scss'
})
export class LocalAttractions implements OnInit {
  private mapLoader = inject(MapLoaderService);

  mapReady = false;

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
      nameKey: 'LOCAL_GUIDE.PUNTA_UMBRIA.TITLE',
      descriptionKey: 'LOCAL_GUIDE.PUNTA_UMBRIA.DESC',
      image: 'assets/images/playa-de-punta-umbria.jpg',
      link: 'https://maps.app.goo.gl/y2F3gYfSExjRz3kR7'
    },
    {
      nameKey: 'LOCAL_GUIDE.VALVERDE.TITLE',
      descriptionKey: 'LOCAL_GUIDE.VALVERDE.DESC',
      image: 'assets/images/valverde-square.jpeg',
      link: 'https://maps.app.goo.gl/y2F3gYfSExjRz3kR7'
    },
    {
      nameKey: 'LOCAL_GUIDE.MONUMENT.TITLE',
      descriptionKey: 'LOCAL_GUIDE.MONUMENT.DESC',
      image: 'assets/images/monument.jpeg',
      link: 'https://maps.app.goo.gl/rNqPGrJq7Gv3o7tq9'
    },
    {
      nameKey: 'LOCAL_GUIDE.RIO_TINTO.TITLE',
      descriptionKey: 'LOCAL_GUIDE.RIO_TINTO.DESC',
      image: 'assets/images/Rio-Tinto.jpg',
      link: 'https://maps.app.goo.gl/M4gL2Xk6cE49KzUq9'
    },
    {
      nameKey: 'LOCAL_GUIDE.MUELLE.TITLE',
      descriptionKey: 'LOCAL_GUIDE.MUELLE.DESC',
      image: 'assets/images/muelle-de-las-carabelas.jpg',
      link: 'https://maps.app.goo.gl/34g7wT8oDsqrMhsm6'
    },
    {
      nameKey: 'LOCAL_GUIDE.SEVILLA.TITLE',
      descriptionKey: 'LOCAL_GUIDE.SEVILLA.DESC',
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
