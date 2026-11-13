import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { AnalyticsSummary } from '../../../core/models/analytics.model';
import { Clinic } from '../../../core/models/clinic.model';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-analytics-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="analytics-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Platform Analytics & Intelligence</h1>
          <p class="page-subtitle">Healthcare utilization, booking conversion, and partner clinic performance metrics.</p>
        </div>
      </div>

      <!-- High-Level Metric Tiles -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon-wrap primary">
            <mat-icon>event_available</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Appointments</span>
            <span class="stat-value">{{ analytics?.totalAppointments || 0 }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap success">
            <mat-icon>task_alt</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Completed Consultations</span>
            <span class="stat-value">{{ analytics?.completedAppointments || 0 }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap warn">
            <mat-icon>event_busy</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Cancellations</span>
            <span class="stat-value">{{ analytics?.cancelledAppointments || 0 }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap revenue">
            <mat-icon>payments</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Consultation Volume</span>
            <span class="stat-value">₹{{ (analytics?.revenueEstimated || (analytics?.totalAppointments || 0) * 500) | number }}</span>
          </div>
        </mat-card>
      </div>

      <!-- Breakdown Split -->
      <div class="content-split">
        <!-- Clinic Performance Breakdown -->
        <mat-card class="main-card">
          <h2 class="card-title">Partner Clinic Performance Breakdown</h2>
          <p class="card-desc">Volume and rating distribution by clinic</p>

          <div *ngIf="loading" class="loading-wrap">
            <mat-spinner diameter="36"></mat-spinner>
          </div>

          <div *ngIf="!loading && clinics.length === 0" class="empty-state">
            <p>No clinic data recorded yet.</p>
          </div>

          <div *ngIf="!loading && clinics.length > 0" class="table-container mt-4">
            <table class="report-table">
              <thead>
                <tr>
                  <th>Clinic Facility</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Patient Rating</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of clinics">
                  <td>
                    <div class="font-bold text-neutral-900 text-sm">{{ c.name }}</div>
                  </td>
                  <td class="text-sm text-neutral-700">{{ getClinicCity(c) }}</td>
                  <td>
                    <span class="status-chip" [class.active]="isClinicActive(c)">
                      {{ isClinicActive(c) ? 'Active' : 'Suspended' }}
                    </span>
                  </td>
                  <td class="text-sm font-bold text-amber-600">
                    ⭐ {{ c.rating ? (c.rating | number:'1.1-1') : '5.0' }} ({{ c.reviewCount || 0 }})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card>

        <!-- Status Breakdown Widget -->
        <mat-card class="side-card">
          <h2 class="card-title">Booking Status Distribution</h2>
          <p class="card-desc">Overall appointment outcomes</p>

          <div class="distribution-list mt-4">
            <div class="dist-row">
              <span class="dist-lbl">Completed</span>
              <span class="dist-val text-emerald-600 font-bold">{{ analytics?.completedAppointments || 0 }}</span>
            </div>
            <div class="dist-row">
              <span class="dist-lbl">Cancelled</span>
              <span class="dist-val text-rose-600 font-bold">{{ analytics?.cancelledAppointments || 0 }}</span>
            </div>
            <div class="dist-row">
              <span class="dist-lbl">Active Clinics</span>
              <span class="dist-val text-teal-800 font-bold">{{ getActiveClinicsCount() }}</span>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .analytics-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
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

    .stat-icon-wrap.success {
      background-color: #EBF7EE;
      color: #2E9E6B;
    }

    .stat-icon-wrap.warn {
      background-color: #FDF2F2;
      color: #D9534F;
    }

    .stat-icon-wrap.revenue {
      background-color: #FEF6EC;
      color: #B57416;
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

    .main-card, .side-card {
      padding: 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
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

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .empty-state {
      text-align: center;
      padding: 32px;
      color: #5C6B6B;
    }

    .table-container {
      overflow-x: auto;
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .report-table th {
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .report-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
    }

    .status-chip {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      background: #FDF2F2;
      color: #D9534F;
    }

    .status-chip.active {
      background: #EBF7EE;
      color: #2E9E6B;
    }

    .distribution-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .dist-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 8px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      font-size: 13px;
    }

    .dist-lbl {
      color: #5C6B6B;
    }
  `],
})
export class AnalyticsReportsComponent implements OnInit {
  private adminService = inject(AdminService);

  analytics: AnalyticsSummary | null = null;
  clinics: Clinic[] = [];
  loading = true;

  ngOnInit(): void {
    this.loadAnalytics();
  }

  isClinicActive(c: any): boolean {
    if (typeof c?.isActive === 'boolean') return c.isActive;
    return c?.subscriptionStatus === 'active' || c?.status === 'active';
  }

  getClinicCity(c: any): string {
    if (c?.city) return c.city;
    if (typeof c?.address === 'object' && c?.address?.city) return c.address.city;
    if (typeof c?.address === 'string' && c?.address) return c.address;
    return 'India';
  }

  getActiveClinicsCount(): number {
    return this.clinics.filter((c) => this.isClinicActive(c)).length;
  }

  loadAnalytics(): void {
    this.loading = true;
    this.adminService.getAnalytics().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.analytics = res.data;
        }
      },
    });

    this.adminService.getClinics().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.clinics = res.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
