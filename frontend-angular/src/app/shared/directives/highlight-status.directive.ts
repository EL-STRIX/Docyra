import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appHighlightStatus]',
  standalone: true,
})
export class HighlightStatusDirective implements OnChanges {
  @Input('appHighlightStatus') status: string = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges(): void {
    const s = this.status?.toLowerCase() || '';

    // Clear previous classes
    this.renderer.removeClass(this.el.nativeElement, 'status-confirmed');
    this.renderer.removeClass(this.el.nativeElement, 'status-completed');
    this.renderer.removeClass(this.el.nativeElement, 'status-cancelled');
    this.renderer.removeClass(this.el.nativeElement, 'status-pending');

    switch (s) {
      case 'confirmed':
      case 'active':
      case 'approved':
        this.renderer.addClass(this.el.nativeElement, 'status-confirmed');
        break;
      case 'completed':
        this.renderer.addClass(this.el.nativeElement, 'status-completed');
        break;
      case 'cancelled':
      case 'rejected':
      case 'suspended':
      case 'no_show':
        this.renderer.addClass(this.el.nativeElement, 'status-cancelled');
        break;
      case 'pending':
        this.renderer.addClass(this.el.nativeElement, 'status-pending');
        break;
    }
  }
}
