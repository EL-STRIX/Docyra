import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Appointment } from '../../../core/models/appointment.model';
import { Doctor } from '../../../core/models/doctor.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { isToday, isTomorrow, isPast, parseISO } from 'date-fns';

@Component({
  selector: 'app-schedule-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StatusBadgeComponent,
    DateFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="schedule-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Schedule & Appointments</h1>
          <p class="page-subtitle">Manage upcoming patient visits, confirm bookings, and update visit records.</p>
        </div>
        <a routerLink="/doctor/emergency" mat-stroked-button color="warn">
          <mat-icon>event_busy</mat-icon>
          <span>Emergency Block Out</span>
        </a>
      </div>

      <!-- Filters Bar -->
      <mat-card class="filter-card">
        <div class="filter-controls">
          <div class="search-box">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Search patient name or visit reason...</mat-label>
              <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" />
              <mat-icon matPrefix class="mr-2 text-neutral-400">search</mat-icon>
            </mat-form-field>
          </div>

          <div class="filter-dropdown">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Time Period</mat-label>
              <mat-select [(ngModel)]="dateFilter" (selectionChange)="applyFilters()">
                <mat-option value="all">All Dates</mat-option>
                <mat-option value="today">Today</mat-option>
                <mat-option value="tomorrow">Tomorrow</mat-option>
                <mat-option value="upcoming">All Upcoming</mat-option>
                <mat-option value="past">Past Records</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="filter-dropdown">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilters()">
                <mat-option value="all">All Statuses</mat-option>
                <mat-option value="confirmed">Confirmed</mat-option>
                <mat-option value="pending">Pending</mat-option>
                <mat-option value="completed">Completed</mat-option>
                <mat-option value="cancelled">Cancelled</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </mat-card>

      <!-- Main Appointments List -->
      <mat-card class="list-card">
        <div *ngIf="loading" class="loading-box">
          <mat-spinner diameter="36"></mat-spinner>
        </div>

        <div *ngIf="!loading && filteredAppointments.length === 0" class="empty-state">
          <mat-icon class="empty-icon">event_note</mat-icon>
          <h3>No appointments match your filters</h3>
          <p>Try clearing your search terms or selecting a different date range.</p>
        </div>

        <div *ngIf="!loading && filteredAppointments.length > 0" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Patient Details</th>
                <th>Reason for Visit</th>
                <th>Fee & Payment</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let apt of filteredAppointments" class="table-row">
                <td class="time-cell">
                  <div class="font-bold text-sm text-neutral-800">
                    {{ apt.slotStart | portalDate:'dd MMM yyyy' }}
                  </div>
                  <div class="text-xs font-semibold text-teal-700">
                    {{ apt.slotStart | portalDate:'h:mm a' }} - {{ apt.slotEnd | portalDate:'h:mm a' }}
                  </div>
                </td>

                <td class="patient-cell">
                  <div class="patient-title">
                    <span class="font-bold text-neutral-900">{{ getPatientName(apt) }}</span>
                    <span *ngIf="apt.bookedFor?.type === 'dependent'" class="dependent-tag">
                      {{ apt.bookedFor?.relationship || 'Family' }}
                    </span>
                  </div>
                  <div class="text-xs text-neutral-500" *ngIf="apt.bookedFor?.dateOfBirth">
                    DOB: {{ apt.bookedFor?.dateOfBirth | portalDate:'dd MMM yyyy' }}
                  </div>
                </td>

                <td class="reason-cell">
                  <span class="text-sm text-neutral-700">{{ apt.reasonForVisit || 'General Consultation' }}</span>
                </td>

                <td class="fee-cell">
                  <div class="font-bold text-sm text-neutral-800">₹{{ apt.consultationFee }}</div>
                  <span class="text-xs capitalize font-semibold" [class.text-emerald-600]="apt.paymentStatus === 'completed'" [class.text-amber-600]="apt.paymentStatus === 'pending'">
                    {{ apt.paymentStatus }}
                  </span>
                </td>

                <td>
                  <app-status-badge [status]="apt.status"></app-status-badge>
                </td>

                <td class="text-right actions-cell">
                  <a [routerLink]="['/doctor/appointments', apt._id]" mat-stroked-button color="primary" class="btn-sm">
                    View Details
                  </a>
                  <button
                    *ngIf="apt.status === 'confirmed'"
                    mat-flat-button
                    color="primary"
                    (click)="markCompleted(apt._id)"
                    class="btn-icon"
                    title="Mark Completed"
                  >
                    <mat-icon>check</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .schedule-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .page-title {
      font-size: 22px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 4px;
    }

    .page-subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
    }

    .filter-card, .list-card {
      padding: 20px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .filter-controls {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .filter-controls {
        grid-template-columns: 1fr;
      }
    }

    .loading-box {
      display: flex;
      justify-content: center;
      padding: 60px;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #A0C6C6;
      margin-bottom: 12px;
    }

    .empty-state h3 {
      font-size: 15px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 4px;
    }

    .empty-state p {
      font-size: 12px;
      color: #5C6B6B;
      margin: 0;
    }

    .table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .data-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background-color: #FAFAF8;
    }

    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
    }

    .table-row:hover {
      background-color: #FAFAF8;
    }

    .patient-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .dependent-tag {
      font-size: 9px;
      font-weight: 700;
      background-color: #E6F2F1;
      color: #0F5C5C;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: capitalize;
    }

    .actions-cell {
      white-space: nowrap;
    }

    .btn-sm {
      font-size: 12px !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 12px !important;
    }

    .btn-icon {
      min-width: 32px !important;
      width: 32px !important;
      height: 32px !important;
      padding: 0 !important;
      margin-left: 6px;
    }

    .text-right {
      text-align: right;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class ScheduleCalendarComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  private notificationService = inject(NotificationService);

  doctorProfile: Doctor | null = null;
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  loading = true;

  searchTerm = '';
  dateFilter = 'all';
  statusFilter = 'all';

  ngOnInit(): void {
    this.loadDoctorAppointments();
  }

  loadDoctorAppointments(): void {
    this.loading = true;
    this.doctorService.getMyDoctorProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.doctorProfile = res.data;
          this.appointmentService.getDoctorAppointments(res.data._id).subscribe({
            next: (aptRes) => {
              if (aptRes.success && Array.isArray(aptRes.data)) {
                this.appointments = aptRes.data;
                this.applyFilters();
              }
              this.loading = false;
            },
            error: () => {
              this.loading = false;
            },
          });
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    let result = [...this.appointments];

    // Search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(
        (a) =>
          this.getPatientName(a).toLowerCase().includes(term) ||
          a.reasonForVisit?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      result = result.filter((a) => a.status === this.statusFilter);
    }

    // Date filter
    if (this.dateFilter === 'today') {
      result = result.filter((a) => {
        try {
          return isToday(parseISO(a.slotStart));
        } catch {
          return false;
        }
      });
    } else if (this.dateFilter === 'tomorrow') {
      result = result.filter((a) => {
        try {
          return isTomorrow(parseISO(a.slotStart));
        } catch {
          return false;
        }
      });
    } else if (this.dateFilter === 'upcoming') {
      result = result.filter((a) => {
        try {
          return !isPast(parseISO(a.slotStart)) || isToday(parseISO(a.slotStart));
        } catch {
          return false;
        }
      });
    } else if (this.dateFilter === 'past') {
      result = result.filter((a) => {
        try {
          return isPast(parseISO(a.slotStart)) && !isToday(parseISO(a.slotStart));
        } catch {
          return false;
        }
      });
    }

    this.filteredAppointments = result;
  }

  getPatientName(apt: Appointment): string {
    if (apt?.bookedFor?.name) return apt.bookedFor.name;
    if (typeof apt?.patientId === 'object' && apt?.patientId && (apt.patientId as any).name) {
      return (apt.patientId as any).name;
    }
    return 'Patient';
  }

  markCompleted(id: string): void {
    this.appointmentService.updateAppointmentStatus(id, 'completed', 'Completed during clinical visit').subscribe({
      next: () => {
        this.notificationService.success('Appointment completed');
        if (this.doctorProfile) {
          this.loadDoctorAppointments();
        }
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to complete appointment');
      },
    });
  }
}
