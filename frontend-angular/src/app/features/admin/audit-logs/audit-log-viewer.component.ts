import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuditLogEntry } from '../../../core/models/audit-log.model';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="audit-log-page">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Audit Logs</h1>
          <p class="page-subtitle">Chronological record of system activity, security access events, and administrative actions.</p>
        </div>

        <div class="header-actions">
          <button
            mat-stroked-button
            (click)="refreshNow()"
            [disabled]="loading"
            class="action-btn"
          >
            <mat-icon [class.spinning]="loading">refresh</mat-icon>
            <span>Refresh</span>
          </button>

          <button
            mat-flat-button
            color="primary"
            (click)="exportLogsCSV()"
            [disabled]="filteredLogs.length === 0"
            class="export-btn"
          >
            <mat-icon>download</mat-icon>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <mat-card class="filter-card">
        <div class="filter-row">
          <!-- Search -->
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onFilterChanged()"
              placeholder="Search action, email, or IP..."
              class="search-input"
            />
            <button
              *ngIf="searchTerm"
              type="button"
              (click)="searchTerm = ''; onFilterChanged()"
              class="clear-btn"
            >
              <mat-icon class="clear-icon">close</mat-icon>
            </button>
          </div>

          <!-- Role Filter -->
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Role</mat-label>
            <mat-select [(ngModel)]="roleFilter" (selectionChange)="onFilterChanged()">
              <mat-option value="all">All Roles</mat-option>
              <mat-option value="admin">Platform Admin</mat-option>
              <mat-option value="clinic_admin">Clinic Admin</mat-option>
              <mat-option value="doctor">Doctor</mat-option>
              <mat-option value="patient">Patient</mat-option>
              <mat-option value="system">System</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Resource Filter -->
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Resource</mat-label>
            <mat-select [(ngModel)]="resourceFilter" (selectionChange)="onFilterChanged()">
              <mat-option value="all">All Resources</mat-option>
              <mat-option value="Clinic">Clinic</mat-option>
              <mat-option value="DoctorProfile">Doctor Profile</mat-option>
              <mat-option value="Appointment">Appointment</mat-option>
              <mat-option value="Auth">Auth & Session</mat-option>
              <mat-option value="SystemSettings">System Settings</mat-option>
              <mat-option value="AppointmentSlot">Appointment Slot</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Date Preset -->
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Time Period</mat-label>
            <mat-select [(ngModel)]="dateFilter" (selectionChange)="onFilterChanged()">
              <mat-option value="all">All Time</mat-option>
              <mat-option value="today">Today</mat-option>
              <mat-option value="7d">Last 7 Days</mat-option>
              <mat-option value="30d">Last 30 Days</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Clear Filters -->
          <button
            *ngIf="hasActiveFilters"
            mat-button
            color="warn"
            (click)="clearFilters()"
            class="reset-btn"
          >
            Reset
          </button>
        </div>

        <div class="filter-count">
          <span>Showing <strong>{{ filteredLogs.length }}</strong> of <strong>{{ totalItems }}</strong> audit records</span>
        </div>
      </mat-card>

      <!-- Logs Table -->
      <mat-card class="table-card">
        <div *ngIf="loading && logs.length === 0" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
          <p class="loading-text">Loading audit logs...</p>
        </div>

        <div *ngIf="!loading && filteredLogs.length === 0" class="empty-state">
          <mat-icon class="empty-icon">search_off</mat-icon>
          <p class="empty-title">No audit records found</p>
          <p class="empty-subtitle">No events match the selected filter criteria.</p>
          <button *ngIf="hasActiveFilters" mat-stroked-button (click)="clearFilters()" class="mt-3">
            Reset Filters
          </button>
        </div>

        <div *ngIf="filteredLogs.length > 0" class="table-container">
          <table class="logs-table">
            <thead>
              <tr>
                <th class="th-time">Timestamp</th>
                <th class="th-actor">Actor</th>
                <th class="th-action">Action</th>
                <th class="th-resource">Resource</th>
                <th class="th-ip">IP Address</th>
                <th class="th-inspect text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let log of filteredLogs"
                class="log-row"
                (click)="openLogDetails(log)"
              >
                <!-- Timestamp -->
                <td class="td-time">
                  {{ (log.timestamp || log.createdAt) | portalDate:'dd MMM yyyy, HH:mm:ss' }}
                </td>

                <!-- Actor -->
                <td class="td-actor">
                  <div class="actor-primary">{{ log.actorName || log.actorEmail || 'System' }}</div>
                  <div class="actor-role">{{ getRoleLabel(log.actorRole) }}</div>
                </td>

                <!-- Action -->
                <td class="td-action">
                  <span class="action-tag">{{ log.action }}</span>
                </td>

                <!-- Resource -->
                <td class="td-resource">
                  <span class="resource-type">{{ log.resourceType || log.targetType || 'System' }}</span>
                  <span *ngIf="log.resourceId || log.targetId" class="resource-id font-mono">
                    #{{ (log.resourceId || log.targetId) | slice:0:8 }}
                  </span>
                </td>

                <!-- IP Address -->
                <td class="td-ip font-mono">
                  {{ log.ipAddress || '127.0.0.1' }}
                </td>

                <!-- Inspect Button -->
                <td class="td-inspect text-right" (click)="$event.stopPropagation()">
                  <button
                    mat-icon-button
                    (click)="openLogDetails(log)"
                    title="View Log Details"
                    class="view-btn"
                  >
                    <mat-icon>visibility</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-bar" *ngIf="totalItems > 0">
          <div class="page-size-wrap">
            <span class="page-size-label">Rows per page:</span>
            <select [(ngModel)]="pageSize" (change)="onPageSizeChange()" class="page-size-select">
              <option [value]="10">10</option>
              <option [value]="25">25</option>
              <option [value]="50">50</option>
            </select>
          </div>

          <div class="pagination-info">
            Page {{ currentPage }} of {{ totalPages }}
          </div>

          <div class="pagination-actions">
            <button
              mat-icon-button
              [disabled]="currentPage === 1"
              (click)="goToPage(1)"
              title="First Page"
            >
              <mat-icon>first_page</mat-icon>
            </button>
            <button
              mat-icon-button
              [disabled]="currentPage === 1"
              (click)="goToPage(currentPage - 1)"
              title="Previous Page"
            >
              <mat-icon>chevron_left</mat-icon>
            </button>
            <button
              mat-icon-button
              [disabled]="currentPage >= totalPages"
              (click)="goToPage(currentPage + 1)"
              title="Next Page"
            >
              <mat-icon>chevron_right</mat-icon>
            </button>
            <button
              mat-icon-button
              [disabled]="currentPage >= totalPages"
              (click)="goToPage(totalPages)"
              title="Last Page"
            >
              <mat-icon>last_page</mat-icon>
            </button>
          </div>
        </div>
      </mat-card>

      <!-- Details Drawer / Modal -->
      <div *ngIf="selectedLog" class="modal-backdrop" (click)="closeLogDetails()">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">Audit Record Details</h2>
              <div class="modal-subtitle font-mono">{{ selectedLog.action }}</div>
            </div>
            <button mat-icon-button (click)="closeLogDetails()" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-lbl">Timestamp</span>
                <span class="detail-val font-mono">{{ (selectedLog.timestamp || selectedLog.createdAt) | portalDate:'dd MMM yyyy, HH:mm:ss' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-lbl">Actor</span>
                <span class="detail-val font-bold">{{ selectedLog.actorName || selectedLog.actorEmail || 'System' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-lbl">Role</span>
                <span class="detail-val">{{ getRoleLabel(selectedLog.actorRole) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-lbl">Resource</span>
                <span class="detail-val">{{ selectedLog.resourceType || selectedLog.targetType || 'System' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-lbl">Resource ID</span>
                <span class="detail-val font-mono">{{ selectedLog.resourceId || selectedLog.targetId || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-lbl">IP Address</span>
                <span class="detail-val font-mono">{{ selectedLog.ipAddress || '127.0.0.1' }}</span>
              </div>
            </div>

            <div class="detail-section" *ngIf="selectedLog.userAgent">
              <span class="detail-lbl">User Agent</span>
              <div class="ua-text font-mono">{{ selectedLog.userAgent }}</div>
            </div>

            <div class="detail-section">
              <div class="payload-header">
                <span class="detail-lbl">Payload / Metadata</span>
                <button mat-button (click)="copyPayload(selectedLog)" class="copy-btn">
                  <mat-icon class="sm-icon">content_copy</mat-icon>
                  <span>Copy</span>
                </button>
              </div>
              <pre class="json-box">{{ selectedLog.metadata ? (selectedLog.metadata | json) : '{}' }}</pre>
            </div>
          </div>

          <div class="modal-footer">
            <button mat-flat-button color="primary" (click)="closeLogDetails()">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .audit-log-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .page-title {
      font-size: 22px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 2px;
    }

    .page-subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-btn, .export-btn {
      height: 38px;
      font-size: 13px;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Filter Card */
    .filter-card {
      padding: 14px 16px !important;
      border-radius: 10px !important;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      box-shadow: none !important;
    }

    .filter-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      background: #F9FAFB;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      padding: 6px 10px;
      gap: 6px;
      flex: 1;
      min-width: 220px;
    }

    .search-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #9CA3AF;
    }

    .search-input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 13px;
      color: #111827;
      width: 100%;
    }

    .clear-btn {
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      color: #9CA3AF;
    }

    .clear-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .filter-field {
      width: 150px;
      font-size: 13px;
    }

    .filter-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .reset-btn {
      font-size: 12px;
    }

    .filter-count {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #F3F4F6;
      font-size: 12px;
      color: #6B7280;
    }

    /* Table Card */
    .table-card {
      padding: 0 !important;
      border-radius: 10px !important;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      box-shadow: none !important;
      overflow: hidden;
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
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6B7280;
      border-bottom: 1px solid #E5E7EB;
      background: #F9FAFB;
      white-space: nowrap;
    }

    .logs-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #F3F4F6;
      font-size: 13px;
      vertical-align: middle;
    }

    .log-row {
      cursor: pointer;
      transition: background-color 0.1s ease;
    }

    .log-row:hover {
      background-color: #F9FAFB;
    }

    .td-time {
      color: #374151;
      white-space: nowrap;
      font-size: 12px;
    }

    .actor-primary {
      font-weight: 600;
      color: #111827;
      font-size: 13px;
    }

    .actor-role {
      font-size: 11px;
      color: #6B7280;
    }

    .action-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
      font-weight: 600;
      background: #F3F4F6;
      color: #1F2937;
      border: 1px solid #E5E7EB;
    }

    .resource-type {
      font-weight: 500;
      color: #374151;
    }

    .resource-id {
      font-size: 11px;
      color: #9CA3AF;
      margin-left: 4px;
    }

    .td-ip {
      color: #4B5563;
      font-size: 12px;
    }

    .view-btn {
      color: #6B7280;
    }

    .view-btn:hover {
      color: #0F5C5C;
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      border-top: 1px solid #E5E7EB;
      background: #FAFAF8;
      font-size: 12px;
      color: #4B5563;
      flex-wrap: wrap;
      gap: 8px;
    }

    .page-size-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .page-size-select {
      border: 1px solid #D1D5DB;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 12px;
      background: #FFFFFF;
      color: #374151;
    }

    .pagination-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    /* Loading & Empty */
    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      gap: 12px;
    }

    .loading-text {
      font-size: 13px;
      color: #6B7280;
    }

    .empty-state {
      text-align: center;
      padding: 48px 16px;
    }

    .empty-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #9CA3AF;
      margin-bottom: 6px;
    }

    .empty-title {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 4px;
    }

    .empty-subtitle {
      font-size: 12px;
      color: #6B7280;
      margin: 0;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-panel {
      background: #FFFFFF;
      border-radius: 10px;
      width: 100%;
      max-width: 600px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #E5E7EB;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 12px;
      color: #6B7280;
      margin-top: 2px;
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .detail-lbl {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6B7280;
    }

    .detail-val {
      font-size: 13px;
      color: #111827;
      word-break: break-all;
    }

    .detail-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .ua-text {
      font-size: 11px;
      color: #4B5563;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      padding: 6px 8px;
      border-radius: 4px;
      word-break: break-all;
    }

    .payload-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .copy-btn {
      font-size: 11px;
      height: 28px;
    }

    .sm-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-right: 4px;
    }

    .json-box {
      background: #111827;
      color: #34D399;
      padding: 12px;
      border-radius: 6px;
      font-size: 11px;
      font-family: monospace;
      max-height: 220px;
      overflow: auto;
      margin: 0;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 12px 20px;
      border-top: 1px solid #E5E7EB;
      background: #F9FAFB;
    }
  `],
})
export class AuditLogViewerComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  logs: AuditLogEntry[] = [];
  filteredLogs: AuditLogEntry[] = [];
  loading = true;

  searchTerm = '';
  roleFilter = 'all';
  resourceFilter = 'all';
  dateFilter = 'all';

  currentPage = 1;
  pageSize = 15;
  totalItems = 0;
  totalPages = 1;

  selectedLog: AuditLogEntry | null = null;

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.roleFilter !== 'all' || this.resourceFilter !== 'all' || this.dateFilter !== 'all');
  }

  ngOnInit(): void {
    this.loadLogs();
  }

  refreshNow(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.roleFilter !== 'all') params.role = this.roleFilter;
    if (this.resourceFilter !== 'all') params.resourceType = this.resourceFilter;
    if (this.searchTerm.trim()) params.search = this.searchTerm.trim();

    if (this.dateFilter !== 'all') {
      const now = new Date();
      if (this.dateFilter === 'today') {
        params.dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (this.dateFilter === '7d') {
        params.dateFrom = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
      } else if (this.dateFilter === '30d') {
        params.dateFrom = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
      }
    }

    this.adminService.getAuditLogs(params).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.logs = res.data;
          this.filteredLogs = [...res.data];

          if (res.meta) {
            this.totalItems = res.meta['total'] || res.data.length;
            this.totalPages = res.meta['totalPages'] || Math.ceil(this.totalItems / this.pageSize) || 1;
          } else {
            this.totalItems = res.data.length;
            this.totalPages = 1;
          }
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onFilterChanged(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.roleFilter = 'all';
    this.resourceFilter = 'all';
    this.dateFilter = 'all';
    this.currentPage = 1;
    this.loadLogs();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadLogs();
  }

  openLogDetails(log: AuditLogEntry): void {
    this.selectedLog = log;
    this.cdr.markForCheck();
  }

  closeLogDetails(): void {
    this.selectedLog = null;
    this.cdr.markForCheck();
  }

  copyPayload(log: AuditLogEntry): void {
    try {
      const json = JSON.stringify(log.metadata || log, null, 2);
      navigator.clipboard.writeText(json);
      this.notificationService.success('Payload copied to clipboard');
    } catch {
      this.notificationService.error('Failed to copy to clipboard');
    }
  }

  exportLogsCSV(): void {
    if (this.filteredLogs.length === 0) return;

    const headers = ['Timestamp', 'Actor Name', 'Actor Email', 'Actor Role', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent'];
    const rows = this.filteredLogs.map((l) => [
      `"${new Date(l.timestamp || l.createdAt || '').toISOString()}"`,
      `"${l.actorName || ''}"`,
      `"${l.actorEmail || ''}"`,
      `"${l.actorRole || ''}"`,
      `"${l.action || ''}"`,
      `"${l.resourceType || l.targetType || ''}"`,
      `"${l.resourceId || l.targetId || ''}"`,
      `"${l.ipAddress || ''}"`,
      `"${(l.userAgent || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Docyra_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.notificationService.success('Audit logs exported successfully');
  }

  getRoleLabel(role?: string): string {
    switch (role) {
      case 'admin':
        return 'Platform Admin';
      case 'clinic_admin':
        return 'Clinic Admin';
      case 'doctor':
        return 'Doctor';
      case 'patient':
        return 'Patient';
      case 'system':
        return 'System';
      default:
        return role || 'Anonymous';
    }
  }
}
