import { Directive, ElementRef, OnInit, Renderer2, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  private observer: IntersectionObserver | undefined;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    // 1. Force initial state (Just Opacity now)
    this.renderer.setStyle(this.el.nativeElement, 'opacity', '0');
    // REMOVED: this.renderer.setStyle(this.el.nativeElement, 'transform', 'translateY(30px)');

    this.renderer.addClass(this.el.nativeElement, 'reveal-hidden');

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // 2. Remove inline opacity so CSS takes over
          this.renderer.removeStyle(this.el.nativeElement, 'opacity');
          // REMOVED: this.renderer.removeStyle(this.el.nativeElement, 'transform');

          // 3. Swap Classes
          this.renderer.removeClass(this.el.nativeElement, 'reveal-hidden');
          this.renderer.addClass(this.el.nativeElement, 'reveal-visible');

          this.observer?.unobserve(this.el.nativeElement);
        }
      });
    }, options);

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy() {
    if (this.observer) this.observer.disconnect();
  }
}
