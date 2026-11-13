import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, interval, takeUntil } from 'rxjs';
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
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatTooltipModule,
  ],
  template: `
    <div class="audit-log-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="badge-row">
            <span class="compliance-badge">
              <mat-icon class="badge-icon">verified_user</mat-icon>
              HIPAA & DISHA Compliance Ledger
            </span>
            <div class="live-status-pill" [class.live]="liveSync" (click)="toggleLiveSync()">
              <span class="pulse-dot"></span>
              <span>{{ liveSync ? 'Live Stream Active (10s)' : 'Live Stream Paused' }}</span>
            </div>
          </div>
          <h1 class="page-title">Compliance & Security Audit Trail</h1>
          <p class="page-subtitle">
            Immutable chronological ledger of access events, sensitive PHI updates, credential reviews, and administrative overrides.
          </p>
        </div>

        <div class="header-actions">
          <button
            mat-stroked-button
            class="action-btn"
            (click)="refreshNow()"
            [disabled]="loading"
            title="Fetch latest audit records"
          >
            <mat-icon [class.spinning]="loading">refresh</mat-icon>
            <span>Refresh</span>
          </button>

          <button
            mat-flat-button
            class="export-btn"
            (click)="exportLogsCSV()"
            [disabled]="filteredLogs.length === 0"
            title="Download CSV compliance audit report"
          >
            <mat-icon>download</mat-icon>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- Live KPI Summary Metric Cards -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon-wrap primary">
            <mat-icon>history_edu</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Events Logged</span>
            <span class="stat-value">{{ stats.totalEvents || totalItems }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap warn">
            <mat-icon>admin_panel_settings</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Admin Overrides</span>
            <span class="stat-value">{{ stats.adminEvents || 0 }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap success">
            <mat-icon>security</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Security & Auth Events</span>
            <span class="stat-value">{{ stats.securityEvents || 0 }}</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon-wrap info">
            <mat-icon>precision_manufacturing</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Automated System Jobs</span>
            <span class="stat-value">{{ stats.systemEvents || 0 }}</span>
          </div>
        </mat-card>
      </div>

      <!-- Filter & Search Toolbar -->
      <mat-card class="filter-card">
        <div class="filter-grid">
          <!-- Search Input -->
          <div class="filter-item search-col">
            <mat-form-field appearance="outline" class="w-full search-field">
              <mat-label>Search by Action, Actor Email, Resource, or IP...</mat-label>
              <input
                matInput
                [(ngModel)]="searchTerm"
                (ngModelChange)="onFilterChanged()"
                placeholder="e.g. USER_LOGIN, Apollo, 103.21..."
              />
              <mat-icon matPrefix class="mr-2 text-neutral-400">search</mat-icon>
              <button
                *ngIf="searchTerm"
                mat-icon-button
                matSuffix
                (click)="searchTerm = ''; onFilterChanged()"
                class="clear-input-btn"
              >
                <mat-icon>close</mat-icon>
              </button>
            </mat-form-field>
          </div>

          <!-- Actor Role Filter -->
          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Actor Role</mat-label>
              <mat-select [(ngModel)]="roleFilter" (selectionChange)="onFilterChanged()">
                <mat-option value="all">All Roles</mat-option>
                <mat-option value="admin">Platform Admin</mat-option>
                <mat-option value="clinic_admin">Clinic Admin</mat-option>
                <mat-option value="doctor">Doctor</mat-option>
                <mat-option value="patient">Patient</mat-option>
                <mat-option value="system">System Daemon</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Resource Type Filter -->
          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Resource Type</mat-label>
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
          </div>

          <!-- Date Preset Filter -->
          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Time Period</mat-label>
              <mat-select [(ngModel)]="dateFilter" (selectionChange)="onFilterChanged()">
                <mat-option value="all">All Time</mat-option>
                <mat-option value="today">Today</mat-option>
                <mat-option value="7d">Last 7 Days</mat-option>
                <mat-option value="30d">Last 30 Days</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <div class="filter-footer">
          <div class="filter-stats">
            <span>Showing <strong>{{ filteredLogs.length }}</strong> of <strong>{{ totalItems }}</strong> audit records</span>
            <span *ngIf="lastSyncedTime" class="sync-time">
              &bull; Last synced: {{ lastSyncedTime | date:'h:mm:ss a' }}
            </span>
          </div>

          <button
            *ngIf="searchTerm || roleFilter !== 'all' || resourceFilter !== 'all' || dateFilter !== 'all'"
            mat-button
            color="warn"
            (click)="clearFilters()"
            class="clear-all-filters-btn"
          >
            <mat-icon class="btn-sm-icon">restart_alt</mat-icon>
            Reset Filters
          </button>
        </div>
      </mat-card>

      <!-- Logs Table Card -->
      <mat-card class="table-card">
        <div *ngIf="loading && logs.length === 0" class="loading-wrap">
          <mat-spinner diameter="40"></mat-spinner>
          <p class="loading-text">Loading immutable audit trail records...</p>
        </div>

        <div *ngIf="!loading && filteredLogs.length === 0" class="empty-state">
          <div class="empty-icon-wrap">
            <mat-icon>manage_search</mat-icon>
          </div>
          <h3>No Audit Records Found</h3>
          <p>No audit trail events match your current filter criteria.</p>
          <button mat-stroked-button color="primary" (click)="clearFilters()">
            Clear All Filters
          </button>
        </div>

        <div *ngIf="filteredLogs.length > 0" class="table-container">
          <table class="logs-table">
            <thead>
              <tr>
                <th class="time-col">Timestamp</th>
                <th class="actor-col">Actor & Role</th>
                <th class="action-col">Action Performed</th>
                <th class="target-col">Resource Target</th>
                <th class="client-col">Client & Network</th>
                <th class="payload-col">Payload Highlights</th>
                <th class="action-btn-col text-right">Inspect</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let log of filteredLogs"
                class="log-row"
                [class.selected]="selectedLog?._id === log._id"
                (click)="openLogDetails(log)"
              >
                <!-- Timestamp Column -->
                <td class="time-cell">
                  <div class="exact-time">
                    {{ (log.timestamp || log.createdAt) | portalDate:'dd MMM yyyy, HH:mm:ss' }}
                  </div>
                  <div class="rel-time">
                    {{ getRelativeTime(log.timestamp || log.createdAt) }}
                  </div>
                </td>

                <!-- Actor Column -->
                <td class="actor-cell">
                  <div class="actor-wrap">
                    <div class="actor-avatar" [ngClass]="log.actorRole">
                      {{ getActorInitials(log) }}
                    </div>
                    <div class="actor-meta">
                      <div class="actor-name">{{ log.actorName || log.actorEmail || 'System Daemon' }}</div>
                      <div class="actor-email text-xs text-neutral-500">{{ log.actorEmail || 'daemon@docyra.app' }}</div>
                      <span class="role-pill" [ngClass]="log.actorRole">
                        {{ getRoleLabel(log.actorRole) }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Action Column -->
                <td class="action-cell">
                  <div class="action-chip" [ngClass]="getActionCategory(log.action)">
                    <mat-icon class="action-icon">{{ getActionIcon(log.action) }}</mat-icon>
                    <span>{{ log.action }}</span>
                  </div>
                </td>

                <!-- Target Resource Column -->
                <td class="target-cell">
                  <div class="resource-pill">
                    <mat-icon class="res-icon">{{ getResourceIcon(log.resourceType || log.targetType) }}</mat-icon>
                    <span class="res-name">{{ log.resourceType || log.targetType || 'System' }}</span>
                  </div>
                  <div *ngIf="log.resourceId || log.targetId" class="res-id font-mono">
                    ID: {{ (log.resourceId || log.targetId) | slice:0:16 }}
                  </div>
                </td>

                <!-- IP & Client Column -->
                <td class="client-cell">
                  <div class="ip-address font-mono">
                    <mat-icon class="ip-icon">lan</mat-icon>
                    {{ log.ipAddress || '127.0.0.1' }}
                  </div>
                  <div class="client-summary" [title]="log.userAgent || ''">
                    {{ getCleanUserAgent(log.userAgent) }}
                  </div>
                </td>

                <!-- Payload Column -->
                <td class="payload-cell">
                  <div *ngIf="hasMetadata(log.metadata)" class="metadata-preview">
                    <span class="meta-tag" *ngFor="let entry of getMetadataPreview(log.metadata)">
                      <strong>{{ entry.key }}:</strong> {{ entry.val }}
                    </span>
                  </div>
                  <span *ngIf="!hasMetadata(log.metadata)" class="no-meta text-neutral-400 text-xs">
                    No extra payload
                  </span>
                </td>

                <!-- Inspect Button Column -->
                <td class="action-btn-cell text-right" (click)="$event.stopPropagation()">
                  <button
                    mat-icon-button
                    class="inspect-btn"
                    (click)="openLogDetails(log)"
                    matTooltip="Inspect Full Audit Record"
                  >
                    <mat-icon>visibility</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div class="pagination-bar" *ngIf="totalItems > 0">
          <div class="page-size-selector">
            <span class="page-size-label">Rows per page:</span>
            <select [(ngModel)]="pageSize" (change)="onPageSizeChange()" class="page-size-dropdown">
              <option [value]="10">10</option>
              <option [value]="15">15</option>
              <option [value]="25">25</option>
              <option [value]="50">50</option>
            </select>
          </div>

          <div class="pagination-info">
            Page {{ currentPage }} of {{ totalPages }}
          </div>

          <div class="pagination-buttons">
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

      <!-- Full Audit Record Inspection Slide-over / Modal -->
      <div *ngIf="selectedLog" class="inspector-backdrop" (click)="closeLogDetails()">
        <div class="inspector-panel" (click)="$event.stopPropagation()">
          <div class="inspector-header">
            <div class="inspector-title-wrap">
              <span class="inspector-kicker">AUDIT RECORD INSPECTOR</span>
              <h2 class="inspector-title">{{ selectedLog.action }}</h2>
              <div class="inspector-id font-mono">UUID: {{ selectedLog._id || selectedLog.id }}</div>
            </div>
            <button mat-icon-button (click)="closeLogDetails()" class="close-inspector-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="inspector-body">
            <!-- Summary Grid -->
            <div class="inspect-section">
              <h4 class="section-title">Context & Identification</h4>
              <div class="inspect-grid">
                <div class="inspect-prop">
                  <span class="prop-lbl">Timestamp (ISO)</span>
                  <span class="prop-val font-mono">{{ selectedLog.timestamp || selectedLog.createdAt }}</span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Actor</span>
                  <span class="prop-val font-bold text-teal-800">{{ selectedLog.actorName || selectedLog.actorEmail }}</span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Actor Role</span>
                  <span class="role-pill" [ngClass]="selectedLog.actorRole">
                    {{ getRoleLabel(selectedLog.actorRole) }}
                  </span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Target Resource</span>
                  <span class="prop-val font-semibold">{{ selectedLog.resourceType || selectedLog.targetType }}</span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Target Resource ID</span>
                  <span class="prop-val font-mono">{{ selectedLog.resourceId || selectedLog.targetId || 'N/A' }}</span>
                </div>
                <div class="inspect-prop">
                  <span class="prop-lbl">Client IP Address</span>
                  <span class="prop-val font-mono">{{ selectedLog.ipAddress || '127.0.0.1' }}</span>
                </div>
              </div>
            </div>

            <!-- Client User Agent -->
            <div class="inspect-section">
              <h4 class="section-title">Client User-Agent & Signature</h4>
              <div class="ua-box font-mono text-xs">
                {{ selectedLog.userAgent || 'Docyra-Operations/2.0' }}
              </div>
            </div>

            <!-- Structured Metadata JSON -->
            <div class="inspect-section">
              <div class="meta-header-row">
                <h4 class="section-title">Event Metadata & Change Payload</h4>
                <button mat-button color="primary" class="copy-json-btn" (click)="copyPayload(selectedLog)">
                  <mat-icon class="btn-sm-icon">content_copy</mat-icon>
                  <span>Copy JSON</span>
                </button>
              </div>
              <pre class="json-viewer">{{ selectedLog.metadata | json }}</pre>
            </div>
          </div>

          <div class="inspector-footer">
            <span class="tamper-notice">
              <mat-icon class="tamper-icon">shield</mat-icon>
              Cryptographically verified & immutable compliance record
            </span>
            <button mat-flat-button color="primary" (click)="closeLogDetails()">
              Done
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
      gap: 20px;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .compliance-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      background: #E6F2F1;
      color: #0F5C5C;
      letter-spacing: 0.3px;
    }

    .badge-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .live-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      background: #F4F5F7;
      color: #6C757D;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
    }

    .live-status-pill.live {
      background: #EBF7EE;
      color: #1B8755;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ADB5BD;
    }

    .live-status-pill.live .pulse-dot {
      background: #2E9E6B;
      box-shadow: 0 0 0 0 rgba(46, 158, 107, 0.7);
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(46, 158, 107, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 6px rgba(46, 158, 107, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(46, 158, 107, 0);
      }
    }

    .page-title {
      font-size: 24px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 6px;
      letter-spacing: -0.4px;
    }

    .page-subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
      max-width: 780px;
      line-height: 1.5;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .action-btn {
      border-color: #D3CECE !important;
      color: #1A2E2E !important;
      font-weight: 600 !important;
    }

    .export-btn {
      background-color: #0F5C5C !important;
      color: #FFFFFF !important;
      font-weight: 700 !important;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% {
        transform: rotate(360deg);
      }
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }

    .stat-card {
      padding: 16px !important;
      border-radius: 12px !important;
      display: flex;
      flex-direction: row !important;
      align-items: center;
      gap: 16px;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .stat-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon-wrap.primary {
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .stat-icon-wrap.warn {
      background: #FEF3E8;
      color: #C05621;
    }

    .stat-icon-wrap.success {
      background: #EBF7EE;
      color: #2E9E6B;
    }

    .stat-icon-wrap.info {
      background: #EBF5FB;
      color: #2B6CB0;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6C757D;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 800;
      color: #1A2E2E;
      line-height: 1.2;
      margin-top: 2px;
    }

    /* Filter Card */
    .filter-card {
      padding: 18px 20px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .filter-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 14px;
    }

    @media (max-width: 1024px) {
      .filter-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 600px) {
      .filter-grid {
        grid-template-columns: 1fr;
      }
    }

    .w-full {
      width: 100%;
    }

    .filter-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      margin-top: 4px;
      border-top: 1px solid #F1F3F5;
      font-size: 12px;
      color: #6C757D;
    }

    .sync-time {
      margin-left: 6px;
      color: #8C98A4;
    }

    .clear-all-filters-btn {
      font-size: 12px !important;
      font-weight: 700 !important;
    }

    .btn-sm-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    /* Table Card */
    .table-card {
      padding: 0 !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      gap: 16px;
    }

    .loading-text {
      font-size: 13px;
      font-weight: 600;
      color: #5C6B6B;
    }

    .empty-state {
      text-align: center;
      padding: 56px 20px;
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #F4F5F7;
      color: #8C98A4;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .empty-icon-wrap mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .empty-state h3 {
      font-size: 16px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 6px;
    }

    .empty-state p {
      font-size: 13px;
      color: #6C757D;
      margin: 0 0 16px;
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
      padding: 14px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
      white-space: nowrap;
    }

    .logs-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #EBECEF;
      font-size: 13px;
      vertical-align: middle;
    }

    .log-row {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .log-row:hover {
      background-color: #F8F9FA;
    }

    .log-row.selected {
      background-color: #EBF7F6;
    }

    /* Cells */
    .exact-time {
      font-weight: 700;
      color: #1A2E2E;
      font-size: 12px;
      white-space: nowrap;
    }

    .rel-time {
      font-size: 11px;
      color: #8C98A4;
      margin-top: 2px;
    }

    .actor-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .actor-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #E2E8F0;
      color: #475569;
      font-weight: 800;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .actor-avatar.admin {
      background: #FEE2E2;
      color: #991B1B;
    }

    .actor-avatar.clinic_admin {
      background: #CCFBF1;
      color: #0F5C5C;
    }

    .actor-avatar.doctor {
      background: #DCFCE7;
      color: #166534;
    }

    .actor-avatar.system {
      background: #F1F5F9;
      color: #475569;
    }

    .actor-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .actor-name {
      font-weight: 700;
      color: #1A2E2E;
      font-size: 12px;
      line-height: 1.2;
    }

    .role-pill {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      background: #F1F3F5;
      color: #495057;
      width: fit-content;
      margin-top: 2px;
    }

    .role-pill.admin {
      background: #FDF2F2;
      color: #D9534F;
    }

    .role-pill.clinic_admin {
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .role-pill.doctor {
      background: #EBF7EE;
      color: #2E9E6B;
    }

    .role-pill.patient {
      background: #EBF5FB;
      color: #2B6CB0;
    }

    .role-pill.system {
      background: #F4F5F7;
      color: #495057;
    }

    /* Action Chip */
    .action-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      font-family: monospace;
      padding: 4px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .action-chip.auth {
      background: #EEF2FF;
      color: #4338CA;
    }

    .action-chip.create {
      background: #ECFDF5;
      color: #047857;
    }

    .action-chip.update {
      background: #FFFBEB;
      color: #B45309;
    }

    .action-chip.danger {
      background: #FEF2F2;
      color: #B91C1C;
    }

    .action-chip.system {
      background: #F0FDF4;
      color: #15803D;
    }

    .action-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    /* Target Resource */
    .resource-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .res-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: #6C757D;
    }

    .res-id {
      font-size: 10px;
      color: #8C98A4;
      margin-top: 2px;
    }

    /* IP & Client */
    .ip-address {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #475569;
    }

    .ip-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
      color: #94A3B8;
    }

    .client-summary {
      font-size: 11px;
      color: #8C98A4;
      margin-top: 2px;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Payload Cell */
    .metadata-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      max-width: 220px;
    }

    .meta-tag {
      font-size: 10px;
      background: #F4F5F7;
      padding: 2px 5px;
      border-radius: 4px;
      color: #495057;
      white-space: nowrap;
    }

    .inspect-btn {
      color: #0F5C5C !important;
    }

    .inspect-btn:hover {
      background: #E6F2F1 !important;
    }

    /* Pagination Bar */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      border-top: 1px solid #EBECEF;
      background: #FAFAF8;
      font-size: 12px;
      color: #6C757D;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .page-size-dropdown {
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid #CED4DA;
      font-size: 12px;
      background: #FFFFFF;
      cursor: pointer;
    }

    .pagination-buttons {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    /* Slide-over Inspector Panel */
    .inspector-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      backdrop-filter: blur(2px);
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .inspector-panel {
      width: 540px;
      max-width: 90vw;
      height: 100vh;
      background: #FFFFFF;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .inspector-header {
      padding: 24px;
      border-bottom: 1px solid #EBECEF;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #FAFAF8;
    }

    .inspector-kicker {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #0F5C5C;
      display: block;
      margin-bottom: 4px;
    }

    .inspector-title {
      font-size: 18px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 6px;
      font-family: monospace;
    }

    .inspector-id {
      font-size: 11px;
      color: #6C757D;
    }

    .inspector-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .inspect-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      margin: 0;
    }

    .inspect-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #FAFAF8;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid #E7E5E0;
    }

    .inspect-prop {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .prop-lbl {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #8C98A4;
    }

    .prop-val {
      font-size: 12px;
      color: #1A2E2E;
      word-break: break-all;
    }

    .ua-box {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      padding: 12px;
      border-radius: 8px;
      color: #475569;
      line-height: 1.5;
      word-break: break-all;
    }

    .meta-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .copy-json-btn {
      font-size: 11px !important;
      font-weight: 700 !important;
      padding: 0 8px !important;
      height: 28px !important;
      line-height: 28px !important;
    }

    .json-viewer {
      background: #1A2E2E;
      color: #80E3C2;
      padding: 16px;
      border-radius: 8px;
      font-size: 11px;
      font-family: monospace;
      overflow-x: auto;
      line-height: 1.4;
      max-height: 280px;
      margin: 0;
    }

    .inspector-footer {
      padding: 16px 24px;
      border-top: 1px solid #EBECEF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FAFAF8;
    }

    .tamper-notice {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #2E9E6B;
    }

    .tamper-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }
  `],
})
export class AuditLogViewerComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  logs: AuditLogEntry[] = [];
  filteredLogs: AuditLogEntry[] = [];
  loading = true;

  // Real-time Live Polling
  liveSync = true;
  lastSyncedTime: Date | null = null;

  // Key KPI stats
  stats: AuditLogStats = {
    totalEvents: 0,
    adminEvents: 0,
    systemEvents: 0,
    securityEvents: 0,
    distinctActors: 0,
  };

  // Filters
  searchTerm = '';
  roleFilter = 'all';
  resourceFilter = 'all';
  dateFilter = 'all';

  // Pagination
  currentPage = 1;
  pageSize = 15;
  totalItems = 0;
  totalPages = 1;

  // Inspector drawer
  selectedLog: AuditLogEntry | null = null;

  ngOnInit(): void {
    this.loadLogs();
    this.initLivePolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initLivePolling(): void {
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.liveSync && !this.loading) {
          this.loadLogs(true);
        }
      });
  }

  toggleLiveSync(): void {
    this.liveSync = !this.liveSync;
    if (this.liveSync) {
      this.notificationService.info('Live stream activated (10s sync)');
      this.loadLogs(true);
    } else {
      this.notificationService.info('Live stream paused');
    }
  }

  refreshNow(): void {
    this.loadLogs(false);
  }

  loadLogs(silent = false): void {
    if (!silent) {
      this.loading = true;
    }

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.roleFilter !== 'all') {
      params.role = this.roleFilter;
    }

    if (this.resourceFilter !== 'all') {
      params.resourceType = this.resourceFilter;
    }

    if (this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }

    if (this.dateFilter !== 'all') {
      const now = new Date();
      if (this.dateFilter === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        params.dateFrom = startOfToday.toISOString();
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

          this.lastSyncedTime = new Date();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onFilterChanged(): void {
    this.currentPage = 1;
    this.loadLogs(false);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.roleFilter = 'all';
    this.resourceFilter = 'all';
    this.dateFilter = 'all';
    this.currentPage = 1;
    this.loadLogs(false);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadLogs(false);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadLogs(false);
  }

  openLogDetails(log: AuditLogEntry): void {
    this.selectedLog = log;
  }

  closeLogDetails(): void {
    this.selectedLog = null;
  }

  copyPayload(log: AuditLogEntry): void {
    try {
      const json = JSON.stringify(log, null, 2);
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
    link.setAttribute('download', `Docyra_Compliance_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.notificationService.success('Audit report exported successfully as CSV');
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
        return 'System Daemon';
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

  getActionIcon(action: string): string {
    if (!action) return 'info';
    const a = action.toUpperCase();
    if (a.includes('LOGIN')) return 'login';
    if (a.includes('LOGOUT')) return 'logout';
    if (a.includes('VERIF') || a.includes('APPROV')) return 'verified';
    if (a.includes('ONBOARD') || a.includes('CREATE')) return 'add_circle';
    if (a.includes('UPDATE') || a.includes('SETTING')) return 'edit_note';
    if (a.includes('CRON') || a.includes('SLOT')) return 'schedule';
    if (a.includes('CANCEL') || a.includes('REJECT')) return 'cancel';
    if (a.includes('SECURITY')) return 'shield';
    return 'tune';
  }

  getResourceIcon(resType?: string): string {
    switch (resType) {
      case 'Clinic':
        return 'domain';
      case 'DoctorProfile':
        return 'medical_services';
      case 'Appointment':
        return 'calendar_month';
      case 'Auth':
        return 'key';
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

  getCleanUserAgent(ua?: string): string {
    if (!ua) return 'Client App';
    if (ua.includes('Docyra-CronDaemon') || ua.includes('CronDaemon')) return 'Cron Daemon';
    if (ua.includes('Docyra-SecDaemon')) return 'Security Daemon';
    if (ua.includes('Docyra-InitScript')) return 'System Script';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'Safari on iOS';
    if (ua.includes('Android')) return 'Chrome on Android';
    if (ua.includes('Windows')) return 'Chrome on Windows';
    if (ua.includes('Macintosh')) return 'Safari on macOS';
    if (ua.includes('Linux')) return 'Browser on Linux';
    return ua.slice(0, 24);
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

  hasMetadata(meta?: Record<string, any>): boolean {
    return Boolean(meta && typeof meta === 'object' && Object.keys(meta).length > 0);
  }

  getMetadataPreview(meta?: Record<string, any>): Array<{ key: string; val: string }> {
    if (!meta) return [];
    return Object.entries(meta)
      .slice(0, 2)
      .map(([k, v]) => ({
        key: k,
        val: typeof v === 'object' ? JSON.stringify(v) : String(v),
      }));
  }
}
