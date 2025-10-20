import {Component, inject} from '@angular/core';
import {Card} from 'primeng/card';
import {Image} from 'primeng/image';
import {Button} from 'primeng/button';
import {PrimeTemplate} from 'primeng/api';
import {GoogleMap} from '@angular/google-maps';
import {MapLoaderService} from '../../../core/services/map-loader/map-loader';

@Component({
  selector: 'app-local-attractions',
  imports: [
    Button,
    Image,
    Card,
    PrimeTemplate,
    GoogleMap
  ],
  standalone: true,
  templateUrl: './local-attractions.html',
  styleUrl: './local-attractions.scss'
})
export class LocalAttractions {
  private mapLoader = inject(MapLoaderService);

  mapReady = false;

  pageTitle = 'Explore Punta Umbría & Huelva';
  introText = 'While you\'re here for our wedding, we hope you get a chance to enjoy the beautiful coast and rich history of the Huelva province. Here are some of our recommendations.';
  mapCenter: google.maps.LatLngLiteral = { lat: 37.2185, lng: -6.9585 };
  mapZoom = 12;

  attractions = [
    {
      name: 'Playa de Punta Umbría',
      description: 'The town\'s main attraction! A long, beautiful golden sand beach perfect for a relaxing walk, sunbathing, or enjoying the Atlantic breeze.',
      image: 'assets/images/playa-de-punta-umbria.jpg', // Corrected path
      link: 'https://maps.app.goo.gl/y2F3gYfSExjRz3kR7'
    },
    {
      name: 'Marismas del Odiel',
      description: 'A stunning UNESCO Biosphere Reserve just a short drive away. It\'s a paradise for nature lovers and bird watchers, with beautiful trails.',
      image: 'assets/images/marismas-del-odiel.jpg', // Corrected path
      link: 'https://www.andalucia.org/en/natural-spaces/paraje-natural/marismas-del-odiel'
    },
    {
      name: 'Muelle de las Carabelas',
      description: 'Discover history where it happened! See life-size replicas of Columbus\'s ships near Huelva city.',
      image: 'assets/images/muelle-de-las-carabelas.jpg', // Corrected path
      link: 'https://maps.app.goo.gl/34g7wT8oDsqrMhsm6'
    },
    {
      name: 'Huelva City Centre',
      description: 'Explore the nearby provincial capital. Stroll through the Plaza de las Monjas and enjoy the local atmosphere, shops, and tapas bars.',
      image: 'assets/images/huelva-city-centre.jpg', // Corrected path
      link: 'https://www.andalucia.org/en/huelva'
    },
    {
      name: 'Enjoy a Chiringuito',
      description: 'You can\'t visit the coast without trying fresh seafood at a chiringuito (beachfront restaurant).',
      image: 'assets/images/enjoy-a-chiringuito.jpg', // Corrected path
      link: 'https://maps.app.goo.gl/M4gL2Xk6cE49KzUq9'
    },
    {
      name: 'Monumento a la Fe Descubridora',
      description: 'An impressive, massive statue dedicated to Christopher Columbus, located at the confluence of the Tinto and Odiel rivers.',
      image: 'assets/images/monumento-fe-descubridora.jpg', // Corrected path
      link: 'https://maps.app.goo.gl/rNqPGrJq7Gv3o7tq9'
    }
  ];

  ngOnInit(): void {
    this.mapLoader.load().then(() => {
      // This code only runs AFTER the script is loaded
      this.mapReady = true;
    }).catch(error => {
      console.error('Failed to load Google Maps script', error);
    });
  }

  // --- Component Methods ---
  navigateTo(url: string): void {
    window.open(url, '_blank');
  }
}
