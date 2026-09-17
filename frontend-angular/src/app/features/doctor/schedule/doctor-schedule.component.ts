import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-doctor-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StatusBadgeComponent],
  template: `
    <div class="schedule-page">
      <div class="page-header">
        <div>
          <h2>Doctor Consultation Calendar</h2>
          <p>Full chronological view of all booked, confirmed, and completed patient visits</p>
        </div>

        <div class="filters">
          <select [(ngModel)]="statusFilter" (change)="filterSchedule()" class="filter-select">
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div class="portal-card">
        <div *ngIf="loading" class="loading-state">Loading schedule...</div>

        <div *ngIf="!loading && filteredAppointments.length === 0" class="empty-state">
          No appointments found matching the selected filter.
        </div>

        <table *ngIf="!loading && filteredAppointments.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Patient</th>
              <th>Clinic</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let apt of filteredAppointments">
              <td>
                <div class="font-bold">{{ formatDate(apt.slotId?.slotStart) }}</div>
                <div class="sub-text">{{ formatTime(apt.slotId?.slotStart) }}</div>
              </td>
              <td>
                <div class="font-bold">{{ apt.dependentSnapshot?.fullName || apt.patientId?.firstName + ' ' + apt.patientId?.lastName }}</div>
                <div class="sub-text">{{ apt.patientId?.email }}</div>
              </td>
              <td>{{ apt.clinicSnapshot?.name || 'Partner Clinic' }}</td>
              <td>{{ apt.reason || 'General Checkup' }}</td>
              <td>
                <app-status-badge [status]="apt.status"></app-status-badge>
              </td>
              <td>
                <div class="action-buttons">
                  <button *ngIf="apt.status === 'booked'" (click)="updateStatus(apt._id, 'confirmed')" class="btn-action btn-confirm">
                    Accept
                  </button>
                  <button *ngIf="apt.status === 'confirmed' || apt.status === 'booked'" (click)="updateStatus(apt._id, 'completed')" class="btn-action btn-complete">
                    Complete
                  </button>
                  <a [routerLink]="['/doctor/appointments', apt._id]" class="btn-action btn-details">
                    Details
                  </a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .schedule-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .filter-select { padding: 10px 16px; border-radius: 10px; border: 1px solid var(--docyra-neutral-border); font-size: 13px; font-weight: 600; outline: none; background: #fff; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 14px 16px; border-bottom: 2px solid var(--docyra-neutral-border); font-size: 11px; text-transform: uppercase; color: var(--docyra-text-secondary); font-weight: 700; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .font-bold { font-weight: 700; }
    .sub-text { font-size: 11px; color: #64748B; }
    .action-buttons { display: flex; gap: 6px; }
    .btn-action { padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; text-decoration: none; }
    .btn-confirm { background: #E6F2F1; color: var(--docyra-primary); }
    .btn-complete { background: #E8F7F0; color: #1E7E53; }
    .btn-details { background: #F1F5F9; color: #475569; }
    .empty-state { text-align: center; padding: 40px; color: #64748B; font-size: 13px; }
    .loading-state { text-align: center; padding: 40px; color: #64748B; }
  `]
})
export class DoctorScheduleComponent implements OnInit {
  appointments: any[] = [];
  filteredAppointments: any[] = [];
  statusFilter = 'all';
  loading = true;

  constructor(private doctorService: DoctorService) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading = true;
    this.doctorService.getSchedule().subscribe({
      next: (res) => {
        this.loading = false;
        this.appointments = res.data?.appointments || [];
        this.filterSchedule();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filterSchedule(): void {
    if (this.statusFilter === 'all') {
      this.filteredAppointments = this.appointments;
    } else if (this.statusFilter === 'cancelled') {
      this.filteredAppointments = this.appointments.filter((a) => a.status.startsWith('cancelled') || a.status === 'rejected');
    } else {
      this.filteredAppointments = this.appointments.filter((a) => a.status === this.statusFilter);
    }
  }

  updateStatus(id: string, status: string): void {
    this.doctorService.updateAppointmentStatus(id, status).subscribe({
      next: () => this.loadAppointments()
    });
  }

  formatDate(iso?: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(iso?: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}
