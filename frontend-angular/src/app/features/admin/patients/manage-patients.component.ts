import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
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

interface BmiInfo {
  value: number;
  category: string;
  badgeClass: string;
}

@Component({
  selector: 'app-manage-patients',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
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
    <div class="manage-patients-container">
      <!-- ==================================================================== -->
      <!-- 1. DIRECTORY LIST VIEW (viewMode === 'list')                          -->
      <!-- ==================================================================== -->
      <div *ngIf="viewMode === 'list'" class="directory-view">
        <!-- Page Header -->
        <div class="page-header">
          <div class="header-left">
            <div class="badge-row">
              <span class="category-badge">
                <mat-icon class="badge-icon">groups</mat-icon>
                Platform Administration
              </span>
            </div>
            <h1 class="page-title">Patient Management Directory</h1>
            <p class="page-subtitle">
              Inspect registered patient profiles, audit biometric and health specifications, review family dependents, and manage account security privileges.
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
          <mat-card class="stat-card" (click)="setStatusFilter('all')">
            <div class="stat-icon-wrap primary">
              <mat-icon>people</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-label">Total Patients</span>
              <span class="stat-value">{{ stats.totalPatients }}</span>
            </div>
          </mat-card>

          <mat-card class="stat-card" (click)="setStatusFilter('active')">
            <div class="stat-icon-wrap success">
              <mat-icon>verified_user</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-label">Active Accounts</span>
              <span class="stat-value text-emerald-700">{{ stats.activePatients }}</span>
            </div>
          </mat-card>

          <mat-card class="stat-card" (click)="setStatusFilter('suspended')">
            <div class="stat-icon-wrap warn">
              <mat-icon>person_off</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-label">Suspended Accounts</span>
              <span class="stat-value text-rose-700">{{ stats.suspendedPatients }}</span>
            </div>
          </mat-card>

          <mat-card class="stat-card">
            <div class="stat-icon-wrap info">
              <mat-icon>family_restroom</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-label">Family Dependents</span>
              <span class="stat-value text-amber-700">{{ stats.totalDependents }}</span>
            </div>
          </mat-card>
        </div>

        <!-- Patients Table Card -->
        <mat-card class="table-card">
          <!-- Filter & Search Toolbar -->
          <div class="toolbar-wrap">
            <div class="search-box">
              <mat-form-field appearance="outline" class="w-full search-field">
                <mat-label>Search by patient name, email, or phone number...</mat-label>
                <input
                  matInput
                  [(ngModel)]="searchTerm"
                  (ngModelChange)="applySearch()"
                  placeholder="e.g. Aarav Patel, patient@docyra.com, +91 98..."
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

          <!-- Loading State -->
          <div *ngIf="loading && patients.length === 0" class="loading-wrap">
            <mat-spinner diameter="40"></mat-spinner>
            <p class="loading-text">Loading registered patient records...</p>
          </div>

          <!-- Empty State -->
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

          <!-- Directory Table -->
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
                  class="patient-row cursor-pointer"
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
                        <div class="patient-id font-mono text-[11px] text-neutral-500">ID: {{ p._id | slice:0:12 }}</div>
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
                        [matTooltip]="(p.isTwoFactorEnabled || p.twoFactorEnabled) ? 'TOTP 2FA enabled' : 'Two-factor auth off'"
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

                  <!-- Registered Date Column -->
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
                        mat-button
                        color="primary"
                        class="view-profile-btn"
                        (click)="openPatientDetails(p)"
                        matTooltip="Open Full Patient Profile Dossier"
                      >
                        <mat-icon>account_circle</mat-icon>
                        <span>View Profile</span>
                      </button>

                      <button
                        *ngIf="p.status !== 'suspended'"
                        mat-stroked-button
                        color="warn"
                        (click)="togglePatientStatus(p._id, 'suspended')"
                        class="btn-sm suspend-btn"
                        matTooltip="Suspend patient access"
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
                <option [value]="50">50</option>
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
      </div>

      <!-- ==================================================================== -->
      <!-- 2. FULL PAGE PATIENT INFORMATION DOSSIER (viewMode === 'detail')     -->
      <!-- ==================================================================== -->
      <div *ngIf="viewMode === 'detail'" class="patient-full-page">
        <!-- Full Page Navigation & Action Toolbar -->
        <div class="detail-nav-bar">
          <div class="nav-left">
            <button mat-button class="back-btn" (click)="navigateToList()">
              <mat-icon>arrow_back</mat-icon>
              <span>Back to Patients Directory</span>
            </button>
            <div class="nav-divider"></div>
            <span class="dossier-kicker">PATIENT DOSSIER</span>
            <span class="dossier-id font-mono text-xs text-neutral-500">ID: {{ activePatientId }}</span>
          </div>

          <div class="nav-actions">
            <button
              mat-stroked-button
              (click)="refreshCurrentPatient()"
              [disabled]="loadingDetails"
              class="action-btn"
            >
              <mat-icon [class.spinning]="loadingDetails">refresh</mat-icon>
              <span>Refresh</span>
            </button>

            <button
              *ngIf="selectedPatient && selectedPatient.status !== 'suspended'"
              mat-stroked-button
              color="warn"
              (click)="togglePatientStatus(selectedPatient._id, 'suspended')"
              class="status-action-btn"
            >
              <mat-icon>block</mat-icon>
              <span>Suspend Patient Account</span>
            </button>

            <button
              *ngIf="selectedPatient && selectedPatient.status === 'suspended'"
              mat-flat-button
              color="primary"
              (click)="togglePatientStatus(selectedPatient._id, 'active')"
              class="status-action-btn"
            >
              <mat-icon>check_circle</mat-icon>
              <span>Reactivate Patient Account</span>
            </button>
          </div>
        </div>

        <!-- Detail Loading Spinner -->
        <div *ngIf="loadingDetails && !selectedPatient" class="detail-loading-box">
          <mat-spinner diameter="44"></mat-spinner>
          <h3>Loading Complete Patient Dossier...</h3>
          <p>Retrieving healthcare demographics, family relations, and appointment history.</p>
        </div>

        <!-- Full Page Content -->
        <div *ngIf="selectedPatient" class="dossier-body">
          <!-- Hero Header Card -->
          <mat-card class="hero-card">
            <div class="hero-content">
              <div class="hero-avatar-wrap">
                <div class="hero-avatar" [ngClass]="selectedPatient.status || 'active'">
                  {{ getInitials(selectedPatient.name) }}
                </div>
              </div>

              <div class="hero-info">
                <div class="hero-title-row">
                  <h1 class="patient-full-name">{{ selectedPatient.name }}</h1>
                  <span class="role-pill">Patient</span>
                  <app-status-badge [status]="selectedPatient.status || 'active'"></app-status-badge>
                </div>

                <div class="hero-meta-row">
                  <div class="meta-item">
                    <mat-icon class="meta-icon">email</mat-icon>
                    <a [href]="'mailto:' + selectedPatient.email" class="meta-link">{{ selectedPatient.email }}</a>
                  </div>

                  <div class="meta-item" *ngIf="selectedPatient.phone">
                    <mat-icon class="meta-icon">call</mat-icon>
                    <a [href]="'tel:' + selectedPatient.phone" class="meta-link font-mono">{{ selectedPatient.phone }}</a>
                  </div>

                  <div class="meta-item">
                    <mat-icon class="meta-icon">fingerprint</mat-icon>
                    <span class="meta-text font-mono">ID: {{ selectedPatient._id }}</span>
                    <button
                      mat-icon-button
                      class="mini-copy-btn"
                      (click)="copyToClipboard(selectedPatient._id, 'Patient ID')"
                      matTooltip="Copy Patient ID"
                    >
                      <mat-icon class="copy-icon">content_copy</mat-icon>
                    </button>
                  </div>
                </div>

                <div class="hero-badges-row">
                  <span class="badge-item" [class.active-item]="selectedPatient.isTwoFactorEnabled || selectedPatient.twoFactorEnabled">
                    <mat-icon>{{ (selectedPatient.isTwoFactorEnabled || selectedPatient.twoFactorEnabled) ? 'lock' : 'lock_open' }}</mat-icon>
                    {{ (selectedPatient.isTwoFactorEnabled || selectedPatient.twoFactorEnabled) ? '2FA Enabled' : '2FA Not Configured' }}
                  </span>

                  <span class="badge-item" [class.active-item]="selectedPatient.isEmailVerified || selectedPatient.emailVerifiedAt">
                    <mat-icon>{{ (selectedPatient.isEmailVerified || selectedPatient.emailVerifiedAt) ? 'verified' : 'hourglass_empty' }}</mat-icon>
                    {{ (selectedPatient.isEmailVerified || selectedPatient.emailVerifiedAt) ? 'Email Address Verified' : 'Email Unverified' }}
                  </span>

                  <span class="badge-item">
                    <mat-icon>calendar_today</mat-icon>
                    Registered on {{ selectedPatient.createdAt | portalDate:'dd MMMM yyyy' }}
                  </span>
                </div>
              </div>
            </div>
          </mat-card>

          <!-- 3-Column Specifications Grid -->
          <div class="specs-grid">
            <!-- 1. Personal & Biometric Specs -->
            <mat-card class="spec-card">
              <div class="card-section-header">
                <mat-icon class="sec-icon primary-icon">person</mat-icon>
                <div>
                  <h3 class="sec-title">Personal & Biometric Profile</h3>
                  <p class="sec-subtitle">Demographics, age, blood group & vitals</p>
                </div>
              </div>

              <div class="spec-list">
                <div class="spec-row">
                  <span class="spec-label">Date of Birth & Age</span>
                  <span class="spec-value">
                    {{ selectedPatient.dateOfBirth ? (selectedPatient.dateOfBirth | portalDate:'dd MMM yyyy') : 'Not specified' }}
                    <span *ngIf="selectedPatient.dateOfBirth" class="text-neutral-500 font-normal">
                      ({{ calculateAge(selectedPatient.dateOfBirth) }})
                    </span>
                  </span>
                </div>

                <div class="spec-row">
                  <span class="spec-label">Gender</span>
                  <span class="spec-value capitalize">
                    {{ selectedPatient.gender ? (selectedPatient.gender | titlecase) : 'Not specified' }}
                  </span>
                </div>

                <div class="spec-row">
                  <span class="spec-label">Blood Group</span>
                  <span class="spec-value">
                    <span *ngIf="selectedPatient.bloodGroup" class="blood-pill">
                      🩸 {{ selectedPatient.bloodGroup }}
                    </span>
                    <span *ngIf="!selectedPatient.bloodGroup" class="text-neutral-400">Not recorded</span>
                  </span>
                </div>

                <div class="spec-row">
                  <span class="spec-label">Height & Weight</span>
                  <span class="spec-value">
                    <span *ngIf="selectedPatient.heightCm">{{ selectedPatient.heightCm }} cm</span>
                    <span *ngIf="selectedPatient.heightCm && selectedPatient.weightKg"> &bull; </span>
                    <span *ngIf="selectedPatient.weightKg">{{ selectedPatient.weightKg }} kg</span>
                    <span *ngIf="!selectedPatient.heightCm && !selectedPatient.weightKg" class="text-neutral-400">Not recorded</span>
                  </span>
                </div>

                <div class="spec-row" *ngIf="getBmi(selectedPatient.heightCm, selectedPatient.weightKg) as bmi">
                  <span class="spec-label">Body Mass Index (BMI)</span>
                  <span class="spec-value">
                    <span class="bmi-pill" [ngClass]="bmi.badgeClass">
                      {{ bmi.value | number:'1.1-1' }} kg/m² ({{ bmi.category }})
                    </span>
                  </span>
                </div>

                <div class="spec-row">
                  <span class="spec-label">Timezone & Locale</span>
                  <span class="spec-value font-mono text-xs">
                    {{ selectedPatient.timezone || 'Asia/Kolkata' }} (IST)
                  </span>
                </div>

                <div class="spec-row" *ngIf="selectedPatient.clinicId">
                  <span class="spec-label">Registered Hospital</span>
                  <span class="spec-value font-semibold text-emerald-800">
                    {{ getClinicDisplayName(selectedPatient.clinicId) }}
                  </span>
                </div>
              </div>
            </mat-card>

            <!-- 2. Medical Conditions & Emergency Contacts -->
            <mat-card class="spec-card">
              <div class="card-section-header">
                <mat-icon class="sec-icon warn-icon">medical_information</mat-icon>
                <div>
                  <h3 class="sec-title">Medical Conditions & Emergency</h3>
                  <p class="sec-subtitle">Allergies, chronic conditions & contact</p>
                </div>
              </div>

              <div class="spec-list">
                <div class="spec-row-stacked">
                  <span class="spec-label">Known Allergies</span>
                  <div class="spec-value-box">
                    <div *ngIf="selectedPatient.allergies && selectedPatient.allergies !== 'None reported'" class="tag-box allergy-box">
                      <mat-icon class="box-tag-icon text-rose-600">warning</mat-icon>
                      <span>{{ selectedPatient.allergies }}</span>
                    </div>
                    <div *ngIf="!selectedPatient.allergies || selectedPatient.allergies === 'None reported'" class="empty-tag-box">
                      <mat-icon class="box-tag-icon text-emerald-600">check_circle</mat-icon>
                      <span>No known drug or food allergies on record</span>
                    </div>
                  </div>
                </div>

                <div class="spec-row-stacked">
                  <span class="spec-label">Chronic Medical Conditions</span>
                  <div class="spec-value-box">
                    <div *ngIf="selectedPatient.chronicConditions && selectedPatient.chronicConditions !== 'None reported'" class="tag-box condition-box">
                      <mat-icon class="box-tag-icon text-amber-600">info</mat-icon>
                      <span>{{ selectedPatient.chronicConditions }}</span>
                    </div>
                    <div *ngIf="!selectedPatient.chronicConditions || selectedPatient.chronicConditions === 'None reported'" class="empty-tag-box">
                      <mat-icon class="box-tag-icon text-emerald-600">check_circle</mat-icon>
                      <span>No chronic conditions reported</span>
                    </div>
                  </div>
                </div>

                <div class="spec-row">
                  <span class="spec-label">Emergency Contact Name</span>
                  <span class="spec-value font-semibold">
                    {{ selectedPatient.emergencyContactName || 'None listed' }}
                  </span>
                </div>

                <div class="spec-row">
                  <span class="spec-label">Emergency Contact Phone</span>
                  <span class="spec-value">
                    <a *ngIf="selectedPatient.emergencyContactPhone" [href]="'tel:' + selectedPatient.emergencyContactPhone" class="meta-link font-mono">
                      📞 {{ selectedPatient.emergencyContactPhone }}
                    </a>
                    <span *ngIf="!selectedPatient.emergencyContactPhone" class="text-neutral-400">Not provided</span>
                  </span>
                </div>
              </div>
            </mat-card>

            <!-- 3. Account Security & Compliance -->
            <mat-card class="spec-card">
              <div class="card-section-header">
                <mat-icon class="sec-icon success-icon">shield</mat-icon>
                <div>
                  <h3 class="sec-title">Security & Account Governance</h3>
                  <p class="sec-subtitle">Authentication, audit trail & compliance</p>
                </div>
              </div>

              <div class="spec-list">
                <div class="spec-row">
                  <span class="spec-label">Account Security Level</span>
                  <span class="spec-value">
                    <span class="security-level-pill" [class.high]="selectedPatient.isTwoFactorEnabled || selectedPatient.twoFactorEnabled">
                      {{ (selectedPatient.isTwoFactorEnabled || selectedPatient.twoFactorEnabled) ? 'High (2FA Enforced)' : 'Standard (Password Only)' }}
                    </span>
                  </span>
                </div>

                <div class="spec-row">
                  <span class="spec-label">Email Verification</span>
                  <span class="spec-value">
                    <span *ngIf="selectedPatient.isEmailVerified || selectedPatient.emailVerifiedAt" class="text-emerald-700 font-semibold">
                      Verified {{ selectedPatient.emailVerifiedAt ? ('on ' + (selectedPatient.emailVerifiedAt | portalDate:'dd MMM yyyy')) : '' }}
                    </span>
                    <span *ngIf="!selectedPatient.isEmailVerified && !selectedPatient.emailVerifiedAt" class="text-amber-700 font-semibold">
                      Pending Verification
                    </span>
                  </span>
                </div>

                <div class="spec-row">
                  <span class="spec-label">Failed Login Attempts</span>
                  <span class="spec-value font-mono">
                    {{ selectedPatient.failedLoginCount || 0 }} failed attempts
                  </span>
                </div>

                <div class="spec-row">
                  <span class="spec-label">Lockout Status</span>
                  <span class="spec-value">
                    <span *ngIf="selectedPatient.lockedUntil" class="text-rose-700 font-bold">
                      Locked until {{ selectedPatient.lockedUntil | portalDate:'dd MMM yyyy, h:mm a' }}
                    </span>
                    <span *ngIf="!selectedPatient.lockedUntil" class="text-emerald-700 font-semibold">
                      Unlocked & Healthy
                    </span>
                  </span>
                </div>

                <div class="spec-row">
                  <span class="spec-label">Terms & Privacy Version</span>
                  <span class="spec-value font-mono text-xs">
                    v{{ selectedPatient.acceptedTermsVersion || '1.0' }}
                    <span *ngIf="selectedPatient.acceptedTermsAt" class="text-neutral-500 font-normal">
                      (Accepted {{ selectedPatient.acceptedTermsAt | portalDate:'dd MMM yyyy' }})
                    </span>
                  </span>
                </div>

                <div class="spec-row">
                  <span class="spec-label">Last Profile Modification</span>
                  <span class="spec-value text-xs text-neutral-600">
                    {{ selectedPatient.updatedAt | portalDate:'dd MMM yyyy, h:mm a' }}
                  </span>
                </div>
              </div>
            </mat-card>
          </div>

          <!-- Family Dependents Section -->
          <mat-card class="section-card">
            <div class="section-header-bar">
              <div class="section-title-wrap">
                <mat-icon class="section-icon primary-color">family_restroom</mat-icon>
                <div>
                  <h2 class="section-heading">Family Dependents Directory</h2>
                  <p class="section-subheading">
                    Registered family beneficiaries linked to this primary patient account ({{ patientDetails?.dependents?.length || 0 }} total).
                  </p>
                </div>
              </div>
            </div>

            <!-- Empty Dependents -->
            <div *ngIf="!patientDetails?.dependents || patientDetails?.dependents?.length === 0" class="empty-dependents-state">
              <mat-icon class="empty-icon">family_restroom</mat-icon>
              <h4>No Family Dependents Registered</h4>
              <p>This patient currently does not have any family members or dependents attached to their healthcare profile.</p>
            </div>

            <!-- Dependents Cards Grid -->
            <div *ngIf="patientDetails?.dependents && (patientDetails?.dependents?.length || 0) > 0" class="dependents-grid">
              <div *ngFor="let dep of patientDetails?.dependents" class="dep-profile-card">
                <div class="dep-header">
                  <div class="dep-avatar">
                    {{ getInitials(dep.name) }}
                  </div>
                  <div class="dep-title-wrap">
                    <h4 class="dep-name">{{ dep.name }}</h4>
                    <div class="dep-rel-badge">{{ dep.relationship | titlecase }}</div>
                  </div>
                </div>

                <div class="dep-details-grid">
                  <div class="dep-field">
                    <span class="df-lbl">Date of Birth & Age</span>
                    <span class="df-val">
                      {{ dep.dateOfBirth | portalDate:'dd MMM yyyy' }}
                      <span class="text-neutral-500">({{ calculateAge(dep.dateOfBirth) }})</span>
                    </span>
                  </div>

                  <div class="dep-field">
                    <span class="df-lbl">Gender</span>
                    <span class="df-val capitalize">{{ dep.gender | titlecase }}</span>
                  </div>

                  <div class="dep-field">
                    <span class="df-lbl">Blood Group</span>
                    <span class="df-val font-bold text-rose-700">
                      {{ dep.bloodGroup ? ('🩸 ' + dep.bloodGroup) : 'Not recorded' }}
                    </span>
                  </div>

                  <div class="dep-field">
                    <span class="df-lbl">Height / Weight</span>
                    <span class="df-val">
                      {{ dep.heightCm ? (dep.heightCm + ' cm') : '-' }} / {{ dep.weightKg ? (dep.weightKg + ' kg') : '-' }}
                    </span>
                  </div>

                  <div class="dep-field col-span-2" *ngIf="dep.allergies">
                    <span class="df-lbl">Allergies</span>
                    <span class="df-val text-rose-700 font-medium">{{ dep.allergies }}</span>
                  </div>

                  <div class="dep-field col-span-2" *ngIf="dep.chronicConditions">
                    <span class="df-lbl">Chronic Conditions</span>
                    <span class="df-val text-amber-700 font-medium">{{ dep.chronicConditions }}</span>
                  </div>

                  <div class="dep-field col-span-2" *ngIf="dep.emergencyContactName || dep.emergencyContactPhone">
                    <span class="df-lbl">Emergency Contact</span>
                    <span class="df-val">
                      {{ dep.emergencyContactName }}
                      <span *ngIf="dep.emergencyContactPhone" class="font-mono text-xs">({{ dep.emergencyContactPhone }})</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </mat-card>

          <!-- Appointment & Consultation History Section -->
          <mat-card class="section-card">
            <div class="section-header-bar">
              <div class="section-title-wrap">
                <mat-icon class="section-icon primary-color">calendar_month</mat-icon>
                <div>
                  <h2 class="section-heading">Consultation & Appointment History</h2>
                  <p class="section-subheading">
                    Complete chronological history of scheduled, completed, and cancelled consultations for this patient ({{ patientDetails?.appointments?.length || 0 }} total records).
                  </p>
                </div>
              </div>
            </div>

            <!-- Empty Appointments -->
            <div *ngIf="!patientDetails?.appointments || patientDetails?.appointments?.length === 0" class="empty-appointments-state">
              <mat-icon class="empty-icon">event_busy</mat-icon>
              <h4>No Consultation Records Found</h4>
              <p>This patient has not booked any doctor appointments yet on the Docyra platform.</p>
            </div>

            <!-- Appointments Table -->
            <div *ngIf="patientDetails?.appointments && (patientDetails?.appointments?.length || 0) > 0" class="table-container">
              <table class="appointments-history-table">
                <thead>
                  <tr>
                    <th class="th-date">Date & Time</th>
                    <th class="th-doctor">Attending Physician</th>
                    <th class="th-clinic">Hospital / Clinic</th>
                    <th class="th-beneficiary">Beneficiary</th>
                    <th class="th-reason">Reason for Visit</th>
                    <th class="th-fee text-right">Fee</th>
                    <th class="th-status text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let apt of patientDetails?.appointments" class="apt-row">
                    <!-- Date & Time -->
                    <td class="td-date">
                      <div class="apt-date-text">{{ apt.slotStart | portalDate:'dd MMM yyyy' }}</div>
                      <div class="apt-time-text">{{ apt.slotStart | portalDate:'h:mm a' }} - {{ apt.slotEnd | portalDate:'h:mm a' }}</div>
                    </td>

                    <!-- Attending Physician -->
                    <td class="td-doctor">
                      <div class="doctor-name font-bold text-neutral-900">{{ getDoctorDisplayName(apt) }}</div>
                      <div class="doctor-spec-chip" *ngIf="getDoctorSpecialization(apt)">
                        {{ getDoctorSpecialization(apt) }}
                      </div>
                    </td>

                    <!-- Hospital / Clinic -->
                    <td class="td-clinic">
                      <div class="clinic-name font-semibold text-neutral-800">{{ getAppointmentClinicName(apt) }}</div>
                      <div class="clinic-city text-xs text-neutral-500">{{ getAppointmentClinicCity(apt) }}</div>
                    </td>

                    <!-- Beneficiary -->
                    <td class="td-beneficiary">
                      <span class="beneficiary-pill" [class.self]="!isBookedForDependent(apt)">
                        <mat-icon class="ben-icon">{{ isBookedForDependent(apt) ? 'family_restroom' : 'person' }}</mat-icon>
                        <span>{{ getBeneficiaryLabel(apt) }}</span>
                      </span>
                    </td>

                    <!-- Reason for Visit -->
                    <td class="td-reason">
                      <div class="reason-text">{{ apt.reasonForVisit || 'General Medical Consultation' }}</div>
                      <div *ngIf="apt.prescription?.medicines?.length" class="prescription-pill">
                        💊 {{ apt.prescription.medicines.length }} medicines prescribed
                      </div>
                      <div *ngIf="apt.cancellationReason" class="cancel-reason-text">
                        Cancelled: {{ apt.cancellationReason }}
                      </div>
                    </td>

                    <!-- Fee -->
                    <td class="td-fee text-right font-bold text-neutral-900">
                      ₹{{ getAppointmentFee(apt) | number }}
                    </td>

                    <!-- Status -->
                    <td class="td-status text-right">
                      <app-status-badge [status]="apt.status"></app-status-badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-patients-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
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
      max-width: 820px;
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
      padding: 16px 18px !important;
      border-radius: 12px !important;
      display: flex;
      flex-direction: row !important;
      align-items: center;
      gap: 16px;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }

    .stat-card:hover {
      border-color: #0F5C5C;
      box-shadow: 0 4px 12px rgba(15, 92, 92, 0.08);
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

    .toolbar-wrap {
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid #E7E5E0;
      flex-wrap: wrap;
    }

    .search-box {
      flex: 1;
      min-width: 280px;
    }

    .search-field {
      margin-bottom: -1.34375em;
    }

    .status-tabs {
      display: flex;
      gap: 6px;
      background: #F4F3EF;
      padding: 4px;
      border-radius: 8px;
    }

    .tab-btn {
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 700;
      border: none;
      background: transparent;
      color: #6C757D;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }

    .tab-btn.active {
      background: #FFFFFF;
      color: #1A2E2E;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .tab-btn.active-tab.active {
      color: #2E9E6B;
    }

    .tab-btn.suspended-tab.active {
      color: #D9534F;
    }

    .table-container {
      width: 100%;
      overflow-x: auto;
    }

    .patients-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .patients-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      background: #F9F9F7;
      border-bottom: 1px solid #E7E5E0;
      white-space: nowrap;
    }

    .patients-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
      vertical-align: middle;
    }

    .patient-row:hover {
      background-color: #FAFAF8;
    }

    .suspended-row {
      background-color: #FFF9F9;
    }

    .patient-identity-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .patient-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #0F5C5C;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .patient-avatar.suspended {
      background: #D9534F;
    }

    .contact-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .contact-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .contact-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #9E9E9E;
    }

    .security-tags-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .security-tag, .verify-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      width: fit-content;
      background: #F1F3F5;
      color: #6C757D;
    }

    .security-tag.enabled {
      background: #EBF7EE;
      color: #2E9E6B;
    }

    .verify-tag.verified {
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .tag-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }

    .utilization-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #4A5568;
    }

    .stat-pill-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #718096;
    }

    .view-profile-btn {
      font-size: 12px !important;
      font-weight: 700 !important;
      color: #0F5C5C !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    .btn-group {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }

    .btn-sm {
      padding: 2px 10px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      border-radius: 6px !important;
      min-width: unset !important;
    }

    .suspend-btn {
      border-color: #F8CECE !important;
      color: #D9534F !important;
    }

    .activate-btn {
      background: #2E9E6B !important;
      color: #FFFFFF !important;
    }

    /* Pagination Bar */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: #FAFAF8;
      border-top: 1px solid #E7E5E0;
      font-size: 12px;
      color: #6C757D;
      flex-wrap: wrap;
      gap: 12px;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .page-size-dropdown {
      border: 1px solid #D3CECE;
      border-radius: 6px;
      padding: 4px 8px;
      background: #FFFFFF;
      font-size: 12px;
      font-weight: 600;
      color: #1A2E2E;
    }

    .pagination-buttons {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .current-page-num {
      font-weight: 700;
      padding: 0 8px;
      color: #1A2E2E;
    }

    .loading-wrap, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
      gap: 8px;
    }

    .empty-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #F4F3EF;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9E9E9E;
      margin-bottom: 8px;
    }

    /* ====================================================================== */
    /* 2. FULL PAGE PATIENT DOSSIER STYLES                                    */
    /* ====================================================================== */
    .patient-full-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .detail-nav-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      padding: 12px 18px;
      border-radius: 12px;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      flex-wrap: wrap;
      gap: 12px;
    }

    .nav-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .back-btn {
      font-weight: 700 !important;
      color: #0F5C5C !important;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .nav-divider {
      width: 1px;
      height: 20px;
      background: #E7E5E0;
    }

    .dossier-kicker {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.6px;
      color: #5C6B6B;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-action-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700 !important;
    }

    .detail-loading-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 20px;
      text-align: center;
      gap: 12px;
    }

    .dossier-body {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Hero Card */
    .hero-card {
      padding: 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .hero-content {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }

    .hero-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #0F5C5C;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
      box-shadow: 0 4px 12px rgba(15, 92, 92, 0.15);
      border: 3px solid #E6F2F1;
    }

    .hero-avatar.suspended {
      background: #D9534F;
      border-color: #FDF2F2;
    }

    .hero-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .hero-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .patient-full-name {
      font-size: 24px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
      letter-spacing: -0.4px;
    }

    .role-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 999px;
      background: #E6F2F1;
      color: #0F5C5C;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .hero-meta-row {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 13px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #4A5568;
    }

    .meta-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #718096;
    }

    .meta-link {
      color: #0F5C5C;
      text-decoration: none;
      font-weight: 600;
    }

    .meta-link:hover {
      text-decoration: underline;
    }

    .mini-copy-btn {
      width: 24px !important;
      height: 24px !important;
      padding: 0 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .copy-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #A0AEC0;
    }

    .hero-badges-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .badge-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      background: #F7FAFC;
      border: 1px solid #E2E8F0;
      color: #4A5568;
    }

    .badge-item mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #718096;
    }

    .badge-item.active-item {
      background: #EBF7EE;
      border-color: #C3ECD0;
      color: #15803D;
    }

    .badge-item.active-item mat-icon {
      color: #15803D;
    }

    /* Specifications Grid */
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    @media (max-width: 1024px) {
      .specs-grid {
        grid-template-columns: 1fr;
      }
    }

    .spec-card {
      padding: 20px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .card-section-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      border-bottom: 1px solid #F0EFEB;
      padding-bottom: 12px;
    }

    .sec-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      margin-top: 2px;
    }

    .primary-icon {
      color: #0F5C5C;
    }

    .warn-icon {
      color: #C05621;
    }

    .success-icon {
      color: #2E9E6B;
    }

    .sec-title {
      font-size: 15px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0;
    }

    .sec-subtitle {
      font-size: 12px;
      color: #718096;
      margin: 2px 0 0;
    }

    .spec-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .spec-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 13px;
    }

    .spec-row-stacked {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13px;
    }

    .spec-label {
      color: #5C6B6B;
      font-weight: 600;
      font-size: 12px;
    }

    .spec-value {
      font-weight: 700;
      color: #1A2E2E;
      text-align: right;
    }

    .spec-value-box {
      margin-top: 2px;
    }

    .tag-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
    }

    .allergy-box {
      background: #FDF2F2;
      color: #B91C1C;
      border: 1px solid #FECACA;
    }

    .condition-box {
      background: #FEF3E8;
      color: #9A3412;
      border: 1px solid #FED7AA;
    }

    .empty-tag-box {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      background: #F0FDF4;
      color: #166534;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #BBF7D0;
    }

    .box-tag-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .blood-pill {
      font-weight: 800;
      color: #B91C1C;
      background: #FEF2F2;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid #FECACA;
    }

    .bmi-pill {
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }

    .bmi-normal {
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }

    .bmi-warn {
      background: #FFFBEB;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    .bmi-danger {
      background: #FEF2F2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .security-level-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: #F1F3F5;
      color: #4A5568;
    }

    .security-level-pill.high {
      background: #EBF7EE;
      color: #15803D;
      border: 1px solid #C3ECD0;
    }

    /* Section Cards (Dependents & Appointments) */
    .section-card {
      padding: 20px 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .section-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #F0EFEB;
      padding-bottom: 14px;
    }

    .section-title-wrap {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .section-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      margin-top: 2px;
    }

    .primary-color {
      color: #0F5C5C;
    }

    .section-heading {
      font-size: 16px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .section-subheading {
      font-size: 12px;
      color: #718096;
      margin: 2px 0 0;
    }

    .empty-dependents-state, .empty-appointments-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 36px 16px;
      text-align: center;
      color: #718096;
    }

    .empty-dependents-state .empty-icon, .empty-appointments-state .empty-icon {
      font-size: 44px;
      width: 44px;
      height: 44px;
      color: #A0AEC0;
      margin-bottom: 8px;
    }

    .empty-dependents-state h4, .empty-appointments-state h4 {
      font-size: 15px;
      font-weight: 700;
      color: #2D3748;
      margin: 0 0 4px;
    }

    .empty-dependents-state p, .empty-appointments-state p {
      font-size: 13px;
      color: #718096;
      margin: 0;
      max-width: 520px;
    }

    /* Dependents Grid */
    .dependents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .dep-profile-card {
      padding: 16px;
      border-radius: 10px;
      border: 1px solid #E7E5E0;
      background: #FAFAF8;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .dep-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .dep-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #319795;
      color: #FFFFFF;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }

    .dep-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .dep-name {
      font-size: 14px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .dep-rel-badge {
      font-size: 11px;
      font-weight: 700;
      color: #0F5C5C;
      background: #E6F2F1;
      padding: 1px 8px;
      border-radius: 999px;
      width: fit-content;
    }

    .dep-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 12px;
      font-size: 12px;
    }

    .dep-field {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .dep-field.col-span-2 {
      grid-column: span 2;
    }

    .df-lbl {
      color: #718096;
      font-size: 11px;
      font-weight: 600;
    }

    .df-val {
      color: #1A2E2E;
      font-weight: 700;
    }

    /* Appointments Table */
    .appointments-history-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .appointments-history-table th {
      padding: 12px 14px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      background: #F9F9F7;
      border-bottom: 1px solid #E7E5E0;
    }

    .appointments-history-table td {
      padding: 14px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
      vertical-align: middle;
    }

    .apt-date-text {
      font-weight: 700;
      color: #1A2E2E;
    }

    .apt-time-text {
      font-size: 11px;
      color: #718096;
      margin-top: 2px;
    }

    .doctor-spec-chip {
      font-size: 11px;
      font-weight: 600;
      color: #0F5C5C;
      background: #E6F2F1;
      padding: 1px 6px;
      border-radius: 4px;
      width: fit-content;
      margin-top: 2px;
    }

    .beneficiary-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      background: #FEF3E8;
      color: #C05621;
    }

    .beneficiary-pill.self {
      background: #F1F5F9;
      color: #334155;
    }

    .ben-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .prescription-pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      color: #2E9E6B;
      background: #EBF7EE;
      padding: 1px 6px;
      border-radius: 4px;
      margin-top: 3px;
    }

    .cancel-reason-text {
      font-size: 11px;
      color: #D9534F;
      margin-top: 2px;
      font-weight: 600;
    }
  `],
})
export class ManagePatientsComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  private routeSubscription: Subscription | null = null;

  // View state: 'list' (directory table) or 'detail' (full page dossier)
  viewMode: 'list' | 'detail' = 'list';
  activePatientId: string | null = null;

  // Directory List State
  patients: User[] = [];
  filteredPatients: User[] = [];
  pagedPatients: User[] = [];
  loading = true;
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'suspended' = 'all';

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

  // Full Page Detail State
  selectedPatient: User | null = null;
  patientDetails: { user: User; dependents: any[]; appointments: any[] } | null = null;
  loadingDetails = false;

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.viewMode = 'detail';
        this.activePatientId = id;
        this.loadPatientDetailById(id);
      } else {
        this.viewMode = 'list';
        this.activePatientId = null;
        this.selectedPatient = null;
        this.patientDetails = null;
        if (this.patients.length === 0) {
          this.loadPatients();
        }
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
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
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to load patients list');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadPatientDetailById(userId: string): void {
    this.loadingDetails = true;
    this.adminService.getPatientDetail(userId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.patientDetails = res.data;
          this.selectedPatient = res.data.user;
        }
        this.loadingDetails = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to retrieve patient dossier');
        this.loadingDetails = false;
        this.cdr.markForCheck();
      },
    });
  }

  refreshCurrentPatient(): void {
    if (this.activePatientId) {
      this.loadPatientDetailById(this.activePatientId);
    }
  }

  openPatientDetails(patient: User): void {
    this.router.navigate(['/admin/patients', patient._id]);
  }

  navigateToList(): void {
    this.router.navigate(['/admin/patients']);
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
        const target = this.patients.find((p) => p._id === userId);
        if (target) {
          target.status = newStatus;
        }
        if (this.selectedPatient && this.selectedPatient._id === userId) {
          this.selectedPatient.status = newStatus;
        }
        this.updateStats();
        this.applySearch();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to update patient status');
      },
    });
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

  calculateAge(dob?: string | Date): string {
    if (!dob) return '';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return `${age} yrs`;
    } catch {
      return '';
    }
  }

  getBmi(heightCm?: number, weightKg?: number): BmiInfo | null {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
    const heightM = heightCm / 100;
    const bmiVal = weightKg / (heightM * heightM);

    let category = 'Normal';
    let badgeClass = 'bmi-normal';

    if (bmiVal < 18.5) {
      category = 'Underweight';
      badgeClass = 'bmi-warn';
    } else if (bmiVal < 25) {
      category = 'Normal';
      badgeClass = 'bmi-normal';
    } else if (bmiVal < 30) {
      category = 'Overweight';
      badgeClass = 'bmi-warn';
    } else {
      category = 'Obese';
      badgeClass = 'bmi-danger';
    }

    return {
      value: bmiVal,
      category,
      badgeClass,
    };
  }

  getClinicDisplayName(clinic: any): string {
    if (!clinic) return '';
    if (typeof clinic === 'string') return clinic;
    return clinic.name || 'Docyra Partner Clinic';
  }

  getDoctorDisplayName(apt: any): string {
    if (!apt?.doctorId) return 'Attending Physician';
    const doc = apt.doctorId;
    if (doc.userId && doc.userId.name) {
      const title = doc.title || 'Dr.';
      return `${title} ${doc.userId.name}`;
    }
    if (doc.name) {
      return doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
    }
    return 'Attending Physician';
  }

  getDoctorSpecialization(apt: any): string {
    if (!apt?.doctorId) return '';
    const doc = apt.doctorId;
    if (doc.specializationId && doc.specializationId.name) {
      return doc.specializationId.name;
    }
    return doc.specialization || '';
  }

  getAppointmentClinicName(apt: any): string {
    if (apt?.clinicId && apt.clinicId.name) {
      return apt.clinicId.name;
    }
    return 'Docyra Partner Clinic';
  }

  getAppointmentClinicCity(apt: any): string {
    if (apt?.clinicId && apt.clinicId.city) {
      return apt.clinicId.city;
    }
    return 'Bengaluru';
  }

  isBookedForDependent(apt: any): boolean {
    return apt?.bookedForType === 'dependent' || apt?.bookedFor?.type === 'dependent';
  }

  getBeneficiaryLabel(apt: any): string {
    if (this.isBookedForDependent(apt)) {
      if (apt.bookedForId && apt.bookedForId.name) {
        return `${apt.bookedForId.name} (${apt.bookedForId.relationship || 'Dependent'})`;
      }
      if (apt.bookedFor && apt.bookedFor.name) {
        return `${apt.bookedFor.name} (${apt.bookedFor.relationship || 'Dependent'})`;
      }
      return 'Family Dependent';
    }
    return 'Self (Primary Patient)';
  }

  getAppointmentFee(apt: any): number {
    if (apt.consultationFee !== undefined && apt.consultationFee !== null) {
      return apt.consultationFee;
    }
    if (apt.doctorId && apt.doctorId.consultationFee) {
      return apt.doctorId.consultationFee;
    }
    return 500;
  }

  copyToClipboard(text: string, label: string): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.notificationService.success(`${label} copied to clipboard`);
      });
    } else {
      this.notificationService.info(`Copied: ${text}`);
    }
  }
}
