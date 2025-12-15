import {ApplicationConfig, provideZoneChangeDetection} from '@angular/core';
import {provideRouter, withInMemoryScrolling} from '@angular/router';
import { routes } from './app.routes';
import { environment } from '../environments/environent';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getStorage, provideStorage } from '@angular/fire/storage';
import {providePrimeNG} from 'primeng/config';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {provideHttpClient} from '@angular/common/http';
import {StonePrimengPreset} from './theme-preset-stone';


export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top', // Scrolls to top on navigation
        anchorScrolling: 'enabled'        // Allows anchor links (like #details) to work
      })
      ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: StonePrimengPreset,
        options: {
          prefix: 'p',
          darkModeSelector: 'my-app-dark', // Class to trigger dark mode
          cssLayer: false
        }
      }
    }),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    provideStorage(() => getStorage()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
  ]
};
