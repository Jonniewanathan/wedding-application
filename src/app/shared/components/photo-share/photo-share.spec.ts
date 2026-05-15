import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { PhotoShare } from './photo-share';

describe('PhotoShare', () => {
  let component: PhotoShare;
  let fixture: ComponentFixture<PhotoShare>;
  let messageService: MessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoShare],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoShare);
    component = fixture.componentInstance;
    messageService = fixture.debugElement.injector.get(MessageService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the page title and intro text', () => {
    expect(component.pageTitle).toBe('Share Your Moments');
    expect(component.introText).toBeTruthy();
    expect(component.disclaimerText).toBeTruthy();
  });

  it('should provide mock photos for the gallery', () => {
    expect(component.mockPhotos.length).toBeGreaterThan(0);
    component.mockPhotos.forEach(photo => {
      expect(photo.itemImageSrc).toBeTruthy();
      expect(photo.alt).toBeTruthy();
    });
  });

  it('should push an info toast when onUpload is called', () => {
    const addSpy = spyOn(messageService, 'add');
    component.onUpload({ files: [{ name: 'a.jpg' }, { name: 'b.jpg' }] } as any);
    expect(addSpy).toHaveBeenCalled();
    const call = addSpy.calls.mostRecent().args[0] as any;
    expect(call.severity).toBe('info');
    expect(call.detail).toContain('2');
  });

  it('should handle an empty file selection without throwing', () => {
    const addSpy = spyOn(messageService, 'add');
    component.onUpload({ files: [] } as any);
    expect(addSpy).toHaveBeenCalled();
    const call = addSpy.calls.mostRecent().args[0] as any;
    expect(call.detail).toContain('0');
  });
});