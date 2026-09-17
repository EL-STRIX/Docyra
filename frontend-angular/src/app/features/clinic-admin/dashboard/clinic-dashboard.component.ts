import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClinicService } from '../../../core/services/clinic.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-clinic-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadgeComponent],
  template: `
    <div class="clinic-dashboard">
      <div class="welcome-banner">
        <div>
          <span class="badge-role">Clinic Administration</span>
          <h2>{{ clinicName }} Dashboard</h2>
          <p>Clinic operational command center for doctors and appointments</p>
        </div>
        <div class="actions">
          <a routerLink="/clinic-admin/doctors" class="btn-primary-action">
            + Add New Doctor
          </a>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="icon">👨‍⚕️</div>
          <div>
            <div class="val">{{ doctorsCount }}</div>
            <div class="lbl">Active Clinic Doctors</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="icon">📋</div>
          <div>
            <div class="val">{{ todayAppointments.length }}</div>
            <div class="lbl">Today's Total Bookings</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="icon">✅</div>
          <div>
            <div class="val">{{ completedCount }}</div>
            <div class="lbl">Completed Visits</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="icon">🏢</div>
          <div>
            <div class="val">100%</div>
            <div class="lbl">Clinic Verification</div>
          </div>
        </div>
      </div>

      <!-- Recent Clinic Appointments -->
      <div class="portal-card">
        <div class="section-title">
          <div>
            <h3>Clinic-wide Schedule & Consultations</h3>
            <p>Live feed of appointments across all affiliated practitioners</p>
          </div>
          <a routerLink="/clinic-admin/appointments" class="view-all-link">View All →</a>
        </div>

        <div *ngIf="loading" class="loading-state">Loading clinic data...</div>

        <table *ngIf="!loading && todayAppointments.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Patient</th>
              <th>Date & Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let apt of todayAppointments">
              <td class="font-bold">
                {{ apt.doctorSnapshot?.fullName || 'Assigned Doctor' }}
              </td>
              <td>
                {{ apt.dependentSnapshot?.fullName || apt.patientId?.firstName + ' ' + apt.patientId?.lastName }}
              </td>
              <td>{{ formatDateTime(apt.slotId?.slotStart) }}</td>
              <td>
                <app-status-badge [status]="apt.status"></app-status-badge>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!loading && todayAppointments.length === 0" class="empty-state">
          No appointments recorded today for this clinic.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .clinic-dashboard { display: flex; flex-direction: column; gap: 24px; }
    .welcome-banner { background: linear-gradient(135deg, #0F5C5C 0%, #0B4747 100%); color: #fff; border-radius: 20px; padding: 32px; display: flex; justify-content: space-between; align-items: center; }
    .badge-role { font-size: 11px; text-transform: uppercase; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 9999px; font-weight: 700; letter-spacing: 0.05em; }
    .welcome-banner h2 { margin: 10px 0 4px; font-size: 24px; font-weight: 800; }
    .welcome-banner p { margin: 0; font-size: 13px; color: rgba(255,255,255,0.85); }
    .btn-primary-action { background: var(--docyra-accent); color: white; padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(242,169,59,0.4); }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .stat-card { background: #fff; border: 1px solid var(--docyra-neutral-border); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; }
    .icon { font-size: 24px; width: 44px; height: 44px; border-radius: 12px; background: #E6F2F1; display: flex; align-items: center; justify-content: center; }
    .val { font-size: 22px; font-weight: 800; color: var(--docyra-text-primary); }
    .lbl { font-size: 12px; color: var(--docyra-text-secondary); font-weight: 600; }
    .section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .section-title h3 { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
    .section-title p { margin: 0; font-size: 12px; color: var(--docyra-text-secondary); }
    .view-all-link { font-size: 13px; font-weight: 700; color: var(--docyra-primary); text-decoration: none; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 12px 16px; border-bottom: 2px solid var(--docyra-neutral-border); font-size: 11px; text-transform: uppercase; color: var(--docyra-text-secondary); font-weight: 700; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .font-bold { font-weight: 700; }
    .loading-state, .empty-state { text-align: center; padding: 40px; color: #64748B; font-size: 13px; }
  `]
})
export class ClinicDashboardComponent implements OnInit {
  clinicName = 'Partner Clinic';
  doctorsCount = 0;
  todayAppointments: any[] = [];
  completedCount = 0;
  loading = true;

  constructor(private clinicService: ClinicService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.clinicService.getClinicDoctors().subscribe({
      next: (res) => {
        this.doctorsCount = (res.data?.doctors || []).length;
      }
    });

    this.clinicService.getClinicAppointments().subscribe({
      next: (res) => {
        this.loading = false;
        const apts = res.data?.appointments || [];
        this.todayAppointments = apts;
        this.completedCount = apts.filter((a: any) => a.status === 'completed').length;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  formatDateTime(iso?: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
  }
}
