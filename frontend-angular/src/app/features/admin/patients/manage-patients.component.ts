import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/user.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-manage-patients',
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
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="manage-patients-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Manage Registered Patients</h1>
          <p class="page-subtitle">Search, inspect account security status, and oversee patient records.</p>
        </div>
      </div>

      <!-- Patients Table Card -->
      <mat-card class="table-card">
        <div class="search-bar">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Search by patient name, email, or phone...</mat-label>
            <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applySearch()" />
            <mat-icon matPrefix class="mr-2 text-neutral-400">search</mat-icon>
          </mat-form-field>
        </div>

        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
        </div>

        <div *ngIf="!loading && filteredPatients.length === 0" class="empty-state">
          <mat-icon class="empty-icon">groups</mat-icon>
          <p>No patient accounts found matching your query.</p>
        </div>

        <div *ngIf="!loading && filteredPatients.length > 0" class="table-container">
          <table class="patients-table">
            <thead>
              <tr>
                <th>Patient Details</th>
                <th>Security & 2FA</th>
                <th>Email Verified</th>
                <th>Joined Date</th>
                <th>Status</th>
                <th class="text-right">Account Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of filteredPatients">
                <td>
                  <div class="font-bold text-neutral-900 text-sm">{{ p.name }}</div>
                  <div class="text-xs text-neutral-500">{{ p.email }}</div>
                  <div class="text-xs text-neutral-500" *ngIf="p.phone">{{ p.phone }}</div>
                </td>

                <td>
                  <span class="security-tag" [class.enabled]="p.isTwoFactorEnabled">
                    {{ p.isTwoFactorEnabled ? '2FA Active' : '2FA Off' }}
                  </span>
                </td>

                <td>
                  <span class="verify-tag" [class.verified]="p.isEmailVerified">
                    {{ p.isEmailVerified ? 'Verified' : 'Pending' }}
                  </span>
                </td>

                <td class="text-xs text-neutral-600 font-semibold">
                  {{ p.createdAt | portalDate:'dd MMM yyyy' }}
                </td>

                <td>
                  <app-status-badge [status]="p.status || 'active'"></app-status-badge>
                </td>

                <td class="text-right actions-col">
                  <button
                    *ngIf="p.status !== 'suspended'"
                    mat-stroked-button
                    color="warn"
                    (click)="togglePatientStatus(p._id, 'suspended')"
                    class="btn-sm"
                  >
                    Suspend
                  </button>
                  <button
                    *ngIf="p.status === 'suspended'"
                    mat-flat-button
                    color="primary"
                    (click)="togglePatientStatus(p._id, 'active')"
                    class="btn-sm"
                  >
                    Activate
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .manage-patients-page {
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

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      color: #5C6B6B;
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

    .patients-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .patients-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .patients-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
    }

    .security-tag, .verify-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      color: #5C6B6B;
    }

    .security-tag.enabled, .verify-tag.verified {
      background: #EBF7EE;
      color: #2E9E6B;
      border-color: #C3ECD0;
    }

    .btn-sm {
      font-size: 12px !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 12px !important;
    }

    .text-right {
      text-align: right;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class ManagePatientsComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);

  patients: User[] = [];
  filteredPatients: User[] = [];
  loading = true;
  searchTerm = '';

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    this.adminService.getPatients().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.patients = res.data;
          this.applySearch();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applySearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredPatients = [...this.patients];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredPatients = this.patients.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        (p.phone && p.phone.includes(term))
    );
  }

  togglePatientStatus(userId: string, newStatus: 'active' | 'suspended'): void {
    this.adminService.updateUserStatus(userId, newStatus).subscribe({
      next: () => {
        this.notificationService.success(`Patient account status updated to ${newStatus}`);
        this.loadPatients();
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to update patient status');
      },
    });
  }
}
