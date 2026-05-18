import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { guestGuard } from './guest-guard';
import { GuestSessionService } from '../../services/auth/guest-session/guest-session';
import { Invitation } from '../../../shared/models/invitation.model';

function makeInvitation(): Invitation {
  return {
    id: 'inv-1',
    displayName: 'Test',
    invitationCode: 'abc',
    status: 'sent',
    guestIds: [],
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp
  };
}

describe('guestGuard', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let session: { currentInvitationValue: Invitation | null };
  let fakeUrlTree: UrlTree;

  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () => guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as boolean | UrlTree;
  }

  beforeEach(() => {
    fakeUrlTree = { __url: '/save-the-date' } as unknown as UrlTree;
    routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    routerSpy.createUrlTree.and.returnValue(fakeUrlTree);

    session = { currentInvitationValue: null };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: GuestSessionService, useValue: session }
      ]
    });
  });

  it('should allow activation when an invitation session exists', () => {
    session.currentInvitationValue = makeInvitation();
    const result = runGuard();
    expect(result).toBeTrue();
    expect(routerSpy.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to /save-the-date when no invitation session exists', () => {
    session.currentInvitationValue = null;
    const result = runGuard();
    expect(result).toBe(fakeUrlTree);
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/save-the-date']);
  });
});