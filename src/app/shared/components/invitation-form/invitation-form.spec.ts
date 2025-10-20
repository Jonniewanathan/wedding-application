import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvitationForm } from './invitation-form';

describe('InvitationForm', () => {
  let component: InvitationForm;
  let fixture: ComponentFixture<InvitationForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvitationForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvitationForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
