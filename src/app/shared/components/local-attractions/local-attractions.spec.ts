import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalAttractions } from './local-attractions';

describe('LocalAttractions', () => {
  let component: LocalAttractions;
  let fixture: ComponentFixture<LocalAttractions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalAttractions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocalAttractions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
