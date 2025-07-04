import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoShare } from './photo-share';

describe('PhotoShare', () => {
  let component: PhotoShare;
  let fixture: ComponentFixture<PhotoShare>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoShare]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhotoShare);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
