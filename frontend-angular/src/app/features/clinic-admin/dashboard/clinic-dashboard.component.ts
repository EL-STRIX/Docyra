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
          <a routerLink="/clinic/doctors" mat-flat-button color="primary" class="header-action-btn">
            <mat-icon>person_add</mat-icon>
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
            <span class="stat-value">{{ getActiveDoctorsCount() }}</span>
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
            <div class="empty-icon-wrap">
              <mat-icon>event_available</mat-icon>
            </div>
            <h3>No visits scheduled for today</h3>
            <p>All appointment slots for today are currently open. You can view all upcoming patient consultations in the unified register.</p>
            <a routerLink="/clinic/appointments" mat-stroked-button color="primary" class="mt-3">
              <span>Open Master Appointments</span>
            </a>
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
                <tr *ngFor="let apt of todayAppointments; trackBy: trackByAppointment">
                  <td class="font-bold text-teal-800">{{ apt.slotStart | portalDate:'h:mm a' }}</td>
                  <td>
                    <div class="font-bold text-neutral-900">{{ getPatientName(apt) }}</div>
                    <div class="text-xs text-neutral-500">{{ apt.reasonForVisit || 'General Consultation' }}</div>
                  </td>
                  <td>
                    <div class="font-semibold text-sm text-neutral-900">{{ getDoctorName(apt) }}</div>
                    <div *ngIf="getDoctorSpecialization(apt)" class="text-xs text-teal-700 font-medium">
                      {{ getDoctorSpecialization(apt) }}
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

        <!-- Doctors Quick Roster Card -->
        <mat-card class="roster-card">
          <div class="card-header-bar">
            <div>
              <h2 class="card-title">Physician Roster</h2>
              <p class="card-desc">{{ doctors.length }} doctors affiliated</p>
            </div>
            <a routerLink="/clinic/doctors" class="view-all-link">Manage →</a>
          </div>

          <div *ngIf="doctors.length === 0 && !loading" class="empty-roster">
            <mat-icon class="text-neutral-400">group_off</mat-icon>
            <p class="text-sm text-neutral-500 mt-1">No doctors added to this clinic yet.</p>
            <a routerLink="/clinic/doctors" mat-button color="primary" class="mt-2">Onboard Physician</a>
          </div>

          <div *ngIf="doctors.length > 0" class="roster-list">
            <div *ngFor="let doc of doctors; trackBy: trackByDoctor" class="roster-item">
              <div class="doc-avatar">
                {{ getDoctorInitials(doc) }}
              </div>
              <div class="doc-info">
                <span class="doc-name">{{ getDoctorDisplayName(doc) }}</span>
                <span class="doc-spec">{{ getDoctorDesignation(doc) }}</span>
                <span class="doc-fee">Fee: ₹{{ doc.consultationFee || 500 }} • {{ doc.slotDurationMinutes || 30 }}m slot</span>
              </div>
              <app-status-badge [status]="getDoctorStatus(doc)"></app-status-badge>
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

    .header-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .stat-card {
      padding: 18px 20px !important;
      border-radius: 12px !important;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 16px;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .stat-icon-wrap {
      width: 48px;
      height: 48px;
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
      font-size: 22px;
      font-weight: 800;
      color: #1A2E2E;
      margin-top: 2px;
    }

    .content-split {
      display: grid;
      grid-template-columns: 2fr 1.2fr;
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
      font-weight: 800;
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

    .view-all-link:hover {
      text-decoration: underline;
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .empty-state {
      text-align: center;
      padding: 40px 24px;
    }

    .empty-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #E6F4F1;
      color: #0F5C5C;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }

    .empty-icon-wrap mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .empty-state h3 {
      font-size: 15px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 6px;
    }

    .empty-state p {
      font-size: 12px;
      color: #5C6B6B;
      margin: 0;
      max-width: 440px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.5;
    }

    .mt-3 {
      margin-top: 14px;
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
      background: #FAFAF8;
    }

    .clinic-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
      vertical-align: middle;
    }

    .empty-roster {
      text-align: center;
      padding: 30px;
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
      padding: 12px 14px;
      border-radius: 10px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      transition: all 0.15s ease;
    }

    .roster-item:hover {
      background: #F4FAF9;
      border-color: #C6E4DF;
    }

    .doc-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #0F5C5C;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
      flex-shrink: 0;
    }

    .doc-info {
      flex: 1;
      margin-left: 12px;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .doc-name {
      font-size: 13px;
      font-weight: 700;
      color: #1A2E2E;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .doc-spec {
      font-size: 11px;
      font-weight: 600;
      color: #0F5C5C;
      margin-top: 1px;
    }

    .doc-fee {
      font-size: 11px;
      color: #5C6B6B;
      margin-top: 1px;
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
  todayAppointments: Appointment[] = [];
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
    this.appointmentService.getClinicAppointments(clinicId, { limit: 50 }).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.appointments = res.data;
          this.todayAppointments = this.appointments.filter((apt) => {
            try {
              return isToday(parseISO(apt.slotStart));
            } catch {
              return false;
            }
          });
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  trackByAppointment(index: number, apt: Appointment): string {
    return apt._id;
  }

  trackByDoctor(index: number, doc: Doctor): string {
    return doc._id;
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
      const d = apt.doctorId as any;
      let name = '';
      if (d.userId && typeof d.userId === 'object' && d.userId.name) {
        name = d.userId.name;
      } else if (d.name) {
        name = d.name;
      }
      if (name) {
        return /^dr\.?\s+/i.test(name) ? name : `Dr. ${name}`;
      }
    }
    return 'Physician';
  }

  getDoctorSpecialization(apt: Appointment): string {
    if (apt.doctorId && typeof apt.doctorId === 'object') {
      const d = apt.doctorId as any;
      return d.specializationId?.name || '';
    }
    return '';
  }

  getDoctorDisplayName(doc: any): string {
    if (!doc) return 'Physician';
    let name = '';
    if (doc.userId && typeof doc.userId === 'object' && doc.userId.name) {
      name = doc.userId.name;
    } else if (doc.name) {
      name = doc.name;
    } else {
      name = 'Physician';
    }

    if (!/^dr\.?\s+/i.test(name)) {
      name = `Dr. ${name}`;
    }
    return name;
  }

  getDoctorDesignation(doc: any): string {
    if (doc.specializationId && typeof doc.specializationId === 'object' && doc.specializationId.name) {
      return doc.specializationId.name;
    }
    if (typeof doc.specializationId === 'string' && doc.specializationId) {
      return doc.specializationId;
    }
    return 'General Physician';
  }

  getDoctorInitials(doc: any): string {
    const name = this.getDoctorDisplayName(doc).replace(/^dr\.?\s+/i, '');
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'DR';
  }

  getDoctorStatus(doc: any): string {
    if (doc.status) return doc.status;
    if (doc.userId && typeof doc.userId === 'object' && doc.userId.status) {
      return doc.userId.status;
    }
    return doc.isApproved ? 'active' : 'pending';
  }

  getActiveDoctorsCount(): number {
    return this.doctors.filter((d) => this.getDoctorStatus(d) === 'active').length;
  }
}
