import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Clinic } from '../../../core/models/clinic.model';
import { Doctor } from '../../../core/models/doctor.model';
import { Specialization } from '../../../core/models/specialization.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-manage-doctors',
  standalone: true,
  imports: [
    CommonModule,
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
    <div class="manage-doctors-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Manage Clinic Physicians</h1>
          <p class="page-subtitle">Onboard, configure, and manage medical staff for {{ clinicProfile?.name || 'your clinic' }}.</p>
        </div>
        <button mat-flat-button color="primary" (click)="openAddModal()" class="add-btn">
          <mat-icon>person_add</mat-icon>
          <span>Onboard New Physician</span>
        </button>
      </div>

      <mat-card class="table-card">
        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
        </div>

        <div *ngIf="!loading && doctors.length === 0" class="empty-state">
          <mat-icon class="empty-icon">medical_services</mat-icon>
          <h3>No physicians onboarded yet</h3>
          <p>Click "Onboard New Physician" above to add doctors to your clinic.</p>
        </div>

        <div *ngIf="!loading && doctors.length > 0" class="table-container">
          <table class="doctors-table">
            <thead>
              <tr>
                <th>Physician Name</th>
                <th>Designation & Qualifications</th>
                <th>Consultation Fee</th>
                <th>Experience</th>
                <th>Slot Duration</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of doctors">
                <td class="cursor-pointer" (click)="openDoctorProfile(doc)">
                  <div class="doctor-identity-cell">
                    <div class="doctor-avatar-sm">
                      <img *ngIf="getDoctorPhoto(doc)" [src]="getDoctorPhoto(doc)" alt="" />
                      <span *ngIf="!getDoctorPhoto(doc)">{{ getDoctorInitials(doc) }}</span>
                    </div>
                    <div>
                      <div class="doctor-name-link">
                        {{ getDoctorDisplayName(doc) }}
                      </div>
                      <div class="text-xs text-neutral-500" *ngIf="getDoctorEmail(doc)">
                        {{ getDoctorEmail(doc) }}
                      </div>
                    </div>
                  </div>
                </td>

                <td>
                  <div class="spec-pill">
                    {{ getDoctorDesignation(doc) }}
                  </div>
                  <div class="text-xs text-neutral-500 mt-0.5" *ngIf="getDoctorQualifications(doc)">
                    {{ getDoctorQualifications(doc) }}
                  </div>
                </td>

                <td>
                  <div class="font-bold text-neutral-900 text-sm">₹{{ doc.consultationFee || 500 }}</div>
                  <div class="text-xs text-neutral-500">Per session</div>
                </td>

                <td>
                  <div class="font-bold text-neutral-800 text-sm">{{ getDoctorExperience(doc) }} Years</div>
                  <div class="text-xs text-neutral-500">Clinical practice</div>
                </td>

                <td class="text-sm font-semibold text-neutral-700">
                  {{ doc.slotDurationMinutes || 30 }} Minutes
                </td>

                <td>
                  <app-status-badge [status]="getDoctorStatus(doc)"></app-status-badge>
                </td>

                <td class="text-right actions-col">
                  <button
                    mat-stroked-button
                    color="primary"
                    (click)="openDoctorProfile(doc)"
                    class="btn-sm action-btn mr-1"
                  >
                    <mat-icon class="btn-icon">visibility</mat-icon>
                    <span>View Profile</span>
                  </button>
                  <button
                    *ngIf="getDoctorStatus(doc) === 'active'"
                    mat-stroked-button
                    color="warn"
                    (click)="toggleStatus(doc._id, 'suspended')"
                    class="btn-sm action-btn"
                  >
                    <mat-icon class="btn-icon">block</mat-icon>
                    <span>Suspend</span>
                  </button>
                  <button
                    *ngIf="getDoctorStatus(doc) === 'suspended' || getDoctorStatus(doc) === 'pending'"
                    mat-flat-button
                    color="primary"
                    (click)="toggleStatus(doc._id, 'active')"
                    class="btn-sm action-btn"
                  >
                    <mat-icon class="btn-icon">check_circle</mat-icon>
                    <span>Activate</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>

      <!-- Onboard Doctor Modal -->
      <div *ngIf="showAddModal" class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
        <div class="modal-card">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Onboard New Physician</h3>
              <p class="modal-desc">Physicians added under {{ clinicProfile?.name || 'the clinic' }} are auto-approved and available immediately.</p>
            </div>
            <button mat-icon-button (click)="showAddModal = false" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="doctorForm" (ngSubmit)="onAddDoctor()" class="doctor-form mt-4">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Full Name *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="name" placeholder="Dr. Rajesh Patel" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">Work Email Address *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput type="email" formControlName="email" placeholder="rajesh.patel@clinic.com" />
                </mat-form-field>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Contact Phone Number</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="phone" placeholder="+91 98765 43210" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">Designation / Specialization *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select formControlName="specializationId" placeholder="Select Specialization">
                    <mat-option *ngFor="let spec of specializations" [value]="spec._id">
                      {{ spec.name }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Qualifications</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="qualifications" placeholder="MBBS, MD (Medicine)" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">Consultation Fee (₹) *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput type="number" formControlName="consultationFee" placeholder="600" />
                </mat-form-field>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Experience (Years) *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput type="number" formControlName="experienceYears" placeholder="8" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">Consultation Slot Duration *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select formControlName="slotDurationMinutes">
                    <mat-option [value]="15">15 Minutes</mat-option>
                    <mat-option [value]="30">30 Minutes</mat-option>
                    <mat-option [value]="45">45 Minutes</mat-option>
                    <mat-option [value]="60">60 Minutes</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Temporary Account Password *</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput type="password" formControlName="password" placeholder="••••••••" />
              </mat-form-field>
            </div>

            <div class="modal-actions">
              <button mat-button type="button" (click)="showAddModal = false">Cancel</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="doctorForm.invalid || creating">
                <mat-spinner *ngIf="creating" diameter="18" class="mr-2"></mat-spinner>
                <span>{{ creating ? 'Onboarding...' : 'Onboard Physician' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Doctor Profile Modal (Full Details View) -->
      <div *ngIf="selectedDoctor" class="modal-backdrop" (click)="closeProfileModalOnBackdrop($event)">
        <div class="profile-modal-card">
          <!-- Modal Header -->
          <div class="profile-modal-header">
            <div class="flex items-center gap-2">
              <mat-icon class="text-teal-700">medical_information</mat-icon>
              <div>
                <h3 class="modal-title">Physician Profile & Credentials</h3>
                <p class="modal-desc">Comprehensive medical qualifications, clinic practice info, and consultation policy.</p>
              </div>
            </div>
            <button mat-icon-button (click)="selectedDoctor = null" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Loading Indicator if fetching extra details -->
          <div *ngIf="loadingDoctorDetails" class="loading-bar">
            <mat-spinner diameter="16"></mat-spinner>
            <span class="text-xs text-neutral-600">Synchronizing live doctor schedule and details...</span>
          </div>

          <div class="profile-modal-body">
            <!-- Hero Identity Banner -->
            <div class="doc-hero-banner">
              <div class="doc-hero-avatar">
                <img *ngIf="getDoctorPhoto(selectedDoctor)" [src]="getDoctorPhoto(selectedDoctor)" alt="Doctor Photo" />
                <span *ngIf="!getDoctorPhoto(selectedDoctor)">{{ getDoctorInitials(selectedDoctor) }}</span>
              </div>
              <div class="doc-hero-info">
                <div class="doc-hero-name-row">
                  <h2 class="doc-hero-name">{{ getDoctorDisplayName(selectedDoctor) }}</h2>
                  <app-status-badge [status]="getDoctorStatus(selectedDoctor)"></app-status-badge>
                </div>
                <div class="doc-hero-spec">
                  <mat-icon class="spec-ic">health_and_safety</mat-icon>
                  <span>{{ getDoctorDesignation(selectedDoctor) }}</span>
                  <span class="dot-sep">•</span>
                  <span>{{ getDoctorQualifications(selectedDoctor) }}</span>
                </div>
                <div class="doc-hero-sub">
                  <span class="clinic-tag" *ngIf="clinicProfile?.name">
                    <mat-icon class="sub-ic">apartment</mat-icon>
                    <span>{{ clinicProfile?.name }}</span>
                  </span>
                  <span class="rating-tag">
                    <mat-icon class="star-ic">star</mat-icon>
                    <span class="font-bold">{{ (selectedDoctor.avgRating || 5.0).toFixed(1) }}</span>
                    <span class="text-xs">({{ selectedDoctor.totalReviews || 0 }} reviews)</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Quick Metrics Grid -->
            <div class="metrics-grid">
              <div class="metric-card">
                <span class="metric-lbl">Consultation Fee</span>
                <span class="metric-val text-teal-800">₹{{ selectedDoctor.consultationFee || 500 }}</span>
                <span class="metric-sub">Per patient visit</span>
              </div>

              <div class="metric-card">
                <span class="metric-lbl">Clinical Experience</span>
                <span class="metric-val text-neutral-900">{{ getDoctorExperience(selectedDoctor) }} Years</span>
                <span class="metric-sub">Active medical practice</span>
              </div>

              <div class="metric-card">
                <span class="metric-lbl">Slot Duration</span>
                <span class="metric-val text-neutral-900">{{ selectedDoctor.slotDurationMinutes || 30 }} Mins</span>
                <span class="metric-sub">Consultation time slot</span>
              </div>

              <div class="metric-card">
                <span class="metric-lbl">Booking Confirmation</span>
                <span class="metric-val text-indigo-700">
                  {{ selectedDoctor.manualApprovalMode ? 'Manual' : 'Instant' }}
                </span>
                <span class="metric-sub">
                  {{ selectedDoctor.manualApprovalMode ? 'Requires doctor review' : 'Instant confirmed (Redbus)' }}
                </span>
              </div>
            </div>

            <!-- Details Sections Grid -->
            <div class="details-two-col">
              <!-- Contact & Identity Column -->
              <div class="details-section">
                <h4 class="section-title">
                  <mat-icon class="sec-ic">contacts</mat-icon>
                  <span>Contact & Medical Registration</span>
                </h4>
                <div class="info-list">
                  <div class="info-row">
                    <span class="info-label">Email Address</span>
                    <span class="info-val font-medium">{{ getDoctorEmail(selectedDoctor) || 'Not provided' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Phone Number</span>
                    <span class="info-val font-medium">{{ getDoctorPhone(selectedDoctor) || 'Not provided' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Medical Registration No.</span>
                    <span class="info-val font-mono font-bold text-neutral-800">
                      {{ selectedDoctor.licenseNumber || 'Verified during onboarding' }}
                    </span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Affiliated Facility</span>
                    <span class="info-val text-neutral-800">
                      {{ clinicProfile?.name || 'Your Clinic' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Qualifications & Practice Column -->
              <div class="details-section">
                <h4 class="section-title">
                  <mat-icon class="sec-ic">workspace_premium</mat-icon>
                  <span>Credentials & Specialization</span>
                </h4>
                <div class="info-list">
                  <div class="info-row">
                    <span class="info-label">Primary Department</span>
                    <span class="info-val font-semibold text-teal-800">
                      {{ getDoctorDesignation(selectedDoctor) }}
                    </span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Degrees & Certifications</span>
                    <div class="qual-badges-wrap">
                      <span *ngFor="let q of getQualificationsArray(selectedDoctor)" class="qual-badge">
                        {{ q }}
                      </span>
                    </div>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Clinic Location</span>
                    <span class="info-val text-neutral-600">
                      {{ selectedDoctor.clinicAddress || clinicProfile?.address || 'Main Clinic Facility' }}
                    </span>
                  </div>
                  <div class="info-row" *ngIf="selectedDoctor.createdAt">
                    <span class="info-label">Affiliation Date</span>
                    <span class="info-val">
                      {{ selectedDoctor.createdAt | portalDate:'dd MMM yyyy' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bio / Professional Statement -->
            <div class="details-section mt-4">
              <h4 class="section-title">
                <mat-icon class="sec-ic">article</mat-icon>
                <span>Professional Biography & Scope of Practice</span>
              </h4>
              <p class="bio-text" *ngIf="selectedDoctor.bio">
                {{ selectedDoctor.bio }}
              </p>
              <p class="bio-empty" *ngIf="!selectedDoctor.bio">
                No professional biography has been recorded for this physician.
              </p>
            </div>

            <!-- Medical License Document (if uploaded) -->
            <div class="details-section mt-4" *ngIf="selectedDoctor.licenseDocumentUrl">
              <h4 class="section-title">
                <mat-icon class="sec-ic">verified_user</mat-icon>
                <span>Medical Registration Certificate</span>
              </h4>
              <div class="license-doc-card">
                <div class="flex items-center gap-3">
                  <div class="license-doc-icon">
                    <mat-icon>description</mat-icon>
                  </div>
                  <div>
                    <div class="font-bold text-sm text-neutral-800">Medical Council License Document</div>
                    <div class="text-xs text-neutral-500">Official medical council verification certificate</div>
                  </div>
                </div>
                <a [href]="getDocumentFullUrl(selectedDoctor.licenseDocumentUrl)" target="_blank" rel="noopener noreferrer" mat-stroked-button color="primary" class="doc-view-btn">
                  <mat-icon>open_in_new</mat-icon>
                  <span>View Document</span>
                </a>
              </div>
            </div>

            <!-- Weekly Consultation Schedule (if available) -->
            <div class="details-section mt-4" *ngIf="selectedDoctor.weeklySchedule && selectedDoctor.weeklySchedule.length > 0">
              <h4 class="section-title">
                <mat-icon class="sec-ic">event_available</mat-icon>
                <span>Weekly Consultation Schedule</span>
              </h4>
              <div class="schedule-grid">
                <div *ngFor="let day of selectedDoctor.weeklySchedule" class="day-slot-card" [class.day-inactive]="!day.isActive">
                  <span class="day-name">{{ getDayName(day.dayOfWeek) }}</span>
                  <div class="day-times" *ngIf="day.isActive && day.slots?.length > 0">
                    <span *ngFor="let s of day.slots" class="slot-pill">{{ s.start }} - {{ s.end }}</span>
                  </div>
                  <span class="day-off" *ngIf="!day.isActive || !day.slots?.length">Off</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button mat-button (click)="selectedDoctor = null">Close</button>
            <div class="flex gap-2">
              <button
                *ngIf="getDoctorStatus(selectedDoctor) === 'active'"
                mat-stroked-button
                color="warn"
                (click)="toggleStatus(selectedDoctor._id, 'suspended'); selectedDoctor.status = 'suspended'"
              >
                <mat-icon>block</mat-icon>
                <span>Suspend Physician</span>
              </button>
              <button
                *ngIf="getDoctorStatus(selectedDoctor) === 'suspended' || getDoctorStatus(selectedDoctor) === 'pending'"
                mat-flat-button
                color="primary"
                (click)="toggleStatus(selectedDoctor._id, 'active'); selectedDoctor.status = 'active'"
              >
                <mat-icon>check_circle</mat-icon>
                <span>Activate Physician</span>
              </button>
            </div>
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

    .table-card {
      padding: 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #A0C6C6;
      margin-bottom: 12px;
    }

    .table-container {
      overflow-x: auto;
    }

    .doctors-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .doctors-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .doctors-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
      vertical-align: middle;
    }

    .spec-pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      background-color: #E6F4F1;
      color: #0F5C54;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .btn-sm {
      font-size: 12px !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 12px !important;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .btn-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
    }

    .text-right {
      text-align: right;
    }

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
      z-index: 999;
      padding: 20px;
    }

    .modal-card {
      background: #FFFFFF;
      border-radius: 14px;
      padding: 28px;
      max-width: 620px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 4px;
    }

    .modal-desc {
      font-size: 12px;
      color: #5C6B6B;
      margin: 0;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 600px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }

    .w-full {
      width: 100%;
    }

    .mr-1 {
      margin-right: 4px;
    }

    .mr-2 {
      margin-right: 8px;
    }

    .cursor-pointer {
      cursor: pointer;
    }

    .doctor-identity-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .doctor-avatar-sm {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #E8F5F1;
      color: #0F5C54;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      overflow: hidden;
      flex-shrink: 0;
    }

    .doctor-avatar-sm img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .doctor-name-link {
      font-weight: 700;
      color: #1A2E2E;
      font-size: 14px;
      transition: color 0.15s;
    }

    .cursor-pointer:hover .doctor-name-link {
      color: #0F5C54;
      text-decoration: underline;
    }

    /* Doctor Profile Modal */
    .profile-modal-card {
      background: #FFFFFF;
      border-radius: 16px;
      max-width: 840px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      border: 1px solid #E5E7EB;
    }

    .profile-modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      background: #FFFFFF;
    }

    .loading-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 24px;
      background: #F0FDFA;
      border-bottom: 1px solid #CCFBF1;
    }

    .profile-modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .doc-hero-banner {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px;
      background: #F7FAF9;
      border: 1px solid #E0ECE9;
      border-radius: 14px;
      margin-bottom: 20px;
    }

    .doc-hero-avatar {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: #0F5C54;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
      flex-shrink: 0;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(15, 92, 84, 0.2);
    }

    .doc-hero-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .doc-hero-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .doc-hero-name-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .doc-hero-name {
      font-size: 20px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .doc-hero-spec {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #0F5C54;
    }

    .spec-ic {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .dot-sep {
      color: #9CA3AF;
    }

    .doc-hero-sub {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 12px;
      color: #5C6B6B;
    }

    .clinic-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .sub-ic {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: #5C6B6B;
    }

    .rating-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #FEF3C7;
      color: #92400E;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .star-ic {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #D97706;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    @media (max-width: 768px) {
      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .metric-card {
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
    }

    .metric-lbl {
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .metric-val {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 2px;
    }

    .metric-sub {
      font-size: 11px;
      color: #718096;
    }

    .details-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 640px) {
      .details-two-col {
        grid-template-columns: 1fr;
      }
    }

    .details-section {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 12px;
      padding: 16px;
    }

    .mt-4 {
      margin-top: 16px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid #E7E5E0;
      padding-bottom: 8px;
    }

    .sec-ic {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #0F5C54;
    }

    .info-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      font-size: 13px;
    }

    .info-label {
      color: #718096;
      font-weight: 500;
      min-width: 140px;
    }

    .info-val {
      color: #1A2E2E;
      text-align: right;
    }

    .qual-badges-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
    }

    .qual-badge {
      background: #E6F4F1;
      color: #0F5C54;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .bio-text {
      font-size: 13px;
      line-height: 1.6;
      color: #374151;
      margin: 0;
    }

    .bio-empty {
      font-size: 13px;
      color: #9CA3AF;
      font-style: italic;
      margin: 0;
    }

    .license-doc-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      padding: 12px 16px;
      border-radius: 10px;
    }

    .license-doc-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #E8F5F1;
      color: #0F5C54;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .schedule-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .day-slot-card {
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .day-slot-card.day-inactive {
      opacity: 0.55;
      background: #F9FAFB;
    }

    .day-name {
      font-size: 11px;
      font-weight: 800;
      color: #1A2E2E;
    }

    .slot-pill {
      font-size: 11px;
      color: #0F5C54;
      font-weight: 600;
      background: #E6F4F1;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }

    .day-off {
      font-size: 11px;
      color: #9CA3AF;
      font-style: italic;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #F9FAFB;
    }
  `],
})
export class ManageDoctorsComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private doctorService = inject(DoctorService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  clinicProfile: Clinic | null = null;
  doctors: Doctor[] = [];
  specializations: Specialization[] = [];
  loading = true;
  showAddModal = false;
  creating = false;
  selectedDoctor: any | null = null;
  loadingDoctorDetails = false;

  doctorForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    specializationId: ['', [Validators.required]],
    password: ['DocyraStaff@2026', [Validators.required, Validators.minLength(8)]],
    consultationFee: [500, [Validators.required, Validators.min(0)]],
    slotDurationMinutes: [30, [Validators.required]],
    experienceYears: [5, [Validators.required, Validators.min(0)]],
    qualifications: ['MBBS, MD'],
  });

  ngOnInit(): void {
    this.loadClinicAndDoctors();
    this.loadSpecializations();
  }

  loadClinicAndDoctors(): void {
    this.loading = true;
    this.clinicService.getMyClinicProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.clinicProfile = res.data;
          this.loadDoctors(res.data._id);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadDoctors(clinicId: string): void {
    this.clinicService.getClinicDoctors(clinicId).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.doctors = res.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadSpecializations(): void {
    this.clinicService.getSpecializations().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.specializations = res.data;
          if (this.specializations.length > 0 && !this.doctorForm.get('specializationId')?.value) {
            this.doctorForm.patchValue({ specializationId: this.specializations[0]._id });
          }
        }
      },
    });
  }

  openAddModal(): void {
    if (this.specializations.length > 0 && !this.doctorForm.get('specializationId')?.value) {
      this.doctorForm.patchValue({ specializationId: this.specializations[0]._id });
    }
    this.showAddModal = true;
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.showAddModal = false;
    }
  }

  toggleStatus(doctorId: string, status: 'active' | 'suspended'): void {
    this.clinicService.updateDoctorStatus(doctorId, status).subscribe({
      next: () => {
        this.notificationService.success(`Doctor status changed to ${status}`);
        if (this.selectedDoctor && this.selectedDoctor._id === doctorId) {
          this.selectedDoctor.status = status;
        }
        if (this.clinicProfile) {
          this.loadDoctors(this.clinicProfile._id);
        }
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }

  openDoctorProfile(doc: any): void {
    this.selectedDoctor = { ...doc };
    this.loadingDoctorDetails = true;
    this.doctorService.getDoctorProfile(doc._id).subscribe({
      next: (res) => {
        this.loadingDoctorDetails = false;
        if (res.success && res.data) {
          this.selectedDoctor = { ...this.selectedDoctor, ...res.data };
        }
      },
      error: () => {
        this.loadingDoctorDetails = false;
      },
    });
  }

  closeProfileModalOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.selectedDoctor = null;
    }
  }

  getDoctorPhone(doc: any): string {
    if (doc?.userId && typeof doc.userId === 'object' && doc.userId.phone) {
      return doc.userId.phone;
    }
    return doc?.phone || '';
  }

  getDoctorInitials(doc: any): string {
    const name = this.getDoctorDisplayName(doc).replace(/^Dr\.\s*/i, '').trim();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || 'D').toUpperCase();
  }

  getQualificationsArray(doc: any): string[] {
    if (Array.isArray(doc?.qualifications) && doc.qualifications.length > 0) {
      return doc.qualifications;
    }
    if (typeof doc?.qualifications === 'string' && doc.qualifications) {
      return doc.qualifications.split(',').map((q: string) => q.trim()).filter((q: string) => q.length > 0);
    }
    return ['MBBS'];
  }

  getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] !== undefined ? days[dayOfWeek] : `Day ${dayOfWeek}`;
  }

  getDocumentFullUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${environment.apiBaseUrl.replace('/api/v1', '')}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  onAddDoctor(): void {
    if (this.doctorForm.invalid || !this.clinicProfile) return;

    this.creating = true;
    const formVal = this.doctorForm.value;
    const quals = typeof formVal.qualifications === 'string'
      ? formVal.qualifications.split(',').map((q: string) => q.trim()).filter((q: string) => q.length > 0)
      : Array.isArray(formVal.qualifications) ? formVal.qualifications : ['MBBS'];

    const payload = {
      name: formVal.name.trim(),
      email: formVal.email.trim().toLowerCase(),
      phone: formVal.phone ? formVal.phone.trim() : undefined,
      specializationId: formVal.specializationId,
      password: formVal.password,
      consultationFee: Number(formVal.consultationFee) || 500,
      slotDurationMinutes: Number(formVal.slotDurationMinutes) || 30,
      experienceYears: Number(formVal.experienceYears) || 0,
      yearsExperience: Number(formVal.experienceYears) || 0,
      qualifications: quals,
    };

    this.clinicService.createDoctor(this.clinicProfile._id, payload).subscribe({
      next: () => {
        this.creating = false;
        this.showAddModal = false;
        this.doctorForm.reset({
          name: '',
          email: '',
          phone: '',
          specializationId: this.specializations[0]?._id || '',
          password: 'DocyraStaff@2026',
          consultationFee: 500,
          slotDurationMinutes: 30,
          experienceYears: 5,
          qualifications: 'MBBS, MD',
        });
        this.notificationService.success('Physician onboarded & auto-approved successfully!');
        this.loadDoctors(this.clinicProfile!._id);
      },
      error: (err) => {
        this.creating = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to onboard physician');
      },
    });
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

    if (!/^dr\.?\s+/i.test(name)) {
      name = `Dr. ${name}`;
    }
    return name;
  }

  getDoctorEmail(doc: any): string {
    if (doc.userId && typeof doc.userId === 'object' && doc.userId.email) {
      return doc.userId.email;
    }
    return doc.email || '';
  }

  getDoctorPhoto(doc: any): string {
    if (!doc) return '';
    if (doc.profilePhotoUrl) return doc.profilePhotoUrl;
    if (doc.userId && typeof doc.userId === 'object' && doc.userId.profilePhotoUrl) {
      return doc.userId.profilePhotoUrl;
    }
    return '';
  }

  getDoctorDesignation(doc: any): string {
    if (doc.specializationId && typeof doc.specializationId === 'object' && doc.specializationId.name) {
      return doc.specializationId.name;
    }
    if (typeof doc.specializationId === 'string' && doc.specializationId) {
      const found = this.specializations.find((s) => s._id === doc.specializationId);
      if (found) return found.name;
      return doc.specializationId;
    }
    return 'General Physician';
  }

  getDoctorQualifications(doc: any): string {
    if (Array.isArray(doc.qualifications) && doc.qualifications.length > 0) {
      return doc.qualifications.join(', ');
    }
    if (typeof doc.qualifications === 'string' && doc.qualifications) {
      return doc.qualifications;
    }
    return 'MBBS';
  }

  getDoctorExperience(doc: any): number {
    if (doc.yearsExperience !== undefined && doc.yearsExperience !== null) {
      return doc.yearsExperience;
    }
    if (doc.experienceYears !== undefined && doc.experienceYears !== null) {
      return doc.experienceYears;
    }
    return 0;
  }

  getDoctorStatus(doc: any): string {
    if (doc.status) return doc.status;
    if (doc.userId && typeof doc.userId === 'object' && doc.userId.status) {
      return doc.userId.status;
    }
    return doc.isApproved ? 'active' : 'suspended';
  }
}
