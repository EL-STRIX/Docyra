import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AnalyticsSummary } from '../../../core/models/analytics.model';
import { Clinic } from '../../../core/models/clinic.model';
import { DoctorApplication } from '../../../core/models/doctor.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-admin-dashboard',
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
    <div class="admin-dashboard">
      <div class="header-section">
        <div>
          <h1 class="page-title">Platform Administration Overview</h1>
          <p class="page-subtitle">Docyra platform-wide clinical operations, clinic onboardings, and system metrics.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/clinics" mat-flat-button color="primary">
            <mat-icon>add_business</mat-icon>
            <span>Onboard Clinic</span>
          </a>
          <a routerLink="/admin/applications" mat-stroked-button color="primary">
            <mat-icon>verified</mat-icon>
            <span>Doctor Applications</span>
          </a>
        </div>
      </div>

      <!-- Key Platform Metrics -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon-wrap primary">
            <mat-icon>domain</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Onboarded Clinics</span>
            <span class="stat-value">{{ summary?.totalClinics || clinics.length }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap accent">
            <mat-icon>medical_services</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Registered Doctors</span>
            <span class="stat-value">{{ summary?.totalDoctors || 0 }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap success">
            <mat-icon>event_available</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Appointments</span>
            <span class="stat-value">{{ summary?.totalAppointments || 0 }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap warn">
            <mat-icon>pending_actions</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Pending Applications</span>
            <span class="stat-value">{{ pendingApplications.length }}</span>
          </div>
        </mat-card>
      </div>

      <!-- Split Layout: Recent Onboardings & Pending Doctor Applications -->
      <div class="content-split">
        <!-- Recent Clinics -->
        <mat-card class="main-card">
          <div class="card-header-bar">
            <div>
              <h2 class="card-title">Active Partner Clinics</h2>
              <p class="card-desc">Partner clinics onboarded on the Docyra platform</p>
            </div>
            <a routerLink="/admin/clinics" class="view-all-link">Manage All Clinics →</a>
          </div>

          <div *ngIf="loading" class="loading-wrap">
            <mat-spinner diameter="36"></mat-spinner>
          </div>

          <div *ngIf="!loading && clinics.length === 0" class="empty-state">
            <mat-icon class="empty-icon">domain_disabled</mat-icon>
            <p>No clinics onboarded yet.</p>
          </div>

          <div *ngIf="!loading && clinics.length > 0" class="clinics-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Clinic</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of clinics | slice:0:5">
                  <td>
                    <div class="font-bold text-neutral-900 text-sm">{{ c.name }}</div>
                    <div class="text-xs text-neutral-500">{{ c.contactPhone || c.contact?.phone || 'N/A' }}</div>
                  </td>
                  <td class="text-sm font-semibold text-neutral-700">{{ getClinicCity(c) }}</td>
                  <td>
                    <app-status-badge [status]="isClinicActive(c) ? 'active' : 'suspended'"></app-status-badge>
                  </td>
                  <td class="text-sm font-bold text-amber-600">
                    ⭐ {{ c.rating ? (c.rating | number:'1.1-1') : '5.0' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card>

        <!-- Pending Doctor Applications -->
        <mat-card class="side-card">
          <div class="card-header-bar">
            <div>
              <h2 class="card-title">Pending Doctor Applications</h2>
              <p class="card-desc">Independent physician licenses requiring review</p>
            </div>
            <a routerLink="/admin/applications" class="view-all-link">Review All →</a>
          </div>

          <div *ngIf="pendingApplications.length === 0 && !loading" class="empty-side">
            <mat-icon class="check-icon">verified</mat-icon>
            <p>All independent doctor applications have been reviewed.</p>
          </div>

          <div *ngIf="pendingApplications.length > 0" class="apps-list">
            <div *ngFor="let app of pendingApplications | slice:0:4" class="app-item">
              <div class="app-top">
                <span class="app-doc-name">{{ app.user?.name || 'Doctor Applicant' }}</span>
                <span class="app-date">{{ app.appliedAt | portalDate:'dd MMM' }}</span>
              </div>
              <div class="app-license">License: <code>{{ app.licenseNumber }}</code></div>
              <div class="app-actions">
                <a routerLink="/admin/applications" class="review-btn">Review License Document →</a>
              </div>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard {
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
      gap: 12px;
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

    .stat-icon-wrap.warn {
      background-color: #FDF2F2;
      color: #D9534F;
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

    .empty-state, .empty-side {
      text-align: center;
      padding: 36px 16px;
      color: #5C6B6B;
      font-size: 13px;
    }

    .empty-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #A0C6C6;
      margin-bottom: 8px;
    }

    .check-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #2E9E6B;
      margin-bottom: 8px;
    }

    .clinics-table-wrap {
      overflow-x: auto;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .admin-table th {
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
    }

    .admin-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
    }

    .apps-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .app-item {
      padding: 12px 14px;
      border-radius: 8px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
    }

    .app-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .app-doc-name {
      font-size: 13px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .app-date {
      font-size: 11px;
      color: #5C6B6B;
    }

    .app-license {
      font-size: 11px;
      color: #5C6B6B;
      margin-top: 4px;
    }

    .app-license code {
      font-weight: 700;
      color: #0F5C5C;
    }

    .app-actions {
      margin-top: 8px;
    }

    .review-btn {
      font-size: 12px;
      font-weight: 700;
      color: #0F5C5C;
      text-decoration: none;
    }
  `],
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);

  summary: AnalyticsSummary | null = null;
  clinics: Clinic[] = [];
  pendingApplications: DoctorApplication[] = [];
  loading = true;

  ngOnInit(): void {
    this.loadAdminData();
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

  loadAdminData(): void {
    this.loading = true;
    this.adminService.getAnalytics().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.summary = res.data;
        }
      },
    });

    this.adminService.getClinics().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.clinics = res.data;
        }
      },
    });

    this.adminService.getDoctorApplications().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.pendingApplications = res.data.filter((a) => a.status === 'pending');
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
