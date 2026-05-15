import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose the wedding-app title', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.title).toBe('wedding-app');
  });

  it('should default sidebarVisible to false', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.sidebarVisible).toBeFalse();
  });

  it('should set currentYear to the current calendar year', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.currentYear).toBe(new Date().getFullYear());
  });

  it('should populate navItems with the 6 expected routes after ngOnInit', () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.ngOnInit();
    const routes = fixture.componentInstance.navItems.map(i => i['routerLink']);
    expect(routes).toEqual([
      '/save-the-date',
      '/invitations',
      '/rsvp',
      '/travel-info',
      '/local-attractions',
      '/photo-share'
    ]);
  });
});