import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Clinic } from '../../../core/models/clinic.model';
import { Doctor } from '../../../core/models/doctor.model';
import { Appointment } from '../../../core/models/appointment.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-clinic-appointments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    DateFormatPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="clinic-appointments-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Clinic Master Appointments</h1>
          <p class="page-subtitle">Unified register of all consultations across all doctors at {{ clinicProfile?.name || 'the clinic' }}.</p>
        </div>
      </div>

      <!-- Filter Controls -->
      <mat-card class="filter-card">
        <div class="filter-grid">
          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Search patient name...</mat-label>
              <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" />
              <mat-icon matPrefix class="mr-2 text-neutral-400">search</mat-icon>
            </mat-form-field>
          </div>

          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Filter by Physician</mat-label>
              <mat-select [(ngModel)]="selectedDoctorId" (selectionChange)="applyFilters()">
                <mat-option value="all">All Physicians</mat-option>
                <mat-option *ngFor="let doc of doctors" [value]="doc._id">
                  {{ doc.title || 'Dr.' }} {{ doc.name || 'Doctor' }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilters()">
                <mat-option value="all">All Statuses</mat-option>
                <mat-option value="confirmed">Confirmed</mat-option>
                <mat-option value="completed">Completed</mat-option>
                <mat-option value="pending">Pending</mat-option>
                <mat-option value="cancelled">Cancelled</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </mat-card>

      <!-- Appointments List Table -->
      <mat-card class="table-card">
        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
        </div>

        <div *ngIf="!loading && filteredAppointments.length === 0" class="empty-state">
          <mat-icon class="empty-icon">event_note</mat-icon>
          <h3>No appointments match your filter criteria</h3>
          <p>Try selecting a different doctor or clearing search parameters.</p>
        </div>

        <div *ngIf="!loading && filteredAppointments.length > 0" class="table-container">
          <table class="clinic-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Patient</th>
                <th>Assigned Physician</th>
                <th>Reason</th>
                <th>Consultation Fee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let apt of filteredAppointments">
                <td>
                  <div class="font-bold text-sm text-neutral-800">
                    {{ apt.slotStart | portalDate:'dd MMM yyyy' }}
                  </div>
                  <div class="text-xs font-semibold text-teal-700">
                    {{ apt.slotStart | portalDate:'h:mm a' }}
                  </div>
                </td>

                <td>
                  <div class="font-bold text-neutral-900 text-sm">
                    {{ apt.bookedFor.name || 'Patient' }}
                    <span *ngIf="apt.bookedFor.type === 'dependent'" class="dependent-pill">
                      {{ apt.bookedFor.relationship || 'Dependent' }}
                    </span>
                  </div>
                </td>

                <td class="text-sm font-semibold text-neutral-800">
                  {{ getDoctorName(apt) }}
                </td>

                <td class="text-sm text-neutral-600">
                  {{ apt.reasonForVisit || 'General Visit' }}
                </td>

                <td>
                  <div class="font-bold text-sm text-neutral-800">₹{{ apt.consultationFee }}</div>
                  <div class="text-xs capitalize" [class.text-emerald-600]="apt.paymentStatus === 'completed'">
                    {{ apt.paymentStatus }}
                  </div>
                </td>

                <td>
                  <app-status-badge [status]="apt.status"></app-status-badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .clinic-appointments-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
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

    .filter-card, .table-card {
      padding: 20px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .filter-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .filter-grid {
        grid-template-columns: 1fr;
      }
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #A0C6C6;
      margin-bottom: 12px;
    }

    .table-container {
      overflow-x: auto;
    }

    .clinic-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .clinic-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .clinic-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
    }

    .dependent-pill {
      font-size: 9px;
      font-weight: 700;
      background-color: #FEF6EC;
      color: #B57416;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 4px;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class ClinicAppointmentsComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private appointmentService = inject(AppointmentService);

  clinicProfile: Clinic | null = null;
  doctors: Doctor[] = [];
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  loading = true;

  searchTerm = '';
  selectedDoctorId = 'all';
  statusFilter = 'all';

  ngOnInit(): void {
    this.loadClinicData();
  }

  loadClinicData(): void {
    this.loading = true;
    this.clinicService.getMyClinicProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.clinicProfile = res.data;
          this.loadDoctors(res.data._id);
          this.loadAppointments(res.data._id);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadDoctors(clinicId: string): void {
    this.clinicService.getClinicDoctors(clinicId).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.doctors = res.data;
        }
      },
    });
  }

  loadAppointments(clinicId: string): void {
    this.appointmentService.getClinicAppointments(clinicId).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.appointments = res.data;
          this.applyFilters();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    let result = [...this.appointments];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.bookedFor?.name?.toLowerCase().includes(term) ||
          a.reasonForVisit?.toLowerCase().includes(term)
      );
    }

    if (this.selectedDoctorId !== 'all') {
      result = result.filter((a) => {
        if (typeof a.doctorId === 'object') {
          return (a.doctorId as any)._id === this.selectedDoctorId;
        }
        return a.doctorId === this.selectedDoctorId;
      });
    }

    if (this.statusFilter !== 'all') {
      result = result.filter((a) => a.status === this.statusFilter);
    }

    this.filteredAppointments = result;
  }

  getDoctorName(apt: Appointment): string {
    if (apt.doctorId && typeof apt.doctorId === 'object') {
      const d = apt.doctorId as any;
      return `${d.title || 'Dr.'} ${d.name || 'Practitioner'}`;
    }
    return 'Physician';
  }
}
