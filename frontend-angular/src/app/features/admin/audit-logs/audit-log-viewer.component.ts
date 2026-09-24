import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuditLogEntry } from '../../../core/models/audit-log.model';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-audit-log-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DateFormatPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="audit-log-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Compliance Audit Log Trail</h1>
          <p class="page-subtitle">Immutable chronological ledger of access events, sensitive PHI updates, and administrative overrides.</p>
        </div>
      </div>

      <!-- Search & Filters -->
      <mat-card class="filter-card">
        <div class="filter-grid">
          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Search action, actor, or target ID...</mat-label>
              <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applySearch()" />
              <mat-icon matPrefix class="mr-2 text-neutral-400">search</mat-icon>
            </mat-form-field>
          </div>

          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Actor Role</mat-label>
              <mat-select [(ngModel)]="roleFilter" (selectionChange)="applySearch()">
                <mat-option value="all">All Roles</mat-option>
                <mat-option value="admin">Platform Admin</mat-option>
                <mat-option value="clinic_admin">Clinic Admin</mat-option>
                <mat-option value="doctor">Doctor</mat-option>
                <mat-option value="patient">Patient</mat-option>
                <mat-option value="system">System Daemon</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </mat-card>

      <!-- Logs Table Card -->
      <mat-card class="table-card">
        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
        </div>

        <div *ngIf="!loading && filteredLogs.length === 0" class="empty-state">
          <mat-icon class="empty-icon">history</mat-icon>
          <p>No audit log events match your filters.</p>
        </div>

        <div *ngIf="!loading && filteredLogs.length > 0" class="table-container">
          <table class="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor & Role</th>
                <th>Action Performed</th>
                <th>Target Resource</th>
                <th>IP & Client</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of filteredLogs">
                <td class="text-xs font-semibold text-neutral-800 whitespace-nowrap">
                  {{ log.createdAt | portalDate:'dd MMM yyyy, HH:mm:ss' }}
                </td>

                <td>
                  <div class="font-bold text-xs text-neutral-900">{{ log.actorEmail || 'System / Anonymous' }}</div>
                  <span class="role-pill" [ngClass]="log.actorRole">{{ log.actorRole }}</span>
                </td>

                <td>
                  <code class="action-code">{{ log.action }}</code>
                </td>

                <td>
                  <div class="text-xs font-semibold text-neutral-800">{{ log.targetType }}</div>
                  <div class="text-[10px] text-neutral-400 font-mono" *ngIf="log.targetId">{{ log.targetId }}</div>
                </td>

                <td>
                  <div class="text-xs font-mono text-neutral-600">{{ log.ipAddress || '127.0.0.1' }}</div>
                </td>

                <td>
                  <span *ngIf="log.metadata" class="metadata-text" [title]="log.metadata | json">
                    {{ log.metadata | json | slice:0:30 }}...
                  </span>
                  <span *ngIf="!log.metadata" class="text-xs text-neutral-400">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .audit-log-page {
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
      grid-template-columns: 2fr 1fr;
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

    .logs-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .logs-table th {
      padding: 12px 14px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .logs-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 12px;
    }

    .role-pill {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      background: #F1F3F5;
      color: #495057;
    }

    .role-pill.admin {
      background: #FDF2F2;
      color: #D9534F;
    }

    .role-pill.doctor {
      background: #FEF6EC;
      color: #B57416;
    }

    .role-pill.clinic_admin {
      background: #EBF7EE;
      color: #2E9E6B;
    }

    .action-code {
      font-size: 11px;
      font-weight: 700;
      color: #0F5C5C;
      background: #E6F2F1;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .metadata-text {
      font-size: 10px;
      font-family: monospace;
      color: #6C757D;
      background: #F8F9FA;
      padding: 2px 4px;
      border-radius: 4px;
      cursor: help;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class AuditLogViewerComponent implements OnInit {
  private adminService = inject(AdminService);

  logs: AuditLogEntry[] = [];
  filteredLogs: AuditLogEntry[] = [];
  loading = true;

  searchTerm = '';
  roleFilter = 'all';

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.adminService.getAuditLogs().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.logs = res.data;
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
    let result = [...this.logs];

    if (this.roleFilter !== 'all') {
      result = result.filter((l) => l.actorRole === this.roleFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.action.toLowerCase().includes(term) ||
          l.actorEmail?.toLowerCase().includes(term) ||
          l.targetType.toLowerCase().includes(term) ||
          l.targetId?.toLowerCase().includes(term)
      );
    }

    this.filteredLogs = result;
  }
}
