import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  licenseDocumentUrl?: string;
  bio?: string;
  status: 'pending' | 'approved' | 'rejected';
  isApproved: boolean;
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
            Review and verify medical credentials of doctors who applied to practice at your clinic facility.
          </p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="loadApplications()" [disabled]="loading" class="refresh-btn">
            <mat-icon [class.spin]="loading">refresh</mat-icon>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card" (click)="setStatusFilter('all')" [class.active-card]="statusFilter === 'all'">
          <div class="kpi-icon-wrap total">
            <mat-icon>assignment</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Total Applications</span>
            <span class="kpi-value">{{ applications.length }}</span>
          </div>
        </div>

        <div class="kpi-card" (click)="setStatusFilter('pending')" [class.active-card]="statusFilter === 'pending'">
          <div class="kpi-icon-wrap pending">
            <mat-icon>hourglass_top</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Pending Verification</span>
            <span class="kpi-value text-amber-600">{{ countPending() }}</span>
          </div>
        </div>

        <div class="kpi-card" (click)="setStatusFilter('approved')" [class.active-card]="statusFilter === 'approved'">
          <div class="kpi-icon-wrap approved">
            <mat-icon>verified</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Approved Doctors</span>
            <span class="kpi-value text-emerald-600">{{ countApproved() }}</span>
          </div>
        </div>

        <div class="kpi-card" (click)="setStatusFilter('rejected')" [class.active-card]="statusFilter === 'rejected'">
          <div class="kpi-icon-wrap rejected">
            <mat-icon>cancel</mat-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Rejected</span>
            <span class="kpi-value text-rose-600">{{ countRejected() }}</span>
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
              class="tab-btn"
              [class.active]="statusFilter === 'all'"
              (click)="setStatusFilter('all')"
            >
              All ({{ applications.length }})
            </button>
            <button
              class="tab-btn pending"
              [class.active]="statusFilter === 'pending'"
              (click)="setStatusFilter('pending')"
            >
              Pending ({{ countPending() }})
            </button>
            <button
              class="tab-btn approved"
              [class.active]="statusFilter === 'approved'"
              (click)="setStatusFilter('approved')"
            >
              Approved ({{ countApproved() }})
            </button>
            <button
              class="tab-btn rejected"
              [class.active]="statusFilter === 'rejected'"
              (click)="setStatusFilter('rejected')"
            >
              Rejected ({{ countRejected() }})
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
                <th>Applied Date</th>
                <th>Status</th>
                <th class="text-right">Clinic Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let app of filteredApplications" [class.highlight-pending]="app.status === 'pending'">
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
                <td>
                  <div *ngIf="app.licenseDocumentUrl" class="doc-link-wrap">
                    <button
                      mat-stroked-button
                      color="primary"
                      class="doc-btn"
                      (click)="openDocument(app)"
                    >
                      <mat-icon>description</mat-icon>
                      <span>View Credential PDF</span>
                    </button>
                  </div>
                  <div *ngIf="!app.licenseDocumentUrl" class="no-doc text-xs text-neutral-400">
                    No document attached
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
                <td class="text-right actions-cell">
                  <!-- Pending actions -->
                  <div *ngIf="app.status === 'pending'" class="action-buttons">
                    <button
                      mat-flat-button
                      class="approve-btn"
                      [disabled]="processingId === app._id"
                      (click)="approve(app)"
                      title="Approve and activate this doctor in your clinic"
                    >
                      <mat-icon>check_circle</mat-icon>
                      <span>Approve</span>
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
  `],
})
export class ClinicDoctorApplicationsComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private notificationService = inject(NotificationService);

  loading = true;
  applications: ClinicDoctorApp[] = [];
  filteredApplications: ClinicDoctorApp[] = [];
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  searchQuery = '';

  selectedAppDoc: ClinicDoctorApp | null = null;
  appToReject: ClinicDoctorApp | null = null;
  rejectionReason = '';
  processingId: string | null = null;

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.loading = true;
    this.clinicService.getDoctorApplications().subscribe({
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
    this.applyFilter();
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

  formatQualifications(quals: string[] | string): string {
    if (Array.isArray(quals)) return quals.join(', ');
    return quals || '';
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
        this.notificationService.success(`${app.name} has been approved and affiliated with your clinic.`);
        app.status = 'approved';
        app.isApproved = true;
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
}
