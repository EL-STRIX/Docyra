import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/user.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

interface PatientStats {
  totalPatients: number;
  activePatients: number;
  suspendedPatients: number;
  totalDependents: number;
}

@Component({
  selector: 'app-manage-patients',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    DateFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="manage-patients-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="badge-row">
            <span class="category-badge">
              <mat-icon class="badge-icon">groups</mat-icon>
              Patient Management Directory
            </span>
          </div>
          <h1 class="page-title">Registered Patients Directory</h1>
          <p class="page-subtitle">
            Search patient records, audit account security status, inspect family dependents, and manage platform access privileges.
          </p>
        </div>

        <div class="header-actions">
          <button
            mat-stroked-button
            class="action-btn"
            (click)="loadPatients()"
            [disabled]="loading"
            title="Refresh patient list"
          >
            <mat-icon [class.spinning]="loading">refresh</mat-icon>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Live KPI Summary Metric Cards -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon-wrap primary">
            <mat-icon>people</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Patients</span>
            <span class="stat-value">{{ stats.totalPatients }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap success">
            <mat-icon>verified_user</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Active Accounts</span>
            <span class="stat-value">{{ stats.activePatients }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap warn">
            <mat-icon>person_off</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Suspended Accounts</span>
            <span class="stat-value">{{ stats.suspendedPatients }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap info">
            <mat-icon>family_restroom</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Family Dependents</span>
            <span class="stat-value">{{ stats.totalDependents }}</span>
          </div>
        </mat-card>
      </div>

      <!-- Patients Table Card -->
      <mat-card class="table-card">
        <!-- Filter Toolbar -->
        <div class="toolbar-wrap">
          <div class="search-box">
            <mat-form-field appearance="outline" class="w-full search-field">
              <mat-label>Search by patient name, email, or phone number...</mat-label>
              <input
                matInput
                [(ngModel)]="searchTerm"
                (ngModelChange)="applySearch()"
                placeholder="e.g. John Doe, patient.john@example.com, +91 98..."
              />
              <mat-icon matPrefix class="mr-2 text-neutral-400">search</mat-icon>
              <button
                *ngIf="searchTerm"
                mat-icon-button
                matSuffix
                (click)="searchTerm = ''; applySearch()"
                class="clear-input-btn"
              >
                <mat-icon>close</mat-icon>
              </button>
            </mat-form-field>
          </div>

          <div class="status-tabs">
            <button
              class="tab-btn"
              [class.active]="statusFilter === 'all'"
              (click)="setStatusFilter('all')"
            >
              All ({{ patients.length }})
            </button>
            <button
              class="tab-btn active-tab"
              [class.active]="statusFilter === 'active'"
              (click)="setStatusFilter('active')"
            >
              Active ({{ getCountByStatus('active') }})
            </button>
            <button
              class="tab-btn suspended-tab"
              [class.active]="statusFilter === 'suspended'"
              (click)="setStatusFilter('suspended')"
            >
              Suspended ({{ getCountByStatus('suspended') }})
            </button>
          </div>
        </div>

        <div *ngIf="loading && patients.length === 0" class="loading-wrap">
          <mat-spinner diameter="40"></mat-spinner>
          <p class="loading-text">Loading registered patient records...</p>
        </div>

        <div *ngIf="!loading && filteredPatients.length === 0" class="empty-state">
          <div class="empty-icon-wrap">
            <mat-icon>person_search</mat-icon>
          </div>
          <h3>No Patient Records Found</h3>
          <p>No patient accounts match your current search query or status filter.</p>
          <button mat-stroked-button color="primary" (click)="clearFilters()">
            Clear Search
          </button>
        </div>

        <div *ngIf="filteredPatients.length > 0" class="table-container">
          <table class="patients-table">
            <thead>
              <tr>
                <th class="patient-col">Patient Identity</th>
                <th class="contact-col">Contact Info</th>
                <th class="security-col">Security & 2FA</th>
                <th class="stats-col">Utilization & Family</th>
                <th class="date-col">Registered On</th>
                <th class="status-col">Account Status</th>
                <th class="actions-col text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let p of pagedPatients"
                class="patient-row"
                [class.suspended-row]="p.status === 'suspended'"
                (click)="openPatientDetails(p)"
              >
                <!-- Identity Column -->
                <td class="patient-cell">
                  <div class="patient-identity-wrap">
                    <div class="patient-avatar" [ngClass]="p.status || 'active'">
                      {{ getInitials(p.name) }}
                    </div>
                    <div class="identity-meta">
                      <div class="patient-name font-bold text-sm text-neutral-900">{{ p.name }}</div>
                      <div class="patient-id font-mono text-[10px] text-neutral-400">ID: {{ p._id | slice:0:12 }}</div>
                    </div>
                  </div>
                </td>

                <!-- Contact Column -->
                <td class="contact-cell">
                  <div class="contact-line email-line">
                    <mat-icon class="contact-icon">email</mat-icon>
                    <span class="text-xs text-neutral-700">{{ p.email }}</span>
                  </div>
                  <div class="contact-line phone-line" *ngIf="p.phone">
                    <mat-icon class="contact-icon">call</mat-icon>
                    <span class="text-xs text-neutral-600 font-mono">{{ p.phone }}</span>
                  </div>
                </td>

                <!-- Security Column -->
                <td class="security-cell">
                  <div class="security-tags-wrap">
                    <span
                      class="security-tag"
                      [class.enabled]="p.isTwoFactorEnabled || p.twoFactorEnabled"
                      [matTooltip]="(p.isTwoFactorEnabled || p.twoFactorEnabled) ? 'Two-factor authentication enabled' : 'Two-factor authentication off'"
                    >
                      <mat-icon class="tag-icon">{{ (p.isTwoFactorEnabled || p.twoFactorEnabled) ? 'lock' : 'lock_open' }}</mat-icon>
                      {{ (p.isTwoFactorEnabled || p.twoFactorEnabled) ? '2FA Enabled' : '2FA Off' }}
                    </span>

                    <span
                      class="verify-tag"
                      [class.verified]="p.isEmailVerified || p.emailVerifiedAt"
                      [matTooltip]="(p.isEmailVerified || p.emailVerifiedAt) ? 'Verified email address' : 'Email verification pending'"
                    >
                      <mat-icon class="tag-icon">{{ (p.isEmailVerified || p.emailVerifiedAt) ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                      {{ (p.isEmailVerified || p.emailVerifiedAt) ? 'Verified' : 'Pending' }}
                    </span>
                  </div>
                </td>

                <!-- Utilization & Family Column -->
                <td class="stats-cell">
                  <div class="utilization-wrap">
                    <span class="meta-stat-pill family-pill" matTooltip="Registered Family Dependents">
                      <mat-icon class="stat-pill-icon">family_restroom</mat-icon>
                      {{ p.dependentsCount || 0 }} {{ (p.dependentsCount || 0) === 1 ? 'Dependent' : 'Dependents' }}
                    </span>
                    <span class="meta-stat-pill booking-pill" matTooltip="Total Doctor Appointments Booked">
                      <mat-icon class="stat-pill-icon">calendar_month</mat-icon>
                      {{ p.appointmentsCount || 0 }} {{ (p.appointmentsCount || 0) === 1 ? 'Booking' : 'Bookings' }}
                    </span>
                  </div>
                </td>

                <!-- Joined Date Column -->
                <td class="date-cell">
                  <div class="join-date text-xs font-semibold text-neutral-700">
                    {{ p.createdAt | portalDate:'dd MMM yyyy' }}
                  </div>
                  <div class="rel-time text-[10px] text-neutral-400">
                    {{ getRelativeDate(p.createdAt) }}
                  </div>
                </td>

                <!-- Status Column -->
                <td class="status-cell">
                  <app-status-badge [status]="p.status || 'active'"></app-status-badge>
                </td>

                <!-- Actions Column -->
                <td class="actions-cell text-right" (click)="$event.stopPropagation()">
                  <div class="btn-group">
                    <button
                      mat-icon-button
                      class="inspect-icon-btn"
                      (click)="openPatientDetails(p)"
                      matTooltip="Inspect Full Patient Profile"
                    >
                      <mat-icon>visibility</mat-icon>
                    </button>

                    <button
                      *ngIf="p.status !== 'suspended'"
                      mat-stroked-button
                      color="warn"
                      (click)="togglePatientStatus(p._id, 'suspended')"
                      class="btn-sm suspend-btn"
                      matTooltip="Suspend patient account"
                    >
                      Suspend
                    </button>

                    <button
                      *ngIf="p.status === 'suspended'"
                      mat-flat-button
                      color="primary"
                      (click)="togglePatientStatus(p._id, 'active')"
                      class="btn-sm activate-btn"
                      matTooltip="Reactivate patient account"
                    >
                      Activate
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="pagination-bar" *ngIf="filteredPatients.length > 0">
          <div class="page-size-selector">
            <span class="page-size-label">Rows per page:</span>
            <select [(ngModel)]="pageSize" (change)="onPageSizeChange()" class="page-size-dropdown">
              <option [value]="5">5</option>
              <option [value]="10">10</option>
              <option [value]="20">20</option>
            </select>
          </div>

          <div class="pagination-info">
            Showing {{ (currentPage - 1) * pageSize + 1 }} - {{ getShowingTo() }} of {{ filteredPatients.length }} patients
          </div>

          <div class="pagination-buttons">
            <button
              mat-icon-button
              [disabled]="currentPage === 1"
              (click)="goToPage(1)"
              title="First Page"
            >
              <mat-icon>first_page</mat-icon>
            </button>
            <button
              mat-icon-button
              [disabled]="currentPage === 1"
              (click)="goToPage(currentPage - 1)"
              title="Previous Page"
            >
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span class="current-page-num">{{ currentPage }} / {{ totalPages }}</span>
            <button
              mat-icon-button
              [disabled]="currentPage >= totalPages"
              (click)="goToPage(currentPage + 1)"
              title="Next Page"
            >
              <mat-icon>chevron_right</mat-icon>
            </button>
            <button
              mat-icon-button
              [disabled]="currentPage >= totalPages"
              (click)="goToPage(totalPages)"
              title="Last Page"
            >
              <mat-icon>last_page</mat-icon>
            </button>
          </div>
        </div>
      </mat-card>

      <!-- Patient Profile Inspector Slide-over Drawer -->
      <div *ngIf="selectedPatient" class="inspector-backdrop" (click)="closePatientDetails()">
        <div class="inspector-panel" (click)="$event.stopPropagation()">
          <div class="inspector-header">
            <div class="inspector-title-wrap">
              <span class="inspector-kicker">PATIENT RECORD DOSSIER</span>
              <h2 class="inspector-title">{{ selectedPatient.name }}</h2>
              <div class="inspector-email">{{ selectedPatient.email }}</div>
            </div>
            <button mat-icon-button (click)="closePatientDetails()" class="close-inspector-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="inspector-body">
            <!-- Account Status Banner -->
            <div class="status-banner" [class.suspended]="selectedPatient.status === 'suspended'">
              <div class="banner-left">
                <mat-icon class="banner-icon">{{ selectedPatient.status === 'suspended' ? 'warning' : 'check_circle' }}</mat-icon>
                <div>
                  <div class="banner-title">
                    Account Status: {{ selectedPatient.status === 'suspended' ? 'Suspended' : 'Active & Verified' }}
                  </div>
                  <div class="banner-desc">
                    {{ selectedPatient.status === 'suspended' ? 'Patient is currently blocked from booking consultations.' : 'Patient in good standing with full platform access.' }}
                  </div>
                </div>
              </div>

              <button
                *ngIf="selectedPatient.status !== 'suspended'"
                mat-stroked-button
                color="warn"
                (click)="togglePatientStatus(selectedPatient._id, 'suspended')"
                class="btn-sm"
              >
                Suspend Account
              </button>
              <button
                *ngIf="selectedPatient.status === 'suspended'"
                mat-flat-button
                color="primary"
                (click)="togglePatientStatus(selectedPatient._id, 'active')"
                class="btn-sm"
              >
                Reactivate Account
              </button>
            </div>

            <!-- Profile Summary Grid -->
            <div class="inspect-section">
              <h4 class="section-title">Account Specifications</h4>
              <div class="inspect-grid">
                <div class="inspect-prop">
                  <span class="prop-lbl">User ID</span>
                  <span class="prop-val font-mono">{{ selectedPatient._id }}</span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Phone Number</span>
                  <span class="prop-val font-mono">{{ selectedPatient.phone || 'Not provided' }}</span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Timezone</span>
                  <span class="prop-val">{{ selectedPatient.timezone || 'Asia/Kolkata' }}</span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Member Since</span>
                  <span class="prop-val">{{ selectedPatient.createdAt | portalDate:'dd MMMM yyyy' }}</span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Two-Factor Authentication</span>
                  <span class="prop-val font-bold" [class.text-emerald-600]="selectedPatient.isTwoFactorEnabled || selectedPatient.twoFactorEnabled">
                    {{ (selectedPatient.isTwoFactorEnabled || selectedPatient.twoFactorEnabled) ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Email Verification</span>
                  <span class="prop-val font-bold" [class.text-teal-700]="selectedPatient.isEmailVerified || selectedPatient.emailVerifiedAt">
                    {{ (selectedPatient.isEmailVerified || selectedPatient.emailVerifiedAt) ? 'Verified' : 'Unverified' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Loading Spinner for Detailed Relations -->
            <div *ngIf="loadingDetails" class="drawer-loading">
              <mat-spinner diameter="32"></mat-spinner>
              <span>Loading family dependents and booking history...</span>
            </div>

            <!-- Dependents Section -->
            <div class="inspect-section" *ngIf="!loadingDetails">
              <div class="section-header-row">
                <h4 class="section-title">
                  Family Dependents ({{ patientDetails?.dependents?.length || 0 }})
                </h4>
              </div>

              <div *ngIf="!patientDetails?.dependents || patientDetails?.dependents?.length === 0" class="empty-detail-box">
                <mat-icon class="box-icon">family_restroom</mat-icon>
                <span>No registered family dependents linked to this patient.</span>
              </div>

              <div *ngIf="patientDetails?.dependents && (patientDetails?.dependents?.length || 0) > 0" class="dependents-list">
                <div *ngFor="let dep of patientDetails?.dependents" class="dependent-card">
                  <div class="dep-avatar">
                    <mat-icon>person</mat-icon>
                  </div>
                  <div class="dep-info">
                    <div class="dep-name font-bold">{{ dep.name }}</div>
                    <div class="dep-sub text-xs text-neutral-500">
                      {{ dep.relationship }} &bull; {{ dep.gender | titlecase }} &bull; DOB: {{ dep.dateOfBirth | portalDate:'dd MMM yyyy' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Appointments Section -->
            <div class="inspect-section" *ngIf="!loadingDetails">
              <div class="section-header-row">
                <h4 class="section-title">
                  Recent Consultations ({{ patientDetails?.appointments?.length || 0 }})
                </h4>
              </div>

              <div *ngIf="!patientDetails?.appointments || patientDetails?.appointments?.length === 0" class="empty-detail-box">
                <mat-icon class="box-icon">event_busy</mat-icon>
                <span>No appointment records recorded for this patient.</span>
              </div>

              <div *ngIf="patientDetails?.appointments && (patientDetails?.appointments?.length || 0) > 0" class="appointments-list">
                <div *ngFor="let apt of patientDetails?.appointments" class="apt-item">
                  <div class="apt-time-box">
                    <span class="apt-date">{{ apt.slotStart | portalDate:'dd MMM' }}</span>
                    <span class="apt-hr">{{ apt.slotStart | portalDate:'h:mm a' }}</span>
                  </div>
                  <div class="apt-meta">
                    <div class="apt-doctor font-bold text-sm text-neutral-900">
                      {{ apt.doctorId?.name || 'Physician Consultation' }}
                    </div>
                    <div class="apt-clinic text-xs text-neutral-500">
                      {{ apt.clinicId?.name || 'Docyra Partner Clinic' }} &bull; {{ apt.clinicId?.city || 'Bengaluru' }}
                    </div>
                  </div>
                  <div class="apt-status">
                    <app-status-badge [status]="apt.status"></app-status-badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="inspector-footer">
            <span class="footer-note">HIPAA Compliant Patient Record</span>
            <button mat-flat-button color="primary" (click)="closePatientDetails()">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-patients-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
    }

    .badge-row {
      margin-bottom: 8px;
    }

    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .badge-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 6px;
      letter-spacing: -0.4px;
    }

    .page-subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
      max-width: 780px;
      line-height: 1.5;
    }

    .action-btn {
      border-color: #D3CECE !important;
      color: #1A2E2E !important;
      font-weight: 600 !important;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% {
        transform: rotate(360deg);
      }
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }

    .stat-card {
      padding: 16px !important;
      border-radius: 12px !important;
      display: flex;
      flex-direction: row !important;
      align-items: center;
      gap: 16px;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .stat-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon-wrap.primary {
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .stat-icon-wrap.success {
      background: #EBF7EE;
      color: #2E9E6B;
    }

    .stat-icon-wrap.warn {
      background: #FDF2F2;
      color: #D9534F;
    }

    .stat-icon-wrap.info {
      background: #FEF3E8;
      color: #C05621;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6C757D;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 800;
      color: #1A2E2E;
      line-height: 1.2;
      margin-top: 2px;
    }

    /* Table Card */
    .table-card {
      padding: 0 !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    /* Toolbar */
    .toolbar-wrap {
      padding: 16px 20px;
      border-bottom: 1px solid #EBECEF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      background: #FAFAF8;
    }

    .search-box {
      flex: 1;
      min-width: 300px;
    }

    .w-full {
      width: 100%;
    }

    .status-tabs {
      display: flex;
      gap: 6px;
      background: #EFEFEF;
      padding: 4px;
      border-radius: 8px;
    }

    .tab-btn {
      padding: 6px 14px;
      border-radius: 6px;
      border: none;
      background: transparent;
      font-size: 12px;
      font-weight: 600;
      color: #5C6B6B;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn.active {
      background: #FFFFFF;
      color: #1A2E2E;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .tab-btn.active-tab.active {
      color: #2E9E6B;
    }

    .tab-btn.suspended-tab.active {
      color: #D9534F;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
    }

    .patients-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .patients-table th {
      padding: 14px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
      white-space: nowrap;
    }

    .patients-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #EBECEF;
      font-size: 13px;
      vertical-align: middle;
    }

    .patient-row {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .patient-row:hover {
      background-color: #F8F9FA;
    }

    .patient-row.suspended-row {
      background-color: #FFFDFD;
    }

    /* Identity Cell */
    .patient-identity-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .patient-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #E6F2F1;
      color: #0F5C5C;
      font-weight: 800;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .patient-avatar.suspended {
      background: #FDF2F2;
      color: #D9534F;
    }

    .identity-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* Contact Cell */
    .contact-line {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 3px;
    }

    .contact-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #8C98A4;
    }

    /* Security Tags */
    .security-tags-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .security-tag, .verify-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: #F4F5F7;
      color: #6C757D;
      width: fit-content;
    }

    .security-tag.enabled, .verify-tag.verified {
      background: #EBF7EE;
      color: #2E9E6B;
    }

    .tag-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }

    /* Utilization */
    .utilization-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      color: #495057;
    }

    .stat-pill-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #6C757D;
    }

    /* Buttons */
    .btn-group {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-sm {
      font-size: 11px !important;
      font-weight: 700 !important;
      height: 30px !important;
      line-height: 30px !important;
      padding: 0 10px !important;
    }

    .inspect-icon-btn {
      color: #0F5C5C !important;
    }

    .inspect-icon-btn:hover {
      background: #E6F2F1 !important;
    }

    .text-right {
      text-align: right;
    }

    /* Loading & Empty */
    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      gap: 16px;
    }

    .loading-text {
      font-size: 13px;
      font-weight: 600;
      color: #5C6B6B;
    }

    .empty-state {
      text-align: center;
      padding: 56px 20px;
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #F4F5F7;
      color: #8C98A4;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .empty-icon-wrap mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .empty-state h3 {
      font-size: 16px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 6px;
    }

    .empty-state p {
      font-size: 13px;
      color: #6C757D;
      margin: 0 0 16px;
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      border-top: 1px solid #EBECEF;
      background: #FAFAF8;
      font-size: 12px;
      color: #6C757D;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .page-size-dropdown {
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid #CED4DA;
      font-size: 12px;
      background: #FFFFFF;
      cursor: pointer;
    }

    .pagination-buttons {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .current-page-num {
      font-weight: 700;
      color: #1A2E2E;
      padding: 0 8px;
    }

    /* Inspector Drawer */
    .inspector-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      backdrop-filter: blur(2px);
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .inspector-panel {
      width: 560px;
      max-width: 92vw;
      height: 100vh;
      background: #FFFFFF;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .inspector-header {
      padding: 24px;
      border-bottom: 1px solid #EBECEF;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #FAFAF8;
    }

    .inspector-kicker {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #0F5C5C;
      display: block;
      margin-bottom: 4px;
    }

    .inspector-title {
      font-size: 20px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 4px;
    }

    .inspector-email {
      font-size: 12px;
      color: #6C757D;
    }

    .inspector-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .status-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-radius: 8px;
      background: #EBF7EE;
      border: 1px solid #C3ECD0;
      color: #1B8755;
    }

    .status-banner.suspended {
      background: #FDF2F2;
      border-color: #F5C6CB;
      color: #D9534F;
    }

    .banner-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .banner-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .banner-title {
      font-size: 13px;
      font-weight: 700;
    }

    .banner-desc {
      font-size: 11px;
      opacity: 0.85;
      margin-top: 2px;
    }

    .inspect-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      margin: 0;
    }

    .inspect-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #FAFAF8;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid #E7E5E0;
    }

    .inspect-prop {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .prop-lbl {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #8C98A4;
    }

    .prop-val {
      font-size: 12px;
      color: #1A2E2E;
      word-break: break-all;
    }

    .drawer-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      font-size: 12px;
      color: #5C6B6B;
    }

    .empty-detail-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      border-radius: 8px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      font-size: 12px;
      color: #8C98A4;
    }

    .box-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #B0BEC5;
    }

    /* Dependents List */
    .dependents-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .dependent-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
    }

    .dep-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #E6F2F1;
      color: #0F5C5C;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Appointments List */
    .appointments-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .apt-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
    }

    .apt-time-box {
      display: flex;
      flex-direction: column;
      min-width: 60px;
    }

    .apt-date {
      font-size: 12px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .apt-hr {
      font-size: 10px;
      color: #6C757D;
    }

    .apt-meta {
      flex: 1;
    }

    .inspector-footer {
      padding: 16px 24px;
      border-top: 1px solid #EBECEF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FAFAF8;
    }

    .footer-note {
      font-size: 11px;
      color: #8C98A4;
      font-weight: 600;
    }
  `],
})
export class ManagePatientsComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);

  patients: User[] = [];
  filteredPatients: User[] = [];
  pagedPatients: User[] = [];
  loading = true;

  // Search & Filter
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'suspended' = 'all';

  // Stats
  stats: PatientStats = {
    totalPatients: 0,
    activePatients: 0,
    suspendedPatients: 0,
    totalDependents: 0,
  };

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Inspector Drawer
  selectedPatient: User | null = null;
  patientDetails: { user: User; dependents: any[]; appointments: any[] } | null = null;
  loadingDetails = false;

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    this.adminService.getPatients().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.patients = res.data;
          this.updateStats();
          this.applySearch();
        }
        this.loading = false;
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to load patients list');
        this.loading = false;
      },
    });
  }

  updateStats(): void {
    const total = this.patients.length;
    const active = this.patients.filter((p) => p.status === 'active' || p.status === undefined).length;
    const suspended = this.patients.filter((p) => p.status === 'suspended').length;
    const dependents = this.patients.reduce((acc, p) => acc + (p.dependentsCount || 0), 0);

    this.stats = {
      totalPatients: total,
      activePatients: active,
      suspendedPatients: suspended,
      totalDependents: dependents,
    };
  }

  setStatusFilter(filter: 'all' | 'active' | 'suspended'): void {
    this.statusFilter = filter;
    this.currentPage = 1;
    this.applySearch();
  }

  getCountByStatus(status: 'active' | 'suspended'): number {
    if (status === 'active') {
      return this.patients.filter((p) => p.status === 'active' || p.status === undefined).length;
    }
    return this.patients.filter((p) => p.status === 'suspended').length;
  }

  applySearch(): void {
    let result = [...this.patients];

    if (this.statusFilter !== 'all') {
      if (this.statusFilter === 'active') {
        result = result.filter((p) => p.status === 'active' || p.status === undefined);
      } else {
        result = result.filter((p) => p.status === 'suspended');
      }
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.email.toLowerCase().includes(term) ||
          (p.phone && p.phone.includes(term))
      );
    }

    this.filteredPatients = result;
    this.totalPages = Math.ceil(this.filteredPatients.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    this.paginate();
  }

  paginate(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedPatients = this.filteredPatients.slice(start, end);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredPatients.length / this.pageSize) || 1;
    this.paginate();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.paginate();
  }

  getShowingTo(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredPatients.length);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.currentPage = 1;
    this.applySearch();
  }

  togglePatientStatus(userId: string, newStatus: 'active' | 'suspended'): void {
    this.adminService.updateUserStatus(userId, newStatus).subscribe({
      next: (res) => {
        this.notificationService.success(`Patient account status updated to ${newStatus}`);
        // Optimistically update current patient in table
        const target = this.patients.find((p) => p._id === userId);
        if (target) {
          target.status = newStatus;
        }
        if (this.selectedPatient && this.selectedPatient._id === userId) {
          this.selectedPatient.status = newStatus;
        }
        this.updateStats();
        this.applySearch();
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to update patient status');
      },
    });
  }

  openPatientDetails(patient: User): void {
    this.selectedPatient = { ...patient };
    this.loadingDetails = true;
    this.adminService.getPatientDetail(patient._id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.patientDetails = res.data;
        }
        this.loadingDetails = false;
      },
      error: () => {
        this.patientDetails = null;
        this.loadingDetails = false;
      },
    });
  }

  closePatientDetails(): void {
    this.selectedPatient = null;
    this.patientDetails = null;
  }

  getInitials(name?: string): string {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getRelativeDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));
      if (diffDays < 1) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays} days ago`;
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} mo ago`;
    } catch {
      return '';
    }
  }
}
