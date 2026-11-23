import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Specialization } from '../../../core/models/specialization.model';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

interface SpecializationStats {
  totalDepartments: number;
  totalDoctors: number;
  totalClinics: number;
  topDepartment: string;
}

@Component({
  selector: 'app-manage-specializations',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
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
    <div class="manage-specializations-page">
      <!-- ==================================================================== -->
      <!-- 1. SPECIALIZATION LIST VIEW (viewMode === 'list')                     -->
      <!-- ==================================================================== -->
      <div *ngIf="viewMode === 'list'" class="spec-list-view">
        <!-- Page Header -->
        <div class="page-header">
          <div class="header-left">
            <h1 class="page-title">Medical Specialties & Departments</h1>
            <p class="page-subtitle">
              Configure clinical specializations displayed across patient search, physician credentials, and booking catalogs.
            </p>
          </div>

          <div class="header-actions">
            <button
              mat-stroked-button
              class="action-btn"
              (click)="loadSpecializations()"
              [disabled]="loading"
              title="Refresh list"
            >
              <mat-icon [class.spinning]="loading">refresh</mat-icon>
              <span>Refresh</span>
            </button>

            <button mat-flat-button class="create-btn" (click)="openCreateModal()">
              <mat-icon>add</mat-icon>
              <span>Add New Specialization</span>
            </button>
          </div>
        </div>

        <!-- Live KPI Summary Metric Cards: Clean Standard Subtle Layout -->
        <div class="stats-grid">
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Total Specialties</span>
              <mat-icon class="metric-icon">domain_add</mat-icon>
            </div>
            <div class="metric-value">{{ stats.totalDepartments }}</div>
            <div class="metric-sub">Configured clinical disciplines</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Active Physicians</span>
              <mat-icon class="metric-icon">medical_services</mat-icon>
            </div>
            <div class="metric-value">{{ stats.totalDoctors }}</div>
            <div class="metric-sub">Specialists practicing across clinics</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Partner Facilities</span>
              <mat-icon class="metric-icon">local_hospital</mat-icon>
            </div>
            <div class="metric-value">{{ stats.totalClinics }}</div>
            <div class="metric-sub">Hospitals & medical clinics</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Top Department</span>
              <mat-icon class="metric-icon">stars</mat-icon>
            </div>
            <div class="metric-value text-department">{{ stats.topDepartment || 'Cardiology' }}</div>
            <div class="metric-sub">Highest consultation volume</div>
          </div>
        </div>

        <!-- Specializations Table Card -->
        <mat-card class="table-card">
          <!-- Search & Filter Toolbar -->
          <div class="toolbar-wrap">
            <div class="search-box">
              <mat-icon class="search-icon">search</mat-icon>
              <input
                type="text"
                class="search-input"
                [(ngModel)]="searchTerm"
                (ngModelChange)="applyFilter()"
                placeholder="Search by department name, slug, or scope..."
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

            <div class="doctor-filter-tabs">
              <button
                class="tab-btn"
                [class.active]="filterMode === 'all'"
                (click)="setFilterMode('all')"
              >
                All ({{ specializations.length }})
              </button>
              <button
                class="tab-btn active-tab"
                [class.active]="filterMode === 'active'"
                (click)="setFilterMode('active')"
              >
                With Doctors ({{ getDepartmentsWithDoctorsCount() }})
              </button>
            </div>
          </div>

          <div *ngIf="loading && specializations.length === 0" class="loading-wrap">
            <mat-spinner diameter="40"></mat-spinner>
            <p class="loading-text">Loading clinical department catalog...</p>
          </div>

          <div *ngIf="!loading && filteredSpecs.length === 0" class="empty-state">
            <div class="empty-icon-wrap">
              <mat-icon>category</mat-icon>
            </div>
            <h3>No Specializations Found</h3>
            <p>No medical specialties match your current search query.</p>
            <button mat-stroked-button color="primary" (click)="clearSearch()">
              Clear Search
            </button>
          </div>

          <div *ngIf="filteredSpecs.length > 0" class="table-container">
            <table class="spec-table">
              <thead>
                <tr>
                  <th class="dept-col">Department & Specialty</th>
                  <th class="slug-col">URL Slug</th>
                  <th class="desc-col">Clinical Scope & Description</th>
                  <th class="doctor-col">Practicing Doctors</th>
                  <th class="clinic-col">Partner Facilities</th>
                  <th class="status-col">Portal Status</th>
                  <th class="actions-col text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let s of filteredSpecs"
                  class="spec-row"
                  (click)="inspectSpec(s)"
                >
                  <!-- Specialty Name & Icon -->
                  <td class="dept-cell">
                    <div class="dept-wrap">
                      <div class="dept-icon-box" [ngClass]="getIconCategory(s.iconName || s.icon)">
                        <mat-icon>{{ getMaterialIcon(s.iconName || s.icon) }}</mat-icon>
                      </div>
                      <div class="dept-meta">
                        <div class="dept-name font-bold text-sm text-neutral-900">{{ s.name }}</div>
                        <span class="dept-type text-xs text-neutral-400">Clinical Specialty</span>
                      </div>
                    </div>
                  </td>

                  <!-- Slug Column -->
                  <td class="slug-cell">
                    <code class="slug-code">{{ s.slug || getComputedSlug(s.name) }}</code>
                  </td>

                  <!-- Description Column -->
                  <td class="desc-cell text-sm text-neutral-600">
                    {{ s.description || 'Comprehensive clinical diagnosis and specialized patient therapy.' }}
                  </td>

                  <!-- Doctors Column -->
                  <td class="doctor-cell">
                    <span
                      class="doctor-count-badge"
                      [class.has-docs]="(s.doctorCount || 0) > 0"
                      [matTooltip]="(s.doctorCount || 0) + ' practicing doctors in this department'"
                    >
                      <mat-icon class="badge-doc-icon">medical_services</mat-icon>
                      {{ s.doctorCount || 0 }} {{ (s.doctorCount || 0) === 1 ? 'Doctor' : 'Doctors' }}
                    </span>
                  </td>

                  <!-- Clinic Count Column -->
                  <td class="clinic-cell">
                    <span class="clinic-count-badge">
                      <mat-icon class="badge-clinic-icon">local_hospital</mat-icon>
                      {{ s.clinicCount || 0 }} {{ (s.clinicCount || 0) === 1 ? 'Clinic' : 'Clinics' }}
                    </span>
                  </td>

                  <!-- Status Column -->
                  <td class="status-cell">
                    <span class="status-pill active">
                      <span class="dot"></span>
                      Active
                    </span>
                  </td>

                  <!-- Actions Column -->
                  <td class="actions-cell text-right" (click)="$event.stopPropagation()">
                    <div class="btn-group">
                      <button
                        mat-stroked-button
                        class="inspect-btn"
                        (click)="inspectSpec(s)"
                        matTooltip="Inspect Affiliated Doctors & Facilities"
                      >
                        <mat-icon class="btn-icon">visibility</mat-icon>
                        <span>View</span>
                      </button>
                      <button
                        mat-stroked-button
                        color="primary"
                        (click)="openEditModal(s)"
                        class="btn-sm edit-btn"
                        matTooltip="Edit Specialization"
                      >
                        <mat-icon class="btn-icon">edit</mat-icon>
                        <span>Edit</span>
                      </button>
                      <button
                        mat-stroked-button
                        color="warn"
                        (click)="deleteSpec(s)"
                        class="btn-sm delete-btn"
                        [disabled]="(s.doctorCount || 0) > 0"
                        [matTooltip]="(s.doctorCount || 0) > 0 ? 'Cannot delete: doctors assigned' : 'Delete Specialization'"
                      >
                        <mat-icon class="btn-icon">delete_outline</mat-icon>
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card>
      </div>

      <!-- ==================================================================== -->
      <!-- 2. FULL PAGE DEPARTMENT DOSSIER VIEW (viewMode === 'detail')         -->
      <!-- ==================================================================== -->
      <div *ngIf="viewMode === 'detail' && selectedSpec" class="spec-detail-fullpage">
        <!-- Top Navigation Bar -->
        <div class="detail-nav-bar">
          <div class="nav-left">
            <button mat-button class="back-btn" (click)="closeInspector()">
              <mat-icon class="back-icon">arrow_back</mat-icon>
              <span>Back to Specializations</span>
            </button>
            <div class="breadcrumb-divider">/</div>
            <span class="breadcrumb-current">{{ selectedSpec.name }}</span>
          </div>

          <div class="nav-actions">
            <button
              mat-stroked-button
              class="refresh-btn"
              (click)="refreshDetail()"
              [disabled]="loadingDetail"
              title="Refresh Department Data"
            >
              <mat-icon [class.spinning]="loadingDetail" class="btn-icon">refresh</mat-icon>
              <span>Refresh</span>
            </button>

            <button
              mat-stroked-button
              class="edit-spec-btn"
              (click)="openEditModal(selectedSpec)"
            >
              <mat-icon class="btn-icon">edit</mat-icon>
              <span>Edit Department</span>
            </button>
          </div>
        </div>

        <!-- Department Identity Hero Header Card -->
        <div class="dept-hero-card">
          <div class="hero-left">
            <div class="dept-hero-icon-box" [ngClass]="getIconCategory(selectedSpec.iconName || selectedSpec.icon)">
              <mat-icon>{{ getMaterialIcon(selectedSpec.iconName || selectedSpec.icon) }}</mat-icon>
            </div>
            <div class="hero-meta">
              <div class="hero-badges-row">
                <span class="status-pill active">
                  <span class="dot"></span>
                  Active Specialty
                </span>
                <span class="portal-pill">
                  <mat-icon class="pill-icon">public</mat-icon>
                  Public Patient Booking
                </span>
              </div>
              <h1 class="hero-title">{{ selectedSpec.name }}</h1>
              <div class="hero-sub-row">
                <span class="hero-slug font-mono">/specializations/{{ selectedSpec.slug || getComputedSlug(selectedSpec.name) }}</span>
                <span class="dot-sep">&bull;</span>
                <span class="hero-id font-mono">ID: {{ selectedSpec._id }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Upper Metric Summary Cards -->
        <div class="stats-grid">
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Practicing Physicians</span>
              <mat-icon class="metric-icon">medical_services</mat-icon>
            </div>
            <div class="metric-value">{{ selectedSpec.doctorCount || specDetailDoctors.length }}</div>
            <div class="metric-sub">Doctors in this department</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Partner Facilities</span>
              <mat-icon class="metric-icon">local_hospital</mat-icon>
            </div>
            <div class="metric-value">{{ selectedSpec.clinicCount || getAffiliatedClinicsCount() }}</div>
            <div class="metric-sub">Clinics providing this discipline</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Avg. Consultation Fee</span>
              <mat-icon class="metric-icon">payments</mat-icon>
            </div>
            <div class="metric-value">₹{{ getAverageConsultationFee() }}</div>
            <div class="metric-sub">Standard consultation rate</div>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Portal Visibility</span>
              <mat-icon class="metric-icon">visibility</mat-icon>
            </div>
            <div class="metric-value text-emerald-700">Published</div>
            <div class="metric-sub">Available across booking catalogs</div>
          </div>
        </div>

        <!-- Clinical Scope Section -->
        <mat-card class="detail-section-card">
          <div class="section-card-header">
            <div class="header-icon-wrap">
              <mat-icon>domain_add</mat-icon>
            </div>
            <div>
              <h3 class="section-card-title">Clinical Scope & Description</h3>
              <p class="section-card-desc">Diagnostic coverage and treatment focus for {{ selectedSpec.name }}</p>
            </div>
          </div>
          <div class="clinical-desc-box">
            {{ selectedSpec.description || 'Comprehensive clinical diagnosis and specialized patient therapy provided across network clinics.' }}
          </div>
        </mat-card>

        <!-- Affiliated Doctors Section -->
        <mat-card class="detail-section-card">
          <div class="section-card-header">
            <div class="header-icon-wrap">
              <mat-icon>groups</mat-icon>
            </div>
            <div class="section-title-col">
              <h3 class="section-card-title">Affiliated Practicing Physicians ({{ specDetailDoctors.length }})</h3>
              <p class="section-card-desc">Credentialed doctors affiliated with {{ selectedSpec.name }} department</p>
            </div>
          </div>

          <!-- Loading Spinner -->
          <div *ngIf="loadingDetail" class="detail-loading-wrap">
            <mat-spinner diameter="36"></mat-spinner>
            <p>Fetching practicing physician roster...</p>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loadingDetail && specDetailDoctors.length === 0" class="empty-doctors-state">
            <mat-icon class="empty-icon">person_off</mat-icon>
            <h4>No Physicians Currently Assigned</h4>
            <p>There are currently no active physicians assigned to {{ selectedSpec.name }}. When doctors specify this specialization during onboarding or profile editing, they will appear here.</p>
          </div>

          <!-- Doctors Table -->
          <div *ngIf="!loadingDetail && specDetailDoctors.length > 0" class="doctors-table-container">
            <table class="doctors-table">
              <thead>
                <tr>
                  <th class="th-doctor">Doctor Name & Identity</th>
                  <th class="th-clinic">Clinic / Hospital</th>
                  <th class="th-exp">Experience</th>
                  <th class="th-fee">Consultation Fee</th>
                  <th class="th-rating">Rating</th>
                  <th class="th-action text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let doc of specDetailDoctors" class="doctor-row">
                  <td class="td-doctor">
                    <div class="doc-identity-cell">
                      <div class="doc-avatar-box">
                        {{ getDoctorInitials(doc.name) }}
                      </div>
                      <div class="doc-identity-info">
                        <div class="doc-name-text">{{ doc.name }}</div>
                        <div class="doc-sub-info">
                          <span *ngIf="doc.email">{{ doc.email }}</span>
                          <span *ngIf="doc.email && doc.phone" class="sep">&bull;</span>
                          <span *ngIf="doc.phone">{{ doc.phone }}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td class="td-clinic">
                    <div class="clinic-cell-info">
                      <div class="clinic-name-text">{{ doc.clinicName || 'Partner Facility' }}</div>
                      <div class="clinic-city-text">{{ doc.clinicCity || 'India' }}</div>
                    </div>
                  </td>

                  <td class="td-exp">
                    <span class="exp-badge">{{ doc.experienceYears || 0 }} Yrs Exp</span>
                  </td>

                  <td class="td-fee">
                    <span class="fee-text">₹{{ doc.consultationFee || 500 }}</span>
                  </td>

                  <td class="td-rating">
                    <span class="rating-badge">⭐ {{ doc.rating ? (doc.rating | number:'1.1-1') : '5.0' }}</span>
                  </td>

                  <td class="td-action text-right">
                    <button
                      mat-stroked-button
                      class="view-doctor-btn"
                      (click)="viewDoctorInManageDoctors(doc)"
                      title="Open physician profile on Doctor Management page"
                    >
                      <mat-icon class="btn-icon">visibility</mat-icon>
                      <span>View Profile</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card>
      </div>

      <!-- Add/Edit Specialization Modal -->
      <div *ngIf="showModal" class="modal-backdrop" (click)="showModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="modal-kicker">DEPARTMENT CONFIGURATION</span>
              <h3 class="modal-title">{{ editingSpecId ? 'Edit Medical Specialization' : 'Add New Clinical Specialization' }}</h3>
            </div>
            <button mat-icon-button (click)="showModal = false">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="specForm" (ngSubmit)="saveSpec()" class="spec-form mt-4">
            <div class="form-group">
              <label class="form-label">Specialization Name *</label>
              <mat-form-field appearance="outline" class="w-full">
                <input
                  matInput
                  formControlName="name"
                  placeholder="e.g. Cardiology, Oncology, Pediatrics"
                  (input)="onNameChanged()"
                />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">URL Slug</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput formControlName="slug" placeholder="e.g. cardiology" />
                <mat-hint>Used for discovery URLs and route filters</mat-hint>
              </mat-form-field>
            </div>

            <div class="form-group mt-2">
              <label class="form-label">Icon Identifier</label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select formControlName="iconName">
                  <mat-option *ngFor="let opt of iconOptions" [value]="opt.value">
                    <div class="icon-option-row">
                      <mat-icon class="option-icon">{{ opt.materialIcon }}</mat-icon>
                      <span>{{ opt.label }} ({{ opt.value }})</span>
                    </div>
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">Clinical Scope & Description</label>
              <mat-form-field appearance="outline" class="w-full">
                <textarea
                  matInput
                  rows="3"
                  formControlName="description"
                  placeholder="Describe patient conditions treated and departmental scope..."
                ></textarea>
              </mat-form-field>
            </div>

            <div class="modal-actions">
              <button mat-button type="button" (click)="showModal = false">Cancel</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="specForm.invalid || saving">
                <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
                <span>{{ editingSpecId ? 'Save Changes' : 'Create Specialization' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-specializations-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
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

    .create-btn {
      background-color: #0F5C5C !important;
      color: #FFFFFF !important;
      font-weight: 700 !important;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% {
        transform: rotate(360deg);
      }
    }

    /* Stats Grid: Clean, Standard Subtle Layout */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
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

    .metric-value.text-department {
      font-size: 19px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .metric-sub {
      font-size: 11px;
      color: #94A3B8;
      margin-top: 4px;
      font-weight: 500;
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
      padding: 12px 16px;
      border-bottom: 1px solid #EBECEF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
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

    .doctor-filter-tabs {
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

    /* Table */
    .table-container {
      overflow-x: auto;
    }

    .spec-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .spec-table th {
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

    .spec-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #EBECEF;
      font-size: 13px;
      vertical-align: middle;
    }

    .spec-row {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .spec-row:hover {
      background-color: #F8F9FA;
    }

    /* Dept Cell */
    .dept-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .dept-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .dept-icon-box mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .dept-icon-box.cardiology {
      background: #FEE2E2;
      color: #DC2626;
    }

    .dept-icon-box.dermatology {
      background: #FCE7F3;
      color: #DB2777;
    }

    .dept-icon-box.pediatrics {
      background: #FEF3C7;
      color: #D97706;
    }

    .dept-icon-box.orthopedics {
      background: #E0E7FF;
      color: #4F46E5;
    }

    .dept-icon-box.general {
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .dept-icon-box.neurology {
      background: #F3E8FF;
      color: #9333EA;
    }

    .dept-icon-box.other {
      background: #F1F5F9;
      color: #475569;
    }

    .dept-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* Slug Code */
    .slug-code {
      font-size: 11px;
      font-family: monospace;
      background: #F8F9FA;
      padding: 3px 7px;
      border: 1px solid #E7E5E0;
      border-radius: 4px;
      color: #0F5C5C;
    }

    /* Badges */
    .doctor-count-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: #F4F5F7;
      color: #6C757D;
    }

    .doctor-count-badge.has-docs {
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .badge-doc-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .clinic-count-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      color: #5C6B6B;
    }

    .badge-clinic-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #8C98A4;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      background: #EBF7EE;
      color: #2E9E6B;
    }

    .status-pill .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #2E9E6B;
    }

    /* Buttons */
    .btn-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .inspect-btn,
    .edit-btn,
    .delete-btn {
      height: 30px !important;
      line-height: 28px !important;
      padding: 0 10px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      border-radius: 6px !important;
    }

    .inspect-btn {
      border-color: #D1D5DB !important;
      color: #374151 !important;
    }

    .inspect-btn:hover {
      background: #F3F4F6 !important;
      border-color: #9CA3AF !important;
    }

    .edit-btn {
      border-color: #93C5FD !important;
      color: #1D4ED8 !important;
    }

    .edit-btn:hover {
      background: #EFF6FF !important;
    }

    .delete-btn {
      border-color: #FCA5A5 !important;
      color: #DC2626 !important;
    }

    .delete-btn:hover:not([disabled]) {
      background: #FEF2F2 !important;
    }

    .delete-btn[disabled] {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .btn-icon {
      font-size: 15px !important;
      width: 15px !important;
      height: 15px !important;
      line-height: 15px !important;
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

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
      backdrop-filter: blur(2px);
    }

    .modal-card {
      background: #FFFFFF;
      border-radius: 14px;
      padding: 28px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #EBECEF;
      padding-bottom: 16px;
    }

    .modal-kicker {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #0F5C5C;
      display: block;
      margin-bottom: 4px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .icon-option-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .option-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #0F5C5C;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #EBECEF;
    }

    /* ==================================================================== */
    /* FULL PAGE DEPARTMENT DOSSIER VIEW                                    */
    /* ==================================================================== */
    .spec-detail-fullpage {
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: fadeIn 0.15s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .detail-nav-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 4px 0 8px;
      flex-wrap: wrap;
    }

    .nav-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600 !important;
      color: #374151 !important;
      padding: 0 12px !important;
      height: 36px !important;
      border-radius: 6px !important;
      background: #F3F4F6 !important;
    }

    .back-btn:hover {
      background: #E5E7EB !important;
      color: #111827 !important;
    }

    .back-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      line-height: 18px !important;
    }

    .breadcrumb-divider {
      color: #9CA3AF;
      font-size: 14px;
    }

    .breadcrumb-current {
      font-weight: 700;
      font-size: 14px;
      color: #111827;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .refresh-btn, .edit-spec-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      border-color: #D1D5DB !important;
      color: #374151 !important;
      border-radius: 6px !important;
    }

    .dept-hero-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }

    .hero-left {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .dept-hero-icon-box {
      width: 54px;
      height: 54px;
      border-radius: 12px;
      background: #F1F5F9;
      color: #0F5C5C;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .dept-hero-icon-box mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .hero-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .hero-badges-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .portal-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #0F5C5C;
      background: #E6F2F1;
      padding: 2px 8px;
      border-radius: 999px;
    }

    .portal-pill .pill-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
      line-height: 13px;
    }

    .hero-title {
      font-size: 24px;
      font-weight: 800;
      color: #0F172A;
      margin: 2px 0 0;
      letter-spacing: -0.4px;
    }

    .hero-sub-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #64748B;
    }

    .dot-sep {
      color: #CBD5E1;
    }

    .detail-section-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 20px 24px !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #F1F5F9;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-icon-wrap mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .section-card-title {
      font-size: 15px;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
    }

    .section-card-desc {
      font-size: 12px;
      color: #64748B;
      margin: 2px 0 0;
    }

    .clinical-desc-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
    }

    .detail-loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 36px;
      gap: 12px;
      color: #64748B;
      font-size: 13px;
    }

    .empty-doctors-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 36px 20px;
      color: #64748B;
    }

    .empty-doctors-state .empty-icon {
      font-size: 38px;
      width: 38px;
      height: 38px;
      color: #94A3B8;
      margin-bottom: 8px;
    }

    .empty-doctors-state h4 {
      font-size: 15px;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 4px;
    }

    .empty-doctors-state p {
      font-size: 13px;
      max-width: 520px;
      margin: 0;
      line-height: 1.5;
    }

    /* Doctors Table in Full Page View */
    .doctors-table-container {
      overflow-x: auto;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
    }

    .doctors-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .doctors-table th {
      background: #F8FAFC;
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #E5E7EB;
    }

    .doctors-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #F1F5F9;
      vertical-align: middle;
      font-size: 13px;
    }

    .doctors-table tr:last-child td {
      border-bottom: none;
    }

    .doctors-table tr:hover {
      background: #FAFAF8;
    }

    .doc-identity-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .doc-avatar-box {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #E6F2F1;
      color: #0F5C5C;
      font-weight: 800;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .doc-identity-info {
      display: flex;
      flex-direction: column;
    }

    .doc-name-text {
      font-weight: 700;
      color: #0F172A;
      font-size: 14px;
    }

    .doc-sub-info {
      font-size: 12px;
      color: #64748B;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .doc-sub-info .sep {
      color: #CBD5E1;
    }

    .clinic-cell-info {
      display: flex;
      flex-direction: column;
    }

    .clinic-name-text {
      font-weight: 600;
      color: #1E293B;
    }

    .clinic-city-text {
      font-size: 12px;
      color: #64748B;
    }

    .exp-badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      background: #F1F5F9;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .fee-text {
      font-weight: 700;
      color: #047857;
      font-size: 13px;
    }

    .rating-badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      color: #B45309;
      background: #FEF3C7;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .view-doctor-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px !important;
      font-weight: 600 !important;
      height: 32px !important;
      padding: 0 12px !important;
      border-radius: 6px !important;
      color: #0F5C5C !important;
      border-color: #0F5C5C !important;
    }

    .view-doctor-btn:hover {
      background: #E6F2F1 !important;
    }

    .view-doctor-btn .btn-icon {
      font-size: 15px !important;
      width: 15px !important;
      height: 15px !important;
      line-height: 15px !important;
    }
  `],
})
export class ManageSpecializationsComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  viewMode: 'list' | 'detail' = 'list';

  specializations: Specialization[] = [];
  filteredSpecs: Specialization[] = [];
  loading = true;

  searchTerm = '';
  filterMode: 'all' | 'active' = 'all';

  // Stats
  stats: SpecializationStats = {
    totalDepartments: 0,
    totalDoctors: 0,
    totalClinics: 0,
    topDepartment: 'Cardiology',
  };

  // Modal
  showModal = false;
  editingSpecId: string | null = null;
  saving = false;

  // Department Details (Full-page)
  selectedSpec: Specialization | null = null;
  specDetailDoctors: any[] = [];
  loadingDetail = false;

  // Preset icon options
  iconOptions = [
    { label: 'Cardiology (Heart)', value: 'HeartPulse', materialIcon: 'favorite' },
    { label: 'Dermatology (Skin)', value: 'Sparkles', materialIcon: 'healing' },
    { label: 'General Medicine (Primary)', value: 'Stethoscope', materialIcon: 'medical_services' },
    { label: 'Pediatrics (Children)', value: 'Baby', materialIcon: 'child_care' },
    { label: 'Orthopedics (Bones & Joints)', value: 'Activity', materialIcon: 'accessibility_new' },
    { label: 'Neurology (Brain)', value: 'Brain', materialIcon: 'psychology' },
    { label: 'Dentistry (Oral Health)', value: 'Dental', materialIcon: 'dentistry' },
    { label: 'Ophthalmology (Vision)', value: 'Eye', materialIcon: 'visibility' },
    { label: 'Psychiatry (Mental Health)', value: 'Mental', materialIcon: 'mood' },
    { label: 'Oncology (Cancer Care)', value: 'Cancer', materialIcon: 'biotech' },
  ];

  specForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: [''],
    description: [''],
    iconName: ['Stethoscope', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadSpecializations();
    this.route.queryParams.subscribe((params) => {
      const specId = params['specId'] || params['departmentId'];
      if (specId) {
        this.openSpecById(specId);
      }
    });
  }

  openSpecById(id: string): void {
    if (this.specializations.length > 0) {
      const found = this.specializations.find((s) => s._id === id || s.slug === id);
      if (found) {
        this.inspectSpec(found);
        return;
      }
    }
    this.adminService.getSpecializationDetail(id).subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.specialization) {
          this.inspectSpec(res.data.specialization);
        }
      },
    });
  }

  loadSpecializations(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.adminService.getSpecializations().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.specializations = res.data;
          this.updateStats();
          this.applyFilter();
          const specId = this.route.snapshot.queryParams['specId'] || this.route.snapshot.queryParams['departmentId'];
          if (specId && !this.selectedSpec) {
            this.openSpecById(specId);
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

  updateStats(): void {
    const total = this.specializations.length;
    const totalDocs = this.specializations.reduce((acc, s) => acc + (s.doctorCount || 0), 0);
    const totalClinics = this.specializations.reduce((acc, s) => acc + (s.clinicCount || 0), 0);

    let topDept = 'Cardiology';
    let maxDocs = -1;
    for (const s of this.specializations) {
      if ((s.doctorCount || 0) > maxDocs) {
        maxDocs = s.doctorCount || 0;
        topDept = s.name;
      }
    }

    this.stats = {
      totalDepartments: total,
      totalDoctors: totalDocs,
      totalClinics,
      topDepartment: topDept,
    };
    this.cdr.markForCheck();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target?.value || '';
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilter();
  }

  setFilterMode(mode: 'all' | 'active'): void {
    this.filterMode = mode;
    this.applyFilter();
  }

  getDepartmentsWithDoctorsCount(): number {
    return this.specializations.filter((s) => (s.doctorCount || 0) > 0).length;
  }

  applyFilter(): void {
    let result = [...this.specializations];

    if (this.filterMode === 'active') {
      result = result.filter((s) => (s.doctorCount || 0) > 0);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          (s.slug && s.slug.toLowerCase().includes(term)) ||
          (s.description && s.description.toLowerCase().includes(term))
      );
    }

    this.filteredSpecs = result;
    this.cdr.markForCheck();
  }

  onNameChanged(): void {
    const nameVal = this.specForm.get('name')?.value || '';
    const currentSlug = this.specForm.get('slug')?.value || '';
    // Auto-compute slug if user hasn't typed a custom slug
    if (!this.editingSpecId || !currentSlug) {
      this.specForm.patchValue({ slug: this.getComputedSlug(nameVal) }, { emitEvent: false });
    }
  }

  getComputedSlug(name: string): string {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  openCreateModal(): void {
    this.editingSpecId = null;
    this.specForm.reset({
      name: '',
      slug: '',
      description: '',
      iconName: 'Stethoscope',
    });
    this.showModal = true;
    this.cdr.markForCheck();
  }

  openEditModal(spec: Specialization): void {
    this.editingSpecId = spec._id;
    this.specForm.patchValue({
      name: spec.name,
      slug: spec.slug || this.getComputedSlug(spec.name),
      description: spec.description || '',
      iconName: spec.iconName || spec.icon || 'Stethoscope',
    });
    this.showModal = true;
    this.cdr.markForCheck();
  }

  saveSpec(): void {
    if (this.specForm.invalid) return;

    this.saving = true;
    this.cdr.markForCheck();
    const formVal = this.specForm.value;
    const payload = {
      name: formVal.name.trim(),
      slug: formVal.slug ? formVal.slug.trim() : this.getComputedSlug(formVal.name),
      description: formVal.description ? formVal.description.trim() : '',
      iconName: formVal.iconName || 'Stethoscope',
    };

    if (this.editingSpecId) {
      this.adminService.updateSpecialization(this.editingSpecId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.notificationService.success(`Specialization "${payload.name}" updated successfully`);
          this.loadSpecializations();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(err.error?.error?.message || 'Failed to update specialization');
          this.cdr.markForCheck();
        },
      });
    } else {
      this.adminService.createSpecialization(payload).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.notificationService.success(`Specialization "${payload.name}" created successfully`);
          this.loadSpecializations();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(err.error?.error?.message || 'Failed to create specialization');
          this.cdr.markForCheck();
        },
      });
    }
  }

  deleteSpec(spec: Specialization): void {
    if ((spec.doctorCount || 0) > 0) {
      this.notificationService.error(
        `Cannot delete "${spec.name}" because it is currently assigned to ${spec.doctorCount} doctor(s). Reassign them first.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to remove the medical specialization "${spec.name}"?`)) {
      return;
    }

    this.adminService.deleteSpecialization(spec._id).subscribe({
      next: () => {
        this.notificationService.success(`Specialization "${spec.name}" removed successfully`);
        this.loadSpecializations();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to delete specialization');
        this.cdr.markForCheck();
      },
    });
  }

  inspectSpec(spec: Specialization): void {
    this.selectedSpec = { ...spec };
    this.viewMode = 'detail';
    this.loadingDetail = true;
    this.specDetailDoctors = [];
    this.cdr.markForCheck();

    this.adminService.getSpecializationDetail(spec._id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.specDetailDoctors = res.data.doctors || [];
          if (res.data.specialization) {
            this.selectedSpec = { ...this.selectedSpec, ...res.data.specialization };
          }
        }
        this.loadingDetail = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.specDetailDoctors = [];
        this.loadingDetail = false;
        this.cdr.markForCheck();
      },
    });
  }

  refreshDetail(): void {
    if (!this.selectedSpec || !this.selectedSpec._id) return;
    this.inspectSpec(this.selectedSpec);
  }

  closeInspector(): void {
    this.viewMode = 'list';
    this.selectedSpec = null;
    this.specDetailDoctors = [];
    this.cdr.markForCheck();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { specId: null, departmentId: null },
      queryParamsHandling: 'merge',
    });
  }

  getAffiliatedClinicsCount(): number {
    if (!this.specDetailDoctors || this.specDetailDoctors.length === 0) {
      return this.selectedSpec?.clinicCount || 0;
    }
    const uniqueClinics = new Set(
      this.specDetailDoctors
        .map((d) => d.clinicName)
        .filter((name) => !!name && name !== 'Independent Practice')
    );
    return Math.max(uniqueClinics.size, this.selectedSpec?.clinicCount || 0);
  }

  getAverageConsultationFee(): number {
    if (!this.specDetailDoctors || this.specDetailDoctors.length === 0) {
      return 0;
    }
    const fees = this.specDetailDoctors
      .map((d) => Number(d.consultationFee) || 0)
      .filter((fee) => fee > 0);
    if (fees.length === 0) return 0;
    const sum = fees.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / fees.length);
  }

  getDoctorInitials(name?: string): string {
    if (!name) return 'DR';
    const clean = name.replace(/^Dr\.?\s*/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  viewDoctorInManageDoctors(doc: any): void {
    if (!doc || !doc._id) return;
    this.router.navigate(['/admin/doctors'], { queryParams: { viewDoctorId: doc._id } });
  }

  getMaterialIcon(iconName?: string): string {
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

  getIconCategory(iconName?: string): string {
    switch (iconName) {
      case 'HeartPulse':
      case 'Cardiology':
        return 'cardiology';
      case 'Sparkles':
      case 'Dermatology':
        return 'dermatology';
      case 'Baby':
      case 'Pediatrics':
        return 'pediatrics';
      case 'Activity':
      case 'Orthopedics':
        return 'orthopedics';
      case 'Brain':
      case 'Neurology':
        return 'neurology';
      default:
        return 'general';
    }
  }
}
