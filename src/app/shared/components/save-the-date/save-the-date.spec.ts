import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveTheDate } from './save-the-date';

describe('SaveTheDate', () => {
  let component: SaveTheDate;
  let fixture: ComponentFixture<SaveTheDate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveTheDate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaveTheDate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
