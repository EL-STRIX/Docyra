import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="audit-logs-page">
      <div class="page-header">
        <div>
          <h2>Compliance & PHI Access Audit Trail</h2>
          <p>Immutable log of sensitive medical access, data modifications, and state changes</p>
        </div>

        <button (click)="loadLogs()" class="btn-refresh">↻ Refresh Logs</button>
      </div>

      <div class="portal-card">
        <div *ngIf="loading" class="loading-state">Querying compliance audit logs...</div>

        <div *ngIf="!loading && logs.length === 0" class="empty-state">
          No audit logs recorded yet.
        </div>

        <table *ngIf="!loading && logs.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Performed By</th>
              <th>Target Model</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of logs">
              <td class="font-mono text-xs">{{ formatTimestamp(log.createdAt) }}</td>
              <td>
                <span class="action-tag">{{ log.action }}</span>
              </td>
              <td>
                <div class="font-bold">{{ log.performedBy?.email || 'System' }}</div>
                <div class="sub-text">{{ log.performedBy?.role }}</div>
              </td>
              <td>
                <span class="target-badge">{{ log.targetType }}</span>
              </td>
              <td class="font-mono text-xs">{{ log.ipAddress || '127.0.0.1' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .audit-logs-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .btn-refresh { background: #F1F5F9; border: 1px solid #CBD5E1; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 12px 16px; border-bottom: 2px solid var(--docyra-neutral-border); font-size: 11px; text-transform: uppercase; color: var(--docyra-text-secondary); font-weight: 700; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .action-tag { background: #E6F2F1; color: var(--docyra-primary); font-family: monospace; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
    .target-badge { background: #F1F5F9; color: #475569; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
    .font-bold { font-weight: 700; }
    .sub-text { font-size: 11px; color: #64748B; }
    .font-mono { font-family: monospace; }
    .text-xs { font-size: 12px; }
    .loading-state, .empty-state { text-align: center; padding: 40px; color: #64748B; font-size: 13px; }
  `]
})
export class AuditLogsComponent implements OnInit {
  logs: any[] = [];
  loading = true;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.adminService.getAuditLogs().subscribe({
      next: (res) => {
        this.loading = false;
        this.logs = res.data?.auditLogs || res.data?.logs || [];
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  formatTimestamp(iso?: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString('en-US');
  }
}
