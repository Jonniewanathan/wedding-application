import { TestBed } from '@angular/core/testing';
import { MapLoaderService } from './map-loader';

describe('MapLoaderService', () => {
  let service: MapLoaderService;
  let createdScripts: HTMLScriptElement[];
  let originalCreateElement: typeof document.createElement;
  let appendChildSpy: jasmine.Spy;

  beforeEach(() => {
    // Reset the static promise cache between tests
    (MapLoaderService as any).promise = undefined;

    createdScripts = [];
    originalCreateElement = document.createElement.bind(document);

    spyOn(document, 'createElement').and.callFake(((tag: string) => {
      const el = originalCreateElement(tag) as HTMLScriptElement;
      if (tag === 'script') {
        createdScripts.push(el);
      }
      return el;
    }) as typeof document.createElement);

    appendChildSpy = spyOn(document.body, 'appendChild').and.callFake(
      ((node: Node) => node) as any
    );

    TestBed.configureTestingModule({ providers: [MapLoaderService] });
    service = TestBed.inject(MapLoaderService);
  });

  afterEach(() => {
    (MapLoaderService as any).promise = undefined;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should append a script tag to the document body on the first load() call', () => {
    service.load();
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(createdScripts.length).toBe(1);
    expect(createdScripts[0].async).toBeTrue();
    expect(createdScripts[0].defer).toBeTrue();
    expect(createdScripts[0].src).toContain('maps.googleapis.com/maps/api/js');
  });

  it('should reuse the same promise on subsequent calls (singleton behaviour)', () => {
    const first = service.load();
    const second = service.load();
    expect(first).toBe(second);
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
  });

  it('should resolve when the script onload fires', async () => {
    const promise = service.load();
    createdScripts[0].onload!(new Event('load'));
    await expectAsync(promise).toBeResolved();
  });

  it('should reject when the script onerror fires', async () => {
    const promise = service.load();
    const errorEvent = new Event('error');
    createdScripts[0].onerror!(errorEvent);
    await expectAsync(promise).toBeRejected();
  });
});