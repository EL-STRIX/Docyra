import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClinicService } from '../../../core/services/clinic.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Clinic } from '../../../core/models/clinic.model';
import { Doctor } from '../../../core/models/doctor.model';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface RevenueSummary {
  todayRevenue: number;
  todayCompletedVisits: number;
  totalRevenue: number;
  totalCompletedVisits: number;
  periodRevenue: number;
  periodCompletedVisits: number;
  averageFeePerVisit: number;
  period: 'day' | 'month' | 'year';
}

export interface RevenueChartItem {
  key: string;
  label: string;
  shortLabel: string;
  date?: string;
  month?: string;
  year?: string;
  revenue: number;
  count: number;
}

export interface DoctorRevenueItem {
  doctorId: string;
  doctorName: string;
  specialization: string;
  consultationFee: number;
  completedVisits: number;
  revenue: number;
  percentage: number;
}

export interface RevenueTransaction {
  _id: string;
  appointmentId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorName: string;
  doctorId: string;
  specialization: string;
  fee: number;
  status: string;
  completedAt: string;
  appointmentDate: string;
  istDate: string;
  istMonth: string;
  istYear: string;
  istFormatted: string;
  reasonForVisit: string;
}

@Component({
  selector: 'app-clinic-revenue',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DateFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  template: `
    <div class="revenue-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <div class="scope-badge">
            <mat-icon>payments</mat-icon>
            <span>Verified Clinic Income & Financial Ledger</span>
          </div>
          <h1 class="page-title">Clinic Revenue Analytics</h1>
          <p class="page-subtitle">
            Daily, monthly, and yearly income calculated strictly from completed patient consultations. Uncompleted and scheduled visits are strictly excluded.
          </p>
        </div>

        <div class="header-controls">
          <!-- Timeframe Mode Selector -->
          <div class="timeframe-pills">
            <button
              class="tf-btn"
              [class.active]="selectedPeriod === 'day'"
              (click)="setPeriod('day')"
            >
              Daily
            </button>
            <button
              class="tf-btn"
              [class.active]="selectedPeriod === 'month'"
              (click)="setPeriod('month')"
            >
              Monthly
            </button>
            <button
              class="tf-btn"
              [class.active]="selectedPeriod === 'year'"
              (click)="setPeriod('year')"
            >
              Yearly
            </button>
          </div>

          <!-- Doctor Filter -->
          <div class="doc-filter-wrap" *ngIf="availableDoctorOptions.length > 0">
            <select [(ngModel)]="selectedDoctorId" (change)="loadRevenueData()" class="doc-select">
              <option value="">All Clinic Physicians</option>
              <option *ngFor="let doc of availableDoctorOptions" [value]="doc.id">
                {{ doc.name }}
              </option>
            </select>
          </div>

          <button mat-stroked-button (click)="loadRevenueData()" [disabled]="loading" class="refresh-btn">
            <mat-icon [class.spin]="loading">refresh</mat-icon>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <mat-card class="kpi-card today-kpi">
          <div class="kpi-icon-wrap today">
            <mat-icon>today</mat-icon>
          </div>
          <div class="kpi-body">
            <span class="kpi-label">Today's Revenue</span>
            <span class="kpi-value text-teal-800">₹{{ (summary?.todayRevenue || 0) | number:'1.0-0' }}</span>
            <span class="kpi-meta">{{ summary?.todayCompletedVisits || 0 }} completed visits today</span>
          </div>
        </mat-card>

        <mat-card class="kpi-card period-kpi">
          <div class="kpi-icon-wrap period">
            <mat-icon>trending_up</mat-icon>
          </div>
          <div class="kpi-body">
            <span class="kpi-label">{{ getPeriodTitle() }} Revenue</span>
            <span class="kpi-value text-indigo-800">₹{{ (summary?.periodRevenue || 0) | number:'1.0-0' }}</span>
            <span class="kpi-meta">{{ summary?.periodCompletedVisits || 0 }} visits in selected timeframe</span>
          </div>
        </mat-card>

        <mat-card class="kpi-card total-kpi">
          <div class="kpi-icon-wrap total">
            <mat-icon>account_balance</mat-icon>
          </div>
          <div class="kpi-body">
            <span class="kpi-label">Total Verified Revenue</span>
            <span class="kpi-value text-neutral-900">₹{{ (summary?.totalRevenue || 0) | number:'1.0-0' }}</span>
            <span class="kpi-meta">{{ summary?.totalCompletedVisits || 0 }} all-time completed visits</span>
          </div>
        </mat-card>

        <mat-card class="kpi-card avg-kpi">
          <div class="kpi-icon-wrap avg">
            <mat-icon>receipt_long</mat-icon>
          </div>
          <div class="kpi-body">
            <span class="kpi-label">Average Fee / Consultation</span>
            <span class="kpi-value text-neutral-800">₹{{ (summary?.averageFeePerVisit || 0) | number:'1.0-0' }}</span>
            <span class="kpi-meta">Standard per-visit return</span>
          </div>
        </mat-card>
      </div>

      <!-- Interactive Revenue Trend Chart Card -->
      <mat-card class="chart-card">
        <div class="chart-header">
          <div>
            <h2 class="chart-title">{{ getChartHeading() }}</h2>
            <p class="chart-desc">
              Visual income distribution across {{ selectedPeriod === 'day' ? 'recent days' : selectedPeriod === 'month' ? 'calendar months' : 'years' }}.
            </p>
          </div>
          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-color-bar"></span>
              <span class="legend-text">Completed Consultation Income (₹)</span>
            </div>
          </div>
        </div>

        <div *ngIf="loading" class="chart-loading">
          <mat-spinner diameter="36"></mat-spinner>
          <span>Loading verified revenue records...</span>
        </div>

        <!-- Custom SVG Bar Chart -->
        <div *ngIf="!loading && chartData.length > 0" class="chart-container">
          <div class="bars-wrapper">
            <div
              *ngFor="let item of chartData; let i = index"
              class="bar-column"
              (mouseenter)="hoveredItem = item"
              (mouseleave)="hoveredItem = null"
            >
              <!-- Tooltip on hover -->
              <div class="bar-tooltip" *ngIf="hoveredItem === item">
                <span class="tt-date">{{ item.label }}</span>
                <span class="tt-rev">₹{{ item.revenue | number:'1.0-0' }}</span>
                <span class="tt-count">{{ item.count }} completed visit{{ item.count === 1 ? '' : 's' }}</span>
              </div>

              <!-- Bar Fill -->
              <div class="bar-track">
                <div
                  class="bar-fill"
                  [style.height.%]="getBarHeightPercent(item.revenue)"
                  [class.bar-zero]="item.revenue === 0"
                  [class.bar-today]="isItemToday(item)"
                >
                  <span class="bar-val-hint" *ngIf="item.revenue > 0">₹{{ formatShortNumber(item.revenue) }}</span>
                </div>
              </div>

              <!-- X-Axis Label -->
              <span class="bar-label" [class.label-today]="isItemToday(item)">
                {{ item.shortLabel || item.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- Empty Chart State -->
        <div *ngIf="!loading && chartData.length === 0" class="chart-empty">
          <mat-icon>bar_chart</mat-icon>
          <p>No completed consultation revenue data found for this period.</p>
        </div>
      </mat-card>

      <!-- Bottom Split: Doctor Revenue Breakdown & Full Transactions Ledger -->
      <div class="bottom-grid">
        <!-- Physician Revenue Share Card -->
        <mat-card class="doctor-share-card">
          <div class="card-title-bar">
            <div>
              <h3 class="section-title">Physician Income Contribution</h3>
              <p class="section-desc">Completed visits and revenue earned by doctor</p>
            </div>
            <a routerLink="/clinic/doctors" class="link-btn">Manage Roster →</a>
          </div>

          <div *ngIf="doctorBreakdown.length === 0" class="empty-sub">
            <mat-icon>medical_services</mat-icon>
            <p>No doctor consultation records completed yet.</p>
          </div>

          <div class="doctor-list" *ngIf="doctorBreakdown.length > 0">
            <div *ngFor="let doc of doctorBreakdown" class="doctor-row">
              <div class="doc-info-block">
                <span class="doc-name">{{ doc.doctorName }}</span>
                <span class="doc-sub">{{ doc.specialization }} • Fee: ₹{{ doc.consultationFee }}</span>
              </div>

              <div class="doc-stats-block">
                <div class="doc-revenue-row">
                  <span class="doc-rev-val">₹{{ doc.revenue | number:'1.0-0' }}</span>
                  <span class="doc-share-pill">{{ doc.percentage }}%</span>
                </div>
                <span class="doc-visits">{{ doc.completedVisits }} completed visit{{ doc.completedVisits === 1 ? '' : 's' }}</span>
                <div class="progress-bar-wrap">
                  <div class="progress-bar-fill" [style.width.%]="doc.percentage"></div>
                </div>
              </div>
            </div>
          </div>
        </mat-card>

        <!-- All Days Revenue Record (Transactions Ledger) -->
        <mat-card class="ledger-card">
          <div class="card-title-bar">
            <div>
              <h3 class="section-title">All-Time Revenue Records & Consultation Ledger</h3>
              <p class="section-desc">Itemized audit of every completed appointment and calculated fee</p>
            </div>
            <div class="ledger-search-box">
              <mat-icon class="search-icon">search</mat-icon>
              <input
                type="text"
                placeholder="Search patient, doctor..."
                [(ngModel)]="searchQuery"
                (input)="filterTransactions()"
                class="ledger-search-input"
              />
            </div>
          </div>

          <div *ngIf="loading" class="loading-wrap">
            <mat-spinner diameter="32"></mat-spinner>
          </div>

          <!-- Empty Ledger State -->
          <div *ngIf="!loading && filteredTransactions.length === 0" class="empty-sub">
            <mat-icon>receipt</mat-icon>
            <p *ngIf="transactions.length === 0">
              No completed appointments recorded yet. Once a doctor marks a visit complete, the consultation fee will appear here instantly.
            </p>
            <p *ngIf="transactions.length > 0">No records matching your search query.</p>
          </div>

          <!-- Ledger Table -->
          <div *ngIf="!loading && filteredTransactions.length > 0" class="table-wrap">
            <table class="ledger-table">
              <thead>
                <tr>
                  <th>Completed Date & Time</th>
                  <th>Patient Name</th>
                  <th>Consulting Physician</th>
                  <th>Reason for Visit</th>
                  <th>Consultation Fee</th>
                  <th class="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let tx of filteredTransactions">
                  <td class="date-cell">
                    <div class="font-bold text-neutral-800 text-sm">
                      {{ tx.completedAt | portalDate:'dd MMM yyyy' }}
                    </div>
                    <div class="text-xs text-neutral-500">
                      {{ tx.completedAt | portalDate:'hh:mm a' }}
                    </div>
                  </td>

                  <td>
                    <div class="font-bold text-neutral-900 text-sm">{{ tx.patientName }}</div>
                    <div class="text-xs text-neutral-500" *ngIf="tx.patientEmail">{{ tx.patientEmail }}</div>
                  </td>

                  <td>
                    <div class="font-bold text-teal-800 text-sm">{{ tx.doctorName }}</div>
                    <div class="text-xs text-neutral-500">{{ tx.specialization }}</div>
                  </td>

                  <td class="text-xs text-neutral-600">
                    {{ tx.reasonForVisit || 'Medical Consultation' }}
                  </td>

                  <td>
                    <div class="font-bold text-emerald-700 text-sm">
                      ₹{{ tx.fee | number:'1.0-0' }}
                    </div>
                  </td>

                  <td class="text-right">
                    <span class="completed-badge">
                      <mat-icon class="chk-icon">check_circle</mat-icon>
                      <span>Completed</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Table Footer Summary -->
          <div class="ledger-footer" *ngIf="!loading && filteredTransactions.length > 0">
            <span class="footer-count">Showing {{ filteredTransactions.length }} completed record{{ filteredTransactions.length === 1 ? '' : 's' }}</span>
            <div class="footer-total">
              <span class="text-neutral-500 text-xs">Total for displayed records:</span>
              <span class="text-emerald-800 font-bold text-sm">₹{{ getFilteredTotal() | number:'1.0-0' }}</span>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .revenue-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
    }

    .scope-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: #E8F5F1;
      color: #0F5C5C;
      border: 1px solid #C2E5DC;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      margin-bottom: 8px;
    }

    .scope-badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 6px;
    }

    .page-subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
      max-width: 720px;
      line-height: 1.5;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .timeframe-pills {
      display: flex;
      background: #E7E5E0;
      border-radius: 8px;
      padding: 3px;
      gap: 2px;
    }

    .tf-btn {
      border: none;
      background: transparent;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #5C6B6B;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tf-btn.active {
      background: #FFFFFF;
      color: #0F5C5C;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .doc-select {
      height: 34px;
      padding: 0 12px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      background: #FFFFFF;
      outline: none;
      cursor: pointer;
    }

    .refresh-btn {
      border-color: #D1D5DB !important;
      color: #374151 !important;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    @media (max-width: 900px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 520px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }
    }

    .kpi-card {
      padding: 18px 20px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .kpi-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kpi-icon-wrap.today { background: #E6F4F1; color: #0F5C5C; }
    .kpi-icon-wrap.period { background: #EEF2FF; color: #4338CA; }
    .kpi-icon-wrap.total { background: #FEF3C7; color: #B45309; }
    .kpi-icon-wrap.avg { background: #F1F5F9; color: #334155; }

    .kpi-body {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-bottom: 2px;
    }

    .kpi-value {
      font-size: 22px;
      font-weight: 900;
      line-height: 1.2;
      margin-bottom: 2px;
    }

    .kpi-meta {
      font-size: 11px;
      color: #64748B;
    }

    /* Chart Card */
    .chart-card {
      padding: 24px !important;
      border-radius: 14px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .chart-title {
      font-size: 16px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 4px;
    }

    .chart-desc {
      font-size: 12px;
      color: #64748B;
      margin: 0;
    }

    .chart-legend {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }

    .legend-color-bar {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      background: #0F5C5C;
    }

    .chart-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 60px;
      color: #64748B;
      font-size: 13px;
    }

    .chart-empty {
      text-align: center;
      padding: 48px;
      color: #94A3B8;
    }

    .chart-empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      margin-bottom: 8px;
    }

    /* Custom Bar Chart Styles */
    .chart-container {
      width: 100%;
      overflow-x: auto;
      padding-top: 60px;
      padding-bottom: 8px;
    }

    .bars-wrapper {
      display: flex;
      align-items: flex-end;
      height: 220px;
      gap: 12px;
      min-width: 600px;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
    }

    .bar-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      position: relative;
      cursor: pointer;
    }

    .bar-track {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .bar-fill {
      width: 70%;
      max-width: 40px;
      min-height: 4px;
      background: linear-gradient(180deg, #137777 0%, #0F5C5C 100%);
      border-radius: 6px 6px 0 0;
      transition: all 0.25s ease;
      position: relative;
      display: flex;
      justify-content: center;
    }

    .bar-column:hover .bar-fill {
      background: linear-gradient(180deg, #094747 0%, #073535 100%);
      transform: scaleY(1.03);
    }

    .bar-fill.bar-zero {
      background: #E2E8F0;
      min-height: 3px;
    }

    .bar-fill.bar-today {
      background: linear-gradient(180deg, #F2A93B 0%, #D97706 100%);
    }

    .bar-val-hint {
      position: absolute;
      top: -20px;
      font-size: 10px;
      font-weight: 700;
      color: #0F5C5C;
      white-space: nowrap;
    }

    .bar-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      margin-top: 8px;
      white-space: nowrap;
      text-align: center;
    }

    .bar-label.label-today {
      color: #D97706;
      font-weight: 800;
    }

    .bar-tooltip {
      position: absolute;
      top: -65px;
      background: #1E293B;
      color: #FFFFFF;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      align-items: center;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10;
      pointer-events: none;
    }

    .bar-tooltip::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 4px 4px 0 4px;
      border-style: solid;
      border-color: #1E293B transparent transparent transparent;
    }

    .tt-date { font-size: 10px; color: #94A3B8; }
    .tt-rev { font-size: 13px; font-weight: 800; color: #38BDF8; }
    .tt-count { font-size: 10px; color: #CBD5E1; }

    /* Bottom Grid */
    .bottom-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 20px;
    }

    @media (max-width: 1024px) {
      .bottom-grid {
        grid-template-columns: 1fr;
      }
    }

    .doctor-share-card, .ledger-card {
      padding: 20px !important;
      border-radius: 14px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .card-title-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .section-title {
      font-size: 15px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 2px;
    }

    .section-desc {
      font-size: 12px;
      color: #64748B;
      margin: 0;
    }

    .link-btn {
      font-size: 12px;
      font-weight: 700;
      color: #0F5C5C;
      text-decoration: none;
    }

    .link-btn:hover {
      text-decoration: underline;
    }

    /* Doctor Breakdown List */
    .doctor-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .doctor-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #F1F5F9;
    }

    .doctor-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .doc-info-block {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .doc-name {
      font-size: 13px;
      font-weight: 700;
      color: #1E293B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .doc-sub {
      font-size: 11px;
      color: #64748B;
      margin-top: 1px;
    }

    .doc-stats-block {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      min-width: 130px;
    }

    .doc-revenue-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .doc-rev-val {
      font-size: 14px;
      font-weight: 800;
      color: #0F5C5C;
    }

    .doc-share-pill {
      font-size: 10px;
      font-weight: 700;
      background: #E8F5F1;
      color: #0F5C5C;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .doc-visits {
      font-size: 11px;
      color: #64748B;
      margin-top: 1px;
    }

    .progress-bar-wrap {
      width: 100%;
      height: 4px;
      background: #E2E8F0;
      border-radius: 999px;
      margin-top: 4px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: #0F5C5C;
      border-radius: 999px;
    }

    /* Ledger Search */
    .ledger-search-box {
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      padding: 4px 10px;
      background: #FFFFFF;
      min-width: 200px;
    }

    .search-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #94A3B8;
    }

    .ledger-search-input {
      border: none;
      outline: none;
      font-size: 12px;
      color: #1E293B;
      width: 100%;
    }

    /* Ledger Table */
    .table-wrap {
      overflow-x: auto;
    }

    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .ledger-table th {
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      border-bottom: 2px solid #E2E8F0;
      background: #F8FAFC;
    }

    .ledger-table td {
      padding: 12px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 13px;
      vertical-align: middle;
    }

    .date-cell {
      white-space: nowrap;
    }

    .completed-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #E8F5F1;
      color: #0F5C5C;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }

    .chk-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .empty-sub {
      text-align: center;
      padding: 36px 20px;
      color: #94A3B8;
    }

    .empty-sub mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      margin-bottom: 6px;
    }

    .ledger-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 14px;
      margin-top: 8px;
      border-top: 1px solid #E2E8F0;
      font-size: 12px;
    }

    .footer-count {
      color: #64748B;
    }

    .footer-total {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .text-right {
      text-align: right;
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
  `],
})
export class ClinicRevenueComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private notificationService = inject(NotificationService);

  loading = true;
  selectedPeriod: 'day' | 'month' | 'year' = 'day';
  selectedDoctorId = '';
  searchQuery = '';
  hoveredItem: RevenueChartItem | null = null;

  clinicProfile: Clinic | null = null;
  doctors: Doctor[] = [];
  summary: RevenueSummary | null = null;
  chartData: RevenueChartItem[] = [];
  doctorBreakdown: DoctorRevenueItem[] = [];
  transactions: RevenueTransaction[] = [];
  filteredTransactions: RevenueTransaction[] = [];

  ngOnInit(): void {
    this.loadClinicAndDoctors();
    this.loadRevenueData();
  }

  loadClinicAndDoctors(): void {
    this.clinicService.getMyClinicProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.clinicProfile = res.data;
          this.clinicService.getClinicDoctors(res.data._id).subscribe({
            next: (docRes) => {
              if (docRes.success && Array.isArray(docRes.data)) {
                this.doctors = docRes.data;
              }
            },
          });
        }
      },
    });
  }

  setPeriod(period: 'day' | 'month' | 'year'): void {
    if (this.selectedPeriod === period) return;
    this.selectedPeriod = period;
    this.loadRevenueData();
  }

  loadRevenueData(): void {
    this.loading = true;
    const params: any = { period: this.selectedPeriod };
    if (this.selectedDoctorId) {
      params.doctorId = this.selectedDoctorId;
    }

    this.clinicService.getClinicRevenue(params).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.summary = res.data.summary;
          this.chartData = res.data.chartData || [];
          this.doctorBreakdown = res.data.doctorBreakdown || [];
          this.transactions = res.data.transactions || [];
          this.filterTransactions();
        }
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(err.error?.message || 'Failed to load clinic revenue analytics');
      },
    });
  }

  filterTransactions(): void {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      this.filteredTransactions = [...this.transactions];
      return;
    }
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredTransactions = this.transactions.filter(
      (tx) =>
        tx.patientName?.toLowerCase().includes(q) ||
        tx.doctorName?.toLowerCase().includes(q) ||
        tx.reasonForVisit?.toLowerCase().includes(q) ||
        tx.specialization?.toLowerCase().includes(q)
    );
  }

  getFilteredTotal(): number {
    return this.filteredTransactions.reduce((acc, curr) => acc + (curr.fee || 0), 0);
  }

  getPeriodTitle(): string {
    switch (this.selectedPeriod) {
      case 'day': return 'Recent 14 Days';
      case 'month': return 'Year-to-Date';
      case 'year': return 'Multi-Year';
      default: return 'Period';
    }
  }

  getChartHeading(): string {
    switch (this.selectedPeriod) {
      case 'day': return 'Daily Verified Revenue Trend';
      case 'month': return 'Monthly Revenue Analysis';
      case 'year': return 'Annual Revenue Growth';
      default: return 'Revenue Analysis';
    }
  }

  getMaxRevenue(): number {
    if (!this.chartData || this.chartData.length === 0) return 1;
    const max = Math.max(...this.chartData.map((d) => d.revenue));
    return max > 0 ? max : 1;
  }

  getBarHeightPercent(revenue: number): number {
    if (!revenue || revenue <= 0) return 3; // Minimal visible line
    const max = this.getMaxRevenue();
    return Math.max(Math.round((revenue / max) * 100), 6);
  }

  formatShortNumber(val: number): string {
    if (val >= 100000) {
      return (val / 100000).toFixed(1) + 'L';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1) + 'k';
    }
    return String(val);
  }

  isItemToday(item: RevenueChartItem): boolean {
    if (this.selectedPeriod !== 'day') return false;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    return item.date === today;
  }

  get availableDoctorOptions(): { id: string; name: string }[] {
    const list: { id: string; name: string }[] = [];
    const seen = new Set<string>();

    for (const d of this.doctors) {
      const id = (d as any)._id?.toString() || (d as any).id?.toString();
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push({ id, name: this.getDoctorDisplayName(d) });
      }
    }

    for (const b of this.doctorBreakdown) {
      if (b.doctorId && !seen.has(b.doctorId.toString()) && b.doctorId !== 'unknown') {
        seen.add(b.doctorId.toString());
        list.push({ id: b.doctorId.toString(), name: b.doctorName });
      }
    }

    return list;
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
    return /^dr\.?\s+/i.test(name) ? name : `Dr. ${name}`;
  }
}
