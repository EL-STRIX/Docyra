import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { format, isToday, parseISO } from 'date-fns';

@Component({
  selector: 'app-doctor-dashboard',
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
    <div class="dashboard-page">
      <!-- Welcome Header -->
      <div class="header-section">
        <div>
          <h1 class="page-title">Welcome back, {{ getDoctorWelcomeName() }}</h1>
          <p class="page-subtitle">Here is what is scheduled for your practice today, {{ todayFormatted }}.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/doctor/emergency" mat-stroked-button color="warn" class="emergency-btn">
            <mat-icon>event_busy</mat-icon>
            <span>Emergency Unavailability</span>
          </a>
          <a routerLink="/doctor/availability" mat-flat-button color="primary">
            <mat-icon>settings</mat-icon>
            <span>Edit Availability Rules</span>
          </a>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon-wrap primary">
            <mat-icon>today</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Today's Appointments</span>
            <span class="stat-value">{{ todayAppointments.length }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap accent">
            <mat-icon>pending_actions</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Pending Confirmation</span>
            <span class="stat-value">{{ pendingCount }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap success">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Completed Visits</span>
            <span class="stat-value">{{ completedCount }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap rating">
            <mat-icon>star</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Doctor Rating</span>
            <span class="stat-value">{{ doctorProfile?.rating ? (doctorProfile?.rating | number:'1.1-1') + ' / 5.0' : '5.0 / 5.0' }}</span>
          </div>
        </mat-card>
      </div>

      <!-- Main Content Split -->
      <div class="content-split">
        <!-- Today's Schedule Timeline -->
        <mat-card class="main-card">
          <div class="card-header-bar">
            <div>
              <h2 class="card-title">Today's Schedule & Consultations</h2>
              <p class="card-desc">Chronological schedule of patient visits</p>
            </div>
            <a routerLink="/doctor/schedule" class="view-all-link">View Full Calendar →</a>
          </div>

          <div *ngIf="loading" class="loading-wrap">
            <mat-spinner diameter="36"></mat-spinner>
          </div>

          <div *ngIf="!loading && todayAppointments.length === 0" class="empty-state">
            <mat-icon class="empty-icon">event_available</mat-icon>
            <h3>No appointments scheduled for today</h3>
            <p>Your calendar is free or all slots for today have not been booked.</p>
          </div>

          <div *ngIf="!loading && todayAppointments.length > 0" class="appointment-list">
            <div *ngFor="let apt of todayAppointments; trackBy: trackByAppointment" class="appointment-row">
              <div class="time-col">
                <span class="slot-time">{{ apt.slotStart | portalDate:'h:mm a' }}</span>
                <span class="slot-duration">{{ doctorProfile?.slotDurationMinutes || 30 }} mins</span>
              </div>

              <div class="patient-col">
                <div class="patient-name">
                  {{ getPatientName(apt) }}
                  <span *ngIf="apt.bookedFor?.type === 'dependent'" class="dependent-pill">Dependent</span>
                </div>
                <div class="patient-reason">
                  {{ apt.reasonForVisit || 'General Consultation' }}
                </div>
              </div>

              <div class="status-col">
                <app-status-badge [status]="apt.status"></app-status-badge>
              </div>

              <div class="actions-col">
                <a [routerLink]="['/doctor/appointments', apt._id]" mat-stroked-button color="primary" class="action-btn">
                  Manage
                </a>
                <button
                  *ngIf="apt.status === 'confirmed'"
                  mat-flat-button
                  color="primary"
                  (click)="markCompleted(apt._id)"
                  class="action-btn-sm"
                  title="Mark Completed"
                >
                  <mat-icon>done</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </mat-card>

        <!-- Quick Summary & Profile Widget -->
        <div class="side-widgets">
          <mat-card class="widget-card">
            <h3 class="widget-title">Practice Overview</h3>
            <div class="profile-summary">
              <div class="summary-item">
                <span class="lbl">Affiliated Clinic:</span>
                <span class="val">{{ getClinicName() }}</span>
              </div>
              <div class="summary-item">
                <span class="lbl">Consultation Fee:</span>
                <span class="val">₹{{ doctorProfile?.consultationFee || 500 }}</span>
              </div>
              <div class="summary-item">
                <span class="lbl">Slot Duration:</span>
                <span class="val">{{ doctorProfile?.slotDurationMinutes || 30 }} Minutes</span>
              </div>
              <div class="summary-item">
                <span class="lbl">Auto-Accept:</span>
                <span class="val font-semibold" [class.text-emerald-600]="doctorProfile?.autoAcceptAppointments">
                  {{ doctorProfile?.autoAcceptAppointments ? 'Enabled' : 'Manual Review' }}
                </span>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-neutral-200">
              <a routerLink="/doctor/profile" mat-stroked-button class="w-full">
                Edit Practice Settings
              </a>
            </div>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .emergency-btn {
      color: #D9534F !important;
      border-color: rgba(217, 83, 79, 0.4) !important;
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

    .main-card, .widget-card {
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
      margin: 0 0 2px;
    }

    .card-desc {
      font-size: 12px;
      color: #5C6B6B;
      margin: 0;
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

    .appointment-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .appointment-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-radius: 8px;
      border: 1px solid #E7E5E0;
      background: #FAFAF8;
      gap: 16px;
    }

    .time-col {
      display: flex;
      flex-direction: column;
      min-width: 80px;
    }

    .slot-time {
      font-size: 13px;
      font-weight: 800;
      color: #0F5C5C;
    }

    .slot-duration {
      font-size: 10px;
      color: #5C6B6B;
    }

    .patient-col {
      flex: 1;
    }

    .patient-name {
      font-size: 14px;
      font-weight: 700;
      color: #1A2E2E;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dependent-pill {
      font-size: 9px;
      font-weight: 700;
      background-color: #E6F2F1;
      color: #0F5C5C;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .patient-reason {
      font-size: 11px;
      color: #5C6B6B;
      margin-top: 2px;
    }

    .actions-col {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-btn {
      font-size: 12px !important;
      padding: 0 12px !important;
      height: 32px !important;
      line-height: 32px !important;
    }

    .action-btn-sm {
      min-width: 32px !important;
      width: 32px !important;
      height: 32px !important;
      padding: 0 !important;
    }

    .widget-title {
      font-size: 15px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 16px;
    }

    .profile-summary {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .summary-item .lbl {
      color: #5C6B6B;
    }

    .summary-item .val {
      font-weight: 700;
      color: #1A2E2E;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class DoctorDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  private notificationService = inject(NotificationService);

  currentUser$ = this.authService.currentUser$;
  doctorProfile: Doctor | null = null;
  appointments: Appointment[] = [];
  todayAppointments: Appointment[] = [];
  loading = true;
  todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');

  ngOnInit(): void {
    this.loadDoctorDashboard();
  }

  loadDoctorDashboard(): void {
    this.loading = true;
    this.doctorService.getMyDoctorProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.doctorProfile = res.data;
          this.loadAppointments(this.doctorProfile._id);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadAppointments(doctorId: string): void {
    this.appointmentService.getDoctorAppointments(doctorId).subscribe({
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

  getDoctorWelcomeName(): string {
    const user = this.authService.currentUser;
    let name = user?.name || (this.doctorProfile as any)?.name || 'Doctor';
    if (!/^dr\.?\s+/i.test(name)) {
      name = `Dr. ${name}`;
    }
    return name;
  }

  getPatientName(apt: Appointment): string {
    if (apt.bookedFor && apt.bookedFor.name) return apt.bookedFor.name;
    if (typeof apt.patientId === 'object' && apt.patientId && (apt.patientId as any).name) {
      return (apt.patientId as any).name;
    }
    return 'Patient';
  }

  get pendingCount(): number {
    return this.appointments.filter((apt) => apt.status === 'pending').length;
  }

  get completedCount(): number {
    return this.appointments.filter((apt) => apt.status === 'completed').length;
  }

  getClinicName(): string {
    if (this.doctorProfile?.clinicId && typeof this.doctorProfile.clinicId === 'object') {
      return (this.doctorProfile.clinicId as any).name || 'Affiliated Clinic';
    }
    return this.doctorProfile?.isIndependent ? 'Independent Practice' : 'Clinic Affiliated';
  }

  markCompleted(id: string): void {
    this.appointmentService.updateAppointmentStatus(id, 'completed', 'Completed during consultation').subscribe({
      next: () => {
        this.notificationService.success('Appointment marked as completed');
        if (this.doctorProfile) {
          this.loadAppointments(this.doctorProfile._id);
        }
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }
}
