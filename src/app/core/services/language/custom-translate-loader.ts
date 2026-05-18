import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { version } from '../../../../../package.json';

@Injectable({ providedIn: 'root' })
export class CustomTranslateHttpLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<any> {
    // Append the app version as a query parameter to bust the cache
    return this.http.get(`./assets/i18n/${lang}.json?v=${version}`);
  }
}
