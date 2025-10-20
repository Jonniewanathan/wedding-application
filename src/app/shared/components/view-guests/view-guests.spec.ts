import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewGuests } from './view-guests';

describe('ViewGuests', () => {
  let component: ViewGuests;
  let fixture: ComponentFixture<ViewGuests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewGuests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewGuests);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
