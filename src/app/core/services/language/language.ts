import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private translate = inject(TranslateService);
  private readonly STORAGE_KEY = 'user_language';

  initLanguage(): void {
    // 1. Set available languages
    this.translate.addLangs(['en', 'es']);

    // 2. Try to get saved language from localStorage
    const savedLang = localStorage.getItem(this.STORAGE_KEY);

    if (savedLang && this.translate.getLangs().includes(savedLang)) {
      this.translate.use(savedLang);
    } else {
      // 3. Fallback to browser language or default
      const browserLang = this.translate.getBrowserLang();
      const langToUse = browserLang && this.translate.getLangs().includes(browserLang) ? browserLang : 'en';
      this.translate.use(langToUse);
    }
  }

  switchLanguage(lang: string): void {
    if (this.translate.getLangs().includes(lang)) {
      this.translate.use(lang);
      localStorage.setItem(this.STORAGE_KEY, lang);
    }
  }

  get currentLang(): string {
    // translate.currentLang is sometimes undefined on very first boot until the async file loads,
    // so we fallback to the default 'en'.
    return this.translate.currentLang || 'en';
  }
}
