import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from './language';

describe('LanguageService', () => {
  let service: LanguageService;
  let translateSpy: jasmine.SpyObj<TranslateService>;
  let registeredLangs: string[];
  let currentLang: string | undefined;

  beforeEach(() => {
    registeredLangs = [];
    currentLang = undefined;

    translateSpy = jasmine.createSpyObj<TranslateService>('TranslateService', [
      'addLangs',
      'getLangs',
      'use',
      'getBrowserLang'
    ]);

    translateSpy.addLangs.and.callFake((langs: string[]) => {
      registeredLangs = [...langs];
    });
    translateSpy.getLangs.and.callFake(() => registeredLangs);
    translateSpy.use.and.callFake((lang: string) => {
      currentLang = lang;
      return null as any;
    });
    Object.defineProperty(translateSpy, 'currentLang', {
      get: () => currentLang
    });

    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: TranslateService, useValue: translateSpy }
      ]
    });

    service = TestBed.inject(LanguageService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initLanguage', () => {
    it('should register "en" and "es" as available languages', () => {
      translateSpy.getBrowserLang.and.returnValue('en');
      service.initLanguage();
      expect(translateSpy.addLangs).toHaveBeenCalledWith(['en', 'es']);
    });

    it('should use the saved language from localStorage when valid', () => {
      localStorage.setItem('user_language', 'es');
      translateSpy.getBrowserLang.and.returnValue('en');
      service.initLanguage();
      expect(translateSpy.use).toHaveBeenCalledWith('es');
    });

    it('should ignore the saved language when it is not in the registered list', () => {
      localStorage.setItem('user_language', 'fr');
      translateSpy.getBrowserLang.and.returnValue('en');
      service.initLanguage();
      expect(translateSpy.use).toHaveBeenCalledWith('en');
    });

    it('should use the browser language when no saved language exists and browser lang is supported', () => {
      translateSpy.getBrowserLang.and.returnValue('es');
      service.initLanguage();
      expect(translateSpy.use).toHaveBeenCalledWith('es');
    });

    it('should fall back to "en" when the browser language is not supported', () => {
      translateSpy.getBrowserLang.and.returnValue('de');
      service.initLanguage();
      expect(translateSpy.use).toHaveBeenCalledWith('en');
    });

    it('should fall back to "en" when getBrowserLang returns undefined', () => {
      translateSpy.getBrowserLang.and.returnValue(undefined);
      service.initLanguage();
      expect(translateSpy.use).toHaveBeenCalledWith('en');
    });
  });

  describe('switchLanguage', () => {
    beforeEach(() => {
      translateSpy.getBrowserLang.and.returnValue('en');
      service.initLanguage();
      translateSpy.use.calls.reset();
    });

    it('should switch to a valid registered language and persist it', () => {
      service.switchLanguage('es');
      expect(translateSpy.use).toHaveBeenCalledWith('es');
      expect(localStorage.getItem('user_language')).toBe('es');
    });

    it('should ignore an unregistered language', () => {
      service.switchLanguage('fr');
      expect(translateSpy.use).not.toHaveBeenCalled();
      expect(localStorage.getItem('user_language')).toBeNull();
    });
  });

  describe('currentLang getter', () => {
    it('should return the current language from the translate service', () => {
      translateSpy.getBrowserLang.and.returnValue('es');
      service.initLanguage();
      expect(service.currentLang).toBe('es');
    });

    it('should return "en" as the fallback before translate.currentLang is set', () => {
      expect(service.currentLang).toBe('en');
    });
  });
});