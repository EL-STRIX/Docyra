import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SystemSettings } from '../../../core/models/analytics.model';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="system-settings-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Platform & Clinical System Settings</h1>
          <p class="page-subtitle">Configure global appointment parameters, cancellation policy windows, and security enforcement.</p>
        </div>
        <button mat-flat-button color="primary" (click)="saveSettings()" [disabled]="saving || loading">
          <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
          <mat-icon *ngIf="!saving">save</mat-icon>
          <span>Save System Settings</span>
        </button>
      </div>

      <div *ngIf="loading" class="loading-wrap">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading" class="settings-grid">
        <!-- Appointment Rules Card -->
        <mat-card class="settings-card">
          <h2 class="card-title">Appointment & Cancellation Rules</h2>

          <div class="form-group mt-4">
            <label class="form-label">Default Consultation Duration</label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-select [(ngModel)]="settings.slotDurationDefaultMinutes">
                <mat-option [value]="15">15 Minutes</mat-option>
                <mat-option [value]="30">30 Minutes (Standard)</mat-option>
                <mat-option [value]="45">45 Minutes</mat-option>
                <mat-option [value]="60">60 Minutes</mat-option>
              </mat-select>
              <mat-hint>Applied as the default when a new doctor is created.</mat-hint>
            </mat-form-field>
          </div>

          <div class="form-group mt-4">
            <label class="form-label">Patient Cancellation Window (Hours)</label>
            <mat-form-field appearance="outline" class="w-full">
              <input matInput type="number" [(ngModel)]="settings.cancellationWindowHours" />
              <mat-hint>Minimum hours before scheduled slot time that a patient can cancel free of charge.</mat-hint>
            </mat-form-field>
          </div>

          <div class="form-group mt-4">
            <label class="form-label">Billing Currency Symbol</label>
            <mat-form-field appearance="outline" class="w-full">
              <input matInput [(ngModel)]="settings.currency" placeholder="INR / ₹" />
            </mat-form-field>
          </div>
        </mat-card>

        <!-- Access & Security Enforcement Card -->
        <mat-card class="settings-card">
          <h2 class="card-title">Security & Onboarding Policies</h2>

          <div class="toggle-list mt-4">
            <div class="toggle-item">
              <div class="toggle-meta">
                <span class="t-title">Allow Independent Doctor Applications</span>
                <span class="t-desc">Allow solo medical practitioners without clinic affiliation to submit license verification.</span>
              </div>
              <mat-slide-toggle [(ngModel)]="settings.allowIndependentDoctors" color="primary"></mat-slide-toggle>
            </div>

            <div class="toggle-item">
              <div class="toggle-meta">
                <span class="t-title">Enforce 2FA for Clinical & Administrative Staff</span>
                <span class="t-desc">Require TOTP 2FA enrollment upon login for doctors, clinic admins, and platform administrators.</span>
              </div>
              <mat-slide-toggle [(ngModel)]="settings.twoFactorEnforcedForStaff" color="primary"></mat-slide-toggle>
            </div>

            <div class="toggle-item">
              <div class="toggle-meta">
                <span class="t-title">Platform Maintenance Mode</span>
                <span class="t-desc">Temporarily freeze new appointment bookings for planned maintenance windows.</span>
              </div>
              <mat-slide-toggle [(ngModel)]="settings.maintenanceMode" color="warn"></mat-slide-toggle>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .system-settings-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
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

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 60px;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 860px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }
    }

    .settings-card {
      padding: 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .toggle-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .toggle-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px;
      border-radius: 8px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      gap: 16px;
    }

    .toggle-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .t-title {
      font-size: 13px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .t-desc {
      font-size: 11px;
      color: #5C6B6B;
      line-height: 1.4;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class SystemSettingsComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);

  loading = true;
  saving = false;

  settings: SystemSettings = {
    slotDurationDefaultMinutes: 30,
    cancellationWindowHours: 24,
    currency: 'INR',
    allowIndependentDoctors: true,
    twoFactorEnforcedForStaff: true,
    maintenanceMode: false,
  };

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.adminService.getSystemSettings().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.settings = { ...this.settings, ...res.data };
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  saveSettings(): void {
    this.saving = true;
    this.adminService.updateSystemSettings(this.settings).subscribe({
      next: () => {
        this.saving = false;
        this.notificationService.success('Platform system settings saved successfully');
      },
      error: (err) => {
        this.saving = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to save system settings');
      },
    });
  }
}
