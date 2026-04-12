import { TestBed } from '@angular/core/testing';

import { GuestSession } from './guest-session';

describe('GuestSession', () => {
  let service: GuestSession;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GuestSession);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
