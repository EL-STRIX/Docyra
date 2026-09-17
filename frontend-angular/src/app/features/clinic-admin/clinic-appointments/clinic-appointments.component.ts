import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-clinic-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
    <div class="clinic-appointments-page">
      <div class="page-header">
        <div>
          <h2>Clinic Appointments Master Log</h2>
          <p>Complete record of consultations across all clinic doctors</p>
        </div>

        <div class="filters">
          <select [(ngModel)]="selectedStatus" (change)="filterAppointments()" class="filter-select">
            <option value="all">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div class="portal-card">
        <div *ngIf="loading" class="loading-state">Loading appointments...</div>

        <div *ngIf="!loading && filteredAppointments.length === 0" class="empty-state">
          No appointments found matching the selected filter.
        </div>

        <table *ngIf="!loading && filteredAppointments.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Assigned Doctor</th>
              <th>Patient</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let apt of filteredAppointments">
              <td>
                <div class="font-bold">{{ formatDateTime(apt.slotId?.slotStart) }}</div>
              </td>
              <td>
                Dr. {{ apt.doctorSnapshot?.fullName || 'Assigned' }}
              </td>
              <td>
                <div class="font-bold">{{ apt.dependentSnapshot?.fullName || apt.patientId?.firstName + ' ' + apt.patientId?.lastName }}</div>
                <div class="sub-text">{{ apt.patientId?.email }}</div>
              </td>
              <td>{{ apt.reason || 'General Consultation' }}</td>
              <td>
                <app-status-badge [status]="apt.status"></app-status-badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .clinic-appointments-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .filter-select { padding: 10px 16px; border-radius: 10px; border: 1px solid var(--docyra-neutral-border); font-size: 13px; outline: none; background: #fff; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 12px 16px; border-bottom: 2px solid var(--docyra-neutral-border); font-size: 11px; text-transform: uppercase; color: var(--docyra-text-secondary); font-weight: 700; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .font-bold { font-weight: 700; }
    .sub-text { font-size: 11px; color: #64748B; }
    .loading-state, .empty-state { text-align: center; padding: 40px; color: #64748B; font-size: 13px; }
  `]
})
export class ClinicAppointmentsComponent implements OnInit {
  appointments: any[] = [];
  filteredAppointments: any[] = [];
  selectedStatus = 'all';
  loading = true;

  constructor(private clinicService: ClinicService) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading = true;
    this.clinicService.getClinicAppointments().subscribe({
      next: (res) => {
        this.loading = false;
        this.appointments = res.data?.appointments || [];
        this.filterAppointments();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filterAppointments(): void {
    if (this.selectedStatus === 'all') {
      this.filteredAppointments = this.appointments;
    } else if (this.selectedStatus === 'cancelled') {
      this.filteredAppointments = this.appointments.filter((a) => a.status.startsWith('cancelled') || a.status === 'rejected');
    } else {
      this.filteredAppointments = this.appointments.filter((a) => a.status === this.selectedStatus);
    }
  }

  formatDateTime(iso?: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
