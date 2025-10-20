import { TestBed } from '@angular/core/testing';

import { MapLoader } from './map-loader';

describe('MapLoader', () => {
  let service: MapLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapLoader);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
