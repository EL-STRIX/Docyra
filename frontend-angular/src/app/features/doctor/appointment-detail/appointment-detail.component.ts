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

export type DetailTab = 'prescription' | 'tests' | 'diagnosis_info' | 'notes';

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
            <div class="header-info">
              <!-- Title & Status Badge -->
              <div class="header-title-row">
                <h1 class="page-title">Appointment #{{ appointment._id | slice:-6 }}</h1>
                <app-status-badge [status]="appointment.status"></app-status-badge>
                <span *ngIf="appointment.isFollowUp || appointment.previousAppointmentId" class="follow-up-badge" [title]="priorAppointment ? ('Linked to prior visit #' + (priorAppointment._id | slice:-6)) : 'Follow-up visit'">
                  <mat-icon class="follow-up-ic">sync</mat-icon>
                  <span>Follow-Up Visit {{ priorAppointment ? '(Linked #' + (priorAppointment._id | slice:-6) + ')' : '' }}</span>
                </span>
                <span *ngIf="appointment.status === 'cancelled' && appointment.cancellationReason" class="cancelled-reason-chip" [title]="appointment.cancellationReason">
                  <mat-icon class="cancelled-reason-ic">info</mat-icon>
                  <span>{{ appointment.cancellationReason }}</span>
                </span>
              </div>

              <!-- Subtitle Metadata Bar -->
              <div class="header-meta-bar">
                <div class="meta-item">
                  <mat-icon class="meta-icon">calendar_today</mat-icon>
                  <span>{{ appointment.slotStart | portalDate:'EEEE, dd MMM yyyy' }}</span>
                </div>

                <span class="meta-divider">•</span>

                <div class="meta-item">
                  <mat-icon class="meta-icon">schedule</mat-icon>
                  <span>{{ appointment.slotStart | portalDate:'h:mm a' }}</span>
                </div>
              </div>
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

              <ng-container *ngIf="appointment.status === 'confirmed' && !isReadOnly">
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

        <!-- Clean Patient Clinical Summary Card -->
        <mat-card class="patient-snapshot-card">
          <div class="snapshot-grid">
            <!-- Patient Info Left -->
            <div class="snapshot-patient">
              <div class="patient-avatar-box">
                <mat-icon class="patient-avatar-ic">account_circle</mat-icon>
              </div>
              <div class="patient-info-text">
                <div class="patient-name-row">
                  <span class="patient-name">{{ getPatientName() }}</span>
                  <span *ngIf="appointment.bookedFor.type === 'dependent'" class="patient-dep-badge">
                    {{ appointment.bookedFor.relationship || 'Dependent' }}
                  </span>
                </div>
                <div class="patient-sub">
                  <span class="sub-pill">{{ appointment.bookedFor.type === 'dependent' ? 'Family Dependent' : 'Self' }}</span>
                  <span *ngIf="appointment.bookedFor.gender" class="sub-dot">•</span>
                  <span *ngIf="appointment.bookedFor.gender">{{ appointment.bookedFor.gender | titlecase }}</span>
                  <span *ngIf="appointment.bookedFor.dateOfBirth" class="sub-dot">•</span>
                  <span *ngIf="appointment.bookedFor.dateOfBirth">
                    DOB: {{ appointment.bookedFor.dateOfBirth | portalDate:'dd MMM yyyy' }}
                    <span *ngIf="calculateAge(appointment.bookedFor.dateOfBirth)" class="text-xs text-gray-500">({{ calculateAge(appointment.bookedFor.dateOfBirth) }})</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Health Snapshot Tags Right -->
            <div class="vitals-tags-wrap">
              <div class="health-tag">
                <span class="tag-label">Blood Group</span>
                <span class="tag-val" [class.highlight]="!!appointment.bookedFor.bloodGroup">
                  {{ appointment.bookedFor.bloodGroup || 'Unspecified' }}
                </span>
              </div>

              <div class="health-tag" [class.alert-tag]="hasReportedAllergies()">
                <span class="tag-label">Allergies</span>
                <span class="tag-val" [title]="appointment.bookedFor.allergies || 'None reported'">
                  {{ appointment.bookedFor.allergies || 'None reported' }}
                </span>
              </div>

              <div class="health-tag" [class.condition-tag]="hasReportedConditions()">
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
            <span>Lab Test Reports</span>
            <span *ngIf="medicalTests.length > 0" class="tab-badge">
              {{ medicalTests.length }}
            </span>
          </button>

          <button
            class="workspace-tab-btn"
            [class.active]="activeTab === 'diagnosis_info'"
            (click)="activeTab = 'diagnosis_info'"
          >
            <mat-icon>person</mat-icon>
            <span>Patient Details</span>
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
              <button *ngIf="!isReadOnly" mat-flat-button color="primary" (click)="savePrescription()" [disabled]="saving">
                <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
                <mat-icon *ngIf="!saving">save</mat-icon>
                <span>Save Prescription</span>
              </button>
            </div>

            <!-- Prior Prescription Context from Linked Initial Visit (if Follow-Up) -->
            <div *ngIf="priorAppointment && priorAppointment.prescription?.medicines?.length" class="prior-prescription-box mt-4">
              <div class="prior-prescription-header">
                <div class="flex items-center gap-2">
                  <mat-icon class="prior-rx-icon">history_edu</mat-icon>
                  <div>
                    <h3 class="prior-rx-title">
                      Medications Prescribed on Linked Prior Consultation
                      <span class="prior-rx-meta">
                        (#{{ priorAppointment._id | slice:-6 }} • {{ priorAppointment.slotStart | portalDate:'dd MMM yyyy' }})
                      </span>
                    </h3>
                    <p class="prior-rx-sub" *ngIf="priorAppointment.reasonForVisit">
                      Initial Reason: {{ priorAppointment.reasonForVisit }}
                    </p>
                  </div>
                </div>

                <button
                  *ngIf="!isReadOnly"
                  type="button"
                  mat-stroked-button
                  color="primary"
                  class="copy-rx-btn"
                  (click)="copyPriorMedicines()"
                  title="Copy these medicines into current prescription for review and editing"
                >
                  <mat-icon>content_copy</mat-icon>
                  <span>Re-Prescribe / Copy Medications</span>
                </button>
              </div>

              <div class="prior-meds-grid mt-3">
                <div *ngFor="let med of priorAppointment.prescription.medicines" class="prior-med-card">
                  <div class="prior-med-name-col">
                    <span class="prior-med-name">{{ med.name }}</span>
                    <span class="prior-med-dose">{{ med.dosage }}</span>
                  </div>
                  <div class="prior-med-schedule">
                    <span class="schedule-pill">{{ med.frequency }}</span>
                    <span class="duration-pill">{{ med.duration }}</span>
                  </div>
                  <div class="prior-med-inst" *ngIf="med.instructions">
                    <mat-icon class="inst-ic">info_outline</mat-icon>
                    <span>{{ med.instructions }}</span>
                  </div>
                </div>
              </div>

              <div *ngIf="priorAppointment.prescription?.generalAdvice" class="prior-advice-strip mt-3">
                <span class="font-bold text-xs text-teal-900">Prior Advice:</span>
                <span class="text-xs text-neutral-700 ml-1.5">{{ priorAppointment.prescription.generalAdvice }}</span>
              </div>
            </div>

            <!-- Medicines Table -->
            <div *ngIf="isReadOnly && validPrescriptionMedicinesCount === 0" class="empty-view-state mt-4">
              <mat-icon class="empty-view-ic">medication</mat-icon>
              <p>No medication was prescribed for this consultation.</p>
            </div>

            <div *ngIf="!isReadOnly || validPrescriptionMedicinesCount > 0" class="prescription-builder mt-4">
              <div class="table-header-row">
                <div class="col-med">Medicine</div>
                <div class="col-dosage">Dosage</div>
                <div class="col-freq">Frequency</div>
                <div class="col-dur">Duration</div>
                <div class="col-inst">Instructions</div>
                <div *ngIf="!isReadOnly" class="col-action"></div>
              </div>

              <div *ngFor="let med of prescriptionMedicines; let i = index" class="medicine-row">
                <div class="col-med">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.name"
                    [disabled]="isReadOnly"
                    placeholder="Medicine name & strength"
                  />
                </div>
                <div class="col-dosage">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.dosage"
                    [disabled]="isReadOnly"
                    placeholder="e.g. 1 Tablet"
                  />
                </div>
                <div class="col-freq">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.frequency"
                    [disabled]="isReadOnly"
                    placeholder="e.g. 1-0-1 / Twice Daily"
                  />
                </div>
                <div class="col-dur">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.duration"
                    [disabled]="isReadOnly"
                    placeholder="e.g. 5 Days"
                  />
                </div>
                <div class="col-inst">
                  <input
                    class="rx-input"
                    [(ngModel)]="med.instructions"
                    [disabled]="isReadOnly"
                    placeholder="e.g. After meals"
                  />
                </div>
                <div *ngIf="!isReadOnly" class="col-action">
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

              <div *ngIf="!isReadOnly" class="mt-3">
                <button mat-stroked-button color="primary" type="button" (click)="addMedicineRow()">
                  <mat-icon>add</mat-icon>
                  <span>Add Medicine</span>
                </button>
              </div>
            </div>

            <!-- Suggested Diagnostic / Lab Tests Section -->
            <div class="suggested-tests-section mt-6">
              <div class="suggested-tests-header">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-teal-700">science</mat-icon>
                  <h3 class="suggested-tests-title">Advise Diagnostic / Lab Tests</h3>
                  <span class="optional-tag" *ngIf="!isReadOnly">Optional</span>
                </div>
                <button *ngIf="!isReadOnly" mat-stroked-button color="primary" type="button" (click)="addSuggestedTestRow()">
                  <mat-icon>add</mat-icon>
                  <span>Suggest Lab Test</span>
                </button>
              </div>

              <!-- Linked Prior Diagnostic Tests Reference (if Follow-Up) -->
              <div *ngIf="priorAppointment && priorAppointment.medicalTests && priorAppointment.medicalTests.length > 0" class="prior-tests-summary-strip mt-3">
                <div class="flex items-center gap-1.5">
                  <mat-icon class="text-teal-700 text-sm">sync</mat-icon>
                  <span class="text-xs font-semibold text-teal-900">
                    {{ priorAppointment.medicalTests.length }} diagnostic test(s) were advised during linked prior consultation.
                  </span>
                </div>
                <button type="button" class="view-prior-tests-link" (click)="activeTab = 'tests'">
                  View Results & Reports in Lab Tests Tab →
                </button>
              </div>

              <div *ngIf="medicalTests.length === 0" class="empty-suggested-tests-box">
                <p *ngIf="!isReadOnly">No lab tests suggested for this patient yet. Click <strong>"Suggest Lab Test"</strong> above if diagnostic tests (e.g. Blood Test, X-Ray, Ultrasound) are required.</p>
                <p *ngIf="isReadOnly">No diagnostic lab tests were advised for this consultation.</p>
              </div>

              <div *ngIf="medicalTests.length > 0" class="prescription-builder mt-3">
                <div class="table-header-row">
                  <div class="col-test-name">Test Name</div>
                  <div class="col-test-inst">Clinical Notes / Instructions</div>
                  <div *ngIf="!isReadOnly" class="col-action"></div>
                </div>

                <div *ngFor="let test of medicalTests; let i = index" class="medicine-row">
                  <div class="col-test-name">
                    <input
                      class="rx-input"
                      [(ngModel)]="test.testName"
                      [disabled]="isReadOnly"
                      placeholder="e.g. Complete Blood Count (CBC) / Fasting Blood Sugar"
                    />
                  </div>
                  <div class="col-test-inst">
                    <input
                      class="rx-input"
                      [(ngModel)]="test.instructions"
                      [disabled]="isReadOnly"
                      placeholder="e.g. 10 hours fasting required / Morning sample"
                    />
                  </div>
                  <div *ngIf="!isReadOnly" class="col-action">
                    <button
                      mat-icon-button
                      color="warn"
                      type="button"
                      (click)="removeSuggestedTestRow(i)"
                      title="Remove Test"
                    >
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Advice & Follow-Up Grid -->
            <div class="rx-additional-grid mt-6">
              <div class="form-group">
                <label class="field-label">Doctor's Advice & Instructions</label>
                <textarea
                  class="rx-textarea"
                  rows="3"
                  [(ngModel)]="prescriptionGeneralAdvice"
                  [disabled]="isReadOnly"
                  placeholder="Dietary instructions, lifestyle advice, or special precautions..."
                ></textarea>
              </div>

              <div class="form-group">
                <label class="field-label">Follow-up Date</label>
                <input
                  class="rx-input"
                  [(ngModel)]="prescriptionFollowUpDate"
                  [disabled]="isReadOnly"
                  placeholder="e.g. 7 days / 22 Nov 2026"
                />
              </div>
            </div>
          </mat-card>
        </div>

        <!-- TAB 2: Lab & Diagnostic Test Reports -->
        <div *ngIf="activeTab === 'tests'" class="tab-content-area">
          <mat-card class="section-card">
            <div class="card-title-bar">
              <h2 class="card-title flex items-center gap-2">
                <mat-icon class="text-teal-700">biotech</mat-icon>
                <span>Diagnostic Test Reports & Results</span>
              </h2>
            </div>
            <p class="section-subtext">
              Review diagnostic tests suggested for this patient and view medical lab test reports uploaded by the clinic administration.
            </p>

            <!-- Tests List -->
            <div class="tests-list mt-4">
              <div *ngIf="medicalTests.length === 0" class="empty-tests-box">
                <mat-icon class="empty-icon">science</mat-icon>
                <h3 class="font-bold text-neutral-800 mt-2">No Diagnostic Tests Ordered</h3>
                <p class="text-sm text-neutral-500 mt-1">No laboratory tests have been prescribed for this consultation yet.</p>
                <button *ngIf="!isReadOnly" mat-stroked-button color="primary" class="mt-3" (click)="activeTab = 'prescription'">
                  <mat-icon>medication</mat-icon>
                  <span>Go to Prescription to Suggest Tests</span>
                </button>
              </div>

              <div *ngIf="medicalTests.length > 0" class="tests-cards-list">
                <div *ngFor="let test of medicalTests" class="test-card-item">
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
                        <span class="lbl">Doctor's Clinical Notes:</span> {{ test.instructions }}
                      </div>
                      <div class="test-date-meta" *ngIf="test.orderedAt">
                        Advised on: {{ test.orderedAt | portalDate:'dd MMM yyyy' }}
                      </div>
                    </div>
                  </div>

                  <!-- Findings & Official Report Viewer (Read-only for doctor) -->
                  <div class="test-result-row">
                    <div class="result-findings-col">
                      <label class="field-label">Laboratory Findings & Values</label>
                      <div class="findings-read-box" [class.has-content]="!!test.resultNotes">
                        {{ test.resultNotes || 'Lab values or clinical findings have not been recorded yet.' }}
                      </div>
                    </div>

                    <div class="result-file-col">
                      <label class="field-label">Test Report Document</label>
                      <div class="file-action-wrap">
                        <div *ngIf="test.resultFileUrl" class="file-attached-badge">
                          <a [href]="test.resultFileUrl" target="_blank" rel="noopener noreferrer" class="view-report-action-btn">
                            <mat-icon>description</mat-icon>
                            <span>View / Download Report</span>
                            <mat-icon class="ext-icon">open_in_new</mat-icon>
                          </a>
                        </div>
                        <div *ngIf="!test.resultFileUrl" class="pending-report-banner">
                          <mat-icon class="pending-clock-ic">hourglass_empty</mat-icon>
                          <span>Report document pending upload by clinic administration</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Linked Diagnostic Tests from Prior Visit if Follow-up -->
            <div *ngIf="priorAppointment && priorAppointment.medicalTests && priorAppointment.medicalTests.length > 0" class="linked-tests-container mt-6">
              <div class="linked-tests-header">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-teal-700">sync</mat-icon>
                  <h3 class="font-bold text-sm text-teal-900">
                    Diagnostic Tests from Linked Prior Consultation ({{ priorAppointment.slotStart | portalDate:'dd MMM yyyy' }})
                  </h3>
                </div>
                <span class="text-xs text-neutral-500">
                  Reason: {{ priorAppointment.reasonForVisit || 'General Consultation' }}
                </span>
              </div>

              <div class="tests-cards-list mt-3">
                <div *ngFor="let test of priorAppointment.medicalTests" class="test-card-item prior-test-card">
                  <div class="test-main-row">
                    <div class="test-info">
                      <div class="test-title">
                        <mat-icon class="test-badge-icon">biotech</mat-icon>
                        <span class="test-name">{{ test.testName }}</span>
                        <span class="test-status-pill" [ngClass]="getTestStatusClass(test.status)">
                          {{ test.status | uppercase }}
                        </span>
                        <span class="prior-visit-tag">Prior Visit</span>
                      </div>
                      <div class="test-instructions" *ngIf="test.instructions">
                        <span class="lbl">Doctor's Clinical Notes:</span> {{ test.instructions }}
                      </div>
                    </div>
                  </div>

                  <div class="test-result-row">
                    <div class="result-findings-col">
                      <label class="field-label">Laboratory Findings & Values</label>
                      <div class="findings-read-box" [class.has-content]="!!test.resultNotes">
                        {{ test.resultNotes || 'Lab values or clinical findings have not been recorded yet.' }}
                      </div>
                    </div>

                    <div class="result-file-col">
                      <label class="field-label">Test Report Document</label>
                      <div class="file-action-wrap">
                        <div *ngIf="test.resultFileUrl" class="file-attached-badge">
                          <a [href]="test.resultFileUrl" target="_blank" rel="noopener noreferrer" class="view-report-action-btn">
                            <mat-icon>description</mat-icon>
                            <span>View / Download Report</span>
                            <mat-icon class="ext-icon">open_in_new</mat-icon>
                          </a>
                        </div>
                        <div *ngIf="!test.resultFileUrl" class="pending-report-banner">
                          <mat-icon class="pending-clock-ic">hourglass_empty</mat-icon>
                          <span>Report document pending upload by clinic administration</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </mat-card>
        </div>

        <!-- TAB 3: Comprehensive Patient Details -->
        <div *ngIf="activeTab === 'diagnosis_info'" class="tab-content-area">
          <mat-card class="section-card">
            <div class="card-title-bar">
              <h2 class="card-title flex items-center gap-2">
                <mat-icon class="text-teal-700">account_circle</mat-icon>
                <span>Comprehensive Patient Profile</span>
              </h2>
            </div>

            <div class="patient-profile-sections mt-4">
              <!-- Section 1: Personal & Category -->
              <div class="patient-info-block">
                <div class="block-header">
                  <mat-icon class="block-ic">badge</mat-icon>
                  <h3>Personal & Booking Details</h3>
                </div>
                <div class="details-grid-4">
                  <div class="info-item">
                    <span class="item-label">Full Patient Name</span>
                    <span class="item-value font-bold text-neutral-900">{{ getPatientName() }}</span>
                  </div>
                  <div class="info-item">
                    <span class="item-label">Booking Category</span>
                    <span class="item-value">
                      <span class="category-badge" [class.dependent-cat]="appointment.bookedFor.type === 'dependent'">
                        {{ appointment.bookedFor.type === 'dependent' ? 'Family Dependent (' + (appointment.bookedFor.relationship || 'Dependent') + ')' : 'Self Booking' }}
                      </span>
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="item-label">Gender</span>
                    <span class="item-value capitalize">{{ appointment.bookedFor.gender || 'Not Specified' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="item-label">Date of Birth & Age</span>
                    <span class="item-value">
                      {{ appointment.bookedFor.dateOfBirth ? (appointment.bookedFor.dateOfBirth | portalDate:'dd MMM yyyy') : 'Not Specified' }}
                      <span *ngIf="calculateAge(appointment.bookedFor.dateOfBirth)" class="text-neutral-500 font-normal">
                        ({{ calculateAge(appointment.bookedFor.dateOfBirth) }})
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Section 2: Contact Information -->
              <div class="patient-info-block">
                <div class="block-header">
                  <mat-icon class="block-ic">contact_phone</mat-icon>
                  <h3>Contact & Emergency Details</h3>
                </div>
                <div class="details-grid-3">
                  <div class="info-item">
                    <span class="item-label">Phone Number</span>
                    <span class="item-value font-medium">{{ getPatientPhone() || 'Not Provided' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="item-label">Email Address</span>
                    <span class="item-value font-medium">{{ getPatientEmail() || 'Not Provided' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="item-label">Emergency Contact</span>
                    <span class="item-value">
                      {{ appointment.bookedFor.emergencyContactName ? (appointment.bookedFor.emergencyContactName + (appointment.bookedFor.emergencyContactPhone ? ' • ' + appointment.bookedFor.emergencyContactPhone : '')) : 'Not Provided' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Section 3: Clinical Health Record -->
              <div class="patient-info-block">
                <div class="block-header">
                  <mat-icon class="block-ic">medical_information</mat-icon>
                  <h3>Clinical Health Record</h3>
                </div>
                <div class="details-grid-2">
                  <div class="info-item">
                    <span class="item-label">Blood Group</span>
                    <span class="item-value font-bold" [class.text-rose-700]="!!appointment.bookedFor.bloodGroup">
                      {{ appointment.bookedFor.bloodGroup || 'Unspecified' }}
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="item-label">Height & Weight</span>
                    <span class="item-value">
                      {{ appointment.bookedFor.heightCm ? appointment.bookedFor.heightCm + ' cm' : '-' }} /
                      {{ appointment.bookedFor.weightKg ? appointment.bookedFor.weightKg + ' kg' : '-' }}
                      <span *ngIf="calculateBmi(appointment.bookedFor.heightCm, appointment.bookedFor.weightKg)" class="bmi-pill">
                        BMI: {{ calculateBmi(appointment.bookedFor.heightCm, appointment.bookedFor.weightKg) }}
                      </span>
                    </span>
                  </div>
                  <div class="info-item span-full">
                    <span class="item-label">Known Allergies</span>
                    <div class="clinical-box" [class.alert-border]="!!appointment.bookedFor.allergies">
                      {{ appointment.bookedFor.allergies || 'No known allergies reported.' }}
                    </div>
                  </div>
                  <div class="info-item span-full">
                    <span class="item-label">Chronic Conditions / Medical History</span>
                    <div class="clinical-box">
                      {{ appointment.bookedFor.chronicConditions || 'No chronic medical conditions reported.' }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section 4: Visit & Consultation Summary -->
              <div class="patient-info-block">
                <div class="block-header">
                  <mat-icon class="block-ic">receipt_long</mat-icon>
                  <h3>Visit & Consultation Details</h3>
                </div>
                <div class="details-grid-3">
                  <div class="info-item">
                    <span class="item-label">Consultation Fee</span>
                    <span class="item-value font-bold text-teal-800">
                      ₹{{ appointment.consultationFee }}
                      <span class="payment-indicator ml-2" [class.paid]="appointment.paymentStatus === 'completed'">
                        {{ appointment.paymentStatus === 'completed' ? 'Paid' : 'Unpaid' }}
                      </span>
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="item-label">Scheduled Visit Time</span>
                    <span class="item-value font-medium">
                      {{ appointment.slotStart | portalDate:'EEEE, dd MMM yyyy • h:mm a' }}
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="item-label">Appointment Status</span>
                    <span class="item-value">
                      <app-status-badge [status]="appointment.status"></app-status-badge>
                    </span>
                  </div>
                  <div class="info-item span-full" *ngIf="appointment.reasonForVisit">
                    <span class="item-label">Reason for Visit / Patient Symptoms</span>
                    <div class="clinical-box">
                      {{ appointment.reasonForVisit }}
                    </div>
                  </div>
                  <div class="info-item span-full" *ngIf="priorAppointment">
                    <span class="item-label">Consultation Continuity</span>
                    <div class="clinical-box continuity-box">
                      <strong>Follow-Up Consultation:</strong> Linked to prior consultation #{{ priorAppointment._id | slice:-6 }} on {{ priorAppointment.slotStart | portalDate:'dd MMM yyyy' }} (Initial Reason: {{ priorAppointment.reasonForVisit || 'General' }}).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </mat-card>
        </div>

        <!-- TAB 4: Clinical Notes -->
        <div *ngIf="activeTab === 'notes'" class="tab-content-area">
          <mat-card class="section-card">
            <div class="card-title-bar">
              <h2 class="card-title flex items-center gap-2">
                <mat-icon class="text-teal-700">edit_note</mat-icon>
                <span>Consultation Notes</span>
              </h2>
            </div>

            <!-- Prior Clinical Notes from Linked Initial Consultation -->
            <div *ngIf="priorAppointment && priorAppointment.notes" class="prior-notes-box mt-4">
              <div class="prior-notes-header">
                <mat-icon class="prior-notes-ic">history</mat-icon>
                <span class="font-bold text-xs text-teal-950">
                  Clinical Examination Notes from Linked Prior Consultation ({{ priorAppointment.slotStart | portalDate:'dd MMM yyyy • h:mm a' }})
                </span>
              </div>
              <p class="prior-notes-text">{{ priorAppointment.notes }}</p>
            </div>

            <mat-form-field appearance="outline" class="w-full mt-4">
              <mat-label>Clinical Observations</mat-label>
              <textarea
                matInput
                rows="6"
                [(ngModel)]="visitNotes"
                [disabled]="isReadOnly"
                placeholder="Enter consultation examination notes..."
              ></textarea>
            </mat-form-field>

            <div *ngIf="!isReadOnly" class="mt-2">
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

    .header-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .header-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .page-title {
      font-size: 22px;
      font-weight: 800;
      color: #111827;
      margin: 0;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .follow-up-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #EFF6FF;
      color: #1D4ED8;
      border: 1px solid #BFDBFE;
    }

    .follow-up-ic {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .cancelled-reason-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: #FEF2F2;
      color: #991B1B;
      border: 1px solid #FECACA;
      max-width: 340px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cancelled-reason-ic {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #DC2626;
      flex-shrink: 0;
    }

    .empty-view-state {
      padding: 28px;
      text-align: center;
      background: #F9FAFB;
      border: 1px dashed #D1D5DB;
      border-radius: 8px;
      color: #6B7280;
    }

    .empty-view-ic {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #9CA3AF;
      margin-bottom: 4px;
    }

    .linked-tests-container {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 12px;
      padding: 16px;
    }

    .linked-tests-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    .prior-test-card {
      border-left: 3px solid #0D9488 !important;
    }

    .prior-visit-tag {
      font-size: 10px;
      font-weight: 700;
      background: #E6F2F1;
      color: #0F5C5C;
      padding: 1px 6px;
      border-radius: 4px;
      margin-left: 6px;
    }

    /* Prior Consultation Context Boxes */
    .prior-prescription-box {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 12px;
      padding: 16px;
    }

    .prior-prescription-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #DCFCE7;
    }

    .prior-rx-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
      color: #0F5C5C;
    }

    .prior-rx-title {
      font-size: 13px;
      font-weight: 800;
      color: #0F5C5C;
      margin: 0;
    }

    .prior-rx-meta {
      font-weight: 600;
      color: #065F46;
      font-size: 12px;
      margin-left: 4px;
    }

    .prior-rx-sub {
      font-size: 11px;
      color: #4B5563;
      margin: 2px 0 0 0;
    }

    .copy-rx-btn {
      font-size: 11px !important;
      font-weight: 700 !important;
      color: #0F5C5C !important;
      border-color: #0F5C5C !important;
      background: #FFFFFF !important;
      line-height: 28px !important;
      height: 32px !important;
      padding: 0 12px !important;
    }

    .copy-rx-btn mat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      margin-right: 4px;
    }

    .prior-meds-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 10px;
    }

    .prior-med-card {
      background: #FFFFFF;
      border: 1px solid #D1FAE5;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .prior-med-name-col {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }

    .prior-med-name {
      font-weight: 800;
      font-size: 13px;
      color: #111827;
    }

    .prior-med-dose {
      font-size: 11px;
      font-weight: 700;
      color: #0F5C5C;
    }

    .prior-med-schedule {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .schedule-pill {
      font-size: 10px;
      font-weight: 700;
      background: #E0F2FE;
      color: #0369A1;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .duration-pill {
      font-size: 10px;
      font-weight: 700;
      background: #FEF3C7;
      color: #92400E;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .prior-med-inst {
      font-size: 11px;
      color: #4B5563;
      display: flex;
      align-items: center;
      gap: 4px;
      font-style: italic;
    }

    .inst-ic {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #9CA3AF;
    }

    .prior-advice-strip {
      background: #FFFFFF;
      border: 1px solid #D1FAE5;
      border-radius: 6px;
      padding: 8px 12px;
    }

    .prior-tests-summary-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      padding: 8px 12px;
    }

    .view-prior-tests-link {
      background: none;
      border: none;
      color: #0F5C5C;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }

    .view-prior-tests-link:hover {
      color: #065F46;
    }

    .prior-notes-box {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 10px;
      padding: 12px 16px;
    }

    .prior-notes-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .prior-notes-ic {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #0F5C5C;
    }

    .prior-notes-text {
      font-size: 12px;
      color: #1F2937;
      line-height: 1.5;
      margin: 0;
      background: #FFFFFF;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #D1FAE5;
    }

    .continuity-box {
      background: #F0FDF4 !important;
      border-color: #BBF7D0 !important;
      color: #065F46 !important;
      font-size: 12px !important;
    }

    .header-meta-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
      flex-wrap: wrap;
      font-size: 13px;
      color: #4B5563;
    }

    .meta-patient {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #111827;
    }

    .meta-patient-name {
      font-weight: 700;
      color: #111827;
    }

    .meta-dep-badge {
      font-size: 10px;
      font-weight: 700;
      color: #0369A1;
      background: #E0F2FE;
      padding: 1px 6px;
      border-radius: 4px;
      margin-left: 2px;
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #4B5563;
    }

    .meta-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #0F5C5C;
    }

    .meta-divider {
      color: #D1D5DB;
      font-size: 14px;
    }

    .payment-indicator {
      font-size: 10px;
      font-weight: 700;
      color: #B45309;
      padding: 2px 6px;
      border-radius: 4px;
      background: #FEF3C7;
    }

    .payment-indicator.paid {
      color: #15803D;
      background: #DCFCE7;
    }

    /* Clean Patient Clinical Summary Card */
    .patient-snapshot-card {
      padding: 14px 20px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
      gap: 14px;
    }

    .patient-avatar-box {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #E6F2F1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .patient-avatar-ic {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #0F5C5C;
    }

    .patient-info-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .patient-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .patient-name {
      font-size: 16px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.01em;
    }

    .patient-dep-badge {
      font-size: 10px;
      font-weight: 700;
      color: #0369A1;
      background: #E0F2FE;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .patient-sub {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #6B7280;
    }

    .sub-pill {
      font-weight: 600;
      color: #4B5563;
    }

    .sub-dot {
      color: #D1D5DB;
    }

    .vitals-tags-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .health-tag {
      display: flex;
      flex-direction: column;
      padding: 6px 12px;
      border-radius: 8px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      min-width: 95px;
    }

    .health-tag.alert-tag {
      background: #FEF2F2;
      border-color: #FECACA;
    }

    .health-tag.alert-tag .tag-label {
      color: #991B1B;
    }

    .health-tag.alert-tag .tag-val {
      color: #DC2626;
      font-weight: 700;
    }

    .health-tag.condition-tag {
      background: #FFFBEB;
      border-color: #FDE68A;
    }

    .health-tag.condition-tag .tag-label {
      color: #92400E;
    }

    .health-tag.condition-tag .tag-val {
      color: #B45309;
    }

    .health-tag.fee-tag {
      background: #F0FDF4;
      border-color: #BBF7D0;
    }

    .tag-label {
      font-size: 10px;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tag-val {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    .tag-val.highlight {
      color: #0F5C5C;
    }

    .fee-val {
      font-size: 13px;
      font-weight: 800;
      color: #0F5C5C;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
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

    .rx-input:disabled, .rx-select:disabled, .rx-textarea:disabled {
      background: #F9FAFB;
      color: #374151;
      border-color: #E5E7EB;
      cursor: not-allowed;
      box-shadow: none;
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

    /* Suggested Diagnostic Tests in Prescription */
    .suggested-tests-section {
      padding-top: 20px;
      border-top: 1px dashed #D1D5DB;
    }

    .suggested-tests-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .suggested-tests-title {
      font-size: 14px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .optional-tag {
      font-size: 10px;
      font-weight: 700;
      color: #6B7280;
      background: #F3F4F6;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .empty-suggested-tests-box {
      background: #F9FAFB;
      border: 1px dashed #D1D5DB;
      border-radius: 8px;
      padding: 14px 16px;
      margin-top: 10px;
      color: #6B7280;
      font-size: 12px;
    }

    .empty-suggested-tests-box p {
      margin: 0;
    }

    .col-test-name { flex: 4; }
    .col-test-inst { flex: 6; }

    /* Diagnostic Tests Reports & Results Styling */
    .section-subtext {
      font-size: 12px;
      color: #6B7280;
      margin: 4px 0 0;
    }

    .empty-tests-box {
      text-align: center;
      padding: 32px 20px;
      color: #6B7280;
      background: #FAFAF8;
      border: 1px dashed #D1D5DB;
      border-radius: 10px;
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
      border-radius: 10px;
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
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #0F5C5C;
    }

    .test-name {
      font-size: 15px;
      font-weight: 800;
      color: #1A2E2E;
    }

    .test-status-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.3px;
    }

    .status-ordered { background: #FEF3C7; color: #B45309; }
    .status-completed { background: #DCFCE7; color: #15803D; }
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

    .test-date-meta {
      font-size: 11px;
      color: #9CA3AF;
      margin-top: 2px;
    }

    .test-result-row {
      display: flex;
      gap: 16px;
      padding-top: 10px;
      border-top: 1px solid #E5E7EB;
      flex-wrap: wrap;
    }

    .result-findings-col {
      flex: 3;
      min-width: 220px;
    }

    .result-file-col {
      flex: 2;
      min-width: 220px;
    }

    .field-label {
      font-size: 11px;
      font-weight: 700;
      color: #1A2E2E;
      display: block;
      margin-bottom: 4px;
    }

    .findings-read-box {
      font-size: 13px;
      color: #6B7280;
      background: #FFFFFF;
      padding: 9px 12px;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
      line-height: 1.4;
      font-style: italic;
    }

    .findings-read-box.has-content {
      color: #111827;
      font-style: normal;
      font-weight: 500;
      background: #F0FDF4;
      border-color: #BBF7D0;
    }

    .view-report-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0F5C5C;
      color: #FFFFFF !important;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.15s ease;
    }

    .view-report-action-btn:hover {
      background: #0B4646;
    }

    .view-report-action-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .view-report-action-btn .ext-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
      opacity: 0.8;
    }

    .pending-report-banner {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 6px;
      font-size: 12px;
      color: #92400E;
      font-weight: 600;
    }

    .pending-clock-ic {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #D97706;
    }

    /* Comprehensive Patient Profile Tab */
    .patient-profile-sections {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .patient-info-block {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 10px;
      padding: 16px 18px;
    }

    .block-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #E5E7EB;
    }

    .block-header .block-ic {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #0F5C5C;
    }

    .block-header h3 {
      font-size: 14px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .details-grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }

    .details-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }

    .details-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }

    @media (max-width: 900px) {
      .details-grid-4, .details-grid-3 {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .details-grid-4, .details-grid-3, .details-grid-2 {
        grid-template-columns: 1fr;
      }
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .info-item.span-full {
      grid-column: 1 / -1;
    }

    .item-label {
      font-size: 11px;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .item-value {
      font-size: 13px;
      font-weight: 600;
      color: #1F2937;
    }

    .category-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      color: #0F5C5C;
      background: #E6F4F1;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .category-badge.dependent-cat {
      color: #0369A1;
      background: #E0F2FE;
    }

    .bmi-pill {
      display: inline-block;
      margin-left: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #0F5C5C;
      background: #E6F4F1;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .clinical-box {
      font-size: 13px;
      color: #1F2937;
      background: #FFFFFF;
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
      line-height: 1.5;
    }

    .clinical-box.alert-border {
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
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Failed to load appointment details');
      },
    });
  }

  get isReadOnly(): boolean {
    if (!this.appointment) return true;
    if (this.appointment.status === 'cancelled') return true;

    // Check if appointment consultation time has ended
    const now = new Date();
    const slotEnd = this.appointment.slotEnd || this.appointment.slotStart;
    if (slotEnd && new Date(slotEnd) < now) {
      return true;
    }
    return false;
  }

  get readOnlyReason(): 'cancelled' | 'time_ended' | null {
    if (!this.appointment) return null;
    if (this.appointment.status === 'cancelled') return 'cancelled';
    const now = new Date();
    const slotEnd = this.appointment.slotEnd || this.appointment.slotStart;
    if (slotEnd && new Date(slotEnd) < now) return 'time_ended';
    return null;
  }

  get priorAppointment(): any {
    if (!this.appointment?.previousAppointmentId) return null;
    if (typeof this.appointment.previousAppointmentId === 'object') {
      return this.appointment.previousAppointmentId;
    }
    return null;
  }

  copyPriorMedicines(): void {
    if (this.isReadOnly) return;
    const priorMeds = this.priorAppointment?.prescription?.medicines;
    if (!priorMeds || priorMeds.length === 0) return;
    const currentValid = this.prescriptionMedicines.filter((m) => m.name && m.name.trim().length > 0);
    this.prescriptionMedicines = [...currentValid, ...JSON.parse(JSON.stringify(priorMeds))];
    if (this.priorAppointment?.prescription?.generalAdvice && !this.prescriptionGeneralAdvice) {
      this.prescriptionGeneralAdvice = this.priorAppointment.prescription.generalAdvice;
    }
    this.notificationService.info('Medications copied from linked prior consultation');
  }

  initAppointmentState(apt: Appointment): void {
    this.visitNotes = apt.notes || '';

    // Prescription init
    if (apt.prescription?.medicines && apt.prescription.medicines.length > 0) {
      this.prescriptionMedicines = JSON.parse(JSON.stringify(apt.prescription.medicines));
    } else {
      this.prescriptionMedicines = this.isReadOnly
        ? []
        : [
            { name: '', dosage: '1 Tablet', frequency: '1-0-1', duration: '5 Days', instructions: 'After food' },
          ];
    }
    this.prescriptionGeneralAdvice = apt.prescription?.generalAdvice || '';
    this.prescriptionFollowUpDate = apt.prescription?.followUpDate || '';

    // Medical tests init
    this.medicalTests = apt.medicalTests ? JSON.parse(JSON.stringify(apt.medicalTests)) : [];
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

  getPatientPhone(): string {
    if (this.appointment?.bookedFor?.phone) return this.appointment.bookedFor.phone;
    if (typeof this.appointment?.patientId === 'object' && this.appointment?.patientId && (this.appointment.patientId as any).phone) {
      return (this.appointment.patientId as any).phone;
    }
    return '';
  }

  getPatientEmail(): string {
    if (this.appointment?.bookedFor?.email) return this.appointment.bookedFor.email;
    if (typeof this.appointment?.patientId === 'object' && this.appointment?.patientId && (this.appointment.patientId as any).email) {
      return (this.appointment.patientId as any).email;
    }
    return '';
  }

  calculateAge(dobStr?: string): string {
    if (!dobStr) return '';
    try {
      const dob = new Date(dobStr);
      if (isNaN(dob.getTime())) return '';
      const diffMs = Date.now() - dob.getTime();
      const ageDt = new Date(diffMs);
      const age = Math.abs(ageDt.getUTCFullYear() - 1970);
      return age > 0 ? `${age} yrs` : '< 1 yr';
    } catch {
      return '';
    }
  }

  calculateBmi(heightCm?: number, weightKg?: number): string {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return '';
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return bmi.toFixed(1);
  }

  hasReportedAllergies(): boolean {
    const a = this.appointment?.bookedFor?.allergies;
    if (!a) return false;
    const lower = a.trim().toLowerCase();
    return lower !== 'none' && lower !== 'none reported' && lower !== 'no known allergies reported.' && lower !== 'no known allergies';
  }

  hasReportedConditions(): boolean {
    const c = this.appointment?.bookedFor?.chronicConditions;
    if (!c) return false;
    const lower = c.trim().toLowerCase();
    return lower !== 'none' && lower !== 'none reported' && lower !== 'no chronic medical conditions reported.' && lower !== 'no chronic conditions';
  }

  getPatientId(): string | null {
    if (!this.appointment?.patientId) return null;
    if (typeof this.appointment.patientId === 'object') {
      return (this.appointment.patientId as any)._id;
    }
    return String(this.appointment.patientId);
  }

  addMedicineRow(): void {
    if (this.isReadOnly) return;
    this.prescriptionMedicines.push({
      name: '',
      dosage: '1 Tablet',
      frequency: '1-0-1',
      duration: '5 Days',
      instructions: 'After meals',
    });
  }

  removeMedicineRow(index: number): void {
    if (this.isReadOnly) return;
    this.prescriptionMedicines.splice(index, 1);
  }

  addSuggestedTestRow(): void {
    if (this.isReadOnly) return;
    this.medicalTests.push({
      testName: '',
      instructions: '',
      status: 'ordered',
      orderedAt: new Date().toISOString(),
    });
  }

  removeSuggestedTestRow(index: number): void {
    if (this.isReadOnly) return;
    this.medicalTests.splice(index, 1);
  }

  savePrescription(): void {
    if (this.isReadOnly) {
      this.notificationService.warning('Cannot write or modify prescriptions for a cancelled or past-window appointment.');
      return;
    }
    const validMeds = this.prescriptionMedicines.filter((m) => m.name && m.name.trim().length > 0);
    const validTests = this.medicalTests
      .filter((t) => t.testName && t.testName.trim().length > 0)
      .map((t) => ({
        ...t,
        testName: t.testName.trim(),
        instructions: (t.instructions || '').trim(),
        status: t.status || 'ordered',
        orderedAt: t.orderedAt || new Date().toISOString(),
      }));

    this.saving = true;

    const payload: {
      prescription: Prescription;
      medicalTests: MedicalTest[];
      notes?: string;
    } = {
      prescription: {
        medicines: validMeds,
        generalAdvice: this.prescriptionGeneralAdvice.trim(),
        followUpDate: this.prescriptionFollowUpDate.trim() || null,
        prescribedAt: new Date().toISOString(),
      },
      medicalTests: validTests,
    };

    this.appointmentService.updateAppointmentDetails(this.appointmentId, payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success && res.data) {
          const prevBookedFor = this.appointment?.bookedFor;
          this.appointment = {
            ...this.appointment,
            ...res.data,
            bookedFor: res.data.bookedFor || prevBookedFor,
          };
          this.medicalTests = res.data.medicalTests || validTests;
          this.notificationService.success('Prescription and advised tests saved successfully');
        }
      },
      error: (err) => {
        this.saving = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to save prescription');
      },
    });
  }

  addTest(): void {
    if (this.isReadOnly) return;
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
    if (this.isReadOnly) return;
    this.medicalTests.splice(index, 1);
  }

  saveMedicalTests(): void {
    if (this.isReadOnly) {
      this.notificationService.warning('Cannot write or modify diagnostic tests for a cancelled or past-window appointment.');
      return;
    }
    this.saving = true;
    this.appointmentService.updateAppointmentDetails(this.appointmentId, { medicalTests: this.medicalTests }).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success && res.data) {
          const prevBookedFor = this.appointment?.bookedFor;
          this.appointment = {
            ...this.appointment,
            ...res.data,
            bookedFor: res.data.bookedFor || prevBookedFor,
          };
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
    if (this.isReadOnly) {
      this.notificationService.warning('Cannot upload test reports for a cancelled or past-window appointment.');
      return;
    }
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
    if (this.isReadOnly) {
      this.notificationService.warning('Cannot write or modify clinical notes for a cancelled or past-window appointment.');
      return;
    }
    this.savingNotes = true;
    this.appointmentService.updateAppointmentDetails(this.appointmentId, { notes: this.visitNotes }).subscribe({
      next: (res) => {
        this.savingNotes = false;
        if (res.success && res.data) {
          const prevBookedFor = this.appointment?.bookedFor;
          this.appointment = {
            ...this.appointment,
            ...res.data,
            bookedFor: res.data.bookedFor || prevBookedFor,
          };
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
    if (this.isReadOnly) {
      this.notificationService.warning('Cannot update status for a cancelled or past-window appointment.');
      return;
    }
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
    if (this.isReadOnly) {
      this.notificationService.warning('Cannot cancel an appointment that has already elapsed or ended.');
      return;
    }
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

    // Advised Diagnostic Tests to print
    const validTestsToPrint = this.medicalTests.filter((t) => t.testName && t.testName.trim().length > 0);
    const testsToPrint = validTestsToPrint.length > 0 ? validTestsToPrint : (apt.medicalTests || []);

    const testsRowsHtml = testsToPrint
      .map(
        (t, idx) => `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: #111827; width: 45%;">${idx + 1}. ${t.testName}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #E5E7EB; color: #4B5563;">${t.instructions || 'Routine evaluation'}</td>
        </tr>
      `
      )
      .join('');

    const testsSectionHtml = testsRowsHtml
      ? `
        <div style="margin-top: 22px;">
          <div style="font-size: 12px; font-weight: 800; color: #0F5C5C; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
            Advised Diagnostic / Lab Tests
          </div>
          <table class="meds-table">
            <thead>
              <tr>
                <th style="width: 45%;">Test Name</th>
                <th>Clinical Instructions / Purpose</th>
              </tr>
            </thead>
            <tbody>
              ${testsRowsHtml}
            </tbody>
          </table>
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
        ${testsSectionHtml}

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
