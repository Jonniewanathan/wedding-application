import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { SaveTheDate } from './save-the-date';

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

describe('SaveTheDate', () => {
  let component: SaveTheDate;
  let fixture: ComponentFixture<SaveTheDate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveTheDate],
      providers: [{ provide: TranslateService, useValue: translateStub() }]
    }).compileComponents();

    fixture = TestBed.createComponent(SaveTheDate);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the couple names', () => {
    expect(component.coupleNames).toBe('Marta & Jonathan');
  });

  it('should initialise countdown fields to zero before ngOnInit', () => {
    expect(component.days).toBe(0);
    expect(component.hours).toBe(0);
    expect(component.minutes).toBe(0);
    expect(component.seconds).toBe(0);
    expect(component.countdownFinished).toBeFalse();
  });

  it('should populate countdown values for a future date', fakeAsync(() => {
    component.ngOnInit();
    tick(0);
    const hasNonZero =
      component.days > 0 ||
      component.hours > 0 ||
      component.minutes > 0 ||
      component.seconds > 0;
    expect(hasNonZero).toBeTrue();
    expect(component.countdownFinished).toBeFalse();
    component.ngOnDestroy();
  }));

  it('should clear the interval on destroy', fakeAsync(() => {
    component.ngOnInit();
    tick(0);
    expect((component as any).intervalId).toBeTruthy();
    component.ngOnDestroy();
    tick(1000);
    expect(component).toBeTruthy();
  }));

  it('should not throw when ngOnDestroy is called without ngOnInit', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('should call scrollIntoView when scrollToContent is invoked on an existing element', () => {
    const target = document.createElement('div');
    const scrollSpy = spyOn(target, 'scrollIntoView');
    spyOn(document, 'getElementById').and.returnValue(target);
    component.scrollToContent();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('should not throw when scrollToContent target does not exist', () => {
    spyOn(document, 'getElementById').and.returnValue(null);
    expect(() => component.scrollToContent()).not.toThrow();
  });
});