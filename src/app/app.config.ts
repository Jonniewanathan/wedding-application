import {ApplicationConfig, provideZoneChangeDetection, importProvidersFrom} from '@angular/core';
import {provideRouter, withInMemoryScrolling} from '@angular/router';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getStorage, provideStorage } from '@angular/fire/storage';
import {providePrimeNG} from 'primeng/config';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {HttpClient, provideHttpClient} from '@angular/common/http';
import {StonePrimengPreset} from './theme-preset-stone';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { CustomTranslateHttpLoader } from './core/services/language/custom-translate-loader';

// Custom loader factory that sidesteps the broken @ngx-translate/http-loader dependency entirely
export function HttpLoaderFactory(http: HttpClient) {
  return new CustomTranslateHttpLoader(http);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      })
      ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: StonePrimengPreset,
        options: {
          prefix: 'p',
          darkModeSelector: 'my-app-dark',
          cssLayer: false
        }
      }
    }),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    provideStorage(() => getStorage()),
    provideZoneChangeDetection({ eventCoalescing: true }),

    // IMPORTANT: provideHttpClient MUST come before TranslateModule!
    provideHttpClient(),

    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      })
    )
  ]
};
