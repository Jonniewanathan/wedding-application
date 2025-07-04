import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelInfo } from './travel-info';

describe('TravelInfo', () => {
  let component: TravelInfo;
  let fixture: ComponentFixture<TravelInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelInfo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
