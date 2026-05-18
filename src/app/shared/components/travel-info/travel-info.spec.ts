import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { TravelInfo } from './travel-info';

function translateStub(): Partial<TranslateService> {
  return {
    instant: ((k: string) => k) as any,
    get: ((k: string) => of(k)) as any,
    stream: ((k: string) => of(k)) as any,
    onLangChange: new EventEmitter() as any,
    onTranslationChange: new EventEmitter() as any,
    onDefaultLangChange: new EventEmitter() as any,
    currentLang: 'en',
    addLangs: () => {},
    getLangs: () => ['en', 'es'],
    use: (() => of({})) as any,
    getBrowserLang: () => 'en'
  };
}

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

describe('TravelInfo', () => {
  let component: TravelInfo;
  let fixture: ComponentFixture<TravelInfo>;
  let originalIO: typeof IntersectionObserver;

  beforeEach(async () => {
    originalIO = (window as any).IntersectionObserver;
    (window as any).IntersectionObserver = IntersectionObserverStub;

    await TestBed.configureTestingModule({
      imports: [TravelInfo],
      providers: [{ provide: TranslateService, useValue: translateStub() }]
    }).compileComponents();

    fixture = TestBed.createComponent(TravelInfo);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    (window as any).IntersectionObserver = originalIO;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose three accommodation locations', () => {
    expect(component.locations.length).toBe(3);
    expect(component.locations.map(l => l.id)).toEqual(['punta', 'valverde', 'huelva']);
  });

  it('should default activeLocation to the first location', () => {
    expect(component.activeLocation).toBe(component.locations[0]);
    expect(component.activeLocation.id).toBe('punta');
  });

  it('should expose airport data for FAO and SVQ', () => {
    const codes = component.airports.map(a => a.code);
    expect(codes).toEqual(['FAO', 'SVQ']);
  });

  it('should expose the hotel offer with contacts and hotels', () => {
    expect(component.hotelOffer.code).toBe('Boda Marta');
    expect(component.hotelOffer.contacts.length).toBeGreaterThan(0);
    expect(component.hotelOffer.hotels.length).toBe(2);
  });

  it('should not throw on destroy when observer was never created', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});