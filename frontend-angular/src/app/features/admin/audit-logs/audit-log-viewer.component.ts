import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuditLogEntry, AuditLogStats } from '../../../core/models/audit-log.model';
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
          <p class="page-subtitle">Track system activity, user access, and administrative changes across the platform.</p>
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

      <!-- KPI Summary Cards: Clean, Standard Subtle Layout -->
      <div class="kpi-grid">
        <div class="metric-card" (click)="setRoleFilter('all')" [class.metric-card-active]="roleFilter === 'all' && !searchTerm">
          <div class="metric-top">
            <span class="metric-label">Total Events</span>
            <mat-icon class="metric-icon">history</mat-icon>
          </div>
          <div class="metric-value">
            {{ stats.totalEvents || totalItems }}
          </div>
          <div class="metric-sub">Recorded system audit trail</div>
        </div>

        <div class="metric-card" (click)="setRoleFilter('admin')" [class.metric-card-active]="roleFilter === 'admin'">
          <div class="metric-top">
            <span class="metric-label">Admin Actions</span>
            <mat-icon class="metric-icon">admin_panel_settings</mat-icon>
          </div>
          <div class="metric-value">
            {{ stats.adminEvents || 0 }}
          </div>
          <div class="metric-sub">Platform administration logs</div>
        </div>

        <div class="metric-card" (click)="filterSecurityEvents()" [class.metric-card-active]="searchTerm === 'AUTH'">
          <div class="metric-top">
            <span class="metric-label">Security & Auth</span>
            <mat-icon class="metric-icon">security</mat-icon>
          </div>
          <div class="metric-value">
            {{ stats.securityEvents || 0 }}
          </div>
          <div class="metric-sub">Authentication & credential checks</div>
        </div>

        <div class="metric-card" (click)="setRoleFilter('system')" [class.metric-card-active]="roleFilter === 'system'">
          <div class="metric-top">
            <span class="metric-label">System Operations</span>
            <mat-icon class="metric-icon">memory</mat-icon>
          </div>
          <div class="metric-value">
            {{ stats.systemEvents || 0 }}
          </div>
          <div class="metric-sub">Automated cron & background jobs</div>
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
            mat-stroked-button
            color="warn"
            (click)="clearFilters()"
            class="reset-btn"
          >
            Reset Filters
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
          <button *ngIf="hasActiveFilters" mat-stroked-button color="primary" (click)="clearFilters()" class="mt-3">
            Clear Filters
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
                [class.row-selected]="selectedLog?._id === log._id"
                (click)="openLogDetails(log)"
              >
                <!-- Timestamp -->
                <td class="td-time">
                  <div class="exact-time">{{ (log.timestamp || log.createdAt) | portalDate:'dd MMM yyyy, HH:mm:ss' }}</div>
                  <div class="rel-time">{{ getRelativeTime(log.timestamp || log.createdAt) }}</div>
                </td>

                <!-- Actor -->
                <td class="td-actor">
                  <div class="actor-cell">
                    <div class="actor-avatar" [ngClass]="log.actorRole">
                      {{ getActorInitials(log) }}
                    </div>
                    <div class="actor-meta">
                      <div class="actor-primary">{{ log.actorName || log.actorEmail || 'System' }}</div>
                      <span class="role-badge" [ngClass]="log.actorRole">{{ getRoleLabel(log.actorRole) }}</span>
                    </div>
                  </div>
                </td>

                <!-- Action -->
                <td class="td-action">
                  <span class="action-badge" [ngClass]="getActionCategory(log.action)">
                    {{ log.action }}
                  </span>
                </td>

                <!-- Resource -->
                <td class="td-resource">
                  <div class="resource-cell">
                    <mat-icon class="res-icon">{{ getResourceIcon(log.resourceType || log.targetType) }}</mat-icon>
                    <span class="resource-name">{{ log.resourceType || log.targetType || 'System' }}</span>
                  </div>
                  <div *ngIf="log.resourceId || log.targetId" class="resource-id font-mono">
                    #{{ (log.resourceId || log.targetId) | slice:0:8 }}
                  </div>
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
                    <mat-icon>chevron_right</mat-icon>
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
              <option [value]="15">15</option>
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

      <!-- Clean Slide-over Drawer / Modal -->
      <div *ngIf="selectedLog" class="drawer-backdrop" (click)="closeLogDetails()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div>
              <span class="drawer-kicker">AUDIT RECORD</span>
              <h2 class="drawer-title font-mono">{{ selectedLog.action }}</h2>
              <div class="drawer-id font-mono">ID: {{ selectedLog._id || selectedLog.id }}</div>
            </div>
            <button mat-icon-button (click)="closeLogDetails()" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="drawer-body">
            <!-- Details Grid -->
            <div class="drawer-section">
              <h3 class="section-title">Context & Identification</h3>
              <div class="details-grid">
                <div class="detail-item">
                  <span class="detail-lbl">Timestamp</span>
                  <span class="detail-val font-mono">{{ (selectedLog.timestamp || selectedLog.createdAt) | portalDate:'dd MMM yyyy, HH:mm:ss' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-lbl">Actor</span>
                  <span class="detail-val font-bold text-teal-900">{{ selectedLog.actorName || selectedLog.actorEmail || 'System' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-lbl">Role</span>
                  <span class="role-badge" [ngClass]="selectedLog.actorRole">{{ getRoleLabel(selectedLog.actorRole) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-lbl">Target Resource</span>
                  <span class="detail-val font-semibold">{{ selectedLog.resourceType || selectedLog.targetType || 'System' }}</span>
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
            </div>

            <!-- User Agent -->
            <div class="drawer-section" *ngIf="selectedLog.userAgent">
              <h3 class="section-title">Client User Agent</h3>
              <div class="ua-box font-mono">{{ selectedLog.userAgent }}</div>
            </div>

            <!-- Metadata JSON -->
            <div class="drawer-section">
              <div class="payload-header">
                <h3 class="section-title">Event Metadata & Payload</h3>
                <button mat-stroked-button (click)="copyPayload(selectedLog)" class="copy-btn">
                  <mat-icon class="sm-icon">content_copy</mat-icon>
                  <span>Copy JSON</span>
                </button>
              </div>
              <pre class="json-box">{{ selectedLog.metadata ? (selectedLog.metadata | json) : '{}' }}</pre>
            </div>
          </div>

          <div class="drawer-footer">
            <button mat-flat-button color="primary" (click)="closeLogDetails()">
              Close Details
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
      gap: 18px;
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

    /* KPI Summary Cards Grid: Clean, Standard Subtle Layout */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    @media (max-width: 1024px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }
    }

    .metric-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .metric-card:hover {
      border-color: #D1D5DB;
    }

    .metric-card.metric-card-active {
      border-color: #0F5C5C;
      background: #FAFAF8;
    }

    .metric-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }

    .metric-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: #94A3B8;
      flex-shrink: 0;
    }

    .metric-card.metric-card-active .metric-icon {
      color: #0F5C5C;
    }

    .metric-value {
      font-size: 22px;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.2;
      letter-spacing: -0.4px;
      font-variant-numeric: tabular-nums;
    }

    .metric-sub {
      font-size: 11px;
      color: #94A3B8;
      margin-top: 4px;
      font-weight: 500;
    }

    /* Filter Card */
    .filter-card {
      padding: 14px 18px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03) !important;
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
      background: #FAFAF8;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
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
      width: 155px;
      font-size: 13px;
    }

    .filter-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .reset-btn {
      font-size: 12px;
      height: 38px;
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
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03) !important;
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
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
      white-space: nowrap;
    }

    .logs-table td {
      padding: 13px 16px;
      border-bottom: 1px solid #F1F3F5;
      font-size: 13px;
      vertical-align: middle;
    }

    .log-row {
      cursor: pointer;
      transition: background-color 0.1s ease;
    }

    .log-row:hover {
      background-color: #F8FAF9;
    }

    .log-row.row-selected {
      background-color: #EBF7F6;
    }

    .td-time {
      white-space: nowrap;
    }

    .exact-time {
      font-weight: 600;
      color: #1A2E2E;
      font-size: 12px;
    }

    .rel-time {
      font-size: 11px;
      color: #8C98A4;
      margin-top: 2px;
    }

    .actor-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .actor-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
      background: #F1F5F9;
      color: #475569;
    }

    .actor-avatar.admin {
      background: #FEF3E8;
      color: #B45309;
    }

    .actor-avatar.clinic_admin {
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .actor-avatar.doctor {
      background: #EBF7EE;
      color: #166534;
    }

    .actor-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .actor-primary {
      font-weight: 600;
      color: #1A2E2E;
      font-size: 13px;
    }

    .role-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      background: #F3F4F6;
      color: #4B5563;
      width: fit-content;
    }

    .role-badge.admin {
      background: #FEF3E8;
      color: #B45309;
    }

    .role-badge.clinic_admin {
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .role-badge.doctor {
      background: #EBF7EE;
      color: #15803D;
    }

    .action-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-family: monospace;
      font-weight: 600;
      background: #F3F4F6;
      color: #374151;
      border: 1px solid #E5E7EB;
    }

    .action-badge.auth {
      background: #EEF2FF;
      color: #4338CA;
      border-color: #C7D2FE;
    }

    .action-badge.create {
      background: #ECFDF5;
      color: #047857;
      border-color: #A7F3D0;
    }

    .action-badge.update {
      background: #FFFBEB;
      color: #B45309;
      border-color: #FDE68A;
    }

    .action-badge.danger {
      background: #FEF2F2;
      color: #B91C1C;
      border-color: #FECACA;
    }

    .resource-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .res-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #6B7280;
    }

    .resource-name {
      font-weight: 600;
      color: #1A2E2E;
      font-size: 13px;
    }

    .resource-id {
      font-size: 11px;
      color: #9CA3AF;
      margin-top: 2px;
    }

    .td-ip {
      color: #4B5563;
      font-size: 12px;
    }

    .view-btn {
      color: #9CA3AF;
    }

    .log-row:hover .view-btn {
      color: #0F5C5C;
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 18px;
      border-top: 1px solid #E7E5E0;
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
      border-radius: 6px;
      padding: 3px 8px;
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
      font-size: 38px;
      width: 38px;
      height: 38px;
      color: #9CA3AF;
      margin-bottom: 6px;
    }

    .empty-title {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 4px;
    }

    .empty-subtitle {
      font-size: 13px;
      color: #6B7280;
      margin: 0;
    }

    /* Slide-over Drawer Backdrop & Panel */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      animation: fadeIn 0.15s ease;
    }

    .drawer-panel {
      background: #FFFFFF;
      width: 100%;
      max-width: 580px;
      height: 100%;
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
      animation: slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .drawer-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #E7E5E0;
      background: #FAFAF8;
    }

    .drawer-kicker {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #0F5C5C;
    }

    .drawer-title {
      font-size: 18px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 4px 0 2px;
    }

    .drawer-id {
      font-size: 11px;
      color: #6B7280;
    }

    .drawer-body {
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      flex: 1;
    }

    .drawer-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      margin: 0;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      padding: 14px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .detail-lbl {
      font-size: 11px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .detail-val {
      font-size: 13px;
      color: #1A2E2E;
      word-break: break-all;
    }

    .ua-box {
      font-size: 11px;
      color: #4B5563;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      padding: 8px 12px;
      border-radius: 6px;
      word-break: break-all;
      line-height: 1.4;
    }

    .payload-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .copy-btn {
      font-size: 11px;
      height: 30px;
    }

    .sm-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-right: 4px;
    }

    .json-box {
      background: #1A2E2E;
      color: #80E3C2;
      padding: 14px;
      border-radius: 8px;
      font-size: 12px;
      font-family: monospace;
      max-height: 280px;
      overflow: auto;
      margin: 0;
      line-height: 1.4;
    }

    .drawer-footer {
      display: flex;
      justify-content: flex-end;
      padding: 14px 24px;
      border-top: 1px solid #E7E5E0;
      background: #FAFAF8;
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

  stats: AuditLogStats = {
    totalEvents: 0,
    adminEvents: 0,
    systemEvents: 0,
    securityEvents: 0,
    distinctActors: 0,
  };

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

  setRoleFilter(role: string): void {
    this.roleFilter = role;
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadLogs();
  }

  filterSecurityEvents(): void {
    this.searchTerm = 'AUTH';
    this.roleFilter = 'all';
    this.currentPage = 1;
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
            if (res.meta['stats']) {
              this.stats = res.meta['stats'];
            }
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
      this.notificationService.success('Audit record payload copied to clipboard');
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

  getActionCategory(action: string): string {
    if (!action) return 'system';
    const a = action.toUpperCase();
    if (a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('AUTH') || a.includes('PASSWORD')) return 'auth';
    if (a.includes('VERIF') || a.includes('ONBOARD') || a.includes('CREATE')) return 'create';
    if (a.includes('UPDATE') || a.includes('SAVE') || a.includes('EDIT')) return 'update';
    if (a.includes('CANCEL') || a.includes('REJECT') || a.includes('DELETE') || a.includes('SUSPEND')) return 'danger';
    return 'system';
  }

  getResourceIcon(resType?: string): string {
    switch (resType) {
      case 'Clinic':
        return 'domain';
      case 'DoctorProfile':
        return 'medical_services';
      case 'Appointment':
        return 'calendar_today';
      case 'Auth':
        return 'vpn_key';
      case 'SystemSettings':
        return 'settings';
      case 'AppointmentSlot':
        return 'event_available';
      default:
        return 'folder';
    }
  }

  getActorInitials(log: AuditLogEntry): string {
    if (log.actorName) {
      const parts = log.actorName.split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (log.actorEmail) {
      return log.actorEmail.slice(0, 2).toUpperCase();
    }
    return 'SY';
  }

  getRelativeTime(timestamp?: string | Date): string {
    if (!timestamp) return '';
    try {
      const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  }
}
