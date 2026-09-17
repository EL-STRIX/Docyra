import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <div>
          <h2>Platform System Settings</h2>
          <p>Global configuration governing slot durations, cancellation policies, and currency</p>
        </div>
        <button (click)="saveSettings()" [disabled]="saving" class="btn-save">
          {{ saving ? 'Saving...' : 'Save Global Settings' }}
        </button>
      </div>

      <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>

      <div class="portal-card settings-card">
        <form (ngSubmit)="saveSettings()" class="settings-form">
          <div class="form-section">
            <h3>Clinical Parameters</h3>

            <div class="form-row">
              <div class="form-group">
                <label>Default Slot Duration (Minutes)</label>
                <input type="number" [(ngModel)]="settings.defaultSlotDurationMinutes" name="slotDuration" min="10" max="120" required class="form-control" />
                <span class="hint">Standard time allocated per patient appointment</span>
              </div>

              <div class="form-group">
                <label>Cancellation Cutoff Window (Hours)</label>
                <input type="number" [(ngModel)]="settings.cancellationCutoffHours" name="cutoffHours" min="1" max="72" required class="form-control" />
                <span class="hint">Minimum notice required for patient appointment cancellation</span>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Currency & Security</h3>

            <div class="form-row">
              <div class="form-group">
                <label>Billing & Consultation Currency</label>
                <select [(ngModel)]="settings.currency" name="currency" class="form-control">
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Mandatory 2FA for Staff</label>
                <select [(ngModel)]="settings.require2FAForStaff" name="require2FA" class="form-control">
                  <option [ngValue]="true">Enabled (Strict Healthcare Security)</option>
                  <option [ngValue]="false">Optional</option>
                </select>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { display: flex; flex-direction: column; gap: 24px; max-width: 800px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .btn-save { background: var(--docyra-primary); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .settings-card { padding: 32px; }
    .settings-form { display: flex; flex-direction: column; gap: 28px; }
    .form-section h3 { margin: 0 0 16px; font-size: 16px; font-weight: 800; padding-bottom: 8px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--docyra-text-primary); }
    .form-control { padding: 12px; border-radius: 10px; border: 1px solid var(--docyra-neutral-border); font-size: 13px; outline: none; }
    .hint { font-size: 11px; color: #64748B; }
    .alert-success { background: #E8F7F0; color: #1E7E53; padding: 12px; border-radius: 10px; font-size: 12px; }
    .alert-error { background: #FDF0EF; color: #DC2626; padding: 12px; border-radius: 10px; font-size: 12px; }
  `]
})
export class AdminSystemSettingsComponent implements OnInit {
  settings = {
    defaultSlotDurationMinutes: 30,
    cancellationCutoffHours: 24,
    currency: 'USD',
    require2FAForStaff: true
  };

  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getSettings().subscribe({
      next: (res) => {
        if (res.data?.settings) {
          this.settings = { ...this.settings, ...res.data.settings };
        }
      }
    });
  }

  saveSettings(): void {
    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.adminService.updateSettings(this.settings).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Global system settings updated successfully!';
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Failed to update system settings.';
      }
    });
  }
}
