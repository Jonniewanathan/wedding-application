import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LoginComponent } from './login';
import { AuthService } from '../../core/services/auth/auth';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialise the form with empty email and password', () => {
    expect(component.loginForm.value).toEqual({ email: '', password: '' });
  });

  it('should mark the form invalid when fields are empty', () => {
    expect(component.loginForm.valid).toBeFalse();
  });

  it('should mark the form invalid when email is not a valid email', () => {
    component.loginForm.setValue({ email: 'not-an-email', password: 'pw' });
    expect(component.loginForm.get('email')?.valid).toBeFalse();
  });

  it('should mark the form valid when email and password are populated', () => {
    component.loginForm.setValue({ email: 'a@b.com', password: 'secret' });
    expect(component.loginForm.valid).toBeTrue();
  });

  it('should not call authService.login when the form is invalid', () => {
    component.onSubmit();
    expect(authSpy.login).not.toHaveBeenCalled();
  });

  it('should call authService.login and navigate to /admin on success', async () => {
    authSpy.login.and.returnValue(Promise.resolve({} as any));
    component.loginForm.setValue({ email: 'a@b.com', password: 'secret' });
    component.onSubmit();
    await Promise.resolve();
    await Promise.resolve();
    expect(authSpy.login).toHaveBeenCalledWith('a@b.com', 'secret');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('should populate errorMessage when login fails', async () => {
    authSpy.login.and.returnValue(Promise.reject(new Error('bad creds')));
    component.loginForm.setValue({ email: 'a@b.com', password: 'wrong' });
    component.onSubmit();
    await Promise.resolve();
    await Promise.resolve();
    expect(component.errorMessage).toBe('Failed to login. Please check your credentials.');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});