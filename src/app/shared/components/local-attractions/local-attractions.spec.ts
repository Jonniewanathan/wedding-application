import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { LocalAttractions } from './local-attractions';
import { MapLoaderService } from '../../../core/services/map-loader/map-loader';

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

describe('LocalAttractions', () => {
  let component: LocalAttractions;
  let fixture: ComponentFixture<LocalAttractions>;
  let mapLoaderSpy: jasmine.SpyObj<MapLoaderService>;

  beforeEach(async () => {
    mapLoaderSpy = jasmine.createSpyObj<MapLoaderService>('MapLoaderService', ['load']);
    mapLoaderSpy.load.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [LocalAttractions],
      providers: [
        { provide: TranslateService, useValue: translateStub() },
        { provide: MapLoaderService, useValue: mapLoaderSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LocalAttractions);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default mapReady to false before the loader resolves', () => {
    expect(component.mapReady).toBeFalse();
  });

  it('should default the map center near Punta Umbría / Huelva', () => {
    expect(component.mapCenter.lat).toBeCloseTo(37.2185, 3);
    expect(component.mapCenter.lng).toBeCloseTo(-6.9585, 3);
    expect(component.mapZoom).toBe(12);
  });

  it('should expose at least 6 attractions with required fields', () => {
    expect(component.attractions.length).toBeGreaterThanOrEqual(6);
    component.attractions.forEach(attr => {
      expect(attr.nameKey).toBeTruthy();
      expect(attr.descriptionKey).toBeTruthy();
      expect(attr.image).toBeTruthy();
      expect(attr.link).toBeTruthy();
    });
  });

  it('should set mapReady to true after MapLoaderService.load resolves', async () => {
    await component.ngOnInit();
    await Promise.resolve();
    expect(mapLoaderSpy.load).toHaveBeenCalled();
    expect(component.mapReady).toBeTrue();
  });

  it('should open a new window when navigateTo is called', () => {
    const openSpy = spyOn(window, 'open');
    component.navigateTo('https://example.com');
    expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank');
  });
});