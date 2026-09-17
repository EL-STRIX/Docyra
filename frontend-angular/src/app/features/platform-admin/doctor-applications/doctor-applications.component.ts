import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-doctor-applications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="applications-page">
      <div class="page-header">
        <div>
          <h2>Independent Doctor Applications</h2>
          <p>Review credentials, license documents, and approve practitioner onboarding</p>
        </div>
      </div>

      <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>

      <div class="portal-card">
        <div *ngIf="loading" class="loading-state">Loading pending applications...</div>

        <div *ngIf="!loading && applications.length === 0" class="empty-state">
          No pending doctor applications awaiting review.
        </div>

        <table *ngIf="!loading && applications.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Doctor Name</th>
              <th>Email</th>
              <th>Specialization</th>
              <th>License Document</th>
              <th>Applied Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let app of applications">
              <td class="font-bold">
                Dr. {{ app.userId?.firstName }} {{ app.userId?.lastName }}
              </td>
              <td>{{ app.userId?.email }}</td>
              <td>{{ app.specializationId?.name || 'General Practitioner' }}</td>
              <td>
                <a *ngIf="app.licenseDocumentUrl" [href]="app.licenseDocumentUrl" target="_blank" class="doc-link">
                  📄 View License Document
                </a>
                <span *ngIf="!app.licenseDocumentUrl" class="text-muted">License Pending</span>
              </td>
              <td>{{ formatDate(app.createdAt) }}</td>
              <td>
                <div class="action-buttons">
                  <button (click)="approve(app._id)" class="btn-approve">✓ Approve</button>
                  <button (click)="reject(app._id)" class="btn-reject">✕ Reject</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .applications-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 12px 16px; border-bottom: 2px solid var(--docyra-neutral-border); font-size: 11px; text-transform: uppercase; color: var(--docyra-text-secondary); font-weight: 700; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .font-bold { font-weight: 700; }
    .doc-link { color: var(--docyra-primary); font-weight: 700; text-decoration: none; }
    .doc-link:hover { text-decoration: underline; }
    .text-muted { color: #94A3B8; font-size: 12px; }
    .action-buttons { display: flex; gap: 6px; }
    .btn-approve { background: #E8F7F0; color: #1E7E53; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
    .btn-reject { background: #FDF0EF; color: #DC2626; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
    .alert-success { background: #E8F7F0; color: #1E7E53; padding: 12px; border-radius: 10px; font-size: 12px; }
    .alert-error { background: #FDF0EF; color: #DC2626; padding: 12px; border-radius: 10px; font-size: 12px; }
    .loading-state, .empty-state { text-align: center; padding: 40px; color: #64748B; font-size: 13px; }
  `]
})
export class DoctorApplicationsComponent implements OnInit {
  applications: any[] = [];
  loading = true;
  successMessage = '';
  errorMessage = '';

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.loading = true;
    this.adminService.getDoctorApplications().subscribe({
      next: (res) => {
        this.loading = false;
        this.applications = res.data?.applications || [];
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  approve(id: string): void {
    this.adminService.approveDoctor(id).subscribe({
      next: () => {
        this.successMessage = 'Doctor application approved! Practitioner profile is now active on Docyra.';
        this.loadApplications();
      }
    });
  }

  reject(id: string): void {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    this.adminService.rejectDoctor(id, reason).subscribe({
      next: () => {
        this.successMessage = 'Doctor application rejected.';
        this.loadApplications();
      }
    });
  }

  formatDate(iso?: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleDateString('en-US');
  }
}
