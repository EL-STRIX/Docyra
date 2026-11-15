import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Clinic } from '../../../core/models/clinic.model';
import { Doctor } from '../../../core/models/doctor.model';
import { Appointment, MedicalTest } from '../../../core/models/appointment.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-clinic-appointments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    DateFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="clinic-appointments-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Clinic Master Appointments</h1>
          <p class="page-subtitle">Unified register of all consultations across all doctors at {{ clinicProfile?.name || 'the clinic' }}.</p>
        </div>
      </div>

      <!-- Filter Controls -->
      <mat-card class="filter-card">
        <div class="filter-grid">
          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Search patient, doctor, reason...</mat-label>
              <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" placeholder="Type to filter..." />
              <mat-icon matPrefix class="mr-2 text-neutral-400">search</mat-icon>
            </mat-form-field>
          </div>

          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Filter by Physician</mat-label>
              <mat-select [(ngModel)]="selectedDoctorId" (selectionChange)="applyFilters()">
                <mat-option value="all">All Physicians</mat-option>
                <mat-option *ngFor="let doc of doctors" [value]="doc._id">
                  {{ getDoctorDisplayName(doc) }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilters()">
                <mat-option value="all">All Statuses</mat-option>
                <mat-option value="confirmed">Confirmed</mat-option>
                <mat-option value="completed">Completed</mat-option>
                <mat-option value="pending">Pending</mat-option>
                <mat-option value="cancelled">Cancelled</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </mat-card>

      <!-- Appointments List Table -->
      <mat-card class="table-card">
        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
        </div>

        <div *ngIf="!loading && filteredAppointments.length === 0" class="empty-state">
          <mat-icon class="empty-icon">event_note</mat-icon>
          <h3>No appointments match your filter criteria</h3>
          <p>Try selecting a different doctor or clearing search parameters.</p>
        </div>

        <div *ngIf="!loading && filteredAppointments.length > 0" class="table-container">
          <table class="clinic-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Patient</th>
                <th>Assigned Physician</th>
                <th>Reason</th>
                <th>Consultation Fee</th>
                <th>Status</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let apt of filteredAppointments" class="table-row-clickable" (click)="openAppointmentDetails(apt)">
                <td>
                  <div class="font-bold text-sm text-neutral-800">
                    {{ apt.slotStart | portalDate:'dd MMM yyyy' }}
                  </div>
                  <div class="text-xs font-semibold text-teal-700">
                    {{ apt.slotStart | portalDate:'h:mm a' }}
                  </div>
                </td>

                <td>
                  <div class="font-bold text-neutral-900 text-sm">
                    {{ getPatientName(apt) }}
                    <span *ngIf="apt.bookedFor?.type === 'dependent'" class="dependent-pill">
                      {{ apt.bookedFor.relationship || 'Dependent' }}
                    </span>
                  </div>
                  <div class="text-xs text-neutral-500" *ngIf="getPatientPhone(apt)">
                    {{ getPatientPhone(apt) }}
                  </div>
                </td>

                <td>
                  <div class="font-bold text-neutral-900 text-sm">
                    {{ getDoctorName(apt) }}
                  </div>
                  <div *ngIf="getDoctorSpecialization(apt)" class="text-xs font-semibold text-teal-700 mt-0.5">
                    {{ getDoctorSpecialization(apt) }}
                  </div>
                </td>

                <td>
                  <div class="font-medium text-neutral-800 text-sm">
                    {{ apt.reasonForVisit || apt.notes || 'General Consultation' }}
                  </div>
                </td>

                <td>
                  <div class="font-bold text-sm text-neutral-900">₹{{ getAppointmentPrice(apt) }}</div>
                  <span class="payment-badge" [ngClass]="getPaymentStatusClass(apt)">
                    {{ getPaymentStatusDisplay(apt) }}
                  </span>
                </td>

                <td>
                  <app-status-badge [status]="apt.status"></app-status-badge>
                </td>

                <td class="text-right" (click)="$event.stopPropagation()">
                  <button mat-stroked-button color="primary" class="btn-sm action-btn" (click)="openAppointmentDetails(apt)">
                    <mat-icon class="btn-icon">visibility</mat-icon>
                    <span>View</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>

      <!-- Appointment Details Modal (Essential Info Only) -->
      <div *ngIf="selectedAppointment" class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
        <div class="appointment-modal-card">
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="header-left">
              <div class="apt-badge-row">
                <span class="apt-ref-id">#{{ selectedAppointment._id.slice(-6) }}</span>
                <app-status-badge [status]="selectedAppointment.status"></app-status-badge>
              </div>
              <h3 class="modal-title">Appointment Summary</h3>
            </div>
            <button mat-icon-button (click)="selectedAppointment = null" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <!-- Schedule Highlight Banner -->
            <div class="schedule-banner">
              <div class="schedule-icon-wrap">
                <mat-icon>event</mat-icon>
              </div>
              <div class="schedule-details">
                <div class="schedule-date">
                  {{ selectedAppointment.slotStart | portalDate:'EEEE, dd MMMM yyyy' }}
                </div>
                <div class="schedule-time">
                  {{ selectedAppointment.slotStart | portalDate:'h:mm a' }}
                  <span *ngIf="selectedAppointment.slotEnd"> - {{ selectedAppointment.slotEnd | portalDate:'h:mm a' }}</span>
                </div>
              </div>
            </div>

            <!-- Two-Column Needed Details -->
            <div class="details-grid">
              <!-- Patient Details Card -->
              <div class="detail-card">
                <div class="detail-card-header">
                  <mat-icon class="card-ic">person</mat-icon>
                  <span>Patient Information</span>
                </div>
                <div class="detail-rows">
                  <div class="detail-row">
                    <span class="detail-lbl">Patient Name</span>
                    <span class="detail-val font-bold text-neutral-900">
                      {{ getPatientName(selectedAppointment) }}
                      <span *ngIf="selectedAppointment.bookedFor?.type === 'dependent'" class="dependent-pill">
                        {{ selectedAppointment.bookedFor.relationship || 'Dependent' }}
                      </span>
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-lbl">Booking Type</span>
                    <span class="detail-val">
                      {{ selectedAppointment.bookedFor.type === 'dependent' ? 'Family Dependent' : 'Self Booking' }}
                    </span>
                  </div>
                  <div class="detail-row" *ngIf="getPatientPhone(selectedAppointment)">
                    <span class="detail-lbl">Phone Number</span>
                    <span class="detail-val font-medium text-neutral-800">
                      {{ getPatientPhone(selectedAppointment) }}
                    </span>
                  </div>
                  <div class="detail-row" *ngIf="getPatientEmail(selectedAppointment)">
                    <span class="detail-lbl">Email Address</span>
                    <span class="detail-val font-medium text-neutral-800">
                      {{ getPatientEmail(selectedAppointment) }}
                    </span>
                  </div>
                  <div class="detail-row" *ngIf="selectedAppointment.bookedFor.gender">
                    <span class="detail-lbl">Gender</span>
                    <span class="detail-val capitalize">
                      {{ selectedAppointment.bookedFor.gender }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Physician & Billing Card -->
              <div class="detail-card">
                <div class="detail-card-header">
                  <mat-icon class="card-ic">medical_services</mat-icon>
                  <span>Physician & Consultation Fee</span>
                </div>
                <div class="detail-rows">
                  <div class="detail-row">
                    <span class="detail-lbl">Attending Physician</span>
                    <span class="detail-val font-bold text-teal-800">
                      {{ getDoctorName(selectedAppointment) }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-lbl">Department / Specialty</span>
                    <span class="detail-val">
                      {{ getDoctorSpecialization(selectedAppointment) || 'General Practice' }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-lbl">Consultation Fee</span>
                    <span class="detail-val font-bold text-neutral-900">
                      ₹{{ getAppointmentPrice(selectedAppointment) }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-lbl">Payment Status</span>
                    <span class="detail-val">
                      <span class="payment-badge" [ngClass]="getPaymentStatusClass(selectedAppointment)">
                        {{ getPaymentStatusDisplay(selectedAppointment) }}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Reason for Visit -->
            <div class="visit-info-card">
              <div class="detail-card-header">
                <mat-icon class="card-ic">article</mat-icon>
                <span>Reason for Visit</span>
              </div>
              <div class="visit-reason-text">
                {{ selectedAppointment.reasonForVisit || 'General Medical Consultation' }}
              </div>
            </div>

            <!-- Doctor's Clinical Notes (Read-Only) -->
            <div class="clinical-section-card" *ngIf="selectedAppointment.notes">
              <div class="detail-card-header flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <mat-icon class="card-ic text-teal-700">description</mat-icon>
                  <span>Doctor's Clinical Notes</span>
                </div>
                <span class="readonly-badge">Doctor's Record • Read-Only</span>
              </div>
              <div class="clinical-notes-content">
                {{ selectedAppointment.notes }}
              </div>
            </div>

            <!-- Doctor's Prescription & Medicines (Read-Only with Print) -->
            <div class="clinical-section-card">
              <div class="detail-card-header flex justify-between items-center flex-wrap gap-2">
                <div class="flex items-center gap-2">
                  <mat-icon class="card-ic text-teal-700">medication</mat-icon>
                  <span>Doctor's Prescription & Medicines</span>
                  <span class="readonly-badge">Read-Only</span>
                </div>
                <button
                  *ngIf="(selectedAppointment.prescription?.medicines?.length || 0) > 0"
                  mat-stroked-button
                  color="primary"
                  class="print-action-btn"
                  (click)="printMedicines()"
                  type="button"
                >
                  <mat-icon class="btn-ic">print</mat-icon>
                  <span>Print Medicine List</span>
                </button>
              </div>

              <div *ngIf="!selectedAppointment.prescription?.medicines || selectedAppointment.prescription?.medicines?.length === 0" class="empty-sub-card">
                <mat-icon class="empty-sub-ic">medical_information</mat-icon>
                <p>No prescribed medicines recorded by the doctor for this visit.</p>
              </div>

              <div *ngIf="(selectedAppointment.prescription?.medicines?.length || 0) > 0" class="meds-table-wrap">
                <table class="prescription-table">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let med of selectedAppointment.prescription?.medicines">
                      <td class="font-bold text-neutral-900">{{ med.name }}</td>
                      <td>{{ med.dosage || '-' }}</td>
                      <td><span class="freq-tag">{{ med.frequency || '-' }}</span></td>
                      <td>{{ med.duration || '-' }}</td>
                      <td class="text-neutral-600">{{ med.instructions || 'As advised' }}</td>
                    </tr>
                  </tbody>
                </table>

                <div *ngIf="selectedAppointment.prescription?.generalAdvice" class="rx-extra-box mt-3">
                  <strong class="text-teal-900">Doctor's General Advice: </strong>
                  <span>{{ selectedAppointment.prescription?.generalAdvice }}</span>
                </div>
                <div *ngIf="selectedAppointment.prescription?.followUpDate" class="rx-extra-box mt-2">
                  <strong class="text-teal-900">Follow-up Recommendation: </strong>
                  <span>{{ selectedAppointment.prescription?.followUpDate }}</span>
                </div>
              </div>
            </div>

            <!-- Advised Diagnostic / Lab Tests (Manage Status & Results) -->
            <div class="clinical-section-card">
              <div class="detail-card-header flex justify-between items-center flex-wrap gap-2">
                <div class="flex items-center gap-2">
                  <mat-icon class="card-ic text-teal-700">biotech</mat-icon>
                  <span>Advised Diagnostic & Lab Tests</span>
                </div>
                <button
                  *ngIf="selectedAppointment.medicalTests && selectedAppointment.medicalTests.length > 0"
                  mat-stroked-button
                  color="primary"
                  class="print-action-btn"
                  (click)="printTests()"
                  type="button"
                >
                  <mat-icon class="btn-ic">print</mat-icon>
                  <span>Print Lab Tests List</span>
                </button>
              </div>

              <div *ngIf="!selectedAppointment.medicalTests || selectedAppointment.medicalTests.length === 0" class="empty-sub-card">
                <mat-icon class="empty-sub-ic">science</mat-icon>
                <p>No diagnostic lab tests were prescribed for this appointment.</p>
              </div>

              <div *ngIf="selectedAppointment.medicalTests && selectedAppointment.medicalTests.length > 0" class="tests-list-wrap">
                <div class="test-item-card" *ngFor="let test of selectedAppointment.medicalTests">
                  <div class="test-item-top">
                    <div class="test-name-area">
                      <div class="test-title-line">
                        <mat-icon class="test-ic">biotech</mat-icon>
                        <span class="test-name-txt">{{ test.testName }}</span>
                        <span class="test-status-pill" [ngClass]="getTestStatusBadgeClass(test.status)">
                          {{ formatTestStatus(test.status) }}
                        </span>
                      </div>
                      <div class="test-instructions-txt" *ngIf="test.instructions">
                        <span class="font-semibold text-neutral-600">Doctor's Instructions:</span> {{ test.instructions }}
                      </div>
                    </div>

                    <!-- Status Change Selector (Clinic Admin can update each test status) -->
                    <div class="test-status-selector-wrap">
                      <label class="selector-lbl">Update Status</label>
                      <mat-form-field appearance="outline" class="status-select-field" subscriptSizing="dynamic">
                        <mat-select [value]="test.status || 'not_started'" (selectionChange)="updateTestStatus(test, $event.value)">
                          <mat-option value="not_started">Not Started</mat-option>
                          <mat-option value="in_progress">In Progress</mat-option>
                          <mat-option value="completed">Completed</mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>
                  </div>

                  <!-- Findings Notes & Report Upload Section -->
                  <div class="test-actions-box">
                    <div class="findings-input-col">
                      <label class="action-field-lbl">Test Findings / Result Notes</label>
                      <div class="findings-input-row">
                        <input
                          class="findings-input"
                          [(ngModel)]="test.resultNotes"
                          placeholder="Enter findings, values or diagnostic notes..."
                        />
                        <button
                          mat-button
                          color="primary"
                          class="save-findings-btn"
                          [disabled]="updatingTestId === test._id"
                          (click)="saveTestFindings(test)"
                          title="Save findings notes"
                        >
                          <mat-icon class="btn-ic">check</mat-icon>
                          <span>Save</span>
                        </button>
                      </div>
                    </div>

                    <div class="upload-col">
                      <label class="action-field-lbl">Lab Test Result Document</label>
                      <div class="upload-btn-row">
                        <input
                          type="file"
                          #reportFileInput
                          (change)="onUploadTestReport($event, test)"
                          accept=".pdf,image/*"
                          style="display: none"
                        />
                        <button
                          mat-stroked-button
                          color="primary"
                          class="report-upload-btn"
                          [disabled]="uploadingTestId === test._id"
                          (click)="reportFileInput.click()"
                        >
                          <mat-spinner *ngIf="uploadingTestId === test._id" diameter="16" class="inline-spinner mr-1.5"></mat-spinner>
                          <mat-icon *ngIf="uploadingTestId !== test._id" class="btn-ic">upload_file</mat-icon>
                          <span>{{ test.resultFileUrl ? 'Replace Report File' : 'Upload Result (PDF/Image)' }}</span>
                        </button>

                        <a
                          *ngIf="test.resultFileUrl"
                          [href]="test.resultFileUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="view-report-pill"
                          title="Open uploaded lab report in new tab"
                        >
                          <mat-icon class="pill-ic">description</mat-icon>
                          <span>View Report</span>
                          <mat-icon class="pill-ic-ext">open_in_new</mat-icon>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cancellation Details (Only if cancelled) -->
            <div class="cancel-info-card" *ngIf="selectedAppointment.status === 'cancelled'">
              <div class="cancel-header">
                <mat-icon class="text-rose-600">cancel</mat-icon>
                <span class="font-bold text-rose-800">Cancellation Record</span>
              </div>
              <p class="cancel-text" *ngIf="selectedAppointment.cancellationReason">
                Reason: {{ selectedAppointment.cancellationReason }}
              </p>
              <div class="cancel-meta" *ngIf="selectedAppointment.cancelledAt || selectedAppointment.cancelledBy">
                <span *ngIf="selectedAppointment.cancelledBy">Cancelled by: {{ selectedAppointment.cancelledBy | titlecase }}</span>
                <span *ngIf="selectedAppointment.cancelledAt">• {{ selectedAppointment.cancelledAt | portalDate:'dd MMM yyyy, h:mm a' }}</span>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button mat-button (click)="selectedAppointment = null">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .clinic-appointments-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
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

    .filter-card, .table-card {
      padding: 20px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .filter-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .filter-grid {
        grid-template-columns: 1fr;
      }
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

    .clinic-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .clinic-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .clinic-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
      vertical-align: middle;
    }

    .dependent-pill {
      font-size: 9px;
      font-weight: 700;
      background-color: #FEF6EC;
      color: #B57416;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 4px;
    }

    .payment-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-top: 4px;
    }

    .payment-paid {
      background-color: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }

    .payment-pending {
      background-color: #FFFBEB;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    .payment-refunded {
      background-color: #FEF2F2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .w-full {
      width: 100%;
    }

    .table-row-clickable {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .table-row-clickable:hover {
      background-color: #F8FAF9;
    }

    .btn-sm {
      font-size: 12px !important;
      height: 32px !important;
      padding: 0 10px !important;
      line-height: 32px !important;
    }

    .action-btn {
      color: #0F5C54 !important;
      border-color: #0F5C54 !important;
    }

    .btn-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      margin-right: 4px;
    }

    /* Modal Backdrop & Card */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .appointment-modal-card {
      background: #FFFFFF;
      border-radius: 16px;
      max-width: 820px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      border: 1px solid #E5E7EB;
    }

    .modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #FFFFFF;
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .apt-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .apt-ref-id {
      font-size: 12px;
      font-weight: 800;
      font-family: monospace;
      color: #0F5C54;
      background: #E6F4F1;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .close-btn {
      color: #9CA3AF;
    }

    .modal-body {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .schedule-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 18px;
      background: #F0FDFA;
      border: 1px solid #CCFBF1;
      border-radius: 12px;
    }

    .schedule-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #0F5C54;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .schedule-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .schedule-date {
      font-size: 14px;
      font-weight: 800;
      color: #0F5C54;
    }

    .schedule-time {
      font-size: 13px;
      font-weight: 600;
      color: #115E59;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    @media (max-width: 600px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
    }

    .detail-card {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .detail-card-header {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0F5C54;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid #E7E5E0;
      padding-bottom: 6px;
    }

    .card-ic {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .detail-rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      font-size: 12px;
    }

    .detail-lbl {
      color: #6B7280;
      font-weight: 500;
    }

    .detail-val {
      color: #1F2937;
      text-align: right;
    }

    .visit-info-card {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .visit-reason-text {
      font-size: 13px;
      font-weight: 600;
      color: #1F2937;
    }

    .visit-notes {
      font-size: 12px;
      color: #4B5563;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      padding: 8px 12px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .notes-lbl {
      font-size: 11px;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
    }

    .notes-content {
      line-height: 1.4;
    }

    .clinical-section-card {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .readonly-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6B7280;
      background: #F3F4F6;
      border: 1px solid #E5E7EB;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .clinical-notes-content {
      font-size: 13px;
      color: #1F2937;
      line-height: 1.6;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 12px 14px;
      white-space: pre-line;
    }

    .print-action-btn {
      font-size: 11px !important;
      font-weight: 700 !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 12px !important;
      border-radius: 6px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    .print-action-btn .btn-ic {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
    }

    .empty-sub-card {
      text-align: center;
      padding: 20px;
      color: #9CA3AF;
      background: #FFFFFF;
      border: 1px dashed #E5E7EB;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .empty-sub-ic {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #CBD5E1;
    }

    .empty-sub-card p {
      margin: 0;
      font-size: 12px;
    }

    .meds-table-wrap {
      overflow-x: auto;
    }

    .prescription-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: #FFFFFF;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #E5E7EB;
    }

    .prescription-table th {
      background: #F8FAFC;
      color: #475569;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px;
      border-bottom: 1px solid #E5E7EB;
      text-align: left;
    }

    .prescription-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #F1F5F9;
      color: #334155;
    }

    .freq-tag {
      background: #E6F4F1;
      color: #0F5C54;
      font-weight: 700;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .rx-extra-box {
      font-size: 12px;
      color: #334155;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 8px 12px;
      line-height: 1.4;
    }

    .tests-list-wrap {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .test-item-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .test-item-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    @media (max-width: 640px) {
      .test-item-top {
        flex-direction: column;
      }
    }

    .test-name-area {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .test-title-line {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .test-ic {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #0F5C54;
    }

    .test-name-txt {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
    }

    .test-status-pill {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 9999px;
    }

    .test-notstarted {
      background: #FEF3C7;
      color: #B45309;
    }

    .test-inprogress {
      background: #E0F2FE;
      color: #0369A1;
    }

    .test-completed {
      background: #DCFCE7;
      color: #15803D;
    }

    .test-instructions-txt {
      font-size: 12px;
      color: #4B5563;
      line-height: 1.4;
      margin-top: 2px;
    }

    .test-status-selector-wrap {
      min-width: 160px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .selector-lbl {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6B7280;
    }

    .status-select-field {
      width: 100%;
    }

    .status-select-field ::ng-deep .mat-mdc-text-field-wrapper {
      padding: 0 8px;
      height: 40px;
    }

    .test-actions-box {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      background: #FAFAF8;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 12px;
    }

    @media (max-width: 720px) {
      .test-actions-box {
        grid-template-columns: 1fr;
      }
    }

    .action-field-lbl {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #4B5563;
      margin-bottom: 4px;
      display: block;
    }

    .findings-input-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .findings-input {
      flex: 1;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      color: #1F2937;
      background: #FFFFFF;
      outline: none;
      transition: border-color 0.2s;
    }

    .findings-input:focus {
      border-color: #0F5C54;
    }

    .save-findings-btn {
      min-width: auto !important;
      padding: 0 10px !important;
      height: 32px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      border-radius: 6px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 2px !important;
    }

    .save-findings-btn .btn-ic {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .upload-btn-row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    .report-upload-btn {
      font-size: 11px !important;
      font-weight: 700 !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 10px !important;
      border-radius: 6px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    .report-upload-btn .btn-ic {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .view-report-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #0F5C54;
      background: #E6F4F1;
      border: 1px solid #B2DFDB;
      padding: 4px 8px;
      border-radius: 6px;
      text-decoration: none;
      transition: background 0.2s;
    }

    .view-report-pill:hover {
      background: #CCE8E4;
    }

    .pill-ic {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .pill-ic-ext {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }

    .cancel-info-card {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .cancel-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }

    .cancel-text {
      font-size: 12px;
      color: #991B1B;
      margin: 0;
      font-weight: 500;
    }

    .cancel-meta {
      font-size: 11px;
      color: #B91C1C;
    }

    .modal-footer {
      padding: 14px 24px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: flex-end;
      background: #F9FAFB;
    }
  `],
})
export class ClinicAppointmentsComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private appointmentService = inject(AppointmentService);
  private notificationService = inject(NotificationService);

  clinicProfile: Clinic | null = null;
  doctors: Doctor[] = [];
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  loading = true;
  selectedAppointment: Appointment | null = null;
  loadingModalDetails = false;
  updatingTestId: string | null = null;
  uploadingTestId: string | null = null;

  searchTerm = '';
  selectedDoctorId = 'all';
  statusFilter = 'all';

  ngOnInit(): void {
    this.loadClinicData();
  }

  loadClinicData(): void {
    this.loading = true;
    this.clinicService.getMyClinicProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.clinicProfile = res.data;
          this.loadDoctors(res.data._id);
          this.loadAppointments(res.data._id);
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
      },
    });
  }

  loadAppointments(clinicId: string): void {
    this.appointmentService.getClinicAppointments(clinicId, { limit: 50 }).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.appointments = res.data;
          this.applyFilters();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    let result = [...this.appointments];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.bookedFor?.name?.toLowerCase().includes(term) ||
          a.reasonForVisit?.toLowerCase().includes(term) ||
          a.notes?.toLowerCase().includes(term) ||
          this.getDoctorName(a).toLowerCase().includes(term)
      );
    }

    if (this.selectedDoctorId !== 'all') {
      result = result.filter((a) => {
        const docId = typeof a.doctorId === 'object' ? (a.doctorId as any)._id : a.doctorId;
        return String(docId) === String(this.selectedDoctorId);
      });
    }

    if (this.statusFilter !== 'all') {
      result = result.filter((a) => a.status === this.statusFilter);
    }

    this.filteredAppointments = result;
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

    const spec = doc.specializationId?.name || (typeof doc.specializationId === 'string' ? doc.specializationId : '');
    if (spec) {
      return `${name} (${spec})`;
    }
    return name;
  }

  getDoctorName(apt: Appointment): string {
    if (apt.doctorId && typeof apt.doctorId === 'object') {
      const d = apt.doctorId as any;
      let name = '';
      if (d.userId && typeof d.userId === 'object' && d.userId.name) {
        name = d.userId.name;
      } else if (d.name) {
        name = d.name;
      }
      if (name) {
        if (!/^dr\.?\s+/i.test(name)) {
          name = `Dr. ${name}`;
        }
        return name;
      }
    }
    return 'Physician';
  }

  getDoctorSpecialization(apt: Appointment): string {
    if (apt.doctorId && typeof apt.doctorId === 'object') {
      const d = apt.doctorId as any;
      return d.specializationId?.name || '';
    }
    return '';
  }

  getAppointmentPrice(apt: Appointment): number {
    if (apt.consultationFee !== undefined && apt.consultationFee !== null) {
      return apt.consultationFee;
    }
    if (apt.doctorId && typeof apt.doctorId === 'object') {
      const d = apt.doctorId as any;
      if (d.consultationFee !== undefined && d.consultationFee !== null) {
        return d.consultationFee;
      }
    }
    return 500;
  }

  getPaymentStatusClass(apt: Appointment): string {
    if (apt.paymentStatus === 'completed') return 'payment-paid';
    if (apt.paymentStatus === 'refunded') return 'payment-refunded';
    return 'payment-pending';
  }

  getPaymentStatusDisplay(apt: Appointment): string {
    if (apt.paymentStatus === 'completed') return 'Paid Online';
    if (apt.paymentStatus === 'refunded') return 'Refunded';
    return 'Pay at Clinic';
  }

  openAppointmentDetails(apt: Appointment): void {
    this.selectedAppointment = apt;
    this.loadingModalDetails = true;
    this.appointmentService.getAppointmentById(apt._id).subscribe({
      next: (res) => {
        this.loadingModalDetails = false;
        if (res.success && res.data) {
          this.selectedAppointment = res.data;
          const idx = this.appointments.findIndex((a) => a._id === apt._id);
          if (idx !== -1) {
            this.appointments[idx] = res.data;
            this.applyFilters();
          }
        }
      },
      error: () => {
        this.loadingModalDetails = false;
      },
    });
  }

  updateTestStatus(test: MedicalTest, newStatus: string): void {
    if (!this.selectedAppointment || !test._id) return;
    this.updatingTestId = test._id;
    this.appointmentService.updateMedicalTest(this.selectedAppointment._id, test._id, {
      status: newStatus,
      resultNotes: test.resultNotes,
    }).subscribe({
      next: (res) => {
        this.updatingTestId = null;
        if (res.success && res.data) {
          this.selectedAppointment = res.data;
          test.status = newStatus;
          this.notificationService.success(`Test "${test.testName}" marked as ${this.formatTestStatus(newStatus)}`);
        }
      },
      error: (err) => {
        this.updatingTestId = null;
        this.notificationService.error(err.error?.error?.message || 'Failed to update test status');
      },
    });
  }

  saveTestFindings(test: MedicalTest): void {
    if (!this.selectedAppointment || !test._id) return;
    this.updatingTestId = test._id;
    this.appointmentService.updateMedicalTest(this.selectedAppointment._id, test._id, {
      status: test.status || 'in_progress',
      resultNotes: test.resultNotes,
    }).subscribe({
      next: (res) => {
        this.updatingTestId = null;
        if (res.success && res.data) {
          this.selectedAppointment = res.data;
          this.notificationService.success(`Findings saved for "${test.testName}"`);
        }
      },
      error: (err) => {
        this.updatingTestId = null;
        this.notificationService.error(err.error?.error?.message || 'Failed to save findings');
      },
    });
  }

  onUploadTestReport(event: Event, test: MedicalTest): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.selectedAppointment || !test._id) {
      return;
    }
    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) {
      this.notificationService.error('Report file size exceeds 10MB limit');
      input.value = '';
      return;
    }
    this.uploadingTestId = test._id;
    this.appointmentService.uploadTestResultFile(
      this.selectedAppointment._id,
      test._id,
      file,
      test.resultNotes,
      'completed'
    ).subscribe({
      next: (res) => {
        this.uploadingTestId = null;
        input.value = '';
        if (res.success && res.data) {
          this.selectedAppointment = res.data;
          this.notificationService.success(`Test report uploaded for "${test.testName}" and marked Completed.`);
        }
      },
      error: (err) => {
        this.uploadingTestId = null;
        input.value = '';
        this.notificationService.error(err.error?.error?.message || 'Failed to upload test report');
      },
    });
  }

  formatTestStatus(status?: string): string {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress':
      case 'process': return 'In Progress';
      case 'not_started': return 'Not Started';
      case 'ordered': return 'Ordered';
      default: return (status || 'Not Started').replace(/_/g, ' ');
    }
  }

  getTestStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'completed': return 'test-completed';
      case 'in_progress':
      case 'process': return 'test-inprogress';
      case 'not_started':
      case 'ordered':
      default: return 'test-notstarted';
    }
  }

  calculateAge(dobString?: string): number {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  printMedicines(): void {
    if (!this.selectedAppointment) return;
    const apt = this.selectedAppointment;
    const docName = this.getDoctorName(apt);
    const docSpec = this.getDoctorSpecialization(apt);
    const patientName = this.getPatientName(apt);
    const patientPhone = this.getPatientPhone(apt);
    const patientAge = apt.bookedFor?.dateOfBirth ? `${this.calculateAge(apt.bookedFor.dateOfBirth)} yrs` : '';
    const patientGender = apt.bookedFor?.gender ? apt.bookedFor.gender.toUpperCase() : '';
    const clinicName = this.clinicProfile?.name || 'Clinic Administration';
    const clinicAddress = this.clinicProfile?.address || '';
    const clinicPhone = this.clinicProfile?.contactPhone || '';
    const dateStr = new Date(apt.slotStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const medicines = apt.prescription?.medicines || [];
    const rowsHtml = medicines.map((m, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #6B7280;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: #111827;">${m.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; color: #374151;">${m.dosage || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; color: #374151;">${m.frequency || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; color: #374151;">${m.duration || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; color: #4B5563;">${m.instructions || 'As advised'}</td>
      </tr>
    `).join('');

    const adviceHtml = apt.prescription?.generalAdvice ? `
      <div style="margin-top: 20px; padding: 12px 16px; background: #F8FAFC; border-left: 4px solid #0F5C54; border-radius: 4px;">
        <strong style="color: #0F5C54; font-size: 13px; text-transform: uppercase;">Doctor's General Advice:</strong>
        <p style="margin: 4px 0 0; color: #334155; font-size: 13px; line-height: 1.5;">${apt.prescription.generalAdvice}</p>
      </div>
    ` : '';

    const followUpHtml = apt.prescription?.followUpDate ? `
      <div style="margin-top: 10px; font-size: 12px; color: #475569;">
        <strong>Follow-up Recommendation:</strong> ${apt.prescription.followUpDate}
      </div>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription Dispensing Slip - #${apt._id.slice(-6)}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1F2937; margin: 0; padding: 10px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F5C54; padding-bottom: 14px; margin-bottom: 16px; }
          .clinic-name { font-size: 20px; font-weight: 800; color: #0F5C54; margin: 0; }
          .clinic-sub { font-size: 12px; color: #6B7280; margin-top: 3px; }
          .badge-dispense { font-size: 11px; font-weight: 800; background: #E6F4F1; color: #0F5C54; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F9FAFB; padding: 12px 16px; border-radius: 8px; border: 1px solid #E5E7EB; margin-bottom: 20px; font-size: 12px; }
          .meta-item { margin-bottom: 4px; }
          .meta-lbl { color: #6B7280; font-weight: 600; width: 110px; display: inline-block; }
          .meta-val { font-weight: 700; color: #111827; }
          .table-title { font-size: 13px; font-weight: 800; color: #0F5C54; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
          th { background: #0F5C54; color: #FFFFFF; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; }
          .sig-line { border-top: 1px solid #9CA3AF; width: 180px; text-align: center; padding-top: 6px; font-weight: 600; color: #111827; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="clinic-name">${clinicName}</h1>
            <div class="clinic-sub">${clinicAddress} ${clinicPhone ? '• Tel: ' + clinicPhone : ''}</div>
          </div>
          <div style="text-align: right;">
            <div class="badge-dispense">Pharmacy Dispensing Slip</div>
            <div style="font-size: 11px; color: #6B7280; margin-top: 4px;">Ref #${apt._id.slice(-6)} • ${dateStr}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-item"><span class="meta-lbl">Patient Name:</span> <span class="meta-val">${patientName}</span></div>
            <div class="meta-item"><span class="meta-lbl">Age / Gender:</span> <span class="meta-val">${patientAge || '-'} ${patientGender ? '/ ' + patientGender : ''}</span></div>
            <div class="meta-item" *ngIf="patientPhone"><span class="meta-lbl">Phone:</span> <span class="meta-val">${patientPhone || '-'}</span></div>
          </div>
          <div>
            <div class="meta-item"><span class="meta-lbl">Prescribing Doctor:</span> <span class="meta-val">${docName}</span></div>
            <div class="meta-item"><span class="meta-lbl">Department:</span> <span class="meta-val">${docSpec || 'General Practice'}</span></div>
            <div class="meta-item"><span class="meta-lbl">Consultation Date:</span> <span class="meta-val">${dateStr}</span></div>
          </div>
        </div>

        <div class="table-title">Prescribed Medications to Dispense</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Medicine Name</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        ${adviceHtml}
        ${followUpHtml}

        <div class="footer">
          <div>Dispensed via Docyra Healthcare System • Generated on ${new Date().toLocaleDateString('en-IN')}</div>
          <div class="sig-line">Pharmacist / Clinic Dispenser Signature</div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 350);
    }
  }

  printTests(): void {
    if (!this.selectedAppointment) return;
    const apt = this.selectedAppointment;
    const docName = this.getDoctorName(apt);
    const docSpec = this.getDoctorSpecialization(apt);
    const patientName = this.getPatientName(apt);
    const patientPhone = this.getPatientPhone(apt);
    const patientAge = apt.bookedFor?.dateOfBirth ? `${this.calculateAge(apt.bookedFor.dateOfBirth)} yrs` : '';
    const patientGender = apt.bookedFor?.gender ? apt.bookedFor.gender.toUpperCase() : '';
    const clinicName = this.clinicProfile?.name || 'Clinic Administration';
    const clinicAddress = this.clinicProfile?.address || '';
    const clinicPhone = this.clinicProfile?.contactPhone || '';
    const dateStr = new Date(apt.slotStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const tests = apt.medicalTests || [];
    const rowsHtml = tests.map((t, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #6B7280;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: #111827;">${t.testName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; color: #374151;">${t.instructions || 'Routine evaluation as requested'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E5E7EB; text-align: center; text-transform: uppercase; font-weight: 600; color: #0F5C54;">${this.formatTestStatus(t.status)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Diagnostic Tests Requisition - #${apt._id.slice(-6)}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1F2937; margin: 0; padding: 10px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F5C54; padding-bottom: 14px; margin-bottom: 16px; }
          .clinic-name { font-size: 20px; font-weight: 800; color: #0F5C54; margin: 0; }
          .clinic-sub { font-size: 12px; color: #6B7280; margin-top: 3px; }
          .badge-lab { font-size: 11px; font-weight: 800; background: #E6F4F1; color: #0F5C54; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F9FAFB; padding: 12px 16px; border-radius: 8px; border: 1px solid #E5E7EB; margin-bottom: 20px; font-size: 12px; }
          .meta-item { margin-bottom: 4px; }
          .meta-lbl { color: #6B7280; font-weight: 600; width: 110px; display: inline-block; }
          .meta-val { font-weight: 700; color: #111827; }
          .table-title { font-size: 13px; font-weight: 800; color: #0F5C54; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
          th { background: #0F5C54; color: #FFFFFF; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; }
          .sig-line { border-top: 1px solid #9CA3AF; width: 180px; text-align: center; padding-top: 6px; font-weight: 600; color: #111827; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="clinic-name">${clinicName}</h1>
            <div class="clinic-sub">${clinicAddress} ${clinicPhone ? '• Tel: ' + clinicPhone : ''}</div>
          </div>
          <div style="text-align: right;">
            <div class="badge-lab">Diagnostic / Lab Requisition Slip</div>
            <div style="font-size: 11px; color: #6B7280; margin-top: 4px;">Ref #${apt._id.slice(-6)} • ${dateStr}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-item"><span class="meta-lbl">Patient Name:</span> <span class="meta-val">${patientName}</span></div>
            <div class="meta-item"><span class="meta-lbl">Age / Gender:</span> <span class="meta-val">${patientAge || '-'} ${patientGender ? '/ ' + patientGender : ''}</span></div>
            <div class="meta-item" *ngIf="patientPhone"><span class="meta-lbl">Phone:</span> <span class="meta-val">${patientPhone || '-'}</span></div>
          </div>
          <div>
            <div class="meta-item"><span class="meta-lbl">Referring Doctor:</span> <span class="meta-val">${docName}</span></div>
            <div class="meta-item"><span class="meta-lbl">Department:</span> <span class="meta-val">${docSpec || 'General Practice'}</span></div>
            <div class="meta-item"><span class="meta-lbl">Date Advised:</span> <span class="meta-val">${dateStr}</span></div>
          </div>
        </div>

        <div class="table-title">Advised Diagnostic Tests</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Test Name</th>
              <th>Clinical Notes / Instructions</th>
              <th style="width: 120px; text-align: center;">Current Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Requisitioned via Docyra Healthcare System • Generated on ${new Date().toLocaleDateString('en-IN')}</div>
          <div class="sig-line">Lab Technician / Pathologist Signature</div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 350);
    }
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.selectedAppointment = null;
    }
  }

  getPatientName(apt: Appointment): string {
    if (apt?.bookedFor?.name) return apt.bookedFor.name;
    if (apt?.patientId && typeof apt.patientId === 'object' && (apt.patientId as any).name) {
      return (apt.patientId as any).name;
    }
    return 'Patient';
  }

  getPatientPhone(apt: Appointment): string {
    if (apt?.bookedFor?.phone) return apt.bookedFor.phone;
    if (apt?.patientId && typeof apt.patientId === 'object' && (apt.patientId as any).phone) {
      return (apt.patientId as any).phone;
    }
    return '';
  }

  getPatientEmail(apt: Appointment): string {
    if (apt?.bookedFor?.email) return apt.bookedFor.email;
    if (apt?.patientId && typeof apt.patientId === 'object' && (apt.patientId as any).email) {
      return (apt.patientId as any).email;
    }
    return '';
  }
}
