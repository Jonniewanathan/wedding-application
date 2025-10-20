import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuestForm } from './guest-form';

describe('GuestForm', () => {
  let component: GuestForm;
  let fixture: ComponentFixture<GuestForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuestForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuestForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
