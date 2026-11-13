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
          <a routerLink="/admin/specializations" mat-stroked-button color="primary">
            <mat-icon>category</mat-icon>
            <span>Specializations</span>
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
          <div class="stat-icon-wrap purple">
            <mat-icon>groups</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Registered Patients</span>
            <span class="stat-value">{{ summary?.totalPatients || 0 }}</span>
          </div>
        </mat-card>
      </div>

      <!-- Split Layout: Recent Onboardings & Platform Governance -->
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
                  <th class="th-clinic">Clinic</th>
                  <th class="th-city">City</th>
                  <th class="th-status">Status</th>
                  <th class="th-rating text-right">Rating</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of clinics | slice:0:5">
                  <td class="td-clinic">
                    <div class="clinic-title">{{ c.name }}</div>
                    <div class="clinic-phone">{{ c.contactPhone || c.contact?.phone || 'N/A' }}</div>
                  </td>
                  <td class="td-city">
                    <span class="city-text">{{ getClinicCity(c) }}</span>
                  </td>
                  <td class="td-status">
                    <app-status-badge [status]="isClinicActive(c) ? 'active' : 'suspended'"></app-status-badge>
                  </td>
                  <td class="td-rating text-right">
                    <span class="rating-text">⭐ {{ c.rating ? (c.rating | number:'1.1-1') : '5.0' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card>

        <!-- Platform Governance & Quick Navigation -->
        <mat-card class="side-card">
          <div class="card-header-bar">
            <div>
              <h2 class="card-title">Platform Operations</h2>
              <p class="card-desc">Quick governance tools and administrative control</p>
            </div>
          </div>

          <div class="quick-nav-list">
            <a routerLink="/admin/clinics" class="quick-nav-item">
              <div class="nav-item-icon clinic-ic">
                <mat-icon>domain</mat-icon>
              </div>
              <div class="nav-item-info">
                <span class="nav-item-title">Manage Clinics</span>
                <span class="nav-item-sub">Onboard, configure facilities, and manage status</span>
              </div>
              <mat-icon class="nav-arrow">chevron_right</mat-icon>
            </a>

            <a routerLink="/admin/specializations" class="quick-nav-item">
              <div class="nav-item-icon spec-ic">
                <mat-icon>category</mat-icon>
              </div>
              <div class="nav-item-info">
                <span class="nav-item-title">Specializations</span>
                <span class="nav-item-sub">Manage clinical departments and disciplines</span>
              </div>
              <mat-icon class="nav-arrow">chevron_right</mat-icon>
            </a>

            <a routerLink="/admin/patients" class="quick-nav-item">
              <div class="nav-item-icon patient-ic">
                <mat-icon>groups</mat-icon>
              </div>
              <div class="nav-item-info">
                <span class="nav-item-title">Manage Patients</span>
                <span class="nav-item-sub">Directory, profiles, and account safety controls</span>
              </div>
              <mat-icon class="nav-arrow">chevron_right</mat-icon>
            </a>

            <a routerLink="/admin/audit-logs" class="quick-nav-item">
              <div class="nav-item-icon audit-ic">
                <mat-icon>history</mat-icon>
              </div>
              <div class="nav-item-info">
                <span class="nav-item-title">Compliance Audit Logs</span>
                <span class="nav-item-sub">Live streaming security and operational audit trail</span>
              </div>
              <mat-icon class="nav-arrow">chevron_right</mat-icon>
            </a>

            <a routerLink="/admin/settings" class="quick-nav-item">
              <div class="nav-item-icon set-ic">
                <mat-icon>settings</mat-icon>
              </div>
              <div class="nav-item-info">
                <span class="nav-item-title">System Settings</span>
                <span class="nav-item-sub">Slot engine interval, currency, and security policies</span>
              </div>
              <mat-icon class="nav-arrow">chevron_right</mat-icon>
            </a>
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

    .stat-icon-wrap.purple {
      background-color: #F3E8FF;
      color: #7E22CE;
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
      font-size: 11.5px;
      color: #5C6B6B;
      margin: 0;
    }

    .view-all-link {
      font-size: 12px;
      font-weight: 700;
      color: #0F5C5C;
      text-decoration: none;
    }

    .quick-nav-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .quick-nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: #FAFAF8;
      border: 1px solid #F0EFEA;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .quick-nav-item:hover {
      background: #F4FAF9;
      border-color: #0F5C5C;
      transform: translateX(3px);
    }

    .nav-item-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nav-item-icon.clinic-ic { background: #E6F2F1; color: #0F5C5C; }
    .nav-item-icon.spec-ic { background: #FEF6EC; color: #B57416; }
    .nav-item-icon.patient-ic { background: #F3E8FF; color: #7E22CE; }
    .nav-item-icon.audit-ic { background: #EEF2F6; color: #1E3A8A; }
    .nav-item-icon.set-ic { background: #F3F4F6; color: #374151; }

    .nav-item-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .nav-item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .nav-item-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .nav-item-sub {
      font-size: 11px;
      color: #718096;
      line-height: 1.3;
    }

    .nav-arrow {
      color: #A0AEC0;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .clinics-table-wrap {
      width: 100%;
      overflow-x: auto;
      border: 1px solid #E7E5E0;
      border-radius: 10px;
      background: #FFFFFF;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .admin-table th {
      padding: 12px 18px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #5C6B6B;
      background-color: #FAFAF8;
      border-bottom: 2px solid #E7E5E0;
      white-space: nowrap;
    }

    .admin-table th.th-clinic {
      width: 44%;
      text-align: left;
    }

    .admin-table th.th-city {
      width: 24%;
      text-align: left;
    }

    .admin-table th.th-status {
      width: 18%;
      text-align: left;
    }

    .admin-table th.th-rating {
      width: 14%;
      text-align: right;
    }

    .admin-table td {
      padding: 14px 18px;
      border-bottom: 1px solid #F1F0EB;
      vertical-align: middle;
    }

    .admin-table tbody tr:last-child td {
      border-bottom: none;
    }

    .admin-table tbody tr:hover td {
      background-color: #FAFAF8;
    }

    .clinic-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #1A2E2E;
      line-height: 1.35;
    }

    .clinic-phone {
      font-size: 12px;
      color: #718096;
      margin-top: 3px;
    }

    .city-text {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      white-space: nowrap;
    }

    .rating-text {
      font-size: 13px;
      font-weight: 700;
      color: #B57416;
      white-space: nowrap;
    }

    .text-right {
      text-align: right !important;
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .empty-state {
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
  `],
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);

  summary: AnalyticsSummary | null = null;
  clinics: Clinic[] = [];
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
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
