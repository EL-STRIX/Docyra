import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="getBadgeClass()">
      {{ getDisplayLabel() }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-confirmed { background: #E8F7F0; color: #1E7E53; }
    .badge-booked { background: #E6F2F1; color: #0F5C5C; }
    .badge-pending { background: #FEF6E9; color: #C07B12; }
    .badge-completed { background: #EBF3FF; color: #2B6CB0; }
    .badge-cancelled { background: #FDF0EF; color: #C53030; }
    .badge-no-show { background: #EDF2F7; color: #4A5568; }
  `]
})
export class StatusBadgeComponent {
  @Input() status: string = '';

  getBadgeClass(): string {
    switch (this.status) {
      case 'confirmed': return 'badge-confirmed';
      case 'booked': return 'badge-booked';
      case 'completed': return 'badge-completed';
      case 'cancelled_by_patient':
      case 'cancelled_by_doctor':
      case 'cancelled_by_admin':
      case 'cancelled_emergency':
      case 'rejected':
        return 'badge-cancelled';
      case 'no_show': return 'badge-no-show';
      default: return 'badge-pending';
    }
  }

  getDisplayLabel(): string {
    if (!this.status) return 'Unknown';
    if (this.status.startsWith('cancelled_')) {
      return this.status.replace('cancelled_', 'Cancelled (').concat(')');
    }
    return this.status.replace('_', ' ');
  }
}
