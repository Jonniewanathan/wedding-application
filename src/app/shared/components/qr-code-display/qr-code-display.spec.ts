import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrCodeDisplay } from './qr-code-display';

describe('QrCodeDisplay', () => {
  let component: QrCodeDisplay;
  let fixture: ComponentFixture<QrCodeDisplay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrCodeDisplay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrCodeDisplay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
