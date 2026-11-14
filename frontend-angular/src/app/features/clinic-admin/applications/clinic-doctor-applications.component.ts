import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClinicService } from '../../../core/services/clinic.service';
import { NotificationService } from '../../../core/services/notification.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';

export interface InterviewMeeting {
  meetingDate: string;
  meetingTime: string;
  meetingLink: string;
  agenda?: string;
  scheduledAt?: string;
  emailSent?: boolean;
  emailSentAt?: string;
  notes?: string;
}

export interface ClinicDoctorApp {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  specialization: string;
  specializationId?: any;
  qualifications?: string[];
  yearsExperience?: number;
  consultationFee: number;
  feeCurrency?: string;
  clinicAddress?: string;
  licenseNumber?: string;
  licenseDocumentUrl?: string;
  bio?: string;
  status: 'pending' | 'approved' | 'rejected';
  isApproved: boolean;
  interviewMeeting?: InterviewMeeting | null;
  createdAt?: string;
}

@Component({
  selector: 'app-clinic-doctor-applications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    DateFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  template: `
    <div class="doctor-applications-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <div class="clinic-scope-badge">
            <mat-icon>domain</mat-icon>
            <span>Clinic Administrator Workspace</span>
          </div>
          <h1 class="page-title">Doctor Affiliation Applications</h1>
          <p class="page-subtitle">
            Review and verify medical credentials of doctors who applied to practice at your clinic facility. Approved physicians are moved to Manage Doctors.
          </p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="navigateToManageDoctors()" class="manage-docs-btn">
            <mat-icon>people</mat-icon>
            <span>Manage Doctors</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card" (click)="setStatusFilter('pending')" [class.active-card]="statusFilter === 'pending'">
          <div class="kpi-icon-wrap pending">
            <mat-icon>hourglass_top</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Pending Verification</span>
            <span class="kpi-value text-amber-600">{{ countPending() }}</span>
          </div>
        </div>

        <div class="kpi-card" (click)="setStatusFilter('rejected')" [class.active-card]="statusFilter === 'rejected'">
          <div class="kpi-icon-wrap rejected">
            <mat-icon>cancel</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Rejected Applications</span>
            <span class="kpi-value text-rose-600">{{ countRejected() }}</span>
          </div>
        </div>

        <div class="kpi-card" (click)="setStatusFilter('all')" [class.active-card]="statusFilter === 'all'">
          <div class="kpi-icon-wrap total">
            <mat-icon>assignment</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Total Applications</span>
            <span class="kpi-value">{{ applications.length }}</span>
          </div>
        </div>

        <div class="kpi-card roster-card" (click)="navigateToManageDoctors()">
          <div class="kpi-icon-wrap roster">
            <mat-icon>people</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Clinic Doctor Roster</span>
            <span class="roster-link-text">
              <span>View Manage Doctors</span>
              <mat-icon class="inline-arrow">arrow_forward</mat-icon>
            </span>
          </div>
        </div>
      </div>

      <!-- Main Applications Card -->
      <mat-card class="table-card">
        <!-- Filter & Search Toolbar -->
        <div class="toolbar-wrap">
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              placeholder="Search by doctor name, email, or specialization..."
              [(ngModel)]="searchQuery"
              (input)="applyFilter()"
              class="search-input"
            />
            <button *ngIf="searchQuery" class="clear-search" (click)="searchQuery = ''; applyFilter()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="status-tabs">
            <button
              class="tab-btn pending"
              [class.active]="statusFilter === 'pending'"
              (click)="setStatusFilter('pending')"
            >
              Pending ({{ countPending() }})
            </button>
            <button
              class="tab-btn rejected"
              [class.active]="statusFilter === 'rejected'"
              (click)="setStatusFilter('rejected')"
            >
              Rejected ({{ countRejected() }})
            </button>
            <button
              class="tab-btn"
              [class.active]="statusFilter === 'all'"
              (click)="setStatusFilter('all')"
            >
              All ({{ applications.length }})
            </button>
          </div>
        </div>

        <!-- Loading Spinner -->
        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
          <p>Loading clinic doctor applications...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && filteredApplications.length === 0" class="empty-state">
          <div class="empty-icon-box">
            <mat-icon>how_to_reg</mat-icon>
          </div>
          <h3>No applications found</h3>
          <p *ngIf="searchQuery || statusFilter !== 'all'">
            No applications match your current filters. Try resetting the search or filter options.
          </p>
          <p *ngIf="!searchQuery && statusFilter === 'all'">
            No doctor applications have been submitted to your clinic yet. When doctors apply through the portal selecting your clinic, their credentials will appear here for verification.
          </p>
        </div>

        <!-- Table View -->
        <div *ngIf="!loading && filteredApplications.length > 0" class="table-container">
          <table class="apps-table">
            <thead>
              <tr>
                <th>Applicant Doctor</th>
                <th>Specialization & Qualifications</th>
                <th>Experience & Fee</th>
                <th>Medical License</th>
                <th>Negotiation Meet</th>
                <th>Applied Date</th>
                <th>Status</th>
                <th class="text-right">Clinic Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let app of filteredApplications" [class.highlight-pending]="app.status === 'pending'" (click)="openReviewModal(app)" class="cursor-pointer">
                <!-- Doctor Name & Contact -->
                <td>
                  <div class="doctor-profile-cell">
                    <div class="doc-avatar">
                      {{ getInitials(app.name) }}
                    </div>
                    <div class="doc-details">
                      <div class="doc-name">{{ app.name }}</div>
                      <div class="doc-email">{{ app.email }}</div>
                      <div *ngIf="app.phone" class="doc-phone">{{ app.phone }}</div>
                    </div>
                  </div>
                </td>

                <!-- Specialization & Qualifications -->
                <td>
                  <div class="spec-cell">
                    <span class="spec-pill">{{ app.specialization }}</span>
                    <div *ngIf="app.qualifications && app.qualifications.length > 0" class="qual-text">
                      {{ formatQualifications(app.qualifications) }}
                    </div>
                    <div *ngIf="app.bio" class="bio-text" [title]="app.bio">
                      {{ truncate(app.bio, 70) }}
                    </div>
                  </div>
                </td>

                <!-- Experience & Fee -->
                <td>
                  <div class="meta-cell">
                    <div class="exp-badge">
                      <mat-icon>work_history</mat-icon>
                      <span>{{ app.yearsExperience || 0 }} yrs exp</span>
                    </div>
                    <div class="fee-badge">
                      <strong>₹{{ app.consultationFee }}</strong>
                      <span class="text-xs text-neutral-500">/ consult</span>
                    </div>
                  </div>
                </td>

                <!-- Medical License Document -->
                <td (click)="$event.stopPropagation()">
                  <div *ngIf="app.licenseDocumentUrl" class="doc-link-wrap">
                    <button
                      mat-stroked-button
                      color="primary"
                      class="doc-btn"
                      (click)="openDocument(app)"
                    >
                      <mat-icon>description</mat-icon>
                      <span>View License</span>
                    </button>
                  </div>
                  <div *ngIf="!app.licenseDocumentUrl" class="no-doc text-xs text-neutral-400">
                    Not uploaded
                  </div>
                </td>

                <!-- Negotiation Meet Status -->
                <td>
                  <div *ngIf="app.interviewMeeting?.meetingDate" class="meet-status-cell">
                    <span class="meet-pill scheduled">
                      <mat-icon class="meet-pill-ic">videocam</mat-icon>
                      <span>{{ app.interviewMeeting?.meetingDate | portalDate:'dd MMM' }} • {{ app.interviewMeeting?.meetingTime }}</span>
                    </span>
                  </div>
                  <div *ngIf="!app.interviewMeeting?.meetingDate" class="meet-status-cell">
                    <span class="meet-pill not-scheduled">
                      <span>Not scheduled</span>
                    </span>
                  </div>
                </td>

                <!-- Applied Date -->
                <td>
                  <div class="date-cell">
                    <span class="date-val">{{ app.createdAt | portalDate:'dd MMM yyyy' }}</span>
                  </div>
                </td>

                <!-- Status Badge -->
                <td>
                  <app-status-badge [status]="app.status"></app-status-badge>
                </td>

                <!-- Verification Actions -->
                <td class="text-right actions-cell" (click)="$event.stopPropagation()">
                  <!-- Pending actions -->
                  <div *ngIf="app.status === 'pending'" class="action-buttons">
                    <button
                      mat-flat-button
                      color="primary"
                      class="review-action-btn"
                      (click)="openReviewModal(app)"
                      title="Review credentials and schedule negotiation meeting"
                    >
                      <mat-icon>handshake</mat-icon>
                      <span>Review & Meet</span>
                    </button>
                    <button
                      mat-stroked-button
                      class="reject-btn"
                      [disabled]="processingId === app._id"
                      (click)="openRejectModal(app)"
                      title="Reject this application"
                    >
                      <mat-icon>cancel</mat-icon>
                      <span>Reject</span>
                    </button>
                  </div>

                  <!-- Already approved -->
                  <div *ngIf="app.status === 'approved'" class="text-emerald-700 text-xs font-semibold flex items-center justify-end gap-1">
                    <mat-icon class="status-ic approved-ic">verified</mat-icon>
                    <span>Affiliated</span>
                  </div>

                  <!-- Already rejected -->
                  <div *ngIf="app.status === 'rejected'" class="text-rose-600 text-xs font-semibold flex items-center justify-end gap-1">
                    <mat-icon class="status-ic rejected-ic">block</mat-icon>
                    <span>Rejected</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>
    </div>

    <!-- Doctor Application Review, Negotiation & Professional Email Modal -->
    <div *ngIf="selectedAppForReview" class="modal-backdrop" (click)="selectedAppForReview = null">
      <div class="review-modal-card" (click)="$event.stopPropagation()">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="modal-title-wrap">
            <mat-icon class="text-teal-700">medical_services</mat-icon>
            <div>
              <h3>Physician Affiliation Application & Meeting</h3>
              <p>Review credentials, schedule online negotiation meeting via email, and finalize clinic onboarding.</p>
            </div>
          </div>
          <button mat-icon-button (click)="selectedAppForReview = null" class="close-btn">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="modal-body-scroll">
          <!-- Hero Doctor Identity Banner -->
          <div class="doc-hero-banner">
            <div class="doc-avatar-lg">
              {{ getInitials(selectedAppForReview.name) }}
            </div>
            <div class="doc-hero-meta">
              <div class="doc-name-row">
                <h2 class="doc-name-title">{{ selectedAppForReview.name }}</h2>
                <app-status-badge [status]="selectedAppForReview.status"></app-status-badge>
              </div>
              <div class="doc-spec-line">
                <mat-icon class="spec-ic">health_and_safety</mat-icon>
                <span>{{ selectedAppForReview.specialization }}</span>
                <span class="dot-sep" *ngIf="formatQualifications(selectedAppForReview.qualifications)">•</span>
                <span *ngIf="formatQualifications(selectedAppForReview.qualifications)">{{ formatQualifications(selectedAppForReview.qualifications) }}</span>
              </div>
              <div class="doc-sub-line">
                <span>Applied: {{ selectedAppForReview.createdAt | portalDate:'dd MMM yyyy, h:mm a' }}</span>
                <span class="dot-sep">•</span>
                <span>{{ selectedAppForReview.email }}</span>
                <span class="dot-sep" *ngIf="selectedAppForReview.phone">•</span>
                <span *ngIf="selectedAppForReview.phone">{{ selectedAppForReview.phone }}</span>
              </div>
            </div>
          </div>

          <!-- Doctor Credentials Grid -->
          <div class="creds-grid">
            <div class="cred-card">
              <span class="cred-lbl">Clinical Experience</span>
              <span class="cred-val">{{ selectedAppForReview.yearsExperience || 0 }} Years</span>
              <span class="cred-sub">Active medical practice</span>
            </div>
            <div class="cred-card">
              <span class="cred-lbl">Proposed Consultation Fee</span>
              <span class="cred-val text-teal-800">₹{{ selectedAppForReview.consultationFee }}</span>
              <span class="cred-sub">Per patient visit</span>
            </div>
            <div class="cred-card">
              <span class="cred-lbl">Medical Registration No.</span>
              <span class="cred-val font-mono">{{ selectedAppForReview.licenseNumber || 'Not provided' }}</span>
              <span class="cred-sub">State / National council</span>
            </div>
            <div class="cred-card">
              <span class="cred-lbl">Credential Certificate</span>
              <div *ngIf="selectedAppForReview.licenseDocumentUrl" class="mt-1">
                <button mat-stroked-button color="primary" class="btn-xs" (click)="openDocument(selectedAppForReview)">
                  <mat-icon>open_in_new</mat-icon>
                  <span>View Certificate</span>
                </button>
              </div>
              <span *ngIf="!selectedAppForReview.licenseDocumentUrl" class="cred-val text-neutral-400">Not uploaded</span>
            </div>
          </div>

          <!-- Scope of Practice & Bio -->
          <div class="bio-box" *ngIf="selectedAppForReview.bio">
            <div class="bio-title">Professional Biography & Scope of Practice</div>
            <p class="bio-content">{{ selectedAppForReview.bio }}</p>
          </div>

          <!-- Negotiation Meeting & Email Section -->
          <div class="negotiation-card">
            <div class="negotiation-header">
              <div class="flex items-center gap-2">
                <mat-icon class="text-teal-700">videocam</mat-icon>
                <div>
                  <h4 class="neg-title">Online Negotiation Meeting & Email Invitation</h4>
                  <p class="neg-desc">Select meeting date and time for clinic negotiation. A professional invitation email with video link is prepared below.</p>
                </div>
              </div>
              <span *ngIf="selectedAppForReview.interviewMeeting?.meetingDate" class="neg-status-pill scheduled">
                <mat-icon>check_circle</mat-icon>
                <span>Invitation Sent</span>
              </span>
              <span *ngIf="!selectedAppForReview.interviewMeeting?.meetingDate" class="neg-status-pill pending">
                <mat-icon>schedule</mat-icon>
                <span>Not Sent Yet</span>
              </span>
            </div>

            <!-- If already scheduled banner -->
            <div *ngIf="selectedAppForReview.interviewMeeting?.meetingDate" class="meet-info-banner">
              <mat-icon class="text-teal-700">event_available</mat-icon>
              <div>
                <strong>Scheduled:</strong> {{ selectedAppForReview.interviewMeeting?.meetingDate | portalDate:'fullDate' }} at {{ selectedAppForReview.interviewMeeting?.meetingTime }} IST
                <span class="text-neutral-500"> • Sent to {{ selectedAppForReview.email }}</span>
                <div class="text-xs mt-1">
                  <strong>Meeting URL:</strong> <a [href]="selectedAppForReview.interviewMeeting?.meetingLink" target="_blank" class="text-teal-700 underline">{{ selectedAppForReview.interviewMeeting?.meetingLink }}</a>
                </div>
              </div>
            </div>

            <!-- Date & Time Picker Form -->
            <div class="meet-inputs-grid">
              <div class="form-group">
                <label class="form-label">Meeting Date *</label>
                <input
                  type="date"
                  [(ngModel)]="meetingForm.date"
                  [min]="todayDate"
                  class="meet-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Meeting Time *</label>
                <input
                  type="time"
                  [(ngModel)]="meetingForm.time"
                  class="meet-input"
                />
              </div>

              <div class="form-group span-2">
                <label class="form-label">Video Meeting URL (Google Meet / Video Link)</label>
                <input
                  type="url"
                  [(ngModel)]="meetingForm.link"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  class="meet-input"
                />
              </div>

              <div class="form-group span-2">
                <label class="form-label">Discussion Agenda</label>
                <input
                  type="text"
                  [(ngModel)]="meetingForm.agenda"
                  placeholder="Clinic Affiliation, practice timings, and consultation fee structure"
                  class="meet-input"
                />
              </div>

              <div class="form-group span-2">
                <label class="form-label">Additional Instructions / Notes (Optional)</label>
                <textarea
                  rows="2"
                  [(ngModel)]="meetingForm.notes"
                  placeholder="e.g. Please keep your Medical Council registration certificate handy..."
                  class="meet-input textarea"
                ></textarea>
              </div>
            </div>

            <!-- Professional Email Template Preview -->
            <div class="email-preview-box">
              <div class="email-preview-header">
                <div class="email-meta-line">
                  <span class="meta-label">To:</span>
                  <span class="meta-val font-semibold">{{ selectedAppForReview.name }} &lt;{{ selectedAppForReview.email }}&gt;</span>
                </div>
                <div class="email-meta-line">
                  <span class="meta-label">From:</span>
                  <span class="meta-val">{{ clinicProfile?.name || 'Clinic Administration' }} &lt;via Docyra Healthcare&gt;</span>
                </div>
                <div class="email-meta-line">
                  <span class="meta-label">Subject:</span>
                  <span class="meta-val font-bold text-teal-900">
                    Invitation: Online Affiliation Meeting with {{ clinicProfile?.name || 'our clinic' }}
                  </span>
                </div>
              </div>

              <div class="email-preview-body">
                <p>Dear <strong>{{ selectedAppForReview.name }}</strong>,</p>
                <p>
                  Thank you for applying to practice at <strong>{{ clinicProfile?.name || 'our clinic' }}</strong> as a {{ selectedAppForReview.specialization }} specialist.
                  Our clinical administration has reviewed your application and credentials.
                </p>
                <p>
                  We would like to invite you to an online negotiation discussion to discuss our clinic affiliation terms, practice timings, consultation schedules, and fee arrangements.
                </p>

                <div class="email-details-card">
                  <div class="email-details-title">Scheduled Discussion Details</div>
                  <div class="email-detail-row">
                    <span class="ed-lbl">Date:</span>
                    <span class="ed-val font-bold">{{ formatPreviewDate(meetingForm.date) }}</span>
                  </div>
                  <div class="email-detail-row">
                    <span class="ed-lbl">Time:</span>
                    <span class="ed-val font-bold">{{ meetingForm.time || '11:00' }} (IST)</span>
                  </div>
                  <div class="email-detail-row">
                    <span class="ed-lbl">Agenda:</span>
                    <span class="ed-val">{{ meetingForm.agenda || 'Clinic Affiliation & Fee Discussion' }}</span>
                  </div>
                  <div class="email-cta-row">
                    <span class="email-btn-preview">Join Online Video Meeting</span>
                  </div>
                  <div class="email-link-text">Meeting URL: {{ meetingForm.link || 'https://meet.google.com/new' }}</div>
                </div>

                <p class="email-closing-note">
                  If you have any questions or require an alternate time, please reply directly to this communication.
                </p>
                <p class="email-signature">
                  Warm regards,<br />
                  <strong>{{ clinicProfile?.name || 'Clinic Administration' }}</strong><br />
                  <span class="text-xs text-neutral-500">Docyra Healthcare Platform</span>
                </p>
              </div>

              <div class="email-send-bar">
                <button
                  mat-flat-button
                  color="primary"
                  class="send-invite-btn"
                  [disabled]="sendingEmail || !meetingForm.date || !meetingForm.time"
                  (click)="sendMeetingEmail()"
                >
                  <mat-spinner *ngIf="sendingEmail" diameter="18" class="mr-2"></mat-spinner>
                  <mat-icon *ngIf="!sendingEmail">send</mat-icon>
                  <span>{{ sendingEmail ? 'Sending Invitation...' : (selectedAppForReview.interviewMeeting?.meetingDate ? 'Update & Re-send Invitation Email' : 'Send Meeting Invitation Email') }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Final Decision Panel (Approve / Reject) -->
          <div class="decision-panel">
            <div class="decision-desc">
              <strong>Final Affiliation Decision:</strong> After completing the negotiation meeting with the doctor, finalize your onboarding decision below.
            </div>
            <div class="decision-btns">
              <button
                *ngIf="selectedAppForReview.status !== 'approved'"
                mat-flat-button
                class="approve-decision-btn"
                [disabled]="processingId === selectedAppForReview._id"
                (click)="approve(selectedAppForReview)"
              >
                <mat-icon>check_circle</mat-icon>
                <span>Approve & Onboard Physician</span>
              </button>
              <button
                *ngIf="selectedAppForReview.status !== 'rejected'"
                mat-stroked-button
                color="warn"
                class="reject-decision-btn"
                [disabled]="processingId === selectedAppForReview._id"
                (click)="openRejectModal(selectedAppForReview)"
              >
                <mat-icon>cancel</mat-icon>
                <span>Reject Application</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <button mat-button (click)="selectedAppForReview = null">Close</button>
        </div>
      </div>
    </div>

    <!-- License Document Viewer Modal -->
    <div *ngIf="selectedAppDoc" class="modal-backdrop" (click)="selectedAppDoc = null">
      <div class="doc-modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <mat-icon class="text-brand-primary">description</mat-icon>
            <div>
              <h3>Medical License & Credentials</h3>
              <p>{{ selectedAppDoc.name }} ({{ selectedAppDoc.specialization }})</p>
            </div>
          </div>
          <div class="modal-actions-top">
            <a [href]="getDocumentFullUrl(selectedAppDoc.licenseDocumentUrl)" target="_blank" rel="noopener noreferrer" mat-stroked-button class="open-tab-btn">
              <mat-icon>open_in_new</mat-icon>
              <span>Open in New Tab</span>
            </a>
            <button mat-icon-button (click)="selectedAppDoc = null">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <div class="modal-body-doc">
          <ng-container *ngIf="isImageDocument(selectedAppDoc.licenseDocumentUrl); else pdfViewer">
            <img [src]="getDocumentFullUrl(selectedAppDoc.licenseDocumentUrl)" alt="License Certificate" class="doc-image-preview" />
          </ng-container>
          <ng-template #pdfViewer>
            <iframe [src]="getDocumentFullUrl(selectedAppDoc.licenseDocumentUrl)" class="doc-iframe" title="Medical Registration Certificate"></iframe>
          </ng-template>
        </div>

        <div class="modal-footer">
          <button mat-button (click)="selectedAppDoc = null">Close Preview</button>
          <div *ngIf="selectedAppDoc.status === 'pending'" class="flex gap-2">
            <button mat-stroked-button color="warn" (click)="openRejectModal(selectedAppDoc); selectedAppDoc = null">
              Reject
            </button>
            <button mat-flat-button class="approve-btn" (click)="approve(selectedAppDoc); selectedAppDoc = null">
              Approve Doctor
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rejection Reason Modal -->
    <div *ngIf="appToReject" class="modal-backdrop" (click)="appToReject = null">
      <div class="reject-modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <mat-icon class="text-rose-600">report_problem</mat-icon>
            <h3>Reject Doctor Application</h3>
          </div>
          <button mat-icon-button (click)="appToReject = null">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="reject-body">
          <p class="reject-desc">
            You are rejecting the affiliation application for <strong>{{ appToReject.name }}</strong>. Please provide a clear reason for your clinic's records.
          </p>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Rejection Reason</mat-label>
            <textarea
              matInput
              rows="3"
              [(ngModel)]="rejectionReason"
              placeholder="e.g. Incomplete credentials, specialization capacity full, or invalid license certificate"
            ></textarea>
          </mat-form-field>
        </div>

        <div class="modal-footer">
          <button mat-button (click)="appToReject = null">Cancel</button>
          <button
            mat-flat-button
            color="warn"
            [disabled]="processingId === appToReject._id"
            (click)="confirmReject()"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .doctor-applications-page {
      padding: 0;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .clinic-scope-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: #E8F5F1;
      color: #0F5C5C;
      border: 1px solid #C2E5DC;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      margin-bottom: 8px;
    }

    .clinic-scope-badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .page-title {
      font-size: 26px;
      font-weight: 900;
      color: #1A2E2E;
      margin: 0 0 6px 0;
      letter-spacing: -0.5px;
    }

    .page-subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
      max-width: 680px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .manage-docs-btn {
      color: #0F5C5C !important;
      border-color: #0F5C5C !important;
      font-weight: 700 !important;
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
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: #0F5C5C;
    }

    .kpi-card.active-card {
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
    .kpi-icon-wrap.pending { background: #FEF3C7; color: #D97706; }
    .kpi-icon-wrap.approved { background: #D1FAE5; color: #059669; }
    .kpi-icon-wrap.rejected { background: #FEE2E2; color: #DC2626; }
    .kpi-icon-wrap.roster { background: #E0F2FE; color: #0284C7; }

    .roster-link-text {
      font-size: 13px;
      font-weight: 700;
      color: #0284C7;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }

    .inline-arrow {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

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

    /* Main Table Card */
    .table-card {
      border-radius: 16px !important;
      border: 1px solid #E5E7EB;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
      overflow: hidden;
      background: #FFFFFF;
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
      max-width: 420px;
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
      font-size: 13px;
    }

    .empty-state {
      padding: 60px 20px;
      text-align: center;
      max-width: 480px;
      margin: 0 auto;
    }

    .empty-icon-box {
      width: 56px;
      height: 56px;
      background: #E8F5F1;
      color: #0F5C5C;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .empty-icon-box mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .empty-state h3 {
      font-size: 17px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 6px;
    }

    .empty-state p {
      font-size: 13px;
      color: #5C6B6B;
      line-height: 1.5;
      margin: 0;
    }

    /* Table Styles */
    .table-container {
      overflow-x: auto;
    }

    .apps-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    .apps-table th {
      background: #F9FAFB;
      color: #4B5563;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 12px 18px;
      border-bottom: 1px solid #E5E7EB;
    }

    .apps-table td {
      padding: 14px 18px;
      border-bottom: 1px solid #F3F4F6;
      vertical-align: middle;
      color: #1F2937;
    }

    .apps-table tr:hover {
      background-color: #FAFAF8;
    }

    .highlight-pending {
      background-color: #FFFDF7;
    }

    .doctor-profile-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .doc-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #0F5C5C;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
      flex-shrink: 0;
    }

    .doc-name {
      font-weight: 800;
      color: #111827;
      font-size: 13.5px;
    }

    .doc-email {
      font-size: 11.5px;
      color: #6B7280;
    }

    .doc-phone {
      font-size: 11px;
      color: #9CA3AF;
    }

    .spec-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .spec-pill {
      display: inline-block;
      align-self: flex-start;
      padding: 3px 8px;
      border-radius: 999px;
      background: #EEF2F6;
      color: #1E3A8A;
      font-size: 11px;
      font-weight: 700;
    }

    .qual-text {
      font-size: 11.5px;
      font-weight: 600;
      color: #374151;
    }

    .bio-text {
      font-size: 11px;
      color: #6B7280;
      font-style: italic;
    }

    .meta-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .exp-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: #4B5563;
      font-weight: 600;
    }

    .exp-badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #9CA3AF;
    }

    .fee-badge {
      font-size: 12.5px;
      color: #0F5C5C;
    }

    .doc-btn {
      font-size: 11px !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 10px !important;
      border-radius: 8px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    .doc-btn mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }

    .date-cell {
      font-size: 11.5px;
      color: #6B7280;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .approve-btn {
      background-color: #059669 !important;
      color: #FFFFFF !important;
      font-size: 11.5px !important;
      font-weight: 700 !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 12px !important;
      border-radius: 8px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    .approve-btn mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }

    .reject-btn {
      color: #DC2626 !important;
      border-color: #FCA5A5 !important;
      font-size: 11.5px !important;
      font-weight: 700 !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 10px !important;
      border-radius: 8px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    .reject-btn mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }

    .status-ic {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .approved-ic { color: #059669; }
    .rejected-ic { color: #DC2626; }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .doc-modal-content {
      background: #FFFFFF;
      border-radius: 16px;
      width: 850px;
      max-width: 95vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }

    .reject-modal-content {
      background: #FFFFFF;
      border-radius: 16px;
      width: 500px;
      max-width: 95vw;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .modal-title-wrap h3 {
      font-size: 16px;
      font-weight: 800;
      color: #111827;
      margin: 0;
    }

    .modal-title-wrap p {
      font-size: 12px;
      color: #6B7280;
      margin: 2px 0 0;
    }

    .modal-actions-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-body-doc {
      padding: 16px;
      flex: 1;
      overflow-y: auto;
      min-height: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F3F4F6;
    }

    .doc-image-preview {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .doc-iframe {
      width: 100%;
      height: 70vh;
      border: none;
      border-radius: 8px;
      background: #FFFFFF;
    }

    .reject-body {
      padding: 20px;
    }

    .reject-desc {
      font-size: 13px;
      color: #4B5563;
      line-height: 1.5;
      margin: 0 0 16px;
    }

    .modal-footer {
      padding: 12px 20px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #F9FAFB;
    }

    /* Negotiation Meet Status Pill */
    .meet-status-cell {
      display: inline-flex;
      align-items: center;
    }

    .meet-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }

    .meet-pill.scheduled {
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }

    .meet-pill.not-scheduled {
      background: #F3F4F6;
      color: #6B7280;
      border: 1px solid #E5E7EB;
    }

    .meet-pill-ic {
      font-size: 13px !important;
      width: 13px !important;
      height: 13px !important;
    }

    .review-action-btn {
      background-color: #0F5C54 !important;
      color: #FFFFFF !important;
      font-size: 11.5px !important;
      font-weight: 700 !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 10px !important;
      border-radius: 8px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    .review-action-btn mat-icon {
      font-size: 15px !important;
      width: 15px !important;
      height: 15px !important;
    }

    /* Comprehensive Review & Negotiation Modal Card */
    .review-modal-card {
      background: #FFFFFF;
      border-radius: 16px;
      width: 880px;
      max-width: 95vw;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }

    .modal-body-scroll {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .doc-hero-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #F0FDFA;
      border: 1px solid #CCFBF1;
      border-radius: 12px;
    }

    .doc-avatar-lg {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #0F5C54;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .doc-hero-meta {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .doc-name-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .doc-name-title {
      font-size: 18px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .doc-spec-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #0F5C54;
    }

    .doc-spec-line mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .doc-sub-line {
      font-size: 11.5px;
      color: #6B7280;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .creds-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    @media (max-width: 768px) {
      .creds-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .cred-card {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .cred-lbl {
      font-size: 11px;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .cred-val {
      font-size: 15px;
      font-weight: 800;
      color: #111827;
    }

    .cred-sub {
      font-size: 10.5px;
      color: #9CA3AF;
    }

    .btn-xs {
      font-size: 11px !important;
      height: 26px !important;
      line-height: 26px !important;
      padding: 0 8px !important;
    }

    .btn-xs mat-icon {
      font-size: 12px !important;
      width: 12px !important;
      height: 12px !important;
    }

    .bio-box {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 10px;
      padding: 12px 16px;
    }

    .bio-title {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #4B5563;
      margin-bottom: 4px;
    }

    .bio-content {
      font-size: 12.5px;
      color: #374151;
      line-height: 1.5;
      margin: 0;
    }

    /* Negotiation Meeting Section */
    .negotiation-card {
      background: #FFFFFF;
      border: 1px solid #B8E4DA;
      border-radius: 12px;
      padding: 18px;
      box-shadow: 0 2px 8px rgba(15, 92, 84, 0.04);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .negotiation-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 12px;
    }

    .neg-title {
      font-size: 14px;
      font-weight: 800;
      color: #0F5C54;
      margin: 0;
    }

    .neg-desc {
      font-size: 12px;
      color: #6B7280;
      margin: 2px 0 0;
    }

    .neg-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }

    .neg-status-pill.scheduled {
      background: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }

    .neg-status-pill.pending {
      background: #FFFBEB;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    .neg-status-pill mat-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }

    .meet-info-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #F0FDFA;
      border: 1px solid #99F6E4;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      color: #115E59;
    }

    .meet-inputs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .span-2 {
      grid-column: span 2;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #374151;
    }

    .meet-input {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid #D1D5DB;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    .meet-input:focus {
      border-color: #0F5C54;
      box-shadow: 0 0 0 3px rgba(15, 92, 84, 0.1);
    }

    .meet-input.textarea {
      resize: vertical;
      font-family: inherit;
    }

    /* Professional Email Template Box */
    .email-preview-box {
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      overflow: hidden;
      background: #F9FAFB;
      margin-top: 4px;
    }

    .email-preview-header {
      background: #F3F4F6;
      padding: 10px 14px;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
    }

    .email-meta-line {
      display: flex;
      gap: 6px;
    }

    .meta-label {
      color: #6B7280;
      width: 52px;
      font-weight: 600;
    }

    .meta-val {
      color: #111827;
    }

    .email-preview-body {
      padding: 16px 18px;
      background: #FFFFFF;
      font-size: 13px;
      line-height: 1.6;
      color: #1F2937;
    }

    .email-preview-body p {
      margin: 0 0 10px;
    }

    .email-details-card {
      background: #F0FDFA;
      border: 1px solid #99F6E4;
      border-radius: 8px;
      padding: 14px;
      margin: 12px 0;
    }

    .email-details-title {
      font-size: 11.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0F5C54;
      margin-bottom: 8px;
    }

    .email-detail-row {
      display: flex;
      gap: 8px;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .ed-lbl {
      color: #6B7280;
      width: 70px;
      font-weight: 600;
    }

    .ed-val {
      color: #111827;
    }

    .email-cta-row {
      margin-top: 12px;
      text-align: center;
    }

    .email-btn-preview {
      display: inline-block;
      background-color: #0F5C54;
      color: #FFFFFF;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12.5px;
      text-decoration: none;
    }

    .email-link-text {
      font-size: 11px;
      color: #6B7280;
      text-align: center;
      margin-top: 6px;
    }

    .email-closing-note {
      font-size: 12px;
      color: #6B7280;
      margin-top: 10px !important;
    }

    .email-signature {
      font-size: 12.5px;
      margin-top: 12px !important;
      border-top: 1px dashed #E5E7EB;
      padding-top: 10px;
    }

    .email-send-bar {
      padding: 12px 18px;
      background: #F9FAFB;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: flex-end;
    }

    .send-invite-btn {
      background-color: #0F5C54 !important;
      color: #FFFFFF !important;
      font-weight: 700 !important;
      height: 38px !important;
      padding: 0 18px !important;
      border-radius: 8px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
    }

    /* Decision Panel (Post-Meeting) */
    .decision-panel {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .decision-desc {
      font-size: 12.5px;
      color: #4B5563;
      flex: 1;
      min-width: 240px;
    }

    .decision-btns {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .approve-decision-btn {
      background-color: #059669 !important;
      color: #FFFFFF !important;
      font-weight: 700 !important;
      height: 38px !important;
      padding: 0 16px !important;
      border-radius: 8px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
    }

    .reject-decision-btn {
      font-weight: 700 !important;
      height: 38px !important;
      padding: 0 14px !important;
      border-radius: 8px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
    }
  `],
})
export class ClinicDoctorApplicationsComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  loading = true;
  applications: ClinicDoctorApp[] = [];
  filteredApplications: ClinicDoctorApp[] = [];
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';
  searchQuery = '';

  selectedAppDoc: ClinicDoctorApp | null = null;
  selectedAppForReview: ClinicDoctorApp | null = null;
  appToReject: ClinicDoctorApp | null = null;
  rejectionReason = '';
  processingId: string | null = null;
  sendingEmail = false;
  clinicProfile: any = null;
  todayDate: string = new Date().toISOString().split('T')[0];

  meetingForm = {
    date: '',
    time: '11:00',
    link: 'https://meet.google.com/new',
    agenda: 'Clinic Affiliation, practice timings, and consultation fee structure',
    notes: '',
  };

  ngOnInit(): void {
    this.loadClinicProfile();
    this.loadApplications();
  }

  loadClinicProfile(): void {
    this.clinicService.getMyClinicProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.clinicProfile = res.data;
        }
      },
    });
  }

  loadApplications(): void {
    this.loading = true;
    this.clinicService.getDoctorApplications({ status: this.statusFilter }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && Array.isArray(res.data)) {
          this.applications = res.data;
          this.applyFilter();
        } else {
          this.applications = [];
          this.filteredApplications = [];
        }
      },
      error: (err) => {
        this.loading = false;
        this.applications = [];
        this.filteredApplications = [];
        this.notificationService.error(
          err.error?.message || 'Failed to load clinic doctor applications'
        );
      },
    });
  }

  setStatusFilter(filter: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.statusFilter = filter;
    this.loadApplications();
  }

  navigateToManageDoctors(): void {
    this.router.navigate(['/clinic/doctors']);
  }

  applyFilter(): void {
    let result = [...this.applications];

    if (this.statusFilter !== 'all') {
      result = result.filter((app) => app.status === this.statusFilter);
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(
        (app) =>
          app.name?.toLowerCase().includes(q) ||
          app.email?.toLowerCase().includes(q) ||
          app.specialization?.toLowerCase().includes(q)
      );
    }

    this.filteredApplications = result;
  }

  countPending(): number {
    return this.applications.filter((a) => a.status === 'pending').length;
  }

  countApproved(): number {
    return this.applications.filter((a) => a.status === 'approved').length;
  }

  countRejected(): number {
    return this.applications.filter((a) => a.status === 'rejected').length;
  }

  getInitials(name?: string): string {
    if (!name) return 'DR';
    const parts = name.replace(/^Dr\.\s*/i, '').trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || 'D').toUpperCase();
  }

  formatQualifications(quals?: string[] | string): string {
    if (!quals) return '';
    if (Array.isArray(quals)) return quals.join(', ');
    return quals;
  }

  truncate(str: string, len: number): string {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  openDocument(app: ClinicDoctorApp): void {
    this.selectedAppDoc = app;
  }

  isImageDocument(url?: string): boolean {
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  }

  getDocumentFullUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${environment.apiBaseUrl.replace('/api/v1', '')}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  approve(app: ClinicDoctorApp): void {
    if (!confirm(`Are you sure you want to approve ${app.name} to join your clinic?`)) {
      return;
    }

    this.processingId = app._id;
    this.clinicService.reviewDoctorApplication(app._id, true).subscribe({
      next: (res) => {
        this.processingId = null;
        this.notificationService.success(`${app.name} has been approved and moved to Manage Doctors.`);
        // Immediately remove approved doctor from the applications queue
        this.applications = this.applications.filter((a) => a._id !== app._id);
        if (this.selectedAppForReview && this.selectedAppForReview._id === app._id) {
          this.selectedAppForReview = null;
        }
        this.applyFilter();
      },
      error: (err) => {
        this.processingId = null;
        this.notificationService.error(
          err.error?.message || 'Failed to approve doctor application'
        );
      },
    });
  }

  openRejectModal(app: ClinicDoctorApp): void {
    this.appToReject = app;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.appToReject) return;

    const targetApp = this.appToReject;
    this.processingId = targetApp._id;

    this.clinicService
      .reviewDoctorApplication(targetApp._id, false, this.rejectionReason || 'Application rejected by clinic administration')
      .subscribe({
        next: (res) => {
          this.processingId = null;
          this.notificationService.success(`Application for ${targetApp.name} has been rejected.`);
          targetApp.status = 'rejected';
          targetApp.isApproved = false;
          if (this.selectedAppForReview && this.selectedAppForReview._id === targetApp._id) {
            this.selectedAppForReview.status = 'rejected';
            this.selectedAppForReview.isApproved = false;
          }
          this.appToReject = null;
          this.applyFilter();
        },
        error: (err) => {
          this.processingId = null;
          this.notificationService.error(
            err.error?.message || 'Failed to reject doctor application'
          );
        },
      });
  }

  openReviewModal(app: ClinicDoctorApp): void {
    this.selectedAppForReview = { ...app };
    if (app.interviewMeeting) {
      this.meetingForm = {
        date: app.interviewMeeting.meetingDate || this.getDefaultMeetingDate(),
        time: app.interviewMeeting.meetingTime || '11:00',
        link: app.interviewMeeting.meetingLink || 'https://meet.google.com/new',
        agenda: app.interviewMeeting.agenda || 'Clinic Affiliation, practice timings, and consultation fee structure',
        notes: app.interviewMeeting.notes || '',
      };
    } else {
      this.meetingForm = {
        date: this.getDefaultMeetingDate(),
        time: '11:00',
        link: 'https://meet.google.com/new',
        agenda: 'Clinic Affiliation, practice timings, and consultation fee structure',
        notes: '',
      };
    }
  }

  sendMeetingEmail(): void {
    if (!this.selectedAppForReview) return;
    if (!this.meetingForm.date || !this.meetingForm.time) {
      this.notificationService.error('Please select both meeting date and time.');
      return;
    }

    this.sendingEmail = true;
    const appId = this.selectedAppForReview._id;
    this.clinicService
      .scheduleDoctorApplicationMeeting(appId, {
        meetingDate: this.meetingForm.date,
        meetingTime: this.meetingForm.time,
        meetingLink: this.meetingForm.link,
        agenda: this.meetingForm.agenda,
        customNotes: this.meetingForm.notes,
      })
      .subscribe({
        next: (res) => {
          this.sendingEmail = false;
          this.notificationService.success(
            `Meeting invitation email successfully sent to ${this.selectedAppForReview?.name} (${this.selectedAppForReview?.email})!`
          );
          if (res.data?.interviewMeeting) {
            this.selectedAppForReview!.interviewMeeting = res.data.interviewMeeting;
            const found = this.applications.find((a) => a._id === appId);
            if (found) {
              found.interviewMeeting = res.data.interviewMeeting;
            }
          }
        },
        error: (err) => {
          this.sendingEmail = false;
          this.notificationService.error(
            err.error?.message || 'Failed to send meeting invitation email.'
          );
        },
      });
  }

  getDefaultMeetingDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  formatPreviewDate(dateStr: string): string {
    if (!dateStr) return 'Select Date';
    try {
      const [y, m, d] = dateStr.split('-');
      const dObj = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'full',
        timeZone: 'Asia/Kolkata',
      }).format(dObj);
    } catch {
      return dateStr;
    }
  }

  getDoctorLastName(name?: string): string {
    if (!name) return 'Practitioner';
    const clean = name.replace(/^dr\.?\s+/i, '').trim();
    const parts = clean.split(' ');
    return parts[parts.length - 1] || clean;
  }
}
