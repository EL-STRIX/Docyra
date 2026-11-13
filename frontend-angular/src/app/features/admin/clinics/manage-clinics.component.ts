import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Clinic } from '../../../core/models/clinic.model';
import { Doctor } from '../../../core/models/doctor.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-manage-clinics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    StatusBadgeComponent,
    DateFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="manage-clinics-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Manage Healthcare Clinics & Hospitals</h1>
          <p class="page-subtitle">Onboard, configure, and oversee institutional healthcare partners across Docyra.</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="loadClinics()" [disabled]="loading" class="refresh-btn">
            <mat-icon [class.spin]="loading">refresh</mat-icon>
            <span>Refresh</span>
          </button>
          <button mat-flat-button color="primary" (click)="openOnboardModal()">
            <mat-icon>add_business</mat-icon>
            <span>Onboard New Partner Clinic</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card" (click)="setStatusFilter('all')" [class.active-kpi]="statusFilter === 'all'">
          <div class="kpi-icon-wrap total">
            <mat-icon>domain</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Total Facilities</span>
            <span class="kpi-value">{{ clinics.length }}</span>
          </div>
        </div>

        <div class="kpi-card" (click)="setStatusFilter('active')" [class.active-kpi]="statusFilter === 'active'">
          <div class="kpi-icon-wrap active">
            <mat-icon>verified</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Active Clinics</span>
            <span class="kpi-value text-emerald-600">{{ countActive() }}</span>
          </div>
        </div>

        <div class="kpi-card" (click)="setStatusFilter('suspended')" [class.active-kpi]="statusFilter === 'suspended'">
          <div class="kpi-icon-wrap suspended">
            <mat-icon>block</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Suspended</span>
            <span class="kpi-value text-rose-600">{{ countSuspended() }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap cities">
            <mat-icon>location_city</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Cities Covered</span>
            <span class="kpi-value text-teal-700">{{ getCitiesCount() }}</span>
          </div>
        </div>
      </div>

      <!-- Clinics Table Card -->
      <mat-card class="table-card">
        <div class="toolbar-wrap">
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              placeholder="Search clinic name, city, email, or phone..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="applySearch()"
              class="search-input"
            />
            <button *ngIf="searchTerm" class="clear-search" (click)="searchTerm = ''; applySearch()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="status-tabs">
            <button
              class="tab-btn"
              [class.active]="statusFilter === 'all'"
              (click)="setStatusFilter('all')"
            >
              All ({{ clinics.length }})
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

        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
          <p>Loading clinic facilities...</p>
        </div>

        <div *ngIf="!loading && filteredClinics.length === 0" class="empty-state">
          <mat-icon class="empty-icon">domain_disabled</mat-icon>
          <h3>No clinic facilities found</h3>
          <p>No clinics match your search query or selected status filter.</p>
        </div>

        <div *ngIf="!loading && filteredClinics.length > 0" class="table-container">
          <table class="clinics-table">
            <thead>
              <tr>
                <th>Clinic Facility</th>
                <th>Location & Address</th>
                <th>Contact Details</th>
                <th>Status</th>
                <th>Rating & Reviews</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of filteredClinics">
                <!-- Name & Avatar -->
                <td>
                  <div class="clinic-name-cell">
                    <div class="clinic-avatar">
                      {{ getClinicInitials(c.name) }}
                    </div>
                    <div class="clinic-meta">
                      <div class="clinic-name">{{ c.name }}</div>
                      <div class="clinic-slug">{{ c.slug || c._id }}</div>
                    </div>
                  </div>
                </td>

                <!-- Location -->
                <td>
                  <div class="loc-cell">
                    <div class="city-name">{{ getClinicCity(c) }}</div>
                    <div class="street-address" [title]="getClinicStreet(c)">
                      {{ truncate(getClinicStreet(c), 35) || 'Address on file' }}
                    </div>
                  </div>
                </td>

                <!-- Contact -->
                <td>
                  <div class="contact-cell">
                    <div class="contact-phone">
                      <mat-icon class="contact-ic">call</mat-icon>
                      <span>{{ getClinicPhone(c) }}</span>
                    </div>
                    <div class="contact-email">
                      <mat-icon class="contact-ic">mail</mat-icon>
                      <span>{{ getClinicEmail(c) }}</span>
                    </div>
                  </div>
                </td>

                <!-- Status -->
                <td>
                  <app-status-badge [status]="isClinicActive(c) ? 'active' : 'suspended'"></app-status-badge>
                </td>

                <!-- Rating -->
                <td>
                  <div class="rating-cell">
                    <span class="rating-badge">⭐ {{ c.rating ? (c.rating | number:'1.1-1') : '5.0' }}</span>
                    <span class="review-count">({{ c.reviewCount || 0 }} reviews)</span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="text-right actions-col">
                  <div class="action-btn-group">
                    <button
                      mat-icon-button
                      class="view-btn"
                      (click)="openClinicDetails(c)"
                      title="View Clinic Details & Doctors"
                    >
                      <mat-icon>visibility</mat-icon>
                    </button>

                    <button
                      mat-icon-button
                      class="edit-btn"
                      (click)="openEditModal(c)"
                      title="Edit Clinic Details"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>

                    <button
                      *ngIf="isClinicActive(c)"
                      mat-stroked-button
                      color="warn"
                      (click)="toggleClinicStatus(c._id, 'suspended')"
                      class="btn-sm status-toggle-btn suspend"
                      title="Suspend clinic operations"
                    >
                      Suspend
                    </button>
                    <button
                      *ngIf="!isClinicActive(c)"
                      mat-flat-button
                      color="primary"
                      (click)="toggleClinicStatus(c._id, 'active')"
                      class="btn-sm status-toggle-btn activate"
                      title="Activate clinic operations"
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

      <!-- Onboard / Edit Clinic Modal -->
      <div *ngIf="showModal" class="modal-backdrop" (click)="showModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">{{ editingClinicId ? 'Edit Clinic Facility' : 'Onboard Healthcare Clinic' }}</h3>
              <p class="modal-desc">
                {{ editingClinicId ? 'Update facility details and contact information.' : 'Register a new institutional clinic or hospital facility on Docyra.' }}
              </p>
            </div>
            <button mat-icon-button (click)="showModal = false">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="clinicForm" (ngSubmit)="onSaveClinic()" class="clinic-form mt-4">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Clinic Facility Name *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="name" placeholder="Apex Specialty Hospital" />
                  <mat-error *ngIf="clinicForm.get('name')?.hasError('required')">Clinic name is required</mat-error>
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">Phone Number *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="phone" placeholder="+91 98765 43210" />
                  <mat-error *ngIf="clinicForm.get('phone')?.hasError('required')">Phone number is required</mat-error>
                </mat-form-field>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Contact Email *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput type="email" formControlName="email" placeholder="contact@apexhospital.com" />
                  <mat-error *ngIf="clinicForm.get('email')?.hasError('required')">Email is required</mat-error>
                  <mat-error *ngIf="clinicForm.get('email')?.hasError('email')">Invalid email address</mat-error>
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">City *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="city" placeholder="Bengaluru" />
                  <mat-error *ngIf="clinicForm.get('city')?.hasError('required')">City is required</mat-error>
                </mat-form-field>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Street Address *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="street" placeholder="100 Feet Road, Indiranagar" />
                  <mat-error *ngIf="clinicForm.get('street')?.hasError('required')">Street address is required</mat-error>
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">State</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="state" placeholder="Karnataka" />
                </mat-form-field>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Postal Code</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="postalCode" placeholder="560038" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">Website</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="website" placeholder="https://apexhospital.com" />
                </mat-form-field>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description / Specialization Focus</label>
              <mat-form-field appearance="outline" class="w-full">
                <textarea matInput formControlName="description" rows="2" placeholder="Multi-specialty center offering advanced cardiology, orthopedics, and 24/7 emergency care..."></textarea>
              </mat-form-field>
            </div>

            <div class="modal-actions">
              <button mat-button type="button" (click)="showModal = false">Cancel</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="clinicForm.invalid || saving">
                <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
                <span>{{ editingClinicId ? 'Save Changes' : 'Complete Onboarding' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Clinic Details Drawer / Modal -->
      <div *ngIf="selectedClinicForView" class="modal-backdrop" (click)="selectedClinicForView = null">
        <div class="drawer-card" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div class="drawer-title-wrap">
              <div class="drawer-avatar">
                {{ getClinicInitials(selectedClinicForView.name) }}
              </div>
              <div>
                <h3 class="drawer-name">{{ selectedClinicForView.name }}</h3>
                <span class="drawer-city">{{ getClinicCity(selectedClinicForView) }}, India</span>
              </div>
            </div>
            <button mat-icon-button (click)="selectedClinicForView = null">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="drawer-body">
            <!-- Facility Metadata Cards -->
            <div class="detail-section">
              <h4 class="section-title">Facility Information</h4>
              <div class="meta-info-grid">
                <div class="info-item">
                  <span class="info-label">Status</span>
                  <span class="info-val">
                    <app-status-badge [status]="isClinicActive(selectedClinicForView) ? 'active' : 'suspended'"></app-status-badge>
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Rating</span>
                  <span class="info-val font-bold text-amber-600">
                    ⭐ {{ selectedClinicForView.rating ? (selectedClinicForView.rating | number:'1.1-1') : '5.0' }} ({{ selectedClinicForView.reviewCount || 0 }} reviews)
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Phone</span>
                  <span class="info-val">{{ getClinicPhone(selectedClinicForView) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Email</span>
                  <span class="info-val">{{ getClinicEmail(selectedClinicForView) }}</span>
                </div>
                <div class="info-item full-width">
                  <span class="info-label">Full Address</span>
                  <span class="info-val">{{ getClinicStreet(selectedClinicForView) }}, {{ getClinicCity(selectedClinicForView) }}</span>
                </div>
                <div *ngIf="selectedClinicForView.website" class="info-item full-width">
                  <span class="info-label">Website</span>
                  <a [href]="selectedClinicForView.website" target="_blank" class="info-link">
                    {{ selectedClinicForView.website }}
                  </a>
                </div>
                <div *ngIf="selectedClinicForView.description" class="info-item full-width">
                  <span class="info-label">About Facility</span>
                  <span class="info-val italic text-neutral-600">{{ selectedClinicForView.description }}</span>
                </div>
              </div>
            </div>

            <!-- Affiliated Doctors -->
            <div class="detail-section mt-4">
              <div class="flex justify-between items-center mb-2">
                <h4 class="section-title mb-0">Affiliated Doctors ({{ clinicDoctors.length }})</h4>
                <span *ngIf="loadingDoctors" class="text-xs text-neutral-500">Loading roster...</span>
              </div>

              <div *ngIf="!loadingDoctors && clinicDoctors.length === 0" class="empty-doctors">
                <mat-icon class="text-neutral-400">person_off</mat-icon>
                <p>No doctors affiliated with this facility yet.</p>
              </div>

              <div *ngIf="clinicDoctors.length > 0" class="doctors-list">
                <div *ngFor="let doc of clinicDoctors" class="doctor-row">
                  <div class="doc-icon">
                    <mat-icon>medical_services</mat-icon>
                  </div>
                  <div class="doc-info">
                    <div class="doc-name">{{ doc.name || doc.userId?.name || 'Dr. Practitioner' }}</div>
                    <div class="doc-spec">{{ doc.specializationId?.name || 'General Practitioner' }}</div>
                  </div>
                  <div class="doc-fee">
                    <span>₹{{ doc.consultationFee }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="drawer-footer">
            <button mat-button (click)="selectedClinicForView = null">Close</button>
            <button mat-stroked-button color="primary" (click)="openEditModal(selectedClinicForView); selectedClinicForView = null">
              <mat-icon>edit</mat-icon>
              <span>Edit Clinic</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-clinics-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
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
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
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
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
    }

    .kpi-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: #0F5C5C;
    }

    .kpi-card.active-kpi {
      border-color: #0F5C5C;
      background: #F4FAF9;
      box-shadow: 0 0 0 2px #0F5C5C;
    }

    .kpi-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kpi-icon-wrap.total { background: #EEF2F6; color: #1E3A8A; }
    .kpi-icon-wrap.active { background: #D1FAE5; color: #059669; }
    .kpi-icon-wrap.suspended { background: #FEE2E2; color: #DC2626; }
    .kpi-icon-wrap.cities { background: #E6F2F1; color: #0F5C5C; }

    .kpi-info {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .kpi-value {
      font-size: 22px;
      font-weight: 900;
      color: #111827;
      line-height: 1.2;
    }

    /* Table Card */
    .table-card {
      border-radius: 16px !important;
      border: 1px solid #E5E7EB;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
      background: #FFFFFF;
      overflow: hidden;
    }

    .toolbar-wrap {
      padding: 16px 20px;
      border-bottom: 1px solid #F3F4F6;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 280px;
      max-width: 440px;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: #9CA3AF;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .search-input {
      width: 100%;
      padding: 9px 36px 9px 38px;
      border-radius: 999px;
      border: 1px solid #D1D5DB;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: #0F5C5C;
      box-shadow: 0 0 0 3px rgba(15, 92, 92, 0.1);
    }

    .clear-search {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: #9CA3AF;
      display: flex;
      align-items: center;
      padding: 0;
    }

    .clear-search mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-tabs {
      display: flex;
      gap: 6px;
      background: #F3F4F6;
      padding: 4px;
      border-radius: 999px;
    }

    .tab-btn {
      border: none;
      background: transparent;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      color: #4B5563;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab-btn:hover {
      color: #111827;
    }

    .tab-btn.active {
      background: #FFFFFF;
      color: #0F5C5C;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 12px;
      color: #6B7280;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #6B7280;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #A0C6C6;
      margin-bottom: 8px;
    }

    .table-container {
      overflow-x: auto;
    }

    .clinics-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }

    .clinics-table th {
      padding: 12px 18px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #4B5563;
      border-bottom: 1px solid #E5E7EB;
      background: #F9FAFB;
    }

    .clinics-table td {
      padding: 14px 18px;
      border-bottom: 1px solid #F3F4F6;
      vertical-align: middle;
      color: #1F2937;
    }

    .clinics-table tr:hover {
      background-color: #FAFAF8;
    }

    .clinic-name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .clinic-avatar {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: #0F5C5C;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
      flex-shrink: 0;
    }

    .clinic-name {
      font-weight: 800;
      color: #111827;
      font-size: 13.5px;
    }

    .clinic-slug {
      font-size: 11px;
      color: #9CA3AF;
      font-family: monospace;
    }

    .loc-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .city-name {
      font-weight: 700;
      color: #111827;
      font-size: 13px;
    }

    .street-address {
      font-size: 11.5px;
      color: #6B7280;
    }

    .contact-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .contact-phone, .contact-email {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      color: #4B5563;
    }

    .contact-ic {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #9CA3AF;
    }

    .rating-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .rating-badge {
      font-weight: 800;
      color: #D97706;
      font-size: 13px;
    }

    .review-count {
      font-size: 11px;
      color: #9CA3AF;
    }

    .actions-col {
      text-align: right;
    }

    .action-btn-group {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }

    .view-btn, .edit-btn {
      color: #5C6B6B !important;
      width: 32px !important;
      height: 32px !important;
      line-height: 32px !important;
    }

    .view-btn:hover { color: #0F5C5C !important; }
    .edit-btn:hover { color: #1E3A8A !important; }

    .view-btn mat-icon, .edit-btn mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }

    .status-toggle-btn {
      font-size: 11.5px !important;
      height: 30px !important;
      line-height: 30px !important;
      padding: 0 10px !important;
      border-radius: 6px !important;
      font-weight: 700 !important;
    }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 24px;
      max-width: 640px;
      width: 100%;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2);
      max-height: 90vh;
      overflow-y: auto;
    }

    .drawer-card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 24px;
      max-width: 580px;
      width: 100%;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .modal-header, .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 14px;
    }

    .drawer-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .drawer-avatar {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #0F5C5C;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 800;
    }

    .drawer-name {
      font-size: 16px;
      font-weight: 800;
      color: #111827;
      margin: 0;
    }

    .drawer-city {
      font-size: 12px;
      color: #6B7280;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 2px;
    }

    .modal-desc {
      font-size: 12px;
      color: #6B7280;
      margin: 0;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    @media (max-width: 600px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .form-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #374151;
    }

    .modal-actions, .drawer-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
      border-top: 1px solid #E5E7EB;
      padding-top: 14px;
    }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding-top: 16px;
    }

    .section-title {
      font-size: 12.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #4B5563;
      margin: 0 0 10px 0;
    }

    .meta-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      background: #F9FAFB;
      padding: 14px;
      border-radius: 10px;
      border: 1px solid #E5E7EB;
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
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6B7280;
    }

    .info-val {
      font-size: 12.5px;
      color: #111827;
      word-break: break-word;
    }

    .info-link {
      font-size: 12px;
      color: #0F5C5C;
      text-decoration: underline;
    }

    .empty-doctors {
      text-align: center;
      padding: 20px;
      color: #6B7280;
      font-size: 12px;
      background: #F9FAFB;
      border-radius: 8px;
    }

    .doctors-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .doctor-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
    }

    .doc-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #E8F5F1;
      color: #0F5C5C;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .doc-icon mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .doc-info {
      flex: 1;
    }

    .doc-name {
      font-size: 12.5px;
      font-weight: 700;
      color: #111827;
    }

    .doc-spec {
      font-size: 11px;
      color: #6B7280;
    }

    .doc-fee {
      font-size: 12px;
      font-weight: 800;
      color: #0F5C5C;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class ManageClinicsComponent implements OnInit {
  private adminService = inject(AdminService);
  private clinicService = inject(ClinicService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  clinics: Clinic[] = [];
  filteredClinics: Clinic[] = [];
  loading = true;
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'suspended' = 'all';

  showModal = false;
  editingClinicId: string | null = null;
  saving = false;

  selectedClinicForView: Clinic | null = null;
  clinicDoctors: any[] = [];
  loadingDoctors = false;

  clinicForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    city: ['Bengaluru', [Validators.required]],
    street: ['', [Validators.required]],
    state: ['Karnataka'],
    postalCode: ['560038'],
    website: [''],
    description: [''],
  });

  ngOnInit(): void {
    this.loadClinics();
  }

  loadClinics(): void {
    this.loading = true;
    this.adminService.getClinics().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.clinics = res.data;
          this.applySearch();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Failed to load clinic facilities');
      },
    });
  }

  setStatusFilter(filter: 'all' | 'active' | 'suspended'): void {
    this.statusFilter = filter;
    this.applySearch();
  }

  countActive(): number {
    return this.clinics.filter((c) => this.isClinicActive(c)).length;
  }

  countSuspended(): number {
    return this.clinics.filter((c) => !this.isClinicActive(c)).length;
  }

  getCitiesCount(): number {
    const cities = new Set(this.clinics.map((c) => this.getClinicCity(c).toLowerCase().trim()));
    return cities.size;
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

  getClinicStreet(c: any): string {
    if (typeof c?.address === 'object' && c?.address?.street) return c.address.street;
    if (typeof c?.address === 'string' && c?.address) return c.address;
    if (c?.street) return c.street;
    return '';
  }

  getClinicPhone(c: any): string {
    if (c?.contactPhone) return c.contactPhone;
    if (typeof c?.contact === 'object' && c?.contact?.phone) return c.contact.phone;
    return '-';
  }

  getClinicEmail(c: any): string {
    if (c?.contactEmail) return c.contactEmail;
    if (typeof c?.contact === 'object' && c?.contact?.email) return c.contact.email;
    return '-';
  }

  getClinicInitials(name?: string): string {
    if (!name) return 'CL';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || 'C').toUpperCase();
  }

  truncate(str: string, maxLen: number): string {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
  }

  applySearch(): void {
    let result = [...this.clinics];

    if (this.statusFilter === 'active') {
      result = result.filter((c) => this.isClinicActive(c));
    } else if (this.statusFilter === 'suspended') {
      result = result.filter((c) => !this.isClinicActive(c));
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          this.getClinicCity(c).toLowerCase().includes(term) ||
          this.getClinicStreet(c).toLowerCase().includes(term) ||
          this.getClinicEmail(c).toLowerCase().includes(term) ||
          this.getClinicPhone(c).includes(term)
      );
    }

    this.filteredClinics = result;
  }

  openOnboardModal(): void {
    this.editingClinicId = null;
    this.clinicForm.reset({
      name: '',
      phone: '',
      email: '',
      city: 'Bengaluru',
      street: '',
      state: 'Karnataka',
      postalCode: '560038',
      website: '',
      description: '',
    });
    this.showModal = true;
  }

  openEditModal(c: Clinic): void {
    this.editingClinicId = c._id;
    this.clinicForm.patchValue({
      name: c.name,
      phone: this.getClinicPhone(c),
      email: this.getClinicEmail(c),
      city: this.getClinicCity(c),
      street: this.getClinicStreet(c),
      state: c.state || (typeof c.address === 'object' ? (c.address as any).state : '') || 'Karnataka',
      postalCode: c.postalCode || (typeof c.address === 'object' ? (c.address as any).postalCode : '') || '560038',
      website: c.website || '',
      description: c.description || '',
    });
    this.showModal = true;
  }

  openClinicDetails(c: Clinic): void {
    this.selectedClinicForView = c;
    this.clinicDoctors = [];
    this.loadingDoctors = true;

    this.clinicService.getClinicDoctors(c._id).subscribe({
      next: (res) => {
        this.loadingDoctors = false;
        if (res.success && Array.isArray(res.data)) {
          this.clinicDoctors = res.data;
        }
      },
      error: () => {
        this.loadingDoctors = false;
      },
    });
  }

  toggleClinicStatus(clinicId: string, newStatus: string): void {
    this.adminService.updateClinicStatus(clinicId, newStatus).subscribe({
      next: () => {
        this.notificationService.success(`Clinic status updated to ${newStatus}`);
        this.loadClinics();
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to update clinic status');
      },
    });
  }

  onSaveClinic(): void {
    if (this.clinicForm.invalid) return;

    this.saving = true;
    const v = this.clinicForm.value;

    const payload = {
      name: v.name.trim(),
      address: v.street.trim(),
      city: v.city.trim(),
      state: v.state?.trim() || 'Karnataka',
      postalCode: v.postalCode?.trim() || '560001',
      country: 'India',
      contactPhone: v.phone.trim(),
      contactEmail: v.email.trim(),
      website: v.website?.trim() || '',
      description: v.description?.trim() || '',
      contact: {
        phone: v.phone.trim(),
        email: v.email.trim(),
        website: v.website?.trim() || '',
      },
      subscriptionStatus: 'active',
      isActive: true,
      onboardingStatus: 'approved' as const,
    };

    if (this.editingClinicId) {
      this.adminService.updateClinic(this.editingClinicId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.notificationService.success('Clinic details updated successfully!');
          this.loadClinics();
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(err.error?.error?.message || err.error?.message || 'Failed to update clinic');
        },
      });
    } else {
      this.adminService.createClinic(payload).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.notificationService.success('Clinic onboarded successfully!');
          this.loadClinics();
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(err.error?.error?.message || err.error?.message || 'Failed to onboard clinic');
        },
      });
    }
  }
}
