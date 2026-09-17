import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { AuthService } from '../../../core/services/auth.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadgeComponent],
  template: `
    <div class="dashboard-page">
      <!-- Header banner -->
      <div class="welcome-card">
        <div class="welcome-text">
          <span class="eyebrow">Doctor Command Center</span>
          <h2>Welcome, Dr. {{ user()?.firstName }} {{ user()?.lastName }}</h2>
          <p>Today is {{ todayStr }}. You have {{ todayAppointments.length }} clinical consultations scheduled.</p>
        </div>
        <div class="actions">
          <a routerLink="/doctor/emergency" class="btn-emergency">
            🚨 Emergency Unavailable
          </a>
        </div>
      </div>

      <!-- Quick stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon icon-teal">📅</div>
          <div>
            <div class="stat-val">{{ todayAppointments.length }}</div>
            <div class="stat-label">Today's Visits</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon icon-green">✅</div>
          <div>
            <div class="stat-val">{{ completedCount }}</div>
            <div class="stat-label">Completed</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon icon-amber">⏳</div>
          <div>
            <div class="stat-val">{{ pendingCount }}</div>
            <div class="stat-label">Upcoming / In-Queue</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon icon-blue">👥</div>
          <div>
            <div class="stat-val">{{ totalPatientsCount }}</div>
            <div class="stat-label">Total Appointments</div>
          </div>
        </div>
      </div>

      <!-- Today's Schedule Table -->
      <div class="schedule-section portal-card">
        <div class="section-header">
          <div>
            <h3>Today's Patient Consultations</h3>
            <p>Real-time slot status with immediate action triggers</p>
          </div>
          <button (click)="loadSchedule()" class="btn-refresh">↻ Refresh</button>
        </div>

        <div *ngIf="loading" class="loading-state">
          Loading clinical schedule...
        </div>

        <div *ngIf="!loading && todayAppointments.length === 0" class="empty-state">
          <div class="empty-icon">🩺</div>
          <h4>No appointments scheduled for today</h4>
          <p>You have no active patient bookings for today's clinical hours.</p>
        </div>

        <div *ngIf="!loading && todayAppointments.length > 0" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let apt of todayAppointments">
                <td class="time-cell font-bold">
                  {{ formatTime(apt.slotId?.slotStart) }}
                </td>
                <td>
                  <div class="patient-name font-bold">
                    {{ apt.dependentSnapshot?.fullName || apt.patientId?.firstName + ' ' + apt.patientId?.lastName }}
                  </div>
                  <div *ngIf="apt.dependentSnapshot?.fullName" class="sub-text">
                    (Dependent: {{ apt.dependentSnapshot.relationship }})
                  </div>
                </td>
                <td class="reason-cell">
                  {{ apt.reason || 'General Consultation' }}
                </td>
                <td>
                  <app-status-badge [status]="apt.status"></app-status-badge>
                </td>
                <td class="action-cell">
                  <ng-container *ngIf="apt.status === 'booked' || apt.status === 'confirmed'">
                    <button (click)="updateStatus(apt._id, 'completed')" class="btn-sm btn-complete">
                      ✓ Complete
                    </button>
                    <button (click)="updateStatus(apt._id, 'no_show')" class="btn-sm btn-noshow">
                      No Show
                    </button>
                  </ng-container>
                  <a [routerLink]="['/doctor/appointments', apt._id]" class="btn-sm btn-view">
                    View
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page { display: flex; flex-direction: column; gap: 24px; }
    .welcome-card { background: linear-gradient(135deg, #0F5C5C 0%, #0B4747 100%); color: #ffffff; border-radius: 20px; padding: 32px; display: flex; justify-content: space-between; align-items: center; }
    .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 9999px; font-weight: 700; }
    .welcome-text h2 { margin: 10px 0 6px; font-size: 26px; font-weight: 800; }
    .welcome-text p { margin: 0; font-size: 13px; color: rgba(255,255,255,0.85); }
    .btn-emergency { background: #EF4444; color: white; padding: 10px 18px; border-radius: 12px; font-size: 12px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
    .stat-card { background: #ffffff; border: 1px solid var(--docyra-neutral-border); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 16px rgba(15,92,92,0.04); }
    .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .icon-teal { background: #E6F2F1; }
    .icon-green { background: #E8F7F0; }
    .icon-amber { background: #FEF6E9; }
    .icon-blue { background: #EBF3FF; }
    .stat-val { font-size: 24px; font-weight: 800; color: var(--docyra-text-primary); }
    .stat-label { font-size: 12px; color: var(--docyra-text-secondary); font-weight: 600; }
    .schedule-section { padding: 28px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .section-header h3 { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
    .section-header p { margin: 0; font-size: 12px; color: var(--docyra-text-secondary); }
    .btn-refresh { background: #F1F5F9; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .table-container { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 12px 16px; border-bottom: 2px solid var(--docyra-neutral-border); font-size: 11px; text-transform: uppercase; color: var(--docyra-text-secondary); font-weight: 700; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .font-bold { font-weight: 700; }
    .sub-text { font-size: 11px; color: #64748B; }
    .reason-cell { max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .action-cell { display: flex; gap: 6px; }
    .btn-sm { padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; text-decoration: none; }
    .btn-complete { background: #E8F7F0; color: #1E7E53; }
    .btn-noshow { background: #F1F5F9; color: #475569; }
    .btn-view { background: #E6F2F1; color: var(--docyra-primary); }
    .empty-state { text-align: center; padding: 40px; }
    .empty-icon { font-size: 40px; margin-bottom: 10px; }
  `]
})
export class DoctorDashboardComponent implements OnInit {
  public user = this.authService.userSignal;
  todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  loading = true;
  todayAppointments: any[] = [];
  completedCount = 0;
  pendingCount = 0;
  totalPatientsCount = 0;

  constructor(private doctorService: DoctorService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadSchedule();
  }

  loadSchedule(): void {
    this.loading = true;
    this.doctorService.getSchedule().subscribe({
      next: (res) => {
        this.loading = false;
        const allApts = res.data?.appointments || [];
        this.todayAppointments = allApts;
        this.completedCount = allApts.filter((a: any) => a.status === 'completed').length;
        this.pendingCount = allApts.filter((a: any) => ['booked', 'confirmed'].includes(a.status)).length;
        this.totalPatientsCount = allApts.length;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  updateStatus(appointmentId: string, status: string): void {
    this.doctorService.updateAppointmentStatus(appointmentId, status).subscribe({
      next: () => {
        this.loadSchedule();
      }
    });
  }

  formatTime(iso?: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}
