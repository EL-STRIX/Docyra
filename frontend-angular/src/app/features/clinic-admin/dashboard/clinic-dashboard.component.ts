import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Clinic } from '../../../core/models/clinic.model';
import { Doctor } from '../../../core/models/doctor.model';
import { Appointment } from '../../../core/models/appointment.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { format, isToday, parseISO } from 'date-fns';

@Component({
  selector: 'app-clinic-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StatusBadgeComponent,
    DateFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="clinic-dashboard">
      <div class="header-section">
        <div>
          <h1 class="page-title">{{ clinicProfile?.name || 'Clinic Administration' }}</h1>
          <p class="page-subtitle">Clinic operations overview, physician roster, and appointment activity for {{ todayFormatted }}.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/clinic/doctors" mat-flat-button color="primary">
            <mat-icon>add</mat-icon>
            <span>Add / Manage Physicians</span>
          </a>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon-wrap primary">
            <mat-icon>medical_services</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Active Physicians</span>
            <span class="stat-value">{{ doctors.length }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap accent">
            <mat-icon>calendar_today</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Today's Visits</span>
            <span class="stat-value">{{ todayAppointments.length }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap success">
            <mat-icon>verified</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Appointments</span>
            <span class="stat-value">{{ appointments.length }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap rating">
            <mat-icon>star</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Clinic Rating</span>
            <span class="stat-value">{{ clinicProfile?.rating ? (clinicProfile?.rating | number:'1.1-1') + ' / 5.0' : '4.9 / 5.0' }}</span>
          </div>
        </mat-card>
      </div>

      <!-- Main Section: Today's Appointments & Doctor Roster -->
      <div class="content-split">
        <!-- Today's Activity Table -->
        <mat-card class="main-card">
          <div class="card-header-bar">
            <div>
              <h2 class="card-title">Today's Clinic Consultations</h2>
              <p class="card-desc">Scheduled patient visits across all doctors</p>
            </div>
            <a routerLink="/clinic/appointments" class="view-all-link">View All Appointments →</a>
          </div>

          <div *ngIf="loading" class="loading-wrap">
            <mat-spinner diameter="36"></mat-spinner>
          </div>

          <div *ngIf="!loading && todayAppointments.length === 0" class="empty-state">
            <mat-icon class="empty-icon">event_available</mat-icon>
            <h3>No visits scheduled for today</h3>
            <p>All clinic appointment slots for today are currently open.</p>
          </div>

          <div *ngIf="!loading && todayAppointments.length > 0" class="table-wrap">
            <table class="clinic-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let apt of todayAppointments">
                  <td class="font-bold text-teal-800">{{ apt.slotStart | portalDate:'h:mm a' }}</td>
                  <td>
                    <div class="font-bold text-neutral-900">{{ getPatientName(apt) }}</div>
                    <div class="text-xs text-neutral-500">{{ apt.reasonForVisit || 'Consultation' }}</div>
                  </td>
                  <td class="text-sm font-semibold text-neutral-800">
                    {{ getDoctorName(apt) }}
                  </td>
                  <td>
                    <app-status-badge [status]="apt.status"></app-status-badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card>

        <!-- Doctors Quick Roster Card -->
        <mat-card class="roster-card">
          <div class="card-header-bar">
            <h2 class="card-title">Physician Roster</h2>
            <a routerLink="/clinic/doctors" class="view-all-link">Manage →</a>
          </div>

          <div *ngIf="doctors.length === 0 && !loading" class="empty-roster">
            <p class="text-sm text-neutral-500">No doctors added to this clinic yet.</p>
          </div>

          <div *ngIf="doctors.length > 0" class="roster-list">
            <div *ngFor="let doc of doctors" class="roster-item">
              <div class="doc-avatar">Dr</div>
              <div class="doc-info">
                <span class="doc-name">{{ doc.title || 'Dr.' }} {{ doc.name || 'Practitioner' }}</span>
                <span class="doc-fee">Fee: ₹{{ doc.consultationFee }} • {{ doc.slotDurationMinutes }}m</span>
              </div>
              <app-status-badge [status]="doc.status"></app-status-badge>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .clinic-dashboard {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .header-section {
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

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .stat-card {
      padding: 16px 20px !important;
      border-radius: 12px !important;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 16px;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .stat-icon-wrap {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon-wrap.primary {
      background-color: #E6F2F1;
      color: #0F5C5C;
    }

    .stat-icon-wrap.accent {
      background-color: #FEF6EC;
      color: #B57416;
    }

    .stat-icon-wrap.success {
      background-color: #EBF7EE;
      color: #2E9E6B;
    }

    .stat-icon-wrap.rating {
      background-color: #FFFBEB;
      color: #F59E0B;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 11px;
      font-weight: 700;
      color: #5C6B6B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 800;
      color: #1A2E2E;
      margin-top: 2px;
    }

    .content-split {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    @media (max-width: 960px) {
      .content-split {
        grid-template-columns: 1fr;
      }
    }

    .main-card, .roster-card {
      padding: 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .card-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0;
    }

    .card-desc {
      font-size: 12px;
      color: #5C6B6B;
      margin: 2px 0 0;
    }

    .view-all-link {
      font-size: 12px;
      font-weight: 700;
      color: #0F5C5C;
      text-decoration: none;
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 40px;
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

    .table-wrap {
      overflow-x: auto;
    }

    .clinic-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .clinic-table th {
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
    }

    .clinic-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
    }

    .roster-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .roster-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 8px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
    }

    .doc-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0F5C5C;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
    }

    .doc-info {
      flex: 1;
      margin-left: 10px;
      display: flex;
      flex-direction: column;
    }

    .doc-name {
      font-size: 13px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .doc-fee {
      font-size: 11px;
      color: #5C6B6B;
    }
  `],
})
export class ClinicDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private clinicService = inject(ClinicService);
  private appointmentService = inject(AppointmentService);

  currentUser$ = this.authService.currentUser$;
  clinicProfile: Clinic | null = null;
  doctors: Doctor[] = [];
  appointments: Appointment[] = [];
  loading = true;
  todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');

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
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get todayAppointments(): Appointment[] {
    return this.appointments.filter((apt) => {
      try {
        return isToday(parseISO(apt.slotStart));
      } catch {
        return false;
      }
    });
  }

  getPatientName(apt: Appointment): string {
    if (apt.bookedFor && apt.bookedFor.name) return apt.bookedFor.name;
    if (typeof apt.patientId === 'object' && apt.patientId && (apt.patientId as any).name) {
      return (apt.patientId as any).name;
    }
    return 'Patient';
  }

  getDoctorName(apt: Appointment): string {
    if (apt.doctorId && typeof apt.doctorId === 'object') {
      return (apt.doctorId as any).name || 'Physician';
    }
    return 'Physician';
  }
}
