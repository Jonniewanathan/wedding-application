import { Routes } from '@angular/router';
import {SaveTheDate} from './shared/components/save-the-date/save-the-date';
import {TravelInfo} from './shared/components/travel-info/travel-info';
import {LocalAttractions} from './shared/components/local-attractions/local-attractions';
import {Rsvp} from './shared/components/rsvp/rsvp';
import {PhotoShare} from './shared/components/photo-share/photo-share';
import {Invitation} from './shared/components/invitation/invitation';

export const routes: Routes = [
  { path: 'save-the-date', component: SaveTheDate },
  // Define routes for other components as they are implemented
  { path: 'invitations', component: Invitation },
  { path: 'rsvp', component: Rsvp },
  { path: 'travel-info', component: TravelInfo },
  { path: 'local-attractions', component: LocalAttractions },
  { path: 'photo-share', component: PhotoShare },
  { path: '', redirectTo: '/save-the-date', pathMatch: 'full' }, // Default route
  { path: '**', redirectTo: '/save-the-date' } // Redirect any unknown paths
];
