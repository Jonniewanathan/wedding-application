import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddGuestForm } from './add-guest-form';

describe('AddGuestForm', () => {
  let component: AddGuestForm;
  let fixture: ComponentFixture<AddGuestForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddGuestForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddGuestForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
