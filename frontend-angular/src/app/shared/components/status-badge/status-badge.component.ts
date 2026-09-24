import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase"
      [ngClass]="getBadgeClass()"
    >
      <span class="w-1.5 h-1.5 rounded-full" [ngClass]="getDotClass()"></span>
      {{ getDisplayLabel() }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    .badge-success {
      background-color: #EBF7EE;
      color: #2E9E6B;
      border: 1px solid #C3ECD0;
    }
    .badge-primary {
      background-color: #E6F2F1;
      color: #0F5C5C;
      border: 1px solid #BCE0DE;
    }
    .badge-warning {
      background-color: #FEF6EC;
      color: #B57416;
      border: 1px solid #FCDFB5;
    }
    .badge-error {
      background-color: #FDF2F2;
      color: #D9534F;
      border: 1px solid #F8CECE;
    }
    .badge-neutral {
      background-color: #F1F3F5;
      color: #6C757D;
      border: 1px solid #E9ECEF;
    }
  `],
})
export class StatusBadgeComponent {
  @Input() status: string = '';
  @Input() label?: string;

  getDisplayLabel(): string {
    if (this.label) return this.label;
    if (!this.status) return '-';
    return this.status.replace(/_/g, ' ');
  }

  getBadgeClass(): string {
    const s = this.status?.toLowerCase() || '';
    switch (s) {
      case 'confirmed':
      case 'active':
      case 'approved':
        return 'badge-success';
      case 'completed':
        return 'badge-primary';
      case 'pending':
        return 'badge-warning';
      case 'cancelled':
      case 'rejected':
      case 'suspended':
      case 'no_show':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  }

  getDotClass(): string {
    const s = this.status?.toLowerCase() || '';
    switch (s) {
      case 'confirmed':
      case 'active':
      case 'approved':
        return 'bg-emerald-500';
      case 'completed':
        return 'bg-teal-600';
      case 'pending':
        return 'bg-amber-500';
      case 'cancelled':
      case 'rejected':
      case 'suspended':
      case 'no_show':
        return 'bg-rose-500';
      default:
        return 'bg-gray-400';
    }
  }
}
