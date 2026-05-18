import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CustomTranslateHttpLoader } from './custom-translate-loader';
import { version as appVersion } from '../../../../../package.json';

describe('CustomTranslateHttpLoader', () => {
  let loader: CustomTranslateHttpLoader;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CustomTranslateHttpLoader
      ]
    });

    loader = TestBed.inject(CustomTranslateHttpLoader);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(loader).toBeTruthy();
  });

  it('should request the translation file for the given language', () => {
    const expected = { GREETING: 'Hello' };

    loader.getTranslation('en').subscribe(translations => {
      expect(translations).toEqual(expected);
    });

    const req = httpMock.expectOne(`./assets/i18n/en.json?v=${appVersion}`);
    expect(req.request.method).toBe('GET');
    req.flush(expected);
  });

  it('should build the URL using the supplied language code', () => {
    loader.getTranslation('es').subscribe();
    const req = httpMock.expectOne(`./assets/i18n/es.json?v=${appVersion}`);
    req.flush({});
  });

  it('should propagate HTTP errors to subscribers', () => {
    let receivedError: any;

    loader.getTranslation('xx').subscribe({
      next: () => fail('expected an error'),
      error: (err) => (receivedError = err)
    });

    const req = httpMock.expectOne(`./assets/i18n/xx.json?v=${appVersion}`);
    req.flush('not found', { status: 404, statusText: 'Not Found' });

    expect(receivedError).toBeTruthy();
    expect(receivedError.status).toBe(404);
  });
});