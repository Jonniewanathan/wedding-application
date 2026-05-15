import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  ConfirmationService,
  MessageService
} from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { Admin } from './admin';
import { AuthService } from '../../core/services/auth/auth';
import { AdminStateService } from './services/admin-state.service';

@Component({
  selector: 'app-guest-pool',
  template: '<div data-test="stub-guest-pool"></div>',
  standalone: true
})
class GuestPoolStubComponent {}

@Component({
  selector: 'app-invitation-groups',
  template: '<div data-test="stub-invitation-groups"></div>',
  standalone: true
})
class InvitationGroupsStubComponent {}

describe('Admin', () => {
  let component: Admin;
  let fixture: ComponentFixture<Admin>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    authSpy.logout.and.returnValue(Promise.resolve());
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    const realMessage = new MessageService();
    const realConfirm = new ConfirmationService();
    const dialogSpy = jasmine.createSpyObj<DialogService>('DialogService', ['open']);

    await TestBed.configureTestingModule({
      imports: [Admin, GuestPoolStubComponent, InvitationGroupsStubComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    })
      .overrideComponent(Admin, {
        set: {
          imports: [
            CommonModule,
            ToastModule,
            ConfirmDialogModule,
            GuestPoolStubComponent,
            InvitationGroupsStubComponent
          ],
          providers: [
            { provide: DialogService, useValue: dialogSpy },
            { provide: ConfirmationService, useValue: realConfirm },
            { provide: MessageService, useValue: realMessage },
            AdminStateService
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(Admin);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default activeTabIndex to 0', () => {
    expect(component.activeTabIndex).toBe(0);
  });

  it('should logout and navigate to /login', async () => {
    component.logout();
    await Promise.resolve();
    await Promise.resolve();
    expect(authSpy.logout).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should switch tab index when activeTabIndex is set', () => {
    component.activeTabIndex = 1;
    expect(component.activeTabIndex).toBe(1);
  });
});