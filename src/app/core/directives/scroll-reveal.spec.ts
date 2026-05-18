import { ElementRef, Renderer2 } from '@angular/core';
import { ScrollRevealDirective } from './scroll-reveal';

class MockIntersectionObserver {
  static lastInstance: MockIntersectionObserver | null = null;

  callback: IntersectionObserverCallback;
  observed: Element[] = [];
  unobserved: Element[] = [];
  disconnected = false;
  options: IntersectionObserverInit | undefined;

  constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = opts;
    MockIntersectionObserver.lastInstance = this;
  }

  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve(el: Element) {
    this.unobserved.push(el);
  }
  disconnect() {
    this.disconnected = true;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  // Helper to simulate an intersection event from tests
  fire(isIntersecting: boolean) {
    const entries = this.observed.map(target => ({
      isIntersecting,
      target
    } as IntersectionObserverEntry));
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

describe('ScrollRevealDirective', () => {
  let element: HTMLElement;
  let mockEl: ElementRef;
  let renderer: jasmine.SpyObj<Renderer2>;
  let originalIntersectionObserver: typeof IntersectionObserver;

  beforeEach(() => {
    element = document.createElement('div');
    mockEl = { nativeElement: element } as ElementRef;
    renderer = jasmine.createSpyObj<Renderer2>('Renderer2', [
      'setStyle',
      'addClass',
      'removeStyle',
      'removeClass'
    ]);

    originalIntersectionObserver = (window as any).IntersectionObserver;
    (window as any).IntersectionObserver = MockIntersectionObserver;
    MockIntersectionObserver.lastInstance = null;
  });

  afterEach(() => {
    (window as any).IntersectionObserver = originalIntersectionObserver;
  });

  it('should create an instance', () => {
    const directive = new ScrollRevealDirective(mockEl, renderer);
    expect(directive).toBeTruthy();
  });

  it('should set initial opacity to 0 and add the hidden class in ngOnInit', () => {
    const directive = new ScrollRevealDirective(mockEl, renderer);
    directive.ngOnInit();
    expect(renderer.setStyle).toHaveBeenCalledWith(element, 'opacity', '0');
    expect(renderer.addClass).toHaveBeenCalledWith(element, 'reveal-hidden');
  });

  it('should register the element with IntersectionObserver on init', () => {
    const directive = new ScrollRevealDirective(mockEl, renderer);
    directive.ngOnInit();
    expect(MockIntersectionObserver.lastInstance).not.toBeNull();
    expect(MockIntersectionObserver.lastInstance!.observed).toContain(element);
  });

  it('should reveal the element when it intersects the viewport', () => {
    const directive = new ScrollRevealDirective(mockEl, renderer);
    directive.ngOnInit();

    MockIntersectionObserver.lastInstance!.fire(true);

    expect(renderer.removeStyle).toHaveBeenCalledWith(element, 'opacity');
    expect(renderer.removeClass).toHaveBeenCalledWith(element, 'reveal-hidden');
    expect(renderer.addClass).toHaveBeenCalledWith(element, 'reveal-visible');
    expect(MockIntersectionObserver.lastInstance!.unobserved).toContain(element);
  });

  it('should not reveal the element when intersection is false', () => {
    const directive = new ScrollRevealDirective(mockEl, renderer);
    directive.ngOnInit();
    renderer.removeStyle.calls.reset();
    renderer.addClass.calls.reset();

    MockIntersectionObserver.lastInstance!.fire(false);

    expect(renderer.removeStyle).not.toHaveBeenCalled();
    expect(renderer.addClass).not.toHaveBeenCalled();
  });

  it('should disconnect the observer on destroy', () => {
    const directive = new ScrollRevealDirective(mockEl, renderer);
    directive.ngOnInit();
    directive.ngOnDestroy();
    expect(MockIntersectionObserver.lastInstance!.disconnected).toBeTrue();
  });

  it('should not throw on destroy when never initialised', () => {
    const directive = new ScrollRevealDirective(mockEl, renderer);
    expect(() => directive.ngOnDestroy()).not.toThrow();
  });
});