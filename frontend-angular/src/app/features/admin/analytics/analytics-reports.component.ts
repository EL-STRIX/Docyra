import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AnalyticsSummary, HospitalReport } from '../../../core/models/analytics.model';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-analytics-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="analytics-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Platform Analytics & Hospital Reports</h1>
          <p class="page-subtitle">Overall performance totals and comprehensive per-hospital consultation and income reports.</p>
        </div>
        <button mat-stroked-button color="primary" (click)="loadAnalytics()" [disabled]="loading" class="refresh-btn">
          <mat-spinner *ngIf="loading" diameter="16" class="mr-2"></mat-spinner>
          <mat-icon *ngIf="!loading">refresh</mat-icon>
          <span>Refresh Report</span>
        </button>
      </div>

      <!-- Top Overview Metrics: Clean, Standard Structured Summary -->
      <div class="metrics-overview">
        <!-- Row 1: Consultations & Platform Revenue -->
        <div class="metrics-row row-4">
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Total Platform Revenue</span>
              <mat-icon class="metric-icon">payments</mat-icon>
            </div>
            <div class="metric-value font-bold text-neutral-900">
              ₹{{ (analytics?.revenueEstimated || 0) | number }}
            </div>
            <div class="metric-sub">Completed visit consultation income</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Total Appointments</span>
              <mat-icon class="metric-icon">calendar_month</mat-icon>
            </div>
            <div class="metric-value">
              {{ analytics?.totalAppointments || 0 }}
            </div>
            <div class="metric-sub">Total consultations booked</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Completed Consultations</span>
              <mat-icon class="metric-icon text-emerald-600">check_circle</mat-icon>
            </div>
            <div class="metric-value text-emerald-700">
              {{ analytics?.completedAppointments || 0 }}
            </div>
            <div class="metric-sub">Fulfilled patient visits</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Cancelled Appointments</span>
              <mat-icon class="metric-icon text-rose-600">cancel</mat-icon>
            </div>
            <div class="metric-value text-rose-700">
              {{ analytics?.cancelledAppointments || 0 }}
            </div>
            <div class="metric-sub">Patient or physician voided</div>
          </div>
        </div>

        <!-- Row 2: Ecosystem & Capacity Scale -->
        <div class="metrics-row row-3">
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Hospitals & Clinics</span>
              <mat-icon class="metric-icon">domain</mat-icon>
            </div>
            <div class="metric-value">
              {{ hospitalReports.length || analytics?.totalClinics || 0 }}
            </div>
            <div class="metric-sub">Partner facilities on platform</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Active Doctors</span>
              <mat-icon class="metric-icon">medical_services</mat-icon>
            </div>
            <div class="metric-value">
              {{ analytics?.totalDoctors || 0 }}
            </div>
            <div class="metric-sub">Verified practicing clinicians</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Registered Patients</span>
              <mat-icon class="metric-icon">groups</mat-icon>
            </div>
            <div class="metric-value">
              {{ analytics?.totalPatients || 0 }}
            </div>
            <div class="metric-sub">Enrolled user patient accounts</div>
          </div>
        </div>
      </div>

      <!-- All Hospitals Listed Down: Individual Hospital Reports Table -->
      <mat-card class="report-card">
        <div class="report-header">
          <div>
            <h2 class="card-title">Hospital & Clinic Performance Reports</h2>
            <p class="card-desc">Detailed utilization, completion, cancellation, and total revenue breakdown per hospital facility.</p>
          </div>
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search hospital or city..."
              class="search-input"
            />
          </div>
        </div>

        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="!loading && filteredHospitals.length === 0" class="empty-state">
          <mat-icon class="empty-icon">search_off</mat-icon>
          <p class="empty-title">No hospitals found</p>
          <p class="empty-subtitle">No hospital report records matching your query.</p>
        </div>

        <div *ngIf="!loading && filteredHospitals.length > 0" class="table-container">
          <table class="report-table">
            <thead>
              <tr>
                <th class="th-clinic">Hospital / Facility</th>
                <th class="th-location">Location</th>
                <th class="th-num">Total Appointments</th>
                <th class="th-num">Completed</th>
                <th class="th-num">Cancelled</th>
                <th class="th-num">Total Income</th>
                <th class="th-num">Doctors</th>
                <th class="th-status">Status</th>
                <th class="th-rating">Rating</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let h of filteredHospitals">
                <td class="td-clinic">
                  <div class="clinic-name">{{ h.name }}</div>
                  <div class="clinic-sub" *ngIf="getClinicAddress(h)">{{ getClinicAddress(h) }}</div>
                </td>
                <td class="td-location">{{ h.city }}</td>
                <td class="td-num">
                  <span class="pill-badge pill-total">{{ h.totalAppointments }}</span>
                </td>
                <td class="td-num">
                  <span class="pill-badge pill-completed">{{ h.completedAppointments }}</span>
                </td>
                <td class="td-num">
                  <span class="pill-badge pill-cancelled">{{ h.cancelledAppointments }}</span>
                </td>
                <td class="td-num font-bold text-neutral-900">
                  ₹{{ h.totalIncome | number }}
                </td>
                <td class="td-num font-medium">
                  {{ h.doctorsCount }}
                </td>
                <td class="td-status">
                  <span class="status-chip" [class.active]="h.isActive">
                    {{ h.isActive ? 'Active' : 'Suspended' }}
                  </span>
                </td>
                <td class="td-rating">
                  <span class="rating-text">⭐ {{ h.rating | number:'1.1-1' }}</span>
                  <span class="review-count">({{ h.reviewCount }})</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .analytics-page {
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

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .metrics-overview {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .metrics-row {
      display: grid;
      gap: 12px;
    }

    .metrics-row.row-4 {
      grid-template-columns: repeat(4, 1fr);
    }

    .metrics-row.row-3 {
      grid-template-columns: repeat(3, 1fr);
    }

    @media (max-width: 1024px) {
      .metrics-row.row-4 {
        grid-template-columns: repeat(2, 1fr);
      }
      .metrics-row.row-3 {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .metrics-row.row-4,
      .metrics-row.row-3 {
        grid-template-columns: 1fr;
      }
    }

    .metric-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .metric-card:hover {
      border-color: #D1D5DB;
    }

    .metric-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }

    .metric-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: #94A3B8;
      flex-shrink: 0;
    }

    .metric-value {
      font-size: 22px;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.2;
      letter-spacing: -0.4px;
      font-variant-numeric: tabular-nums;
    }

    .metric-sub {
      font-size: 11px;
      color: #94A3B8;
      margin-top: 4px;
      font-weight: 500;
    }

    .report-card {
      padding: 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
    }

    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 17px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0;
    }

    .card-desc {
      font-size: 13px;
      color: #5C6B6B;
      margin: 3px 0 0;
    }

    .search-box {
      display: flex;
      align-items: center;
      background: #FAFAF8;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      padding: 6px 12px;
      gap: 8px;
      min-width: 260px;
    }

    .search-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #9CA3AF;
    }

    .search-input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 13px;
      color: #1A2E2E;
      width: 100%;
    }

    .table-container {
      overflow-x: auto;
      margin-top: 8px;
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .report-table th {
      padding: 12px 14px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .report-table td {
      padding: 14px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
      vertical-align: middle;
    }

    .clinic-name {
      font-weight: 700;
      color: #1A2E2E;
      font-size: 14px;
    }

    .clinic-sub {
      font-size: 11px;
      color: #718096;
      margin-top: 2px;
    }

    .td-num {
      text-align: right;
    }

    .th-num {
      text-align: right;
    }

    .pill-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }

    .pill-total {
      background: #F3F4F6;
      color: #1F2937;
    }

    .pill-completed {
      background: #EBF7EE;
      color: #15803D;
    }

    .pill-cancelled {
      background: #FDF2F2;
      color: #B91C1C;
    }

    .status-chip {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      background: #FDF2F2;
      color: #D9534F;
    }

    .status-chip.active {
      background: #EBF7EE;
      color: #2E9E6B;
    }

    .rating-text {
      font-weight: 700;
      color: #D97706;
    }

    .review-count {
      font-size: 11px;
      color: #9CA3AF;
      margin-left: 4px;
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
      text-align: center;
    }

    .empty-icon {
      font-size: 44px;
      width: 44px;
      height: 44px;
      color: #9CA3AF;
      margin-bottom: 8px;
    }

    .empty-title {
      font-size: 15px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 4px;
    }

    .empty-subtitle {
      font-size: 12px;
      color: #6B7280;
      margin: 0;
    }
  `],
})
export class AnalyticsReportsComponent implements OnInit {
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  analytics: AnalyticsSummary | null = null;
  hospitalReports: HospitalReport[] = [];
  loading = true;
  searchQuery = '';

  ngOnInit(): void {
    this.loadAnalytics();
  }

  get filteredHospitals(): HospitalReport[] {
    if (!this.searchQuery.trim()) {
      return this.hospitalReports;
    }
    const q = this.searchQuery.toLowerCase().trim();
    return this.hospitalReports.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.city && h.city.toLowerCase().includes(q))
    );
  }

  getClinicAddress(h: HospitalReport): string {
    if (!h.address) return '';
    if (typeof h.address === 'string') return h.address;
    if (typeof h.address === 'object') {
      const parts = [h.address.street, h.address.state].filter(Boolean);
      return parts.join(', ');
    }
    return '';
  }

  loadAnalytics(): void {
    this.loading = true;
    this.adminService.getAnalytics().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.analytics = res.data;
          this.hospitalReports = res.data.hospitalReports || res.data.clinicReports || [];
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
