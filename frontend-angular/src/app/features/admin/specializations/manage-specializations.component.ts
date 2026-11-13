import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="badge-row">
            <span class="category-badge">
              <mat-icon class="badge-icon">category</mat-icon>
              Clinical Department Registry
            </span>
          </div>
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

      <!-- Live KPI Summary Metric Cards -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon-wrap primary">
            <mat-icon>domain_add</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Specialties</span>
            <span class="stat-value">{{ stats.totalDepartments }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap success">
            <mat-icon>medical_services</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Active Physicians</span>
            <span class="stat-value">{{ stats.totalDoctors }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap info">
            <mat-icon>local_hospital</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Partner Facilities</span>
            <span class="stat-value">{{ stats.totalClinics }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap warn">
            <mat-icon>stars</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Top Department</span>
            <span class="stat-value text-base">{{ stats.topDepartment || 'Cardiology' }}</span>
          </div>
        </mat-card>
      </div>

      <!-- Specializations Table Card -->
      <mat-card class="table-card">
        <!-- Search & Filter Toolbar -->
        <div class="toolbar-wrap">
          <div class="search-box">
            <mat-form-field appearance="outline" class="w-full search-field">
              <mat-label>Search by department name, slug, or scope...</mat-label>
              <input
                matInput
                [value]="searchTerm"
                (input)="onSearchInput($event)"
                placeholder="e.g. Cardiology, dermatology, neurology..."
              />
              <mat-icon matPrefix class="mr-2 text-neutral-400">search</mat-icon>
              <button
                *ngIf="searchTerm"
                mat-icon-button
                matSuffix
                (click)="clearSearch()"
                class="clear-input-btn"
              >
                <mat-icon>close</mat-icon>
              </button>
            </mat-form-field>
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
                      mat-icon-button
                      class="inspect-icon-btn"
                      (click)="inspectSpec(s)"
                      matTooltip="Inspect Affiliated Doctors & Facilities"
                    >
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button
                      mat-button
                      color="primary"
                      (click)="openEditModal(s)"
                      class="btn-sm edit-btn"
                    >
                      <mat-icon class="btn-sm-icon">edit</mat-icon>
                      Edit
                    </button>
                    <button
                      mat-button
                      color="warn"
                      (click)="deleteSpec(s)"
                      class="btn-sm delete-btn"
                    >
                      <mat-icon class="btn-sm-icon">delete_outline</mat-icon>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>

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

      <!-- Department Inspector Slide-over Drawer -->
      <div *ngIf="selectedSpec" class="inspector-backdrop" (click)="closeInspector()">
        <div class="inspector-panel" (click)="$event.stopPropagation()">
          <div class="inspector-header">
            <div class="inspector-title-wrap">
              <span class="inspector-kicker">DEPARTMENT DOSSIER</span>
              <div class="title-with-icon">
                <div class="dept-icon-box" [ngClass]="getIconCategory(selectedSpec.iconName || selectedSpec.icon)">
                  <mat-icon>{{ getMaterialIcon(selectedSpec.iconName || selectedSpec.icon) }}</mat-icon>
                </div>
                <h2 class="inspector-title">{{ selectedSpec.name }}</h2>
              </div>
              <div class="inspector-slug font-mono">/specializations/{{ selectedSpec.slug || getComputedSlug(selectedSpec.name) }}</div>
            </div>
            <button mat-icon-button (click)="closeInspector()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="inspector-body">
            <!-- Summary Grid -->
            <div class="inspect-section">
              <h4 class="section-title">Department Specifications</h4>
              <div class="inspect-grid">
                <div class="inspect-prop">
                  <span class="prop-lbl">Department ID</span>
                  <span class="prop-val font-mono">{{ selectedSpec._id }}</span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Practicing Doctors</span>
                  <span class="prop-val font-bold text-teal-800">{{ selectedSpec.doctorCount || 0 }} Physicians</span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Partner Facilities</span>
                  <span class="prop-val font-bold text-neutral-800">{{ selectedSpec.clinicCount || 0 }} Clinics</span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Portal Visibility</span>
                  <span class="prop-val text-emerald-600 font-bold">Public Patient Search</span>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="inspect-section">
              <h4 class="section-title">Clinical Scope</h4>
              <div class="desc-box">
                {{ selectedSpec.description || 'Clinical specialty offering specialized outpatient medical diagnostics and care.' }}
              </div>
            </div>

            <!-- Loading Spinner for Affiliated Doctors -->
            <div *ngIf="loadingDetail" class="drawer-loading">
              <mat-spinner diameter="32"></mat-spinner>
              <span>Fetching practicing physician roster...</span>
            </div>

            <!-- Affiliated Doctors Roster -->
            <div class="inspect-section" *ngIf="!loadingDetail">
              <h4 class="section-title">
                Affiliated Physicians ({{ specDetailDoctors.length }})
              </h4>

              <div *ngIf="specDetailDoctors.length === 0" class="empty-detail-box">
                <mat-icon class="box-icon">person_off</mat-icon>
                <span>No practicing physicians currently assigned to this department.</span>
              </div>

              <div *ngIf="specDetailDoctors.length > 0" class="doctors-list">
                <div *ngFor="let doc of specDetailDoctors" class="doctor-card">
                  <div class="doc-avatar">
                    <mat-icon>medical_services</mat-icon>
                  </div>
                  <div class="doc-meta">
                    <div class="doc-name font-bold">{{ doc.name }}</div>
                    <div class="doc-clinic text-xs text-neutral-500">
                      {{ doc.clinicName }} &bull; {{ doc.clinicCity }}
                    </div>
                  </div>
                  <div class="doc-badge-col text-right">
                    <div class="doc-fee text-xs font-bold text-emerald-700">₹{{ doc.consultationFee }}</div>
                    <div class="doc-rating text-[11px] text-amber-600">⭐ {{ doc.rating | number:'1.1-1' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="inspector-footer">
            <button mat-stroked-button color="primary" (click)="openEditModal(selectedSpec); closeInspector()">
              <mat-icon>edit</mat-icon>
              <span>Edit Department</span>
            </button>
            <button mat-flat-button color="primary" (click)="closeInspector()">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-specializations-page {
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
      background: #FEF3E8;
      color: #C05621;
    }

    .stat-icon-wrap.info {
      background: #EBF5FB;
      color: #2B6CB0;
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
      gap: 4px;
    }

    .btn-sm {
      font-size: 11px !important;
      font-weight: 700 !important;
      height: 30px !important;
      line-height: 30px !important;
      padding: 0 8px !important;
    }

    .btn-sm-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      margin-right: 3px;
    }

    .inspect-icon-btn {
      color: #0F5C5C !important;
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

    /* Inspector Slide-over */
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

    .title-with-icon {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 4px 0;
    }

    .inspector-title {
      font-size: 20px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .inspector-slug {
      font-size: 11px;
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

    .desc-box {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
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

    /* Doctors List */
    .doctors-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .doctor-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
    }

    .doc-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #E6F2F1;
      color: #0F5C5C;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .doc-meta {
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
  `],
})
export class ManageSpecializationsComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

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

  // Drawer
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
  }

  loadSpecializations(): void {
    this.loading = true;
    this.adminService.getSpecializations().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.specializations = res.data;
          this.updateStats();
          this.applyFilter();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
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
  }

  saveSpec(): void {
    if (this.specForm.invalid) return;

    this.saving = true;
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
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(err.error?.error?.message || 'Failed to update specialization');
        },
      });
    } else {
      this.adminService.createSpecialization(payload).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.notificationService.success(`Specialization "${payload.name}" created successfully`);
          this.loadSpecializations();
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(err.error?.error?.message || 'Failed to create specialization');
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
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to delete specialization');
      },
    });
  }

  inspectSpec(spec: Specialization): void {
    this.selectedSpec = { ...spec };
    this.loadingDetail = true;
    this.specDetailDoctors = [];

    this.adminService.getSpecializationDetail(spec._id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.specDetailDoctors = res.data.doctors || [];
        }
        this.loadingDetail = false;
      },
      error: () => {
        this.specDetailDoctors = [];
        this.loadingDetail = false;
      },
    });
  }

  closeInspector(): void {
    this.selectedSpec = null;
    this.specDetailDoctors = [];
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
