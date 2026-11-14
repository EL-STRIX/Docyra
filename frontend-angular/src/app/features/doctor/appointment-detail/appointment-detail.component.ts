import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  Appointment,
  AppointmentStatus,
  Prescription,
  PrescriptionMedicine,
  MedicalTest,
} from '../../../core/models/appointment.model';
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

export type DetailTab = 'prescription' | 'tests' | 'diagnosis_info' | 'past_history' | 'notes';

@Component({
  selector: 'app-doctor-appointment-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
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
    <div class="detail-page">
      <!-- Breadcrumb Bar -->
      <div class="breadcrumb-bar">
        <a routerLink="/doctor/schedule" class="back-link">
          <mat-icon>arrow_back</mat-icon>
          <span>Back to Schedule</span>
        </a>
      </div>

      <div *ngIf="loading" class="loading-box">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && appointment" class="content-container">
        <!-- Top Status & Actions Header -->
        <div class="detail-header-card">
          <div class="header-main">
            <div>
              <div class="flex items-center gap-3 flex-wrap">
                <h1 class="page-title">Appointment #{{ appointment._id | slice:-6 }}</h1>
                <app-status-badge [status]="appointment.status"></app-status-badge>
              </div>
              <p class="subtitle">
                {{ appointment.slotStart | portalDate:'EEEE, dd MMM yyyy • h:mm a' }}
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="status-action-btns">
              <button
                mat-stroked-button
                color="primary"
                (click)="printPrescription()"
                class="print-btn"
                title="Print or download prescription"
              >
                <mat-icon>print</mat-icon>
                <span>Print Rx</span>
              </button>

              <ng-container *ngIf="appointment.status === 'confirmed'">
                <button mat-flat-button color="primary" (click)="updateStatus('completed')" [disabled]="updating">
                  <mat-icon>done_all</mat-icon>
                  <span>Mark Completed</span>
                </button>
                <button mat-stroked-button (click)="updateStatus('no_show')" [disabled]="updating">
                  <mat-icon>person_off</mat-icon>
                  <span>Mark No-Show</span>
                </button>
                <button mat-stroked-button color="warn" (click)="showCancelModal = true" [disabled]="updating">
                  <mat-icon>cancel</mat-icon>
                  <span>Cancel Visit</span>
                </button>
              </ng-container>
            </div>
          </div>
        </div>

        <!-- Clean Patient Summary Strip -->
        <mat-card class="patient-snapshot-card">
          <div class="snapshot-grid">
            <!-- Patient Info -->
            <div class="snapshot-patient">
              <div class="patient-avatar-box">
                <mat-icon>account_circle</mat-icon>
              </div>
              <div>
                <div class="patient-name">{{ getPatientName() }}</div>
                <div class="patient-sub">
                  {{ appointment.bookedFor.type === 'dependent' ? (appointment.bookedFor.relationship || 'Family Dependent') : 'Self' }}
                  <span *ngIf="appointment.bookedFor.gender"> • {{ appointment.bookedFor.gender | titlecase }}</span>
                  <span *ngIf="appointment.bookedFor.dateOfBirth"> • DOB: {{ appointment.bookedFor.dateOfBirth | portalDate:'dd MMM yyyy' }}</span>
                </div>
              </div>
            </div>

            <!-- Health Snapshot Tags -->
            <div class="vitals-tags-wrap">
              <div class="health-tag">
                <span class="tag-label">Blood Group</span>
                <span class="tag-val" [class.highlight]="!!appointment.bookedFor.bloodGroup">
                  {{ appointment.bookedFor.bloodGroup || 'Unspecified' }}
                </span>
              </div>

              <div class="health-tag" [class.alert-tag]="!!appointment.bookedFor.allergies">
                <span class="tag-label">Allergies</span>
                <span class="tag-val">
                  {{ appointment.bookedFor.allergies || 'None reported' }}
                </span>
              </div>

              <div class="health-tag">
                <span class="tag-label">Conditions</span>
                <span class="tag-val" [title]="appointment.bookedFor.chronicConditions || 'None reported'">
                  {{ appointment.bookedFor.chronicConditions || 'None reported' }}
                </span>
              </div>

              <div class="health-tag fee-tag">
                <span class="tag-label">Fee</span>
                <span class="fee-val">
                  ₹{{ appointment.consultationFee }}
                  <span class="payment-indicator" [class.paid]="appointment.paymentStatus === 'completed'">
                    {{ appointment.paymentStatus === 'completed' ? 'Paid' : 'Unpaid' }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </mat-card>

        <!-- Clean Workspace Navigation Tabs -->
        <div class="workspace-tabs-bar">
          <button
            class="workspace-tab-btn"
            [class.active]="activeTab === 'prescription'"
            (click)="activeTab = 'prescription'"
          >
            <mat-icon>medication</mat-icon>
            <span>Prescription</span>
            <span *ngIf="validPrescriptionMedicinesCount > 0" class="tab-badge">
              {{ validPrescriptionMedicinesCount }}
            </span>
          </button>

          <button
            class="workspace-tab-btn"
            [class.active]="activeTab === 'tests'"
            (click)="activeTab = 'tests'"
          >
            <mat-icon>biotech</mat-icon>
            <span>Lab Tests</span>
            <span *ngIf="medicalTests.length > 0" class="tab-badge">
              {{ medicalTests.length }}
            </span>
          </button>

          <button
            class="workspace-tab-btn"
            [class.active]="activeTab === 'diagnosis_info'"
            (click)="activeTab = 'diagnosis_info'"
          >
            <mat-icon>monitor_heart</mat-icon>
            <span>Patient Details</span>
          </button>

          <button
            class="workspace-tab-btn"
            [class.active]="activeTab === 'past_history'"
            (click)="activeTab = 'past_history'"
          >
            <mat-icon>history</mat-icon>
            <span>Past Visits</span>
            <span class="tab-badge">{{ pastVisitsWithThisDoctor.length }}</span>
          </button>

          <button
            class="workspace-tab-btn"
            [class.active]="activeTab === 'notes'"
            (click)="activeTab = 'notes'"
          >
            <mat-icon>description</mat-icon>
            <span>Clinical Notes</span>
          </button>
        </div>

        <!-- TAB 1: Prescription -->
        <div *ngIf="activeTab === 'prescription'" class="tab-content-area">
          <mat-card class="section-card rx-card">
            <div class="card-title-bar">
              <h2 class="card-title flex items-center gap-2">
                <mat-icon class="text-teal-700">medication</mat-icon>
                <span>Prescription</span>
              </h2>
              <button mat-flat-button color="primary" (click)="savePrescription()" [disabled]="saving">
                <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
                <mat-icon *ngIf="!saving">save</mat-icon>
                <span>Save Prescription</span>
              </button>
            </div>

            <!-- Medicines Table -->
            <div class="prescription-builder mt-4">
              <div class="table-header-row">
                <div class="col-med">Medicine</div>
                <div class="col-dosage">Dosage</div>
                <div class="col-freq">Frequency</div>
                <div class="col-dur">Duration</div>
                <div class="col-inst">Instructions</div>
                <div class="col-action"></div>
              </div>

              <div *ngFor="let med of prescriptionMedicines; let i = index" class="medicine-row">
                <div class="col-med">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.name"
                    placeholder="Medicine name & strength"
                  />
                </div>
                <div class="col-dosage">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.dosage"
                    placeholder="e.g. 1 Tablet"
                  />
                </div>
                <div class="col-freq">
                  <select class="rx-select" [(ngModel)]="med.frequency">
                    <option value="Once Daily (1-0-0)">Once Daily (1-0-0)</option>
                    <option value="Twice Daily (1-0-1)">Twice Daily (1-0-1)</option>
                    <option value="Thrice Daily (1-1-1)">Thrice Daily (1-1-1)</option>
                    <option value="Four Times Daily">Four Times Daily</option>
                    <option value="As Needed (SOS)">As Needed (SOS)</option>
                    <option value="Every 8 Hours">Every 8 Hours</option>
                    <option value="Night only (0-0-1)">Night only (0-0-1)</option>
                  </select>
                </div>
                <div class="col-dur">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.duration"
                    placeholder="e.g. 5 Days"
                  />
                </div>
                <div class="col-inst">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.instructions"
                    placeholder="e.g. After meals"
                  />
                </div>
                <div class="col-action">
                  <button
                    mat-icon-button
                    color="warn"
                    (click)="removeMedicineRow(i)"
                    title="Remove"
                    [disabled]="prescriptionMedicines.length === 1 && !med.name"
                  >
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </div>

              <div class="mt-3">
                <button mat-stroked-button color="primary" (click)="addMedicineRow()">
                  <mat-icon>add</mat-icon>
                  <span>Add Medicine</span>
                </button>
              </div>
            </div>

            <!-- Advice & Follow-Up Grid -->
            <div class="rx-additional-grid mt-5">
              <div class="form-group">
                <label class="field-label">Doctor's Advice & Instructions</label>
                <textarea
                  class="rx-textarea"
                  rows="3"
                  [(ngModel)]="prescriptionGeneralAdvice"
                  placeholder="Dietary instructions, lifestyle advice, or special precautions..."
                ></textarea>
              </div>

              <div class="form-group">
                <label class="field-label">Follow-up Date</label>
                <input
                  class="rx-input"
                  [(ngModel)]="prescriptionFollowUpDate"
                  placeholder="e.g. 7 days / 22 Nov 2026"
                />
              </div>
            </div>
          </mat-card>
        </div>

        <!-- TAB 2: Lab & Diagnostic Tests -->
        <div *ngIf="activeTab === 'tests'" class="tab-content-area">
          <mat-card class="section-card">
            <div class="card-title-bar">
              <h2 class="card-title flex items-center gap-2">
                <mat-icon class="text-amber-700">biotech</mat-icon>
                <span>Diagnostic Tests</span>
              </h2>
              <button mat-flat-button color="primary" (click)="saveMedicalTests()" [disabled]="saving">
                <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
                <mat-icon *ngIf="!saving">save</mat-icon>
                <span>Save Tests</span>
              </button>
            </div>

            <!-- Add Test Row -->
            <div class="add-test-box mt-4">
              <div class="new-test-grid">
                <div class="test-input-col">
                  <label class="field-label">Test Name</label>
                  <input
                    class="rx-input"
                    [(ngModel)]="newTestName"
                    placeholder="e.g. Complete Blood Count (CBC) / Fasting Blood Sugar"
                  />
                </div>

                <div class="test-input-col">
                  <label class="field-label">Instructions</label>
                  <input
                    class="rx-input"
                    [(ngModel)]="newTestInstructions"
                    placeholder="e.g. 10 hours fasting required"
                  />
                </div>

                <div class="test-input-col-sm">
                  <label class="field-label">Status</label>
                  <select class="rx-select" [(ngModel)]="newTestStatus">
                    <option value="ordered">Ordered</option>
                    <option value="completed">Completed</option>
                    <option value="normal">Normal</option>
                    <option value="abnormal">Abnormal / Review</option>
                  </select>
                </div>

                <div class="test-btn-col">
                  <button
                    mat-flat-button
                    color="primary"
                    (click)="addTest()"
                    [disabled]="!newTestName.trim()"
                  >
                    <mat-icon>add</mat-icon>
                    <span>Add Test</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Tests List -->
            <div class="tests-list mt-5">
              <div *ngIf="medicalTests.length === 0" class="empty-tests-box">
                <mat-icon class="empty-icon">science</mat-icon>
                <p>No diagnostic tests ordered.</p>
              </div>

              <div *ngIf="medicalTests.length > 0" class="tests-cards-list">
                <div *ngFor="let test of medicalTests; let idx = index" class="test-card-item">
                  <div class="test-main-row">
                    <div class="test-info">
                      <div class="test-title">
                        <mat-icon class="test-badge-icon">biotech</mat-icon>
                        <span class="test-name">{{ test.testName }}</span>
                        <span class="test-status-pill" [ngClass]="getTestStatusClass(test.status)">
                          {{ test.status | uppercase }}
                        </span>
                      </div>
                      <div class="test-instructions" *ngIf="test.instructions">
                        <span class="lbl">Note:</span> {{ test.instructions }}
                      </div>
                    </div>

                    <div class="test-actions">
                      <button mat-icon-button color="warn" (click)="removeTest(idx)" title="Remove">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Findings & Upload File -->
                  <div class="test-result-row">
                    <div class="result-findings-col">
                      <label class="field-label">Lab Findings & Values</label>
                      <input
                        class="rx-input"
                        [(ngModel)]="test.resultNotes"
                        placeholder="Enter lab findings or values..."
                      />
                    </div>

                    <div class="result-file-col">
                      <label class="field-label">Report Attachment</label>
                      <div class="file-action-wrap">
                        <input
                          #fileInput
                          type="file"
                          (change)="onTestFileSelected($event, idx)"
                          class="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        <button
                          *ngIf="!test.resultFileUrl"
                          mat-stroked-button
                          (click)="fileInput.click()"
                          [disabled]="uploadingFileIndex === idx"
                          class="upload-btn"
                        >
                          <mat-spinner *ngIf="uploadingFileIndex === idx" diameter="16" class="mr-1"></mat-spinner>
                          <mat-icon *ngIf="uploadingFileIndex !== idx">attach_file</mat-icon>
                          <span>Upload PDF/Image</span>
                        </button>

                        <div *ngIf="test.resultFileUrl" class="file-attached-badge">
                          <a [href]="test.resultFileUrl" target="_blank" class="file-link">
                            <mat-icon>description</mat-icon>
                            <span>View Report</span>
                          </a>
                          <button mat-icon-button (click)="fileInput.click()" title="Replace">
                            <mat-icon class="text-xs">sync</mat-icon>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </mat-card>
        </div>

        <!-- TAB 3: Patient Details -->
        <div *ngIf="activeTab === 'diagnosis_info'" class="tab-content-area">
          <mat-card class="section-card">
            <h2 class="card-title flex items-center gap-2">
              <mat-icon class="text-teal-700">monitor_heart</mat-icon>
              <span>Patient Medical Details</span>
            </h2>

            <div class="clinical-details-grid mt-4">
              <div class="detail-box">
                <span class="box-label">Blood Group</span>
                <span class="box-value font-bold" [class.text-rose-700]="!!appointment.bookedFor.bloodGroup">
                  {{ appointment.bookedFor.bloodGroup || 'Not Specified' }}
                </span>
              </div>

              <div class="detail-box">
                <span class="box-label">Date of Birth & Age</span>
                <span class="box-value">
                  {{ appointment.bookedFor.dateOfBirth ? (appointment.bookedFor.dateOfBirth | portalDate:'dd MMM yyyy') : 'Not Specified' }}
                </span>
              </div>

              <div class="detail-box">
                <span class="box-label">Gender</span>
                <span class="box-value capitalize">
                  {{ appointment.bookedFor.gender || 'Not Specified' }}
                </span>
              </div>

              <div class="detail-box">
                <span class="box-label">Height / Weight</span>
                <span class="box-value">
                  {{ appointment.bookedFor.heightCm ? appointment.bookedFor.heightCm + ' cm' : '-' }} /
                  {{ appointment.bookedFor.weightKg ? appointment.bookedFor.weightKg + ' kg' : '-' }}
                </span>
              </div>

              <div class="detail-box full-width">
                <span class="box-label">Known Allergies</span>
                <div class="allergy-display-box" [class.alert-border]="!!appointment.bookedFor.allergies">
                  {{ appointment.bookedFor.allergies || 'No known allergies reported.' }}
                </div>
              </div>

              <div class="detail-box full-width">
                <span class="box-label">Chronic Conditions</span>
                <div class="condition-display-box">
                  {{ appointment.bookedFor.chronicConditions || 'No chronic medical conditions reported.' }}
                </div>
              </div>

              <div class="detail-box full-width" *ngIf="appointment.bookedFor.emergencyContactName || appointment.bookedFor.emergencyContactPhone">
                <span class="box-label">Emergency Contact</span>
                <span class="box-value">
                  {{ appointment.bookedFor.emergencyContactName || 'Contact' }} • {{ appointment.bookedFor.emergencyContactPhone || '-' }}
                </span>
              </div>
            </div>
          </mat-card>
        </div>

        <!-- TAB 4: Past Visits Under THIS Doctor -->
        <div *ngIf="activeTab === 'past_history'" class="tab-content-area">
          <mat-card class="section-card">
            <h2 class="card-title flex items-center gap-2">
              <mat-icon class="text-teal-700">history_edu</mat-icon>
              <span>Consultation History (Under You)</span>
            </h2>

            <!-- First-time patient with this doctor -->
            <div *ngIf="pastVisitsWithThisDoctor.length === 0" class="empty-history-box mt-4">
              <mat-icon class="empty-icon">history</mat-icon>
              <h3 class="empty-title">First Visit With You</h3>
              <p class="empty-desc">
                No previous consultations on record for this patient under your care.
              </p>
              <span class="privacy-tag">
                Medical records from other practitioners remain confidential.
              </span>
            </div>

            <!-- List of Past Prescriptions & Consultations under THIS Doctor -->
            <div *ngIf="pastVisitsWithThisDoctor.length > 0" class="past-visits-list mt-4">
              <div *ngFor="let pastApt of pastVisitsWithThisDoctor" class="past-visit-card">
                <div class="past-visit-header">
                  <div>
                    <span class="past-visit-date font-bold">
                      {{ pastApt.slotStart | portalDate:'dd MMM yyyy • h:mm a' }}
                    </span>
                    <span class="past-reason block text-xs text-neutral-600 mt-0.5">
                      Reason: {{ pastApt.reasonForVisit || 'General Consultation' }}
                    </span>
                  </div>
                  <app-status-badge [status]="pastApt.status"></app-status-badge>
                </div>

                <div *ngIf="pastApt.prescription?.medicines?.length" class="past-section mt-3">
                  <span class="past-lbl">Prescribed Medications:</span>
                  <div class="past-meds-table">
                    <div *ngFor="let med of pastApt.prescription?.medicines" class="past-med-item">
                      <span class="font-bold text-neutral-900">{{ med.name }}</span>
                      <span class="text-neutral-600">{{ med.dosage }}</span>
                      <span class="text-neutral-600">{{ med.frequency }}</span>
                      <span class="text-neutral-600">{{ med.duration }}</span>
                      <span class="text-neutral-500 italic text-xs">{{ med.instructions }}</span>
                    </div>
                  </div>
                </div>

                <div *ngIf="pastApt.prescription?.generalAdvice" class="past-section mt-2">
                  <span class="past-lbl">Advice:</span>
                  <p class="past-text">{{ pastApt.prescription?.generalAdvice }}</p>
                </div>

                <div *ngIf="pastApt.notes" class="past-section mt-2">
                  <span class="past-lbl">Notes:</span>
                  <p class="past-text">{{ pastApt.notes }}</p>
                </div>
              </div>
            </div>
          </mat-card>
        </div>

        <!-- TAB 5: Clinical Notes -->
        <div *ngIf="activeTab === 'notes'" class="tab-content-area">
          <mat-card class="section-card">
            <h2 class="card-title flex items-center gap-2">
              <mat-icon class="text-teal-700">edit_note</mat-icon>
              <span>Consultation Notes</span>
            </h2>

            <mat-form-field appearance="outline" class="w-full mt-4">
              <mat-label>Clinical Observations</mat-label>
              <textarea
                matInput
                rows="6"
                [(ngModel)]="visitNotes"
                placeholder="Enter consultation examination notes..."
              ></textarea>
            </mat-form-field>

            <div class="mt-2">
              <button
                mat-flat-button
                color="primary"
                (click)="saveNotes()"
                [disabled]="savingNotes || visitNotes === appointment.notes"
              >
                <mat-spinner *ngIf="savingNotes" diameter="18" class="mr-2"></mat-spinner>
                <span>Save Notes</span>
              </button>
            </div>
          </mat-card>
        </div>
      </div>

      <!-- Cancellation Modal -->
      <div *ngIf="showCancelModal" class="modal-backdrop">
        <div class="modal-card">
          <h3 class="modal-title">Cancel Appointment</h3>
          <p class="modal-desc">
            Please provide a cancellation reason. The patient will be notified.
          </p>

          <mat-form-field appearance="outline" class="w-full mt-4">
            <mat-label>Reason for cancellation</mat-label>
            <textarea
              matInput
              rows="3"
              [(ngModel)]="cancelReason"
              placeholder="e.g. Clinical rescheduling or emergency"
            ></textarea>
          </mat-form-field>

          <div class="modal-actions">
            <button mat-button (click)="showCancelModal = false" [disabled]="updating">Cancel</button>
            <button
              mat-flat-button
              color="warn"
              (click)="cancelAppointment()"
              [disabled]="updating || !cancelReason.trim()"
            >
              <mat-spinner *ngIf="updating" diameter="18" class="mr-2"></mat-spinner>
              <span>Confirm Cancellation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #0F5C5C;
      font-weight: 700;
      font-size: 13px;
      text-decoration: none;
    }

    .loading-box {
      display: flex;
      justify-content: center;
      padding: 60px;
    }

    .content-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-header-card {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E7E5E0;
      padding: 18px 24px;
    }

    .header-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .page-title {
      font-size: 20px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 4px 0 0;
    }

    .status-action-btns {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .print-btn {
      color: #0F5C5C !important;
    }

    /* Clean Patient Summary Strip */
    .patient-snapshot-card {
      padding: 16px 20px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .snapshot-grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .snapshot-patient {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .patient-avatar-box mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #0F5C5C;
    }

    .patient-name {
      font-size: 15px;
      font-weight: 800;
      color: #1A2E2E;
    }

    .patient-sub {
      font-size: 12px;
      color: #5C6B6B;
      margin-top: 1px;
    }

    .vitals-tags-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .health-tag {
      display: flex;
      flex-direction: column;
      padding: 6px 12px;
      border-radius: 6px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      min-width: 90px;
    }

    .tag-label {
      font-size: 10px;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .tag-val {
      font-size: 12px;
      font-weight: 600;
      color: #1F2937;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    .tag-val.highlight {
      color: #991B1B;
      font-weight: 700;
    }

    .alert-tag {
      background: #FEF2F2;
      border-color: #FECACA;
    }

    .alert-tag .tag-val {
      color: #991B1B;
      font-weight: 700;
    }

    .fee-tag {
      background: #F0FDF4;
      border-color: #BBF7D0;
    }

    .fee-val {
      font-size: 13px;
      font-weight: 800;
      color: #15803D;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
    }

    .payment-indicator {
      font-size: 9px;
      font-weight: 700;
      color: #B45309;
      padding: 1px 5px;
      border-radius: 3px;
      background: #FEF3C7;
    }

    .payment-indicator.paid {
      color: #15803D;
      background: #DCFCE7;
    }

    /* Workspace Tabs Bar */
    .workspace-tabs-bar {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 2px;
    }

    .workspace-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 15px;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #5C6B6B;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .workspace-tab-btn:hover {
      background: #F4F3EF;
      color: #1A2E2E;
    }

    .workspace-tab-btn.active {
      background: #0F5C5C;
      color: #FFFFFF;
      border-color: #0F5C5C;
    }

    .workspace-tab-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .tab-badge {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.08);
      font-weight: 800;
    }

    .workspace-tab-btn.active .tab-badge {
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
    }

    /* Section Cards & Forms */
    .section-card {
      padding: 20px 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .card-title-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid #F0EFEA;
    }

    .card-title {
      font-size: 16px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    /* Prescription Builder Table */
    .prescription-builder {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .table-header-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      font-weight: 700;
      color: #5C6B6B;
      text-transform: uppercase;
      padding: 6px 12px;
      background: #F4F3EF;
      border-radius: 6px;
    }

    .medicine-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      background: #FAFAF8;
    }

    .col-med { flex: 3; }
    .col-dosage { flex: 1.5; }
    .col-freq { flex: 2; }
    .col-dur { flex: 1.5; }
    .col-inst { flex: 2.5; }
    .col-action { width: 36px; text-align: center; }

    .rx-input, .rx-select, .rx-textarea {
      width: 100%;
      padding: 8px 10px;
      font-size: 13px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      background: #FFFFFF;
      box-sizing: border-box;
      outline: none;
      font-family: inherit;
    }

    .rx-input:focus, .rx-select:focus, .rx-textarea:focus {
      border-color: #0F5C5C;
      box-shadow: 0 0 0 2px rgba(15, 92, 92, 0.1);
    }

    .rx-additional-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .rx-additional-grid {
        grid-template-columns: 1fr;
      }
      .table-header-row {
        display: none;
      }
      .medicine-row {
        flex-direction: column;
        align-items: stretch;
      }
      .col-action {
        text-align: right;
      }
    }

    /* Diagnostic Tests Styling */
    .add-test-box {
      background: #F8FAF9;
      border: 1px dashed #A0C6C6;
      border-radius: 10px;
      padding: 14px 16px;
    }

    .new-test-grid {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }

    .test-input-col {
      flex: 2;
      min-width: 200px;
    }

    .test-input-col-sm {
      flex: 1;
      min-width: 140px;
    }

    .test-btn-col {
      margin-bottom: 1px;
    }

    .field-label {
      font-size: 11px;
      font-weight: 700;
      color: #1A2E2E;
      display: block;
      margin-bottom: 4px;
    }

    .empty-tests-box {
      text-align: center;
      padding: 24px;
      color: #6B7280;
    }

    .empty-tests-box mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #9CA3AF;
    }

    .tests-cards-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .test-card-item {
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      padding: 12px 14px;
      background: #FAFAF8;
    }

    .test-main-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .test-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .test-badge-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #0F5C5C;
    }

    .test-name {
      font-size: 14px;
      font-weight: 800;
      color: #1A2E2E;
    }

    .test-status-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .status-ordered { background: #FEF3C7; color: #B45309; }
    .status-completed { background: #EBF7EE; color: #2E9E6B; }
    .status-abnormal { background: #FEE2E2; color: #DC2626; }
    .status-normal { background: #E0F2FE; color: #0284C7; }

    .test-instructions {
      font-size: 12px;
      color: #4B5563;
      margin-top: 3px;
    }

    .test-instructions .lbl {
      font-weight: 700;
      color: #374151;
    }

    .test-result-row {
      display: flex;
      gap: 14px;
      padding-top: 8px;
      border-top: 1px solid #E5E7EB;
      flex-wrap: wrap;
    }

    .result-findings-col {
      flex: 2;
      min-width: 220px;
    }

    .result-file-col {
      flex: 1;
      min-width: 180px;
    }

    .file-attached-badge {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .file-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 700;
      color: #0F5C5C;
      text-decoration: underline;
    }

    .file-link mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Diagnosis Info Details */
    .clinical-details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    @media (max-width: 768px) {
      .clinical-details-grid {
        grid-template-columns: 1fr;
      }
    }

    .detail-box {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .detail-box.full-width {
      grid-column: 1 / -1;
    }

    .box-label {
      font-size: 10px;
      font-weight: 700;
      color: #5C6B6B;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .box-value {
      font-size: 13px;
      font-weight: 600;
      color: #1A2E2E;
    }

    .allergy-display-box, .condition-display-box {
      font-size: 13px;
      color: #1A2E2E;
      background: #FFFFFF;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
      margin-top: 3px;
      line-height: 1.4;
    }

    .allergy-display-box.alert-border {
      border-color: #FECACA;
      background: #FFF5F5;
      color: #991B1B;
      font-weight: 700;
    }

    /* Clean History Box */
    .empty-history-box {
      text-align: center;
      padding: 30px 20px;
      background: #F8FAF9;
      border: 1px dashed #A0C6C6;
      border-radius: 10px;
    }

    .empty-history-box .empty-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #0F5C5C;
      margin-bottom: 6px;
    }

    .empty-title {
      font-size: 15px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .empty-desc {
      font-size: 13px;
      color: #5C6B6B;
      margin: 4px 0 10px;
    }

    .privacy-tag {
      font-size: 11px;
      color: #0F5C5C;
      background: #E6F4F1;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-block;
      font-weight: 600;
    }

    /* Past Visits List */
    .past-visits-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .past-visit-card {
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      padding: 14px;
      background: #FAFAF8;
    }

    .past-visit-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 6px;
      border-bottom: 1px solid #E5E7EB;
    }

    .past-visit-date {
      font-size: 13px;
      color: #0F5C5C;
    }

    .past-section {
      font-size: 12px;
    }

    .past-lbl {
      font-weight: 700;
      color: #4B5563;
      display: block;
      margin-bottom: 3px;
    }

    .past-meds-table {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: #FFFFFF;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
    }

    .past-med-item {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .past-text {
      background: #FFFFFF;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
      margin: 0;
    }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-card {
      background: #FFFFFF;
      border-radius: 12px;
      padding: 24px;
      max-width: 450px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    }

    .modal-title {
      font-size: 16px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 4px;
    }

    .modal-desc {
      font-size: 12px;
      color: #5C6B6B;
      margin: 0;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }

    .w-full {
      width: 100%;
    }

    .hidden {
      display: none;
    }
  `],
})
export class DoctorAppointmentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appointmentService = inject(AppointmentService);
  private doctorService = inject(DoctorService);
  private notificationService = inject(NotificationService);

  appointmentId = '';
  appointment: Appointment | null = null;
  currentDoctor: Doctor | null = null;
  pastVisitsWithThisDoctor: Appointment[] = [];

  activeTab: DetailTab = 'prescription';
  loading = true;
  updating = false;
  saving = false;
  savingNotes = false;
  uploadingFileIndex: number | null = null;

  // Digital Prescription state
  prescriptionMedicines: PrescriptionMedicine[] = [];
  prescriptionGeneralAdvice = '';
  prescriptionFollowUpDate = '';

  // Medical Tests state
  medicalTests: MedicalTest[] = [];
  newTestName = '';
  newTestInstructions = '';
  newTestStatus: 'ordered' | 'completed' | 'normal' | 'abnormal' = 'ordered';

  // Notes state
  visitNotes = '';

  // Cancel Modal state
  showCancelModal = false;
  cancelReason = '';

  ngOnInit(): void {
    this.appointmentId = this.route.snapshot.paramMap.get('id') || '';
    if (this.appointmentId) {
      this.loadDoctorAndAppointment();
    }
  }

  loadDoctorAndAppointment(): void {
    this.loading = true;
    this.doctorService.getMyDoctorProfile().subscribe({
      next: (docRes) => {
        if (docRes.success && docRes.data) {
          this.currentDoctor = docRes.data;
        }
        this.loadAppointmentDetails();
      },
      error: () => {
        this.loadAppointmentDetails();
      },
    });
  }

  loadAppointmentDetails(): void {
    this.appointmentService.getAppointmentById(this.appointmentId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.appointment = res.data;
          this.initAppointmentState(res.data);
          this.loadPatientHistoryWithDoctor();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Failed to load appointment details');
      },
    });
  }

  initAppointmentState(apt: Appointment): void {
    this.visitNotes = apt.notes || '';

    // Prescription init
    if (apt.prescription?.medicines && apt.prescription.medicines.length > 0) {
      this.prescriptionMedicines = JSON.parse(JSON.stringify(apt.prescription.medicines));
    } else {
      this.prescriptionMedicines = [
        { name: '', dosage: '1 Tablet', frequency: 'Twice Daily (1-0-1)', duration: '5 Days', instructions: 'After food' },
      ];
    }
    this.prescriptionGeneralAdvice = apt.prescription?.generalAdvice || '';
    this.prescriptionFollowUpDate = apt.prescription?.followUpDate || '';

    // Medical tests init
    this.medicalTests = apt.medicalTests ? JSON.parse(JSON.stringify(apt.medicalTests)) : [];
  }

  loadPatientHistoryWithDoctor(): void {
    if (!this.currentDoctor?._id) return;
    const patientId = this.getPatientId();
    if (!patientId) return;

    this.appointmentService.getDoctorAppointments(this.currentDoctor._id, { patientId } as any).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          // Strictly show only visits under THIS doctor, excluding the current active appointment
          this.pastVisitsWithThisDoctor = res.data.filter((a) => a._id !== this.appointmentId);
        }
      },
      error: () => {
        // Safe fallback
      },
    });
  }

  get validPrescriptionMedicinesCount(): number {
    return this.prescriptionMedicines.filter((m) => m.name && m.name.trim().length > 0).length;
  }

  getPatientName(): string {
    if (this.appointment?.bookedFor?.name) return this.appointment.bookedFor.name;
    if (typeof this.appointment?.patientId === 'object' && this.appointment?.patientId && (this.appointment.patientId as any).name) {
      return (this.appointment.patientId as any).name;
    }
    return 'Patient';
  }

  getPatientId(): string | null {
    if (!this.appointment?.patientId) return null;
    if (typeof this.appointment.patientId === 'object') {
      return (this.appointment.patientId as any)._id;
    }
    return String(this.appointment.patientId);
  }

  addMedicineRow(): void {
    this.prescriptionMedicines.push({
      name: '',
      dosage: '1 Tablet',
      frequency: 'Twice Daily (1-0-1)',
      duration: '5 Days',
      instructions: 'After food',
    });
  }

  removeMedicineRow(index: number): void {
    this.prescriptionMedicines.splice(index, 1);
  }

  savePrescription(): void {
    const validMeds = this.prescriptionMedicines.filter((m) => m.name && m.name.trim().length > 0);
    this.saving = true;

    const payload: {
      prescription: Prescription;
      notes?: string;
    } = {
      prescription: {
        medicines: validMeds,
        generalAdvice: this.prescriptionGeneralAdvice.trim(),
        followUpDate: this.prescriptionFollowUpDate.trim() || null,
        prescribedAt: new Date().toISOString(),
      },
    };

    this.appointmentService.updateAppointmentDetails(this.appointmentId, payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success && res.data) {
          this.appointment = res.data;
          this.notificationService.success('Prescription saved successfully');
        }
      },
      error: (err) => {
        this.saving = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to save prescription');
      },
    });
  }

  addTest(): void {
    if (!this.newTestName.trim()) return;

    this.medicalTests.push({
      testName: this.newTestName.trim(),
      instructions: this.newTestInstructions.trim(),
      status: this.newTestStatus,
      resultNotes: '',
      orderedAt: new Date().toISOString(),
    });

    this.newTestName = '';
    this.newTestInstructions = '';
    this.newTestStatus = 'ordered';
  }

  removeTest(index: number): void {
    this.medicalTests.splice(index, 1);
  }

  saveMedicalTests(): void {
    this.saving = true;
    this.appointmentService.updateAppointmentDetails(this.appointmentId, { medicalTests: this.medicalTests }).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success && res.data) {
          this.appointment = res.data;
          this.notificationService.success('Diagnostic tests saved');
        }
      },
      error: (err) => {
        this.saving = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to save diagnostic tests');
      },
    });
  }

  onTestFileSelected(event: any, testIndex: number): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploadingFileIndex = testIndex;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('testName', this.medicalTests[testIndex].testName);
    formData.append('instructions', this.medicalTests[testIndex].instructions || '');
    formData.append('resultNotes', this.medicalTests[testIndex].resultNotes || '');
    formData.append('status', 'completed');

    this.appointmentService.uploadTestResult(this.appointmentId, formData).subscribe({
      next: (res) => {
        this.uploadingFileIndex = null;
        if (res.success && res.data) {
          this.appointment = res.data;
          this.medicalTests = res.data.medicalTests || [];
          this.notificationService.success('Report uploaded successfully');
        }
      },
      error: (err) => {
        this.uploadingFileIndex = null;
        this.notificationService.error(err.error?.error?.message || 'Failed to upload report');
      },
    });
  }

  getTestStatusClass(status?: string): string {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'normal': return 'status-normal';
      case 'abnormal': return 'status-abnormal';
      case 'ordered':
      default: return 'status-ordered';
    }
  }

  saveNotes(): void {
    this.savingNotes = true;
    this.appointmentService.updateAppointmentDetails(this.appointmentId, { notes: this.visitNotes }).subscribe({
      next: (res) => {
        this.savingNotes = false;
        if (res.success && res.data) {
          this.appointment = res.data;
          this.notificationService.success('Notes saved');
        }
      },
      error: (err) => {
        this.savingNotes = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to save notes');
      },
    });
  }

  updateStatus(status: AppointmentStatus): void {
    this.updating = true;
    this.appointmentService.updateAppointmentStatus(this.appointmentId, status, this.visitNotes).subscribe({
      next: (res) => {
        this.updating = false;
        if (res.success && res.data) {
          this.appointment = res.data;
          this.notificationService.success(`Appointment marked as ${status}`);
        }
      },
      error: (err) => {
        this.updating = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }

  cancelAppointment(): void {
    if (!this.cancelReason.trim()) return;

    this.updating = true;
    this.appointmentService.cancelAppointment(this.appointmentId, this.cancelReason).subscribe({
      next: (res) => {
        this.updating = false;
        this.showCancelModal = false;
        if (res.success && res.data) {
          this.appointment = res.data;
          this.notificationService.warning('Appointment cancelled');
        }
      },
      error: (err) => {
        this.updating = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to cancel appointment');
      },
    });
  }

  /**
   * Reliable prescription print & PDF download without popup-blocker issues:
   * Uses a dedicated hidden iframe.
   * Includes Doctor & Clinic details, Patient Medical Details, and ℞ Prescription.
   * Excludes test reports.
   */
  printPrescription(): void {
    const validMeds = this.prescriptionMedicines.filter((m) => m.name && m.name.trim().length > 0);
    const hasAnyMeds = validMeds.length > 0 || (this.appointment?.prescription?.medicines?.length || 0) > 0;
    const hasAnyAdvice = !!(this.prescriptionGeneralAdvice && this.prescriptionGeneralAdvice.trim()) ||
                         !!(this.appointment?.prescription?.generalAdvice && this.appointment.prescription.generalAdvice.trim());

    if (!hasAnyMeds && !hasAnyAdvice) {
      this.notificationService.warning('Please enter medication details before printing.');
      return;
    }

    const apt = this.appointment;
    if (!apt) return;

    const patientName = this.getPatientName();
    const doctorName = this.currentDoctor
      ? `${this.currentDoctor.title || 'Dr.'} ${this.currentDoctor.name}`
      : 'Consulting Doctor';
    const specialization =
      (this.currentDoctor?.specializationId as any)?.name ||
      (this.currentDoctor as any)?.specialization ||
      'General Physician';
    const clinicName = (this.currentDoctor?.clinicId as any)?.name || 'Docyra Healthcare Practice';
    const license = this.currentDoctor?.licenseNumber || '';
    const phone = this.currentDoctor?.phone || '';
    const email = this.currentDoctor?.email || '';

    // Patient Medical Details
    const bloodGroup = apt.bookedFor?.bloodGroup ? apt.bookedFor.bloodGroup : 'Not Specified';
    const allergies = apt.bookedFor?.allergies ? apt.bookedFor.allergies : 'None Reported';
    const conditions = apt.bookedFor?.chronicConditions ? apt.bookedFor.chronicConditions : 'None Reported';
    const gender = apt.bookedFor?.gender ? apt.bookedFor.gender.toUpperCase() : 'N/A';
    const dob = apt.bookedFor?.dateOfBirth
      ? new Date(apt.bookedFor.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';
    const visitDate = apt.slotStart
      ? new Date(apt.slotStart).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      : '';
    const visitTime = apt.slotStart
      ? new Date(apt.slotStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '';

    // Medicines to print
    const medsToPrint = validMeds.length > 0 ? validMeds : (apt.prescription?.medicines || []);

    const medicinesRowsHtml = medsToPrint
      .map(
        (m, idx) => `
        <tr>
          <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: #111827;">${idx + 1}. ${m.name}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; color: #374151;">${m.dosage || '-'}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; color: #374151;">${m.frequency || '-'}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; color: #374151;">${m.duration || '-'}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; color: #4B5563; font-size: 12px;">${m.instructions || '-'}</td>
        </tr>
      `
      )
      .join('');

    const adviceText = this.prescriptionGeneralAdvice.trim() || apt.prescription?.generalAdvice || '';
    const adviceHtml = adviceText
      ? `
        <div style="margin-top: 18px; padding: 12px 14px; background: #F9FAFB; border-left: 4px solid #0F5C5C; border-radius: 4px;">
          <div style="font-size: 11px; font-weight: 700; color: #0F5C5C; text-transform: uppercase; margin-bottom: 4px;">Doctor's Advice</div>
          <div style="font-size: 13px; color: #1F2937; line-height: 1.5;">${adviceText.replace(/\n/g, '<br/>')}</div>
        </div>
      `
      : '';

    const followUpText = this.prescriptionFollowUpDate.trim() || apt.prescription?.followUpDate || '';
    const followUpHtml = followUpText
      ? `
        <div style="margin-top: 14px; font-size: 13px; color: #374151;">
          <strong>Follow-up Visit:</strong> ${followUpText}
        </div>
      `
      : '';

    const printableDocument = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription - ${patientName}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1F2937; margin: 0; padding: 24px; font-size: 13px; line-height: 1.4; }
          .header-table { width: 100%; border-bottom: 2px solid #0F5C5C; padding-bottom: 12px; margin-bottom: 14px; }
          .clinic-brand { font-size: 20px; font-weight: 800; color: #0F5C5C; }
          .doc-name { font-size: 17px; font-weight: 700; color: #111827; }
          .doc-spec { font-size: 12px; color: #4B5563; font-weight: 600; }
          .patient-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 12px 14px; margin-bottom: 16px; }
          .patient-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .grid-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #6B7280; }
          .grid-val { font-size: 13px; font-weight: 600; color: #111827; margin-top: 2px; }
          .alert-val { color: #991B1B; font-weight: 700; }
          .rx-symbol { font-size: 26px; font-weight: 800; font-family: serif; color: #0F5C5C; margin: 12px 0 6px; }
          .meds-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          .meds-table th { background: #F3F4F6; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; color: #4B5563; border-bottom: 1px solid #D1D5DB; }
          .footer-section { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #E5E7EB; }
          .seal-text { font-size: 11px; color: #6B7280; }
          .sign-line { width: 180px; border-top: 1px dashed #4B5563; text-align: center; padding-top: 4px; font-size: 12px; font-weight: 600; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="vertical-align: top;">
              <div class="clinic-brand">${clinicName}</div>
              <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Docyra Medical Practice</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <div class="doc-name">${doctorName}</div>
              <div class="doc-spec">${specialization} ${license ? '• Reg: ' + license : ''}</div>
              <div style="font-size: 11px; color: #6B7280;">${phone ? 'Tel: ' + phone : ''} ${email ? '• ' + email : ''}</div>
            </td>
          </tr>
        </table>

        <!-- Patient Medical Details Section -->
        <div class="patient-box">
          <div class="patient-grid">
            <div>
              <div class="grid-lbl">Patient Name</div>
              <div class="grid-val">${patientName}</div>
            </div>
            <div>
              <div class="grid-lbl">DOB / Gender</div>
              <div class="grid-val">${dob} / ${gender}</div>
            </div>
            <div>
              <div class="grid-lbl">Blood Group</div>
              <div class="grid-val alert-val">${bloodGroup}</div>
            </div>
            <div>
              <div class="grid-lbl">Consultation Date</div>
              <div class="grid-val">${visitDate} ${visitTime}</div>
            </div>
          </div>
          <div class="patient-grid" style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E5E7EB;">
            <div style="grid-column: span 2;">
              <div class="grid-lbl">Known Allergies</div>
              <div class="grid-val" style="color: ${allergies !== 'None Reported' ? '#991B1B' : '#111827'}; font-weight: 700;">${allergies}</div>
            </div>
            <div style="grid-column: span 2;">
              <div class="grid-lbl">Chronic Conditions</div>
              <div class="grid-val">${conditions}</div>
            </div>
          </div>
        </div>

        <!-- ℞ Digital Prescription -->
        <div class="rx-symbol">℞</div>
        <table class="meds-table">
          <thead>
            <tr>
              <th style="width: 35%;">Medicine & Strength</th>
              <th style="width: 15%;">Dosage</th>
              <th style="width: 20%;">Frequency</th>
              <th style="width: 15%;">Duration</th>
              <th style="width: 15%;">Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${medicinesRowsHtml || '<tr><td colspan="5" style="padding: 12px; text-align: center; color: #6B7280;">No medications prescribed.</td></tr>'}
          </tbody>
        </table>

        ${adviceHtml}
        ${followUpHtml}

        <div class="footer-section">
          <div class="seal-text">
            Generated via Docyra Healthcare<br/>
            Ref #${apt._id ? apt._id.slice(-8) : ''} • Date: ${new Date().toLocaleDateString('en-IN')}
          </div>
          <div>
            <div class="sign-line">
              ${doctorName}<br/>
              <span style="font-size: 10px; color: #6B7280; font-weight: normal;">Authorized Medical Practitioner</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Print using hidden iframe (works reliably across all browsers without popup blockers)
    let printFrame = document.getElementById('docyra-print-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'docyra-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }

    try {
      const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(printableDocument);
        frameDoc.close();

        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        }, 250);
      }
    } catch {
      // Fallback in case of sandboxed iframe
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(printableDocument);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 250);
      }
    }
  }
}
