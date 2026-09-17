import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-dashboard">
      <div class="admin-banner">
        <div>
          <span class="badge-role">Platform Administration</span>
          <h2>Docyra Global Governance Dashboard</h2>
          <p>System-wide health, clinic network status, doctor verification, and audit monitoring</p>
        </div>
        <div class="banner-actions">
          <a routerLink="/admin/clinics" class="btn-banner-action">+ Onboard Clinic</a>
          <a routerLink="/admin/doctor-applications" class="btn-banner-action-sec">Review Applications</a>
        </div>
      </div>

      <!-- Key Platform Metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="icon-wrap icon-teal">🏥</div>
          <div>
            <div class="metric-val">{{ stats.totalClinics }}</div>
            <div class="metric-lbl">Partner Clinics</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="icon-wrap icon-green">👨‍⚕️</div>
          <div>
            <div class="metric-val">{{ stats.totalDoctors }}</div>
            <div class="metric-lbl">Verified Doctors</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="icon-wrap icon-blue">👥</div>
          <div>
            <div class="metric-val">{{ stats.totalPatients }}</div>
            <div class="metric-lbl">Registered Patients</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="icon-wrap icon-amber">📝</div>
          <div>
            <div class="metric-val">{{ stats.pendingApplications }}</div>
            <div class="metric-lbl">Pending Applications</div>
          </div>
        </div>
      </div>

      <!-- Quick Action Modules Grid -->
      <div class="modules-grid">
        <div class="module-card portal-card">
          <div class="module-header">
            <h3>🏥 Clinic Network Management</h3>
            <a routerLink="/admin/clinics">Manage All →</a>
          </div>
          <p>Onboard new certified healthcare clinics, inspect facility rosters, and manage clinic operational status.</p>
          <div class="card-footer">
            <a routerLink="/admin/clinics" class="btn-sm-link">Open Clinic Manager</a>
          </div>
        </div>

        <div class="module-card portal-card">
          <div class="module-header">
            <h3>📝 Independent Doctor Review</h3>
            <a routerLink="/admin/doctor-applications">Applications →</a>
          </div>
          <p>Verify medical license documents uploaded by applying doctors and grant platform practice approval.</p>
          <div class="card-footer">
            <a routerLink="/admin/doctor-applications" class="btn-sm-link">Review Applications ({{ stats.pendingApplications }})</a>
          </div>
        </div>

        <div class="module-card portal-card">
          <div class="module-header">
            <h3>🛡️ PHI Compliance Audit Trail</h3>
            <a routerLink="/admin/audit-logs">Audit Logs →</a>
          </div>
          <p>Immutable HIPAA/GDPR access trail tracking patient record reads, updates, and appointment status changes.</p>
          <div class="card-footer">
            <a routerLink="/admin/audit-logs" class="btn-sm-link">View Audit Logs</a>
          </div>
        </div>

        <div class="module-card portal-card">
          <div class="module-header">
            <h3>⚙️ Global System Settings</h3>
            <a routerLink="/admin/settings">Settings →</a>
          </div>
          <p>Configure default slot durations, appointment cancellation cutoff windows, and platform currency.</p>
          <div class="card-footer">
            <a routerLink="/admin/settings" class="btn-sm-link">Configure Parameters</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard { display: flex; flex-direction: column; gap: 24px; }
    .admin-banner { background: linear-gradient(135deg, #0F5C5C 0%, #0B4747 100%); color: white; border-radius: 20px; padding: 32px; display: flex; justify-content: space-between; align-items: center; }
    .badge-role { font-size: 11px; text-transform: uppercase; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 9999px; font-weight: 700; letter-spacing: 0.05em; }
    .admin-banner h2 { margin: 10px 0 4px; font-size: 24px; font-weight: 800; }
    .admin-banner p { margin: 0; font-size: 13px; color: rgba(255,255,255,0.85); }
    .banner-actions { display: flex; gap: 10px; }
    .btn-banner-action { background: var(--docyra-accent); color: white; padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; text-decoration: none; }
    .btn-banner-action-sec { background: rgba(255,255,255,0.2); color: white; padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; text-decoration: none; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .metric-card { background: white; border: 1px solid var(--docyra-neutral-border); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; }
    .icon-wrap { font-size: 24px; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .icon-teal { background: #E6F2F1; }
    .icon-green { background: #E8F7F0; }
    .icon-blue { background: #EBF3FF; }
    .icon-amber { background: #FEF6E9; }
    .metric-val { font-size: 24px; font-weight: 800; color: var(--docyra-text-primary); }
    .metric-lbl { font-size: 12px; color: var(--docyra-text-secondary); font-weight: 600; }
    .modules-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; }
    .module-card { padding: 28px; display: flex; flex-direction: column; justify-content: space-between; }
    .module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .module-header h3 { margin: 0; font-size: 16px; font-weight: 800; }
    .module-header a { font-size: 12px; font-weight: 700; color: var(--docyra-primary); text-decoration: none; }
    .module-card p { font-size: 13px; color: var(--docyra-text-secondary); line-height: 1.5; margin: 0 0 20px; }
    .btn-sm-link { font-size: 12px; font-weight: 700; color: var(--docyra-primary); text-decoration: none; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  stats = {
    totalClinics: 0,
    totalDoctors: 0,
    totalPatients: 0,
    pendingApplications: 0
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getClinics().subscribe({
      next: (res) => {
        this.stats.totalClinics = (res.data?.clinics || []).length;
      }
    });

    this.adminService.getDoctorApplications().subscribe({
      next: (res) => {
        this.stats.pendingApplications = (res.data?.applications || []).length;
      }
    });

    this.adminService.getPatients().subscribe({
      next: (res) => {
        this.stats.totalPatients = (res.data?.patients || []).length;
      }
    });
  }
}
