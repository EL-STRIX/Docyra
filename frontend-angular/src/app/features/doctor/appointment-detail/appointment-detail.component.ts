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
                <span *ngIf="isFirstTimePatient" class="first-time-pill">
                  <mat-icon class="pill-icon">person_add</mat-icon>
                  New Patient with You
                </span>
              </div>
              <p class="subtitle">
                Scheduled on {{ appointment.slotStart | portalDate:'EEEE, dd MMMM yyyy, h:mm a' }}
              </p>
            </div>

            <!-- Contextual Status Actions -->
            <div class="status-action-btns">
              <button mat-stroked-button color="primary" (click)="printPrescription()" class="print-btn" title="Print digital prescription">
                <mat-icon>print</mat-icon>
                <span>Print Rx</span>
              </button>

              <!-- Confirmed actions -->
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

        <!-- Quick Patient Summary & Diagnostic Snapshot Strip -->
        <mat-card class="patient-snapshot-card">
          <div class="snapshot-grid">
            <div class="snapshot-item patient-main">
              <div class="patient-avatar-box">
                <mat-icon>account_circle</mat-icon>
              </div>
              <div>
                <div class="snapshot-name">{{ getPatientName() }}</div>
                <div class="snapshot-sub">
                  {{ appointment.bookedFor.type === 'dependent' ? 'Family Dependent (' + (appointment.bookedFor.relationship || 'Family') + ')' : 'Self Booking' }}
                  <span *ngIf="appointment.bookedFor.gender"> • {{ appointment.bookedFor.gender | titlecase }}</span>
                  <span *ngIf="appointment.bookedFor.dateOfBirth"> • DOB: {{ appointment.bookedFor.dateOfBirth | portalDate:'dd MMM yyyy' }}</span>
                </div>
              </div>
            </div>

            <!-- Blood Group Pill -->
            <div class="snapshot-item">
              <span class="snapshot-lbl">Blood Group</span>
              <span class="blood-group-badge">
                {{ appointment.bookedFor.bloodGroup ? '🩸 ' + appointment.bookedFor.bloodGroup : 'Not Specified' }}
              </span>
            </div>

            <!-- Known Allergies Alert -->
            <div class="snapshot-item">
              <span class="snapshot-lbl">Known Allergies</span>
              <span class="allergies-pill" [class.has-allergies]="!!appointment.bookedFor.allergies">
                {{ appointment.bookedFor.allergies || 'No Known Allergies' }}
              </span>
            </div>

            <!-- Pre-Existing Conditions -->
            <div class="snapshot-item">
              <span class="snapshot-lbl">Pre-Existing Conditions</span>
              <span class="conditions-text">
                {{ appointment.bookedFor.chronicConditions || 'None Reported' }}
              </span>
            </div>

            <!-- Consultation Fee & Payment -->
            <div class="snapshot-item fee-box">
              <span class="snapshot-lbl">Visit Fee</span>
              <span class="fee-amount">₹{{ appointment.consultationFee }}</span>
              <span class="pay-tag" [class.paid]="appointment.paymentStatus === 'completed'">
                {{ appointment.paymentStatus | uppercase }}
              </span>
            </div>
          </div>
        </mat-card>

        <!-- Workspace Tabs Bar -->
        <div class="workspace-tabs-bar">
          <button
            class="workspace-tab-btn"
            [class.active]="activeTab === 'prescription'"
            (click)="activeTab = 'prescription'"
          >
            <mat-icon>medication</mat-icon>
            <span>Digital Prescription (Rx)</span>
            <span *ngIf="prescriptionMedicines.length > 0" class="tab-badge">
              {{ prescriptionMedicines.length }}
            </span>
          </button>

          <button
            class="workspace-tab-btn"
            [class.active]="activeTab === 'tests'"
            (click)="activeTab = 'tests'"
          >
            <mat-icon>biotech</mat-icon>
            <span>Medical & Lab Tests</span>
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
            <span>Patient Diagnosis Details</span>
          </button>

          <button
            class="workspace-tab-btn"
            [class.active]="activeTab === 'past_history'"
            (click)="activeTab = 'past_history'"
          >
            <mat-icon>history</mat-icon>
            <span>Patient History Under You</span>
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

        <!-- TAB 1: Digital Prescription Builder -->
        <div *ngIf="activeTab === 'prescription'" class="tab-content-area">
          <mat-card class="section-card rx-card" id="prescription-printable-area">
            <div class="card-title-bar">
              <div>
                <h2 class="card-title flex items-center gap-2">
                  <mat-icon class="text-teal-700">medication</mat-icon>
                  <span>Digital Prescription (Rx)</span>
                </h2>
                <p class="card-desc">
                  Write medicines, dosage schedule, dietary instructions, and follow-up consultation date.
                </p>
              </div>
              <button mat-flat-button color="primary" (click)="savePrescription()" [disabled]="saving">
                <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
                <mat-icon *ngIf="!saving">save</mat-icon>
                <span>Save Prescription</span>
              </button>
            </div>

            <!-- Medicines Table -->
            <div class="prescription-builder mt-4">
              <div class="table-header-row">
                <div class="col-med">Medicine Name & Formulation</div>
                <div class="col-dosage">Dosage</div>
                <div class="col-freq">Frequency</div>
                <div class="col-dur">Duration</div>
                <div class="col-inst">Timing / Instructions</div>
                <div class="col-action"></div>
              </div>

              <div *ngFor="let med of prescriptionMedicines; let i = index" class="medicine-row">
                <div class="col-med">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.name"
                    placeholder="e.g. Amoxicillin 500mg / Paracetamol 650mg"
                  />
                </div>
                <div class="col-dosage">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.dosage"
                    placeholder="e.g. 1 Tablet / 5ml"
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
                    placeholder="e.g. 5 Days / 1 Week"
                  />
                </div>
                <div class="col-inst">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.instructions"
                    placeholder="e.g. After meals with warm water"
                  />
                </div>
                <div class="col-action">
                  <button
                    mat-icon-button
                    color="warn"
                    (click)="removeMedicineRow(i)"
                    title="Remove medicine"
                    [disabled]="prescriptionMedicines.length === 1 && !med.name"
                  >
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </div>

              <div class="mt-3">
                <button mat-stroked-button color="primary" (click)="addMedicineRow()">
                  <mat-icon>add</mat-icon>
                  <span>Add Another Medication</span>
                </button>
              </div>
            </div>

            <!-- Advice & Follow-Up -->
            <div class="rx-additional-grid mt-6">
              <div class="form-group">
                <label class="form-label">General Medical Advice & Lifestyle Precautions</label>
                <textarea
                  class="rx-textarea"
                  rows="3"
                  [(ngModel)]="prescriptionGeneralAdvice"
                  placeholder="e.g. Rest adequately, avoid cold food, drink 3L water daily, monitor BP mornings."
                ></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Recommended Next Follow-up Visit</label>
                <input
                  class="rx-input"
                  [(ngModel)]="prescriptionFollowUpDate"
                  placeholder="e.g. After 7 days / On 22 November 2026"
                />
                <span class="text-xs text-neutral-500 mt-1">Recommended timeframe for patient re-evaluation.</span>
              </div>
            </div>
          </mat-card>
        </div>

        <!-- TAB 2: Medical Diagnostic Tests & Lab Results -->
        <div *ngIf="activeTab === 'tests'" class="tab-content-area">
          <mat-card class="section-card">
            <div class="card-title-bar">
              <div>
                <h2 class="card-title flex items-center gap-2">
                  <mat-icon class="text-amber-700">biotech</mat-icon>
                  <span>Diagnostic Lab Tests & Investigation Orders</span>
                </h2>
                <p class="card-desc">
                  Prescribe required diagnostic tests for better medical diagnosis and record laboratory results.
                </p>
              </div>
              <button mat-flat-button color="primary" (click)="saveMedicalTests()" [disabled]="saving">
                <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
                <mat-icon *ngIf="!saving">save</mat-icon>
                <span>Save Tests</span>
              </button>
            </div>

            <!-- New Test Input Section -->
            <div class="add-test-box mt-4">
              <h3 class="test-box-title">Order New Diagnostic Test</h3>
              <div class="new-test-grid">
                <div class="test-input-col">
                  <label class="field-label">Test Name</label>
                  <input
                    class="rx-input"
                    [(ngModel)]="newTestName"
                    placeholder="e.g. Complete Blood Count (CBC) / Fasting Blood Sugar / Chest X-Ray"
                  />
                </div>

                <div class="test-input-col">
                  <label class="field-label">Preparation / Clinical Note</label>
                  <input
                    class="rx-input"
                    [(ngModel)]="newTestInstructions"
                    placeholder="e.g. 10 hours fasting required / Urgent"
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
                    <mat-icon>add_circle</mat-icon>
                    <span>Add Test</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Existing Tests List -->
            <div class="tests-list mt-6">
              <h3 class="test-box-title">Ordered Diagnostic Tests ({{ medicalTests.length }})</h3>

              <div *ngIf="medicalTests.length === 0" class="empty-tests-box">
                <mat-icon class="empty-icon">science</mat-icon>
                <p>No diagnostic tests ordered yet for this consultation.</p>
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
                        <span class="lbl">Instructions:</span> {{ test.instructions }}
                      </div>
                    </div>

                    <div class="test-actions">
                      <button mat-icon-button color="warn" (click)="removeTest(idx)" title="Remove test">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Test Results & Report Findings -->
                  <div class="test-result-row">
                    <div class="result-findings-col">
                      <label class="field-label">Diagnostic Findings & Values:</label>
                      <input
                        class="rx-input"
                        [(ngModel)]="test.resultNotes"
                        placeholder="Enter lab findings, abnormal markers, or test values..."
                      />
                    </div>

                    <!-- File Attachment Upload / Link -->
                    <div class="result-file-col">
                      <label class="field-label">Report Attachment:</label>
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
                          <span>Upload Report PDF/Image</span>
                        </button>

                        <div *ngIf="test.resultFileUrl" class="file-attached-badge">
                          <a [href]="test.resultFileUrl" target="_blank" class="file-link">
                            <mat-icon>description</mat-icon>
                            <span>View Attached Report</span>
                          </a>
                          <button mat-icon-button (click)="fileInput.click()" title="Replace file">
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

        <!-- TAB 3: Patient Diagnostic Details -->
        <div *ngIf="activeTab === 'diagnosis_info'" class="tab-content-area">
          <mat-card class="section-card">
            <h2 class="card-title flex items-center gap-2">
              <mat-icon class="text-teal-700">monitor_heart</mat-icon>
              <span>Patient Clinical Diagnosis & Health Profile</span>
            </h2>
            <p class="card-desc">
              Clinical background provided by patient to facilitate accurate diagnosis and prescription safety.
            </p>

            <div class="clinical-details-grid mt-4">
              <div class="detail-box">
                <span class="box-label">Blood Group</span>
                <span class="box-value font-bold text-rose-700">
                  {{ appointment.bookedFor.bloodGroup || 'Not Documented' }}
                </span>
              </div>

              <div class="detail-box">
                <span class="box-label">Date of Birth & Age</span>
                <span class="box-value">
                  {{ appointment.bookedFor.dateOfBirth ? (appointment.bookedFor.dateOfBirth | portalDate:'dd MMM yyyy') : 'Not Documented' }}
                </span>
              </div>

              <div class="detail-box">
                <span class="box-label">Biological Gender</span>
                <span class="box-value capitalize">
                  {{ appointment.bookedFor.gender || 'Not Documented' }}
                </span>
              </div>

              <div class="detail-box">
                <span class="box-label">Height & Weight Vitals</span>
                <span class="box-value">
                  {{ appointment.bookedFor.heightCm ? appointment.bookedFor.heightCm + ' cm' : '-' }} /
                  {{ appointment.bookedFor.weightKg ? appointment.bookedFor.weightKg + ' kg' : '-' }}
                </span>
              </div>

              <div class="detail-box full-width">
                <span class="box-label text-rose-700 font-bold">⚠️ Known Allergies & Drug Sensitivities</span>
                <div class="allergy-display-box" [class.alert-border]="!!appointment.bookedFor.allergies">
                  {{ appointment.bookedFor.allergies || 'No known allergies reported by the patient.' }}
                </div>
              </div>

              <div class="detail-box full-width">
                <span class="box-label font-bold">Pre-Existing / Chronic Health Conditions</span>
                <div class="condition-display-box">
                  {{ appointment.bookedFor.chronicConditions || 'No pre-existing or chronic medical conditions reported.' }}
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

        <!-- TAB 4: Patient History Under THIS Doctor (Strict Doctor Scoping) -->
        <div *ngIf="activeTab === 'past_history'" class="tab-content-area">
          <mat-card class="section-card">
            <div class="card-title-bar">
              <div>
                <h2 class="card-title flex items-center gap-2">
                  <mat-icon class="text-teal-700">history_edu</mat-icon>
                  <span>Patient Past Consultation & Prescription History (Under Your Care)</span>
                </h2>
                <p class="card-desc">
                  Chronological record of visits and prescriptions provided by your practice to this patient.
                </p>
              </div>
            </div>

            <!-- First-time patient with this doctor -->
            <div *ngIf="pastVisitsWithThisDoctor.length === 0" class="privacy-notice-box mt-4">
              <mat-icon class="privacy-icon">shield</mat-icon>
              <div>
                <h3 class="privacy-title">First Visit Under Your Practice</h3>
                <p class="privacy-desc">
                  This patient has no previous completed consultations or prescriptions recorded under your care.
                </p>
                <div class="privacy-policy-tag">
                  🔒 Doctor-Patient Confidentiality: In accordance with medical privacy standards, consultations and prescriptions from other practitioners are strictly confidential and inaccessible to other doctors.
                </div>
              </div>
            </div>

            <!-- List of Past Prescriptions & Consultations under THIS Doctor -->
            <div *ngIf="pastVisitsWithThisDoctor.length > 0" class="past-visits-list mt-4">
              <div *ngFor="let pastApt of pastVisitsWithThisDoctor" class="past-visit-card">
                <div class="past-visit-header">
                  <div>
                    <span class="past-visit-date font-bold">
                      {{ pastApt.slotStart | portalDate:'dd MMMM yyyy, h:mm a' }}
                    </span>
                    <span class="past-reason block text-xs text-neutral-600 mt-0.5">
                      Reason: {{ pastApt.reasonForVisit || 'General Consultation' }}
                    </span>
                  </div>
                  <app-status-badge [status]="pastApt.status"></app-status-badge>
                </div>

                <!-- Past Prescription (if prescribed) -->
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

                <!-- Past Advice -->
                <div *ngIf="pastApt.prescription?.generalAdvice" class="past-section mt-2">
                  <span class="past-lbl">Clinical Advice:</span>
                  <p class="past-text">{{ pastApt.prescription?.generalAdvice }}</p>
                </div>

                <!-- Past Tests -->
                <div *ngIf="pastApt.medicalTests?.length" class="past-section mt-2">
                  <span class="past-lbl">Diagnostic Tests:</span>
                  <div class="past-tests-pills">
                    <span *ngFor="let t of pastApt.medicalTests" class="past-test-pill">
                      {{ t.testName }} ({{ t.status }})
                      <span *ngIf="t.resultNotes"> - Findings: {{ t.resultNotes }}</span>
                    </span>
                  </div>
                </div>

                <!-- Past Clinical Notes -->
                <div *ngIf="pastApt.notes" class="past-section mt-2">
                  <span class="past-lbl">Visit Notes:</span>
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
              <span>Doctor's Clinical Notes</span>
            </h2>
            <p class="card-desc">Record private consultation observations, patient symptoms, and treatment plan.</p>

            <mat-form-field appearance="outline" class="w-full mt-4">
              <mat-label>Clinical Visit Observations & Diagnosis</mat-label>
              <textarea
                matInput
                rows="6"
                [(ngModel)]="visitNotes"
                placeholder="Enter clinical examination notes, patient presentation, and treatment evaluation..."
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
                <span>Save Clinical Notes</span>
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
            Please provide a cancellation reason. The patient will be notified immediately.
          </p>

          <mat-form-field appearance="outline" class="w-full mt-4">
            <mat-label>Reason for cancellation</mat-label>
            <textarea
              matInput
              rows="3"
              [(ngModel)]="cancelReason"
              placeholder="e.g. Doctor emergency or clinical rescheduling"
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
      gap: 20px;
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
      padding: 20px 24px;
    }

    .header-main {
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
      margin: 0;
    }

    .subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 4px 0 0;
    }

    .first-time-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #E0F2FE;
      color: #0369A1;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }

    .pill-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
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

    /* Patient Snapshot Strip */
    .patient-snapshot-card {
      padding: 16px 20px !important;
      border-radius: 12px !important;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
    }

    .snapshot-grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .snapshot-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .patient-main {
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }

    .patient-avatar-box mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #0F5C5C;
    }

    .snapshot-name {
      font-size: 15px;
      font-weight: 800;
      color: #1A2E2E;
    }

    .snapshot-sub {
      font-size: 12px;
      color: #5C6B6B;
    }

    .snapshot-lbl {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #5C6B6B;
      letter-spacing: 0.4px;
    }

    .blood-group-badge {
      font-size: 13px;
      font-weight: 800;
      color: #B91C1C;
    }

    .allergies-pill {
      font-size: 12px;
      font-weight: 600;
      color: #4B5563;
    }

    .allergies-pill.has-allergies {
      background: #FEF2F2;
      color: #B91C1C;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #FECACA;
      font-weight: 700;
    }

    .conditions-text {
      font-size: 12px;
      color: #1A2E2E;
      font-weight: 600;
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .fee-box {
      align-items: flex-end;
    }

    .fee-amount {
      font-size: 16px;
      font-weight: 800;
      color: #1A2E2E;
    }

    .pay-tag {
      font-size: 9px;
      font-weight: 700;
      color: #D97706;
    }

    .pay-tag.paid {
      color: #16A34A;
    }

    /* Workspace Tabs Bar */
    .workspace-tabs-bar {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .workspace-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
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
      padding: 24px !important;
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
      padding-bottom: 16px;
      border-bottom: 1px solid #F0EFEA;
    }

    .card-title {
      font-size: 16px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .card-desc {
      font-size: 12px;
      color: #5C6B6B;
      margin: 2px 0 0;
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
      padding: 16px 18px;
    }

    .test-box-title {
      font-size: 13px;
      font-weight: 700;
      color: #0F5C5C;
      margin: 0 0 12px;
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
      padding: 30px;
      color: #6B7280;
    }

    .empty-tests-box mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #9CA3AF;
    }

    .tests-cards-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .test-card-item {
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      padding: 14px 16px;
      background: #FAFAF8;
    }

    .test-main-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
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
      margin-top: 4px;
    }

    .test-instructions .lbl {
      font-weight: 700;
      color: #374151;
    }

    .test-result-row {
      display: flex;
      gap: 16px;
      padding-top: 10px;
      border-top: 1px solid #E5E7EB;
      flex-wrap: wrap;
    }

    .result-findings-col {
      flex: 2;
      min-width: 250px;
    }

    .result-file-col {
      flex: 1;
      min-width: 200px;
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
      gap: 14px;
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
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .detail-box.full-width {
      grid-column: 1 / -1;
    }

    .box-label {
      font-size: 11px;
      font-weight: 700;
      color: #5C6B6B;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .box-value {
      font-size: 14px;
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
      margin-top: 4px;
      line-height: 1.4;
    }

    .allergy-display-box.alert-border {
      border-color: #FECACA;
      background: #FFF5F5;
      color: #991B1B;
      font-weight: 700;
    }

    /* Privacy Notice Box */
    .privacy-notice-box {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 10px;
      padding: 18px 20px;
    }

    .privacy-icon {
      color: #16A34A;
      font-size: 28px;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }

    .privacy-title {
      font-size: 15px;
      font-weight: 800;
      color: #14532D;
      margin: 0;
    }

    .privacy-desc {
      font-size: 13px;
      color: #166534;
      margin: 4px 0 8px;
    }

    .privacy-policy-tag {
      font-size: 11px;
      color: #374151;
      background: #FFFFFF;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
      display: inline-block;
    }

    /* Past Visits List */
    .past-visits-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .past-visit-card {
      border: 1px solid #E7E5E0;
      border-radius: 10px;
      padding: 16px;
      background: #FAFAF8;
    }

    .past-visit-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 8px;
      border-bottom: 1px solid #E5E7EB;
    }

    .past-visit-date {
      font-size: 14px;
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

    .past-tests-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .past-test-pill {
      background: #EFF6FF;
      color: #1E40AF;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
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

  get isFirstTimePatient(): boolean {
    return this.pastVisitsWithThisDoctor.length === 0;
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
          this.notificationService.success('Digital prescription saved successfully');
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
          this.notificationService.success('Diagnostic tests saved successfully');
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
          this.notificationService.success('Test result report uploaded successfully');
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
          this.notificationService.success('Clinical notes saved successfully');
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

  printPrescription(): void {
    window.print();
  }
}
