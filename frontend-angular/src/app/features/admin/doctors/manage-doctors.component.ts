import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Doctor } from '../../../core/models/doctor.model';
import { Specialization } from '../../../core/models/specialization.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-admin-manage-doctors',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    StatusBadgeComponent,
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
    <div class="manage-doctors-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Manage Physicians & Specialists</h1>
          <p class="page-subtitle">
            Oversee verified practitioners, clinic affiliations, clinical scope, and live consultation metrics across Docyra.
          </p>
        </div>

        <div class="header-actions">
          <button
            mat-stroked-button
            class="action-btn"
            (click)="loadDoctors()"
            [disabled]="loading"
            title="Refresh doctors roster"
          >
            <mat-icon [class.spinning]="loading">refresh</mat-icon>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards: Clean Standard Subtle Layout -->
      <div class="kpi-grid">
        <div class="metric-card">
          <div class="metric-top">
            <span class="metric-label">Total Physicians</span>
            <mat-icon class="metric-icon">medical_services</mat-icon>
          </div>
          <div class="metric-value">{{ doctors.length }}</div>
          <div class="metric-sub">Registered medical practitioners</div>
        </div>

        <div class="metric-card">
          <div class="metric-top">
            <span class="metric-label">Active Doctors</span>
            <mat-icon class="metric-icon">verified</mat-icon>
          </div>
          <div class="metric-value">{{ countActive() }}</div>
          <div class="metric-sub">Verified & in good standing</div>
        </div>

        <div class="metric-card">
          <div class="metric-top">
            <span class="metric-label">Clinic-Affiliated</span>
            <mat-icon class="metric-icon">local_hospital</mat-icon>
          </div>
          <div class="metric-value">{{ countClinicAffiliated() }}</div>
          <div class="metric-sub">Partner hospital practitioners</div>
        </div>

        <div class="metric-card">
          <div class="metric-top">
            <span class="metric-label">Independent Practice</span>
            <mat-icon class="metric-icon">domain</mat-icon>
          </div>
          <div class="metric-value">{{ countIndependent() }}</div>
          <div class="metric-sub">Direct patient consultation</div>
        </div>
      </div>

      <!-- Doctors Table Card -->
      <mat-card class="table-card">
        <!-- Filter & Search Toolbar -->
        <div class="toolbar-wrap">
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              placeholder="Search by physician name, email, specialization, clinic, or city..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="applyFilters()"
              class="search-input"
            />
            <button
              *ngIf="searchTerm"
              type="button"
              class="clear-search-btn"
              (click)="clearSearch()"
              title="Clear Search"
            >
              <mat-icon class="clear-icon">close</mat-icon>
            </button>
          </div>

          <div class="filters-group">
            <!-- Specialization Filter -->
            <select
              [(ngModel)]="specializationFilter"
              (ngModelChange)="applyFilters()"
              class="dropdown-filter"
            >
              <option value="all">All Specialties</option>
              <option *ngFor="let spec of specializations" [value]="spec._id">
                {{ spec.name }}
              </option>
            </select>

            <!-- Status Tabs -->
            <div class="status-tabs">
              <button
                class="tab-btn"
                [class.active]="statusFilter === 'all'"
                (click)="setStatusFilter('all')"
              >
                All ({{ doctors.length }})
              </button>
              <button
                class="tab-btn active-tab"
                [class.active]="statusFilter === 'active'"
                (click)="setStatusFilter('active')"
              >
                Active ({{ countActive() }})
              </button>
              <button
                class="tab-btn suspended-tab"
                [class.active]="statusFilter === 'suspended'"
                (click)="setStatusFilter('suspended')"
              >
                Suspended ({{ countSuspended() }})
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading && doctors.length === 0" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
          <p class="loading-text">Loading registered physician profiles...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && filteredDoctors.length === 0" class="empty-state">
          <div class="empty-icon-wrap">
            <mat-icon>medical_services</mat-icon>
          </div>
          <h3>No Physicians Found</h3>
          <p>No physician profiles match your current search query or applied filters.</p>
          <button mat-stroked-button color="primary" (click)="clearAllFilters()">
            Clear All Filters
          </button>
        </div>

        <!-- Doctors Table -->
        <div *ngIf="filteredDoctors.length > 0" class="table-container">
          <table class="doctors-table">
            <thead>
              <tr>
                <th class="physician-col">Physician & Identity</th>
                <th class="spec-col">Specialty & Department</th>
                <th class="facility-col">Practice Facility</th>
                <th class="credentials-col">Credentials & Experience</th>
                <th class="fee-col">Consultation Fee</th>
                <th class="rating-col">Rating & Reviews</th>
                <th class="status-col">Account Status</th>
                <th class="actions-col text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let doc of filteredDoctors"
                class="doctor-row cursor-pointer"
                [class.suspended-row]="doc.status === 'suspended'"
                (click)="openDoctorProfile(doc)"
              >
                <!-- Physician Identity -->
                <td class="physician-cell">
                  <div class="doctor-identity-wrap">
                    <div class="doctor-avatar" [ngClass]="doc.status || 'active'">
                      <img *ngIf="doc.profilePhotoUrl" [src]="doc.profilePhotoUrl" alt="" />
                      <span *ngIf="!doc.profilePhotoUrl">{{ getInitials(doc.name) }}</span>
                    </div>
                    <div class="identity-meta">
                      <div class="doctor-name">
                        {{ getDoctorDisplayName(doc) }}
                      </div>
                      <div class="doctor-email">
                        {{ doc.email || 'Email on file' }}
                      </div>
                      <div class="doctor-meta-sub">
                        <span *ngIf="doc.phone" class="doctor-phone">
                          <mat-icon class="sub-ic">call</mat-icon>
                          <span>{{ doc.phone }}</span>
                        </span>
                        <span *ngIf="doc.phone && doc._id" class="sub-sep">&bull;</span>
                        <span *ngIf="doc._id" class="doctor-code">
                          #{{ (doc._id || '').slice(-6) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Specialization -->
                <td class="spec-cell">
                  <div class="spec-badge">
                    <mat-icon class="spec-icon">
                      {{ getSpecializationIcon(doc) }}
                    </mat-icon>
                    <span>{{ getSpecializationName(doc) }}</span>
                  </div>
                </td>

                <!-- Practice Facility -->
                <td class="facility-cell">
                  <div *ngIf="isClinicDoctor(doc)" class="facility-wrap">
                    <div class="facility-header">
                      <mat-icon class="facility-icon">local_hospital</mat-icon>
                      <span class="facility-name" [title]="getClinicName(doc)">
                        {{ getClinicName(doc) }}
                      </span>
                    </div>
                    <div class="facility-city">
                      <mat-icon class="city-icon">location_on</mat-icon>
                      <span>{{ getClinicCity(doc) }}</span>
                    </div>
                  </div>
                  <div *ngIf="!isClinicDoctor(doc)" class="facility-wrap">
                    <div class="facility-header">
                      <span class="independent-tag">
                        <mat-icon class="ind-icon">medical_services</mat-icon>
                        <span>Independent Practice</span>
                      </span>
                    </div>
                    <div class="facility-city" [title]="doc.clinicAddress || 'Bengaluru'">
                      <mat-icon class="city-icon">location_on</mat-icon>
                      <span>{{ truncate(doc.clinicAddress, 26) || getClinicCity(doc) }}</span>
                    </div>
                  </div>
                </td>

                <!-- Credentials & Experience -->
                <td class="credentials-cell">
                  <div class="exp-text">
                    {{ getExperience(doc) }}
                  </div>
                  <div class="qual-chips-wrap" *ngIf="doc.qualifications && doc.qualifications.length > 0">
                    <span class="qual-chip" *ngFor="let q of doc.qualifications.slice(0, 2)">
                      {{ q }}
                    </span>
                    <span *ngIf="doc.qualifications.length > 2" class="qual-more" [matTooltip]="doc.qualifications.join(', ')">
                      +{{ doc.qualifications.length - 2 }}
                    </span>
                  </div>
                  <div *ngIf="!doc.qualifications || doc.qualifications.length === 0" class="qual-fallback">
                    Medical Practitioner
                  </div>
                </td>

                <!-- Consultation Fee -->
                <td class="fee-cell">
                  <div class="fee-amount">
                    ₹{{ doc.consultationFee || 500 }}
                  </div>
                  <div class="fee-sub">per visit</div>
                </td>

                <!-- Rating -->
                <td class="rating-cell">
                  <div class="rating-wrap">
                    <span class="rating-badge">⭐ {{ doc.avgRating ? (doc.avgRating | number:'1.1-1') : '5.0' }}</span>
                    <span class="review-count">({{ doc.totalReviews || 0 }} {{ (doc.totalReviews || 0) === 1 ? 'review' : 'reviews' }})</span>
                  </div>
                </td>

                <!-- Status -->
                <td class="status-cell">
                  <app-status-badge [status]="doc.status || 'active'"></app-status-badge>
                </td>

                <!-- Actions -->
                <td class="actions-cell text-right" (click)="$event.stopPropagation()">
                  <div class="btn-group">
                    <button
                      mat-stroked-button
                      class="inspect-btn"
                      (click)="openDoctorProfile(doc)"
                      matTooltip="Open Full Physician Dossier"
                    >
                      <mat-icon class="btn-icon">visibility</mat-icon>
                      <span>View</span>
                    </button>

                    <button
                      *ngIf="doc.status !== 'suspended'"
                      mat-stroked-button
                      color="warn"
                      (click)="toggleDoctorStatus(doc, 'suspended')"
                      class="btn-sm suspend-btn"
                      matTooltip="Suspend physician credentials"
                    >
                      Suspend
                    </button>

                    <button
                      *ngIf="doc.status === 'suspended'"
                      mat-stroked-button
                      color="primary"
                      (click)="toggleDoctorStatus(doc, 'active')"
                      class="btn-sm activate-btn"
                      matTooltip="Reactivate physician credentials"
                    >
                      Activate
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>

      <!-- View Doctor Profile Slide-over Drawer -->
      <div *ngIf="selectedDoctor" class="drawer-backdrop" (click)="closeDoctorProfile()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <!-- Drawer Header -->
          <div class="drawer-header">
            <div class="drawer-header-content">
              <div class="doc-header-avatar" [ngClass]="selectedDoctor.status || 'active'">
                <img *ngIf="selectedDoctor.profilePhotoUrl" [src]="selectedDoctor.profilePhotoUrl" alt="" />
                <span *ngIf="!selectedDoctor.profilePhotoUrl">{{ getInitials(selectedDoctor.name) }}</span>
              </div>
              <div class="doc-header-meta">
                <div class="dossier-kicker">PHYSICIAN CREDENTIAL DOSSIER</div>
                <h3 class="doc-header-name">{{ getDoctorDisplayName(selectedDoctor) }}</h3>
                <div class="header-badges">
                  <app-status-badge [status]="selectedDoctor.status || 'active'"></app-status-badge>
                  <span class="spec-header-pill">
                    <mat-icon class="pill-icon">{{ getSpecializationIcon(selectedDoctor) }}</mat-icon>
                    {{ getSpecializationName(selectedDoctor) }}
                  </span>
                  <span class="rating-header-pill">
                    ⭐ {{ selectedDoctor.avgRating ? (selectedDoctor.avgRating | number:'1.1-1') : '5.0' }}
                  </span>
                </div>
              </div>
            </div>
            <button mat-icon-button (click)="closeDoctorProfile()" title="Close Dossier">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Drawer Body -->
          <div class="drawer-body">
            <!-- Loading Details Indicator -->
            <div *ngIf="loadingDetail" class="detail-loading-wrap">
              <mat-spinner diameter="28"></mat-spinner>
              <span>Fetching live clinical appointment metrics & schedule...</span>
            </div>

            <!-- Live Clinical Performance Cards -->
            <div class="section-card">
              <div class="section-header">
                <mat-icon class="section-icon">analytics</mat-icon>
                <h4 class="section-title">Clinical Consultation Metrics</h4>
              </div>
              <div class="stats-cards-grid">
                <div class="metric-box">
                  <span class="metric-val">{{ selectedDoctor.realtimeStats?.totalAppointments ?? 0 }}</span>
                  <span class="metric-lbl">Total Bookings</span>
                </div>
                <div class="metric-box">
                  <span class="metric-val text-emerald-600">{{ selectedDoctor.realtimeStats?.completedAppointments ?? 0 }}</span>
                  <span class="metric-lbl">Completed</span>
                </div>
                <div class="metric-box">
                  <span class="metric-val text-blue-600">{{ selectedDoctor.realtimeStats?.upcomingAppointments ?? 0 }}</span>
                  <span class="metric-lbl">Upcoming</span>
                </div>
                <div class="metric-box">
                  <span class="metric-val text-amber-700">₹{{ (selectedDoctor.realtimeStats?.totalRevenueGenerated ?? 0) | number }}</span>
                  <span class="metric-lbl">Total Revenue</span>
                </div>
              </div>
            </div>

            <!-- Professional Credentials & Practice Specs -->
            <div class="section-card">
              <div class="section-header">
                <mat-icon class="section-icon">badge</mat-icon>
                <h4 class="section-title">Credentials & Regulatory Information</h4>
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Medical Council License</span>
                  <span class="info-val font-mono">{{ selectedDoctor.licenseNumber || 'License verified on file' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Years of Experience</span>
                  <span class="info-val font-semibold">{{ getExperience(selectedDoctor) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Consultation Fee</span>
                  <span class="info-val font-bold text-emerald-700">₹{{ selectedDoctor.consultationFee || 500 }} ({{ selectedDoctor.feeCurrency || 'INR' }})</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Slot Duration</span>
                  <span class="info-val">{{ selectedDoctor.slotDurationMinutes || 30 }} Minutes</span>
                </div>
                <div class="info-item full-width">
                  <span class="info-label">Educational Qualifications</span>
                  <div class="qual-badges-list" *ngIf="selectedDoctor.qualifications && selectedDoctor.qualifications.length > 0">
                    <span class="detail-qual-chip" *ngFor="let q of selectedDoctor.qualifications">
                      {{ q }}
                    </span>
                  </div>
                  <span *ngIf="!selectedDoctor.qualifications || selectedDoctor.qualifications.length === 0" class="info-val text-neutral-400">
                    Certified Medical Practitioner
                  </span>
                </div>
                <div class="info-item full-width" *ngIf="selectedDoctor.licenseDocumentUrl">
                  <span class="info-label">License Document</span>
                  <a [href]="selectedDoctor.licenseDocumentUrl" target="_blank" class="document-link">
                    <mat-icon class="doc-link-icon">description</mat-icon>
                    <span>View Verified License Certificate</span>
                    <mat-icon class="doc-link-arrow">open_in_new</mat-icon>
                  </a>
                </div>
              </div>
            </div>

            <!-- Practice Facility Location -->
            <div class="section-card">
              <div class="section-header">
                <mat-icon class="section-icon">domain</mat-icon>
                <h4 class="section-title">Practice Affiliation & Facility</h4>
              </div>
              <div class="info-grid">
                <div class="info-item full-width">
                  <span class="info-label">Facility Classification</span>
                  <span class="info-val font-semibold">
                    {{ isClinicDoctor(selectedDoctor) ? 'Institutional Hospital / Partner Clinic' : 'Direct Independent Outpatient Practice' }}
                  </span>
                </div>
                <div class="info-item" *ngIf="isClinicDoctor(selectedDoctor)">
                  <span class="info-label">Hospital / Clinic Name</span>
                  <span class="info-val font-bold text-neutral-900">{{ getClinicName(selectedDoctor) }}</span>
                </div>
                <div class="info-item" *ngIf="isClinicDoctor(selectedDoctor)">
                  <span class="info-label">Facility City</span>
                  <span class="info-val">{{ getClinicCity(selectedDoctor) }}</span>
                </div>
                <div class="info-item full-width" *ngIf="selectedDoctor.clinicAddress || (selectedDoctor.clinicId && selectedDoctor.clinicId.address)">
                  <span class="info-label">Address</span>
                  <span class="info-val text-neutral-600">
                    {{ selectedDoctor.clinicAddress || selectedDoctor.clinicId?.address }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Weekly Availability Schedule -->
            <div class="section-card" *ngIf="selectedDoctor.weeklySchedule && selectedDoctor.weeklySchedule.length > 0">
              <div class="section-header">
                <mat-icon class="section-icon">calendar_month</mat-icon>
                <h4 class="section-title">Weekly Consultation Schedule</h4>
              </div>
              <div class="schedule-grid">
                <div *ngFor="let day of selectedDoctor.weeklySchedule" class="day-schedule-row" [class.inactive-day]="!day.isActive">
                  <span class="day-name">{{ getDayOfWeekName(day.dayOfWeek) }}</span>
                  <div class="day-slots" *ngIf="day.isActive && day.slots && day.slots.length > 0">
                    <span class="slot-pill" *ngFor="let slot of day.slots">
                      {{ slot.start }} - {{ slot.end }}
                    </span>
                  </div>
                  <div class="day-slots" *ngIf="!day.isActive || !day.slots || day.slots.length === 0">
                    <span class="off-pill">Off Duty</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Professional Bio -->
            <div class="section-card" *ngIf="selectedDoctor.bio">
              <div class="section-header">
                <mat-icon class="section-icon">notes</mat-icon>
                <h4 class="section-title">Clinical Statement & Biography</h4>
              </div>
              <div class="bio-text">
                {{ selectedDoctor.bio }}
              </div>
            </div>

            <!-- Contact & Registration -->
            <div class="section-card">
              <div class="section-header">
                <mat-icon class="section-icon">contact_phone</mat-icon>
                <h4 class="section-title">Direct Contact Information</h4>
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Email Address</span>
                  <span class="info-val">{{ selectedDoctor.email || 'Email on file' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Phone Number</span>
                  <span class="info-val font-mono">{{ selectedDoctor.phone || 'Phone on file' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Doctor Identifier</span>
                  <span class="info-val font-mono text-xs">{{ selectedDoctor._id }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Drawer Footer -->
          <div class="drawer-footer">
            <button
              *ngIf="selectedDoctor.status !== 'suspended'"
              mat-stroked-button
              color="warn"
              (click)="toggleDoctorStatus(selectedDoctor, 'suspended')"
              class="footer-action-btn"
            >
              <mat-icon>block</mat-icon>
              <span>Suspend Physician</span>
            </button>
            <button
              *ngIf="selectedDoctor.status === 'suspended'"
              mat-flat-button
              color="primary"
              (click)="toggleDoctorStatus(selectedDoctor, 'active')"
              class="footer-action-btn"
            >
              <mat-icon>check_circle</mat-icon>
              <span>Activate Physician</span>
            </button>
            <button mat-button (click)="closeDoctorProfile()">
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-doctors-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-title {
      font-size: 24px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 4px;
      letter-spacing: -0.4px;
    }

    .page-subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
      max-width: 780px;
      line-height: 1.5;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
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
      100% { transform: rotate(360deg); }
    }

    /* KPI Summary Cards: Clean Standard Subtle Layout */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }

    @media (max-width: 1024px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }
    }

    .metric-card {
      background: #FFFFFF;
      border: 1px solid #EBECEF;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      cursor: default;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .metric-card:hover {
      border-color: #CBD5E1;
      background-color: #FBFBFC;
    }

    .metric-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .metric-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748B;
    }

    .metric-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #94A3B8;
    }

    .metric-value {
      font-size: 26px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.5px;
      line-height: 1.15;
      margin: 2px 0 0;
    }

    .metric-sub {
      font-size: 11.5px;
      color: #64748B;
      margin-top: 2px;
    }

    /* Table Card */
    .table-card {
      padding: 0 !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      overflow: hidden;
      box-shadow: none !important;
    }

    /* Toolbar */
    .toolbar-wrap {
      padding: 14px 18px;
      border-bottom: 1px solid #EBECEF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      background: #FAFAF8;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #FFFFFF;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      padding: 0 12px;
      flex: 1;
      min-width: 280px;
      max-width: 440px;
      height: 38px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .search-box:focus-within {
      border-color: #0F5C5C;
      box-shadow: 0 0 0 3px rgba(15, 92, 92, 0.1);
    }

    .search-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #9CA3AF;
    }

    .search-input {
      border: none;
      outline: none;
      background: transparent;
      font-size: 13px;
      color: #1F2937;
      width: 100%;
    }

    .search-input::placeholder {
      color: #9CA3AF;
    }

    .clear-search-btn {
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9CA3AF;
    }

    .clear-search-btn:hover {
      color: #4B5563;
    }

    .clear-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .filters-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .dropdown-filter {
      height: 36px;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid #D1D5DB;
      background: #FFFFFF;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      outline: none;
      cursor: pointer;
    }

    .dropdown-filter:focus {
      border-color: #0F5C5C;
    }

    .status-tabs {
      display: flex;
      gap: 4px;
      background: #EFEFEF;
      padding: 3px;
      border-radius: 8px;
    }

    .tab-btn {
      padding: 5px 12px;
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

    /* Table Container */
    .table-container {
      overflow-x: auto;
    }

    .doctors-table {
      width: 100%;
      min-width: 1080px;
      border-collapse: collapse;
      text-align: left;
    }

    .doctors-table th {
      padding: 13px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #4B5563;
      border-bottom: 1px solid #E5E7EB;
      background: #F9FAFB;
      white-space: nowrap;
    }

    .doctors-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 13px;
      vertical-align: middle;
      color: #1F2937;
    }

    .doctor-row {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .doctor-row:hover {
      background-color: #FAFAF8;
    }

    .doctor-row.suspended-row {
      background-color: #FFFDFD;
    }

    /* Column Widths */
    .physician-col { width: 22%; min-width: 220px; }
    .spec-col { width: 14%; min-width: 135px; }
    .facility-col { width: 17%; min-width: 170px; }
    .credentials-col { width: 14%; min-width: 135px; }
    .fee-col { width: 10%; min-width: 95px; }
    .rating-col { width: 12%; min-width: 125px; }
    .status-col { width: 8%; min-width: 90px; }
    .actions-col { width: 13%; min-width: 145px; text-align: right; }

    /* Physician Identity */
    .doctor-identity-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .doctor-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #E6F2F1;
      color: #0F5C5C;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .doctor-avatar.suspended {
      background: #FEE2E2;
      color: #DC2626;
    }

    .doctor-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .identity-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .doctor-name {
      font-size: 13.5px;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.3;
    }

    .doctor-email {
      font-size: 12px;
      color: #64748B;
    }

    .doctor-meta-sub {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: #94A3B8;
      margin-top: 1px;
    }

    .doctor-phone {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: #64748B;
    }

    .sub-ic {
      font-size: 12px;
      width: 12px;
      height: 12px;
      line-height: 12px;
    }

    .sub-sep {
      color: #CBD5E1;
    }

    .doctor-code {
      font-family: monospace;
      color: #94A3B8;
    }

    /* Specialty Badge */
    .spec-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #E8F5F1;
      color: #0F5C5C;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid #C4E5DC;
      white-space: nowrap;
    }

    .spec-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    /* Facility */
    .facility-wrap {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .facility-header {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .facility-name {
      font-size: 12.5px;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 170px;
    }

    .facility-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: #2563EB;
      flex-shrink: 0;
    }

    .facility-city {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11.5px;
      color: #64748B;
    }

    .city-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
      color: #94A3B8;
      flex-shrink: 0;
    }

    .independent-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #0F5C5C;
      background: #E6F2F1;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #C4E5DC;
      white-space: nowrap;
    }

    .ind-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }

    /* Credentials */
    .exp-text {
      font-size: 12.5px;
      font-weight: 700;
      color: #1E293B;
      margin-bottom: 2px;
      white-space: nowrap;
    }

    .qual-chips-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .qual-chip {
      font-size: 10.5px;
      background: #F1F5F9;
      color: #334155;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
      border: 1px solid #E2E8F0;
    }

    .qual-more {
      font-size: 10.5px;
      color: #64748B;
      font-weight: 700;
      cursor: help;
    }

    .qual-fallback {
      font-size: 11px;
      color: #94A3B8;
    }

    /* Consultation Fee */
    .fee-amount {
      font-size: 13.5px;
      font-weight: 800;
      color: #0F5C5C;
    }

    .fee-sub {
      font-size: 11px;
      color: #94A3B8;
    }

    /* Rating */
    .rating-wrap {
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }

    .rating-badge {
      font-weight: 800;
      font-size: 12.5px;
      color: #D97706;
    }

    .review-count {
      font-size: 11px;
      color: #64748B;
    }

    /* Action Buttons */
    .btn-group {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      vertical-align: middle;
    }

    .inspect-btn,
    .btn-sm {
      height: 30px !important;
      line-height: 28px !important;
      padding: 0 10px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      border-radius: 6px !important;
      box-shadow: none !important;
    }

    .inspect-btn {
      border-color: #D1D5DB !important;
      color: #374151 !important;
      background: #FFFFFF !important;
    }

    .inspect-btn:hover {
      background: #F3F4F6 !important;
      border-color: #9CA3AF !important;
      color: #0F5C5C !important;
    }

    .suspend-btn {
      border-color: #FECACA !important;
      color: #DC2626 !important;
      background: #FFFFFF !important;
    }

    .suspend-btn:hover {
      background: #FEF2F2 !important;
      border-color: #F87171 !important;
    }

    .activate-btn {
      border-color: #A7F3D0 !important;
      color: #059669 !important;
      background: #FFFFFF !important;
    }

    .activate-btn:hover {
      background: #ECFDF5 !important;
      border-color: #6EE7B7 !important;
    }

    .btn-icon {
      font-size: 15px !important;
      width: 15px !important;
      height: 15px !important;
      line-height: 15px !important;
    }

    .text-right { text-align: right; }

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

    /* Slide-Over Drawer */
    .drawer-backdrop {
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

    .drawer-panel {
      width: 600px;
      max-width: 95vw;
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

    .drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid #EBECEF;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #FAFAF8;
    }

    .drawer-header-content {
      display: flex;
      gap: 14px;
      align-items: center;
    }

    .doc-header-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #E6F2F1;
      color: #0F5C5C;
      font-weight: 800;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .doc-header-avatar.suspended {
      background: #FEE2E2;
      color: #DC2626;
    }

    .doc-header-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .doc-header-meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .dossier-kicker {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #0F5C5C;
    }

    .doc-header-name {
      font-size: 18px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .header-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      flex-wrap: wrap;
    }

    .spec-header-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #0F5C5C;
      background: #E6F2F1;
      padding: 2px 8px;
      border-radius: 999px;
    }

    .pill-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }

    .rating-header-pill {
      font-size: 11px;
      font-weight: 700;
      color: #B45309;
      background: #FEF3C7;
      padding: 2px 8px;
      border-radius: 999px;
    }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-loading-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: #F0FDF4;
      border-radius: 8px;
      border: 1px solid #DCFCE7;
      font-size: 12px;
      color: #166534;
      font-weight: 600;
    }

    .section-card {
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 16px;
      background: #FFFFFF;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #F3F4F6;
    }

    .section-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #0F5C5C;
    }

    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #374151;
      margin: 0;
    }

    .stats-cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .metric-box {
      background: #FAFAF8;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .metric-val {
      font-size: 18px;
      font-weight: 800;
      color: #1A2E2E;
      line-height: 1.2;
    }

    .metric-lbl {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6B7280;
      margin-top: 3px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-item.full-width {
      grid-column: span 2;
    }

    .info-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #9CA3AF;
    }

    .info-val {
      font-size: 13px;
      color: #1F2937;
    }

    .qual-badges-list {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .detail-qual-chip {
      background: #F3F4F6;
      color: #1F2937;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
    }

    .document-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #EFF6FF;
      color: #1D4ED8;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 6px;
      text-decoration: none;
      margin-top: 4px;
      border: 1px solid #BFDBFE;
    }

    .doc-link-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .doc-link-arrow {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-left: 4px;
    }

    /* Weekly Schedule */
    .schedule-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .day-schedule-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: #FAFAF8;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
      font-size: 12px;
    }

    .day-schedule-row.inactive-day {
      opacity: 0.6;
    }

    .day-name {
      font-weight: 700;
      color: #374151;
      width: 90px;
    }

    .day-slots {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .slot-pill {
      background: #F0FDF4;
      color: #166534;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #BBF7D0;
    }

    .off-pill {
      font-size: 11px;
      color: #9CA3AF;
      font-weight: 600;
    }

    .bio-text {
      font-size: 13px;
      line-height: 1.6;
      color: #4B5563;
      white-space: pre-line;
    }

    /* Drawer Footer */
    .drawer-footer {
      padding: 16px 24px;
      border-top: 1px solid #EBECEF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FAFAF8;
    }

    .footer-action-btn {
      font-weight: 700 !important;
    }
  `],
})
export class ManageDoctorsAdminComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  specializations: Specialization[] = [];
  loading = true;

  // Filters
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'suspended' = 'all';
  specializationFilter = 'all';
  practiceFilter: 'all' | 'clinic' | 'independent' = 'all';

  // Selected Profile Dossier
  selectedDoctor: any | null = null;
  loadingDetail = false;
  pendingDoctorId: string | null = null;

  ngOnInit(): void {
    this.loadSpecializations();
    this.loadDoctors();
    this.route.queryParams.subscribe((params) => {
      const docId = params['viewDoctorId'] || params['doctorId'];
      if (docId) {
        this.pendingDoctorId = docId;
        this.checkPendingDoctor();
      }
    });
  }

  checkPendingDoctor(): void {
    if (this.pendingDoctorId && this.doctors.length > 0) {
      const targetId = this.pendingDoctorId;
      const found = this.doctors.find(
        (d) =>
          d._id === targetId ||
          (d as any).id === targetId ||
          (d.userId && ((d.userId as any)._id === targetId || (d.userId as any).id === targetId || d.userId === targetId))
      );
      if (found) {
        this.openDoctorProfile(found);
      } else {
        this.adminService.getDoctorDetail(targetId).subscribe({
          next: (res) => {
            if (res.success && res.data) {
              this.openDoctorProfile(res.data);
            }
          },
        });
      }
      this.pendingDoctorId = null;
    }
  }

  loadSpecializations(): void {
    this.adminService.getSpecializations().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.specializations = res.data;
          this.cdr.markForCheck();
        }
      },
    });
  }

  loadDoctors(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.adminService.getDoctors({ limit: 1000 }).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.doctors = res.data;
          this.applyFilters();
          if (this.pendingDoctorId) {
            this.checkPendingDoctor();
          }
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

  applyFilters(): void {
    let result = [...this.doctors];

    // Status Filter
    if (this.statusFilter !== 'all') {
      result = result.filter((d) => (d.status || 'active') === this.statusFilter);
    }

    // Specialization Filter
    if (this.specializationFilter !== 'all') {
      result = result.filter((d) => {
        const specId = (typeof d.specializationId === 'object' && d.specializationId)
          ? (d.specializationId as any)._id
          : d.specializationId;
        return specId === this.specializationFilter;
      });
    }

    // Practice Affiliation Filter
    if (this.practiceFilter === 'clinic') {
      result = result.filter((d) => this.isClinicDoctor(d));
    } else if (this.practiceFilter === 'independent') {
      result = result.filter((d) => !this.isClinicDoctor(d));
    }

    // Search term filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter((d) => {
        const name = (d.name || (d.userId as any)?.name || '').toLowerCase();
        const email = (d.email || (d.userId as any)?.email || '').toLowerCase();
        const phone = (d.phone || (d.userId as any)?.phone || '').toLowerCase();
        const spec = this.getSpecializationName(d).toLowerCase();
        const clinic = this.getClinicName(d).toLowerCase();
        const city = this.getClinicCity(d).toLowerCase();
        return (
          name.includes(term) ||
          email.includes(term) ||
          phone.includes(term) ||
          spec.includes(term) ||
          clinic.includes(term) ||
          city.includes(term)
        );
      });
    }

    this.filteredDoctors = result;
    this.cdr.markForCheck();
  }

  setStatusFilter(status: 'all' | 'active' | 'suspended'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  setPracticeFilter(type: 'all' | 'clinic' | 'independent'): void {
    this.practiceFilter = type;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.specializationFilter = 'all';
    this.practiceFilter = 'all';
    this.applyFilters();
  }

  countActive(): number {
    return this.doctors.filter((d) => (d.status || 'active') === 'active').length;
  }

  countSuspended(): number {
    return this.doctors.filter((d) => d.status === 'suspended').length;
  }

  countClinicAffiliated(): number {
    return this.doctors.filter((d) => this.isClinicDoctor(d)).length;
  }

  countIndependent(): number {
    return this.doctors.filter((d) => !this.isClinicDoctor(d)).length;
  }

  isClinicDoctor(doc: any): boolean {
    if (doc.isIndependent) return false;
    return !!doc.clinicId;
  }

  getDoctorDisplayName(doc: any): string {
    const rawName = doc.name || doc.userId?.name || 'Practicing Physician';
    const title = doc.title || 'Dr.';
    if (rawName.toLowerCase().startsWith('dr.')) {
      return rawName;
    }
    return `${title} ${rawName}`;
  }

  getInitials(name?: string): string {
    if (!name) return 'DR';
    return name
      .replace(/^dr\.?\s+/i, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  getSpecializationName(doc: any): string {
    if (doc.specializationName) return doc.specializationName;
    if (doc.specializationId && typeof doc.specializationId === 'object') {
      return doc.specializationId.name || 'General Medicine';
    }
    const matched = this.specializations.find((s) => s._id === doc.specializationId);
    return matched ? matched.name : 'General Medicine';
  }

  getSpecializationIcon(doc: any): string {
    if (doc.specializationIcon) {
      return this.mapIconName(doc.specializationIcon);
    }
    if (doc.specializationId && typeof doc.specializationId === 'object' && doc.specializationId.iconName) {
      return this.mapIconName(doc.specializationId.iconName);
    }
    return 'medical_services';
  }

  mapIconName(iconName?: string): string {
    switch (iconName) {
      case 'HeartPulse':
      case 'Cardiology':
        return 'favorite';
      case 'Sparkles':
      case 'Dermatology':
        return 'healing';
      case 'Baby':
      case 'Pediatrics':
        return 'child_care';
      case 'Activity':
      case 'Orthopedics':
        return 'accessibility_new';
      case 'Brain':
      case 'Neurology':
        return 'psychology';
      case 'Dental':
        return 'dentistry';
      case 'Eye':
        return 'visibility';
      case 'Mental':
        return 'mood';
      case 'Cancer':
        return 'biotech';
      default:
        return 'medical_services';
    }
  }

  getClinicName(doc: any): string {
    if (doc.clinicName) return doc.clinicName;
    if (doc.clinicId && typeof doc.clinicId === 'object') {
      return doc.clinicId.name || 'Partner Facility';
    }
    return 'Independent Practice';
  }

  getClinicCity(doc: any): string {
    if (doc.clinicCity) return doc.clinicCity;
    if (doc.clinicId && typeof doc.clinicId === 'object') {
      return doc.clinicId.city || 'India';
    }
    return 'India';
  }

  truncate(str?: string, maxLen: number = 24): string {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
  }

  getExperience(doc: any): string {
    const yrs = doc.yearsExperience ?? doc.experienceYears ?? 0;
    return `${yrs} ${yrs === 1 ? 'Year' : 'Years'} Exp`;
  }

  getDayOfWeekName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || `Day ${day}`;
  }

  openDoctorProfile(doc: Doctor): void {
    this.selectedDoctor = { ...doc };
    this.loadingDetail = true;
    this.cdr.markForCheck();

    this.adminService.getDoctorDetail(doc._id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedDoctor = { ...this.selectedDoctor, ...res.data };
        }
        this.loadingDetail = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingDetail = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeDoctorProfile(): void {
    this.selectedDoctor = null;
    this.cdr.markForCheck();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { viewDoctorId: null, doctorId: null },
      queryParamsHandling: 'merge',
    });
  }

  toggleDoctorStatus(doc: any, newStatus: 'active' | 'suspended'): void {
    const action = newStatus === 'active' ? 'reactivate' : 'suspend';
    const doctorName = this.getDoctorDisplayName(doc);

    if (!confirm(`Are you sure you want to ${action} the medical practice credentials for ${doctorName}?`)) {
      return;
    }

    this.adminService.updateDoctorStatus(doc._id, newStatus).subscribe({
      next: () => {
        this.notificationService.success(`Physician credentials ${newStatus === 'active' ? 'activated' : 'suspended'} for ${doctorName}`);
        doc.status = newStatus;
        if (this.selectedDoctor && this.selectedDoctor._id === doc._id) {
          this.selectedDoctor.status = newStatus;
        }
        this.applyFilters();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || `Failed to update physician status`);
        this.cdr.markForCheck();
      },
    });
  }
}
