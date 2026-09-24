import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DoctorApplication } from '../../../core/models/doctor.model';
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
  selector: 'app-doctor-applications',
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
  ],
  template: `
    <div class="doctor-applications-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Independent Doctor Applications & Verification</h1>
          <p class="page-subtitle">Review medical licenses and qualifications for independent doctors applying to practice on Docyra.</p>
        </div>
      </div>

      <!-- Applications List Card -->
      <mat-card class="table-card">
        <div class="filter-bar">
          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Filter by Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilter()">
                <mat-option value="all">All Applications</mat-option>
                <mat-option value="pending">Pending Review</mat-option>
                <mat-option value="approved">Approved</mat-option>
                <mat-option value="rejected">Rejected</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
        </div>

        <div *ngIf="!loading && filteredApplications.length === 0" class="empty-state">
          <mat-icon class="empty-icon">verified</mat-icon>
          <h3>No applications found</h3>
          <p>No independent doctor applications match the selected status.</p>
        </div>

        <div *ngIf="!loading && filteredApplications.length > 0" class="table-container">
          <table class="apps-table">
            <thead>
              <tr>
                <th>Applicant Doctor</th>
                <th>License Number</th>
                <th>License Document</th>
                <th>Applied Date</th>
                <th>Status</th>
                <th class="text-right">Verification Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let app of filteredApplications">
                <td>
                  <div class="font-bold text-neutral-900 text-sm">
                    {{ app.user?.name || 'Doctor Applicant' }}
                  </div>
                  <div class="text-xs text-neutral-500">{{ app.user?.email }}</div>
                </td>

                <td>
                  <code class="license-code">{{ app.licenseNumber }}</code>
                </td>

                <td>
                  <button mat-stroked-button color="primary" class="doc-btn" (click)="openDocument(app)">
                    <mat-icon>description</mat-icon>
                    <span>View License PDF</span>
                  </button>
                </td>

                <td class="text-xs font-semibold text-neutral-600">
                  {{ app.appliedAt | portalDate:'dd MMM yyyy' }}
                </td>

                <td>
                  <app-status-badge [status]="app.status"></app-status-badge>
                </td>

                <td class="text-right actions-col">
                  <ng-container *ngIf="app.status === 'pending'">
                    <button mat-flat-button color="primary" (click)="approve(app)" class="btn-sm mr-2" [disabled]="reviewing">
                      Approve
                    </button>
                    <button mat-stroked-button color="warn" (click)="openRejectModal(app)" class="btn-sm" [disabled]="reviewing">
                      Reject
                    </button>
                  </ng-container>
                  <span *ngIf="app.status !== 'pending'" class="text-xs text-neutral-500">
                    Reviewed on {{ app.reviewedAt | portalDate:'dd MMM' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>

      <!-- License Document Preview Modal -->
      <div *ngIf="selectedAppDoc" class="modal-backdrop">
        <div class="doc-modal-card">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Medical License Document Verification</h3>
              <p class="modal-desc">
                Applicant: <strong>{{ selectedAppDoc.user?.name }}</strong> • License: <code>{{ selectedAppDoc.licenseNumber }}</code>
              </p>
            </div>
            <button mat-icon-button (click)="selectedAppDoc = null">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="doc-viewer-frame">
            <div class="doc-placeholder-box">
              <mat-icon class="pdf-icon">picture_as_pdf</mat-icon>
              <h4>Medical Council Registration Certificate</h4>
              <p class="text-xs text-neutral-500">Document URL: {{ selectedAppDoc.licenseDocumentUrl }}</p>
              <div class="mt-4">
                <a [href]="selectedAppDoc.licenseDocumentUrl" target="_blank" mat-flat-button color="primary">
                  <mat-icon>open_in_new</mat-icon>
                  <span>Open Full Document in New Tab</span>
                </a>
              </div>
            </div>
          </div>

          <div class="modal-actions" *ngIf="selectedAppDoc.status === 'pending'">
            <button mat-stroked-button color="warn" (click)="openRejectModal(selectedAppDoc); selectedAppDoc = null">
              Reject Application
            </button>
            <button mat-flat-button color="primary" (click)="approve(selectedAppDoc); selectedAppDoc = null">
              Approve & Activate Doctor
            </button>
          </div>
        </div>
      </div>

      <!-- Rejection Reason Modal -->
      <div *ngIf="showRejectModal" class="modal-backdrop">
        <div class="modal-card">
          <h3 class="modal-title">Reject Doctor Application</h3>
          <p class="modal-desc">
            Please provide a specific reason for rejection (e.g. Unverified license number, expired registration).
          </p>

          <mat-form-field appearance="outline" class="w-full mt-4">
            <mat-label>Rejection Reason</mat-label>
            <textarea
              matInput
              rows="3"
              [(ngModel)]="rejectionReason"
              placeholder="Medical council registration number does not match submitted certificates."
              required
            ></textarea>
          </mat-form-field>

          <div class="modal-actions">
            <button mat-button (click)="showRejectModal = false">Cancel</button>
            <button
              mat-flat-button
              color="warn"
              (click)="confirmReject()"
              [disabled]="!rejectionReason.trim() || reviewing"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .doctor-applications-page {
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

    .table-card {
      padding: 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .filter-bar {
      max-width: 240px;
      margin-bottom: 12px;
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
      color: #2E9E6B;
      margin-bottom: 12px;
    }

    .table-container {
      overflow-x: auto;
    }

    .apps-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .apps-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .apps-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
    }

    .license-code {
      font-size: 12px;
      font-weight: 700;
      color: #0F5C5C;
      background: #E6F2F1;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .doc-btn {
      font-size: 12px !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 10px !important;
    }

    .btn-sm {
      font-size: 12px !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 12px !important;
    }

    .mr-2 {
      margin-right: 8px;
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
      max-width: 480px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .doc-modal-card {
      background: #FFFFFF;
      border-radius: 14px;
      padding: 28px;
      max-width: 700px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
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

    .doc-viewer-frame {
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      padding: 40px;
      background: #FAFAF8;
      text-align: center;
      margin: 16px 0;
    }

    .pdf-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #D9534F;
      margin-bottom: 12px;
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
  `],
})
export class DoctorApplicationsComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);

  applications: DoctorApplication[] = [];
  filteredApplications: DoctorApplication[] = [];
  loading = true;
  statusFilter = 'all';

  selectedAppDoc: DoctorApplication | null = null;
  showRejectModal = false;
  appToReject: DoctorApplication | null = null;
  rejectionReason = '';
  reviewing = false;

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.loading = true;
    this.adminService.getDoctorApplications().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.applications = res.data;
          this.applyFilter();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFilter(): void {
    if (this.statusFilter === 'all') {
      this.filteredApplications = [...this.applications];
    } else {
      this.filteredApplications = this.applications.filter((a) => a.status === this.statusFilter);
    }
  }

  openDocument(app: DoctorApplication): void {
    this.selectedAppDoc = app;
  }

  approve(app: DoctorApplication): void {
    this.reviewing = true;
    this.adminService.reviewDoctorApplication(app._id, 'approved').subscribe({
      next: () => {
        this.reviewing = false;
        this.notificationService.success(`Doctor application for ${app.user?.name || 'Applicant'} approved & activated!`);
        this.loadApplications();
      },
      error: (err) => {
        this.reviewing = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to approve application');
      },
    });
  }

  openRejectModal(app: DoctorApplication): void {
    this.appToReject = app;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.appToReject || !this.rejectionReason.trim()) return;

    this.reviewing = true;
    this.adminService.reviewDoctorApplication(this.appToReject._id, 'rejected', this.rejectionReason).subscribe({
      next: () => {
        this.reviewing = false;
        this.showRejectModal = false;
        this.notificationService.warning('Doctor application rejected');
        this.loadApplications();
      },
      error: (err) => {
        this.reviewing = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to reject application');
      },
    });
  }
}
