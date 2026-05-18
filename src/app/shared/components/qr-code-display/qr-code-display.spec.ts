import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventEmitter } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { QrCodeDisplay } from './qr-code-display';
import { LanguageService } from '../../../core/services/language/language';
import { Guest } from '../../models/guest.model';

function translateStub(): Partial<TranslateService> {
  return {
    instant: ((k: string) => k) as any,
    get: ((k: string) => of(k)) as any,
    stream: ((k: string) => of(k)) as any,
    onLangChange: new EventEmitter() as any,
    onTranslationChange: new EventEmitter() as any,
    onDefaultLangChange: new EventEmitter() as any,
    currentLang: 'en',
    addLangs: () => {},
    getLangs: () => ['en', 'es'],
    use: (() => of({})) as any,
    getBrowserLang: () => 'en'
  };
}

function makeGuest(firstName: string, lastName: string): Guest {
  return {
    id: `${firstName}-${lastName}`,
    firstName,
    lastName,
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Timestamp
  };
}

describe('QrCodeDisplay', () => {
  let component: QrCodeDisplay;
  let fixture: ComponentFixture<QrCodeDisplay>;
  let dialogRef: jasmine.SpyObj<DynamicDialogRef>;
  let messageSpy: jasmine.SpyObj<MessageService>;
  let config: DynamicDialogConfig;

  function setup(data: any = {}) {
    dialogRef = jasmine.createSpyObj<DynamicDialogRef>('DynamicDialogRef', ['close']);
    messageSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
    config = { data } as DynamicDialogConfig;

    const languageStub: Partial<LanguageService> = {
      switchLanguage: () => {},
      initLanguage: () => {}
    };
    Object.defineProperty(languageStub, 'currentLang', { get: () => 'en' });

    TestBed.configureTestingModule({
      imports: [QrCodeDisplay],
      providers: [
        { provide: DynamicDialogRef, useValue: dialogRef },
        { provide: DynamicDialogConfig, useValue: config },
        { provide: LanguageService, useValue: languageStub },
        { provide: TranslateService, useValue: translateStub() },
        { provide: MessageService, useValue: messageSpy }
      ]
    });

    fixture = TestBed.createComponent(QrCodeDisplay);
    component = fixture.componentInstance;
    component.ngOnInit();
  }

  it('should create', () => {
    setup();
    expect(component).toBeTruthy();
  });

  it('should use the supplied URL, QR code, and invitation name from config.data', () => {
    setup({
      url: 'https://example.com/invite/x',
      qrCodeDataUrl: 'data:image/png;base64,abc',
      invitationName: 'The Smiths',
      guests: []
    });
    expect(component.invitationUrl).toBe('https://example.com/invite/x');
    expect(component.qrCodeDataUrl).toBe('data:image/png;base64,abc');
    expect(component.invitationName).toBe('The Smiths');
  });

  it('should fall back to a placeholder URL when none is supplied', () => {
    setup({});
    expect(component.invitationUrl).toBe('URL not provided');
    expect(component.qrCodeDataUrl).toBe('');
    expect(component.invitationName).toBe('');
    expect(component.guests).toEqual([]);
  });

  it('should build a WhatsApp message containing the invitation name and URL', () => {
    setup({
      url: 'https://example.com/invite/x',
      invitationName: 'The Smiths',
      guests: []
    });
    const msg = component.generatedMessage();
    expect(msg).toContain('The Smiths');
    expect(msg).toContain('https://example.com/invite/x');
    expect(msg).not.toContain('This invitation admits');
  });

  it('should include the guest list in the WhatsApp message when guests are supplied', () => {
    setup({
      url: 'https://example.com/invite/x',
      invitationName: 'The Smiths',
      guests: [makeGuest('Alice', 'Smith'), makeGuest('Bob', 'Smith')]
    });
    const msg = component.generatedMessage();
    expect(msg).toContain('This invitation admits');
    expect(msg).toContain('Alice Smith');
    expect(msg).toContain('Bob Smith');
  });

  it('should build a wa.me URL with no phone segment when none is supplied', () => {
    setup({
      url: 'https://example.com/invite/x',
      invitationName: 'The Smiths',
      guests: []
    });
    const url = component.whatsappUrl();
    expect(url.startsWith('https://wa.me/?text=')).toBeTrue();
    const decoded = decodeURIComponent(url.split('?text=')[1]);
    expect(decoded).toBe(component.generatedMessage());
  });

  it('should embed a digits-only phone segment when one is supplied', () => {
    setup({
      url: 'https://example.com/invite/x',
      invitationName: 'The Smiths',
      phoneNumber: '+353 85 123-4567',
      guests: []
    });
    const url = component.whatsappUrl();
    expect(url.startsWith('https://wa.me/353851234567?text=')).toBeTrue();
  });

  it('should fall back to no phone segment when the supplied phone has no digits', () => {
    setup({
      url: 'https://example.com/invite/x',
      invitationName: 'The Smiths',
      phoneNumber: '???-???',
      guests: []
    });
    const url = component.whatsappUrl();
    expect(url.startsWith('https://wa.me/?text=')).toBeTrue();
  });

  it('should close the dialog when closeDialog is called', () => {
    setup();
    component.closeDialog();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('should write invitationUrl to the clipboard and toast on copyUrl', async () => {
    setup({ url: 'https://example.com/invite/x', guests: [] });
    const writeText = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());

    component.copyUrl();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('https://example.com/invite/x');
    expect(messageSpy.add).toHaveBeenCalled();
    const last = messageSpy.add.calls.mostRecent().args[0] as any;
    expect(last.severity).toBe('success');
  });

  it('should toast error when copyUrl rejects', async () => {
    setup({ url: 'https://example.com/invite/x', guests: [] });
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.reject(new Error('denied')));

    component.copyUrl();
    await Promise.resolve();
    await Promise.resolve();

    const last = messageSpy.add.calls.mostRecent().args[0] as any;
    expect(last.severity).toBe('error');
  });

  it('should toast success when copyMessage resolves', async () => {
    setup({ invitationName: 'X', guests: [] });
    const writeText = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    component.copyMessage();
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(component.generatedMessage());
    expect(messageSpy.add).toHaveBeenCalled();
  });

  it('should toast error when copyMessage rejects', async () => {
    setup({ invitationName: 'X', guests: [] });
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.reject(new Error('denied')));
    component.copyMessage();
    await Promise.resolve();
    await Promise.resolve();
    const last = messageSpy.add.calls.mostRecent().args[0] as any;
    expect(last.severity).toBe('error');
  });

  it('should toast error when print pop-up is blocked', () => {
    setup({ invitationName: 'X', guests: [] });
    spyOn(window, 'open').and.returnValue(null);
    component.printInvite();
    expect(messageSpy.add).toHaveBeenCalled();
    const last = messageSpy.add.calls.mostRecent().args[0] as any;
    expect(last.severity).toBe('error');
  });

  describe('printInvite HTML escaping', () => {
    let writeSpy: jasmine.Spy;
    let fakeWindow: any;

    function setupPrint(data: any) {
      setup(data);
      writeSpy = jasmine.createSpy('write');
      fakeWindow = {
        document: {
          open: jasmine.createSpy('open'),
          write: writeSpy,
          close: jasmine.createSpy('close')
        }
      };
      spyOn(window, 'open').and.returnValue(fakeWindow as any);
    }

    it('should escape HTML in the invitation name', () => {
      setupPrint({
        url: 'https://example.com',
        qrCodeDataUrl: 'data:image/png;base64,abc',
        invitationName: '<script>alert("xss")</script>',
        guests: []
      });

      component.printInvite();

      const written = writeSpy.calls.mostRecent().args[0] as string;
      expect(written).not.toContain('<script>alert("xss")</script>');
      expect(written).toContain('&lt;script&gt;');
    });

    it('should escape HTML in guest names', () => {
      setupPrint({
        url: 'https://example.com',
        qrCodeDataUrl: 'data:image/png;base64,abc',
        invitationName: 'Safe',
        guests: [
          {
            id: '1',
            firstName: '<img src=x onerror=alert(1)>',
            lastName: 'Smith',
            createdAt: {} as any
          }
        ]
      });

      component.printInvite();

      const written = writeSpy.calls.mostRecent().args[0] as string;
      expect(written).not.toContain('<img src=x onerror=alert(1)>');
      expect(written).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('should not pull in the Tailwind CDN script', () => {
      setupPrint({
        url: 'https://example.com',
        qrCodeDataUrl: 'data:image/png;base64,abc',
        invitationName: 'Safe',
        guests: []
      });

      component.printInvite();

      const written = writeSpy.calls.mostRecent().args[0] as string;
      expect(written).not.toContain('cdn.tailwindcss.com');
    });

    it('should escape HTML in the invitation URL', () => {
      setupPrint({
        url: 'https://example.com/"><script>x</script>',
        qrCodeDataUrl: 'data:image/png;base64,abc',
        invitationName: 'Safe',
        guests: []
      });

      component.printInvite();

      const written = writeSpy.calls.mostRecent().args[0] as string;
      expect(written).not.toContain('"><script>x</script>');
      expect(written).toContain('&quot;&gt;&lt;script&gt;');
    });
  });
});