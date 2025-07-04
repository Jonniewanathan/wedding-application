import { Component } from '@angular/core';

@Component({
  selector: 'app-local-attractions',
  imports: [],
  standalone: true,
  templateUrl: './local-attractions.html',
  styleUrl: './local-attractions.css'
})
export class LocalAttractions {
  pageTitle = 'Explore the Local Charm';
  introText = 'Marbella and its surrounding areas offer a wonderful blend of culture, history, and beautiful scenery. Here are some of our favorite recommendations for you to enjoy during your stay!';

  attractions = [
    {
      name: 'Marbella Old Town (Casco Antiguo)',
      description: 'Wander through charming narrow streets, discover orange tree-filled plazas, and enjoy authentic Spanish tapas. Don\'t miss Plaza de los Naranjos!',
      image: 'https://placehold.co/400x250/F0EBE5/6B7280?text=Marbella+Old+Town',
      link: 'https://www.andalucia.com/marbella/oldtown.htm' // Example link
    },
    {
      name: 'Puerto Banús',
      description: 'Experience the glitz and glamour of this famous marina, home to luxury yachts, designer boutiques, and vibrant nightlife. Great for people-watching!',
      image: 'https://placehold.co/400x250/F0EBE5/6B7280?text=Puerto+Ban%C3%BAs',
      link: 'https://www.puertobanus.es/en/' // Example link
    },
    {
      name: 'Sierra Blanca Mountains & La Concha',
      description: 'For nature lovers and hikers, the stunning Sierra Blanca mountains provide a beautiful backdrop. Hike to La Concha peak for panoramic views of the coast.',
      image: 'https://placehold.co/400x250/F0EBE5/6B7280?text=La+Concha+Mountain',
      link: 'https://www.marbella.es/web/turismo/naturaleza/la-concha.html' // Example link
    },
    {
      name: 'Estepona Old Town',
      description: 'A beautifully preserved and flower-filled old town west of Marbella, offering a more traditional Andalusian charm, vibrant murals, and lovely plazas.',
      image: 'https://placehold.co/400x250/F0EBE5/6B7280?text=Estepona+Old+Town',
      link: 'https://www.estepona.es/en/tourism/old-town.html' // Example link
    },
    {
      name: 'Bioparc Fuengirola',
      description: 'A modern zoo with a focus on natural habitats and conservation, offering an immersive experience for families. About a 30-minute drive from Marbella.',
      image: 'https://placehold.co/400x250/F0EBE5/6B7280?text=Bioparc+Fuengirola',
      link: 'https://www.bioparcfuengirola.es/en/' // Example link
    },
    {
      name: 'Day Trip to Ronda',
      description: 'Visit the dramatic town of Ronda, famous for its Puente Nuevo bridge spanning a deep gorge, and its historic bullring. A scenic drive inland.',
      image: 'https://placehold.co/400x250/F0EBE5/6B7280?text=Ronda+Bridge',
      link: 'https://www.rondaturismo.com/en/' // Example link
    }
  ];

  constructor() { }

}
