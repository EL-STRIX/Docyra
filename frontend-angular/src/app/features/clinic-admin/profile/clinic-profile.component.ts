import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Clinic } from '../../../core/models/clinic.model';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-clinic-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="clinic-profile-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Clinic Profile & Facility Settings</h1>
          <p class="page-subtitle">Manage public contact details, physical address, and facility bio for {{ clinicProfile?.name || 'your clinic' }}.</p>
        </div>
        <button mat-flat-button color="primary" (click)="saveClinic()" [disabled]="saving || loading">
          <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
          <mat-icon *ngIf="!saving">save</mat-icon>
          <span>Save Clinic Settings</span>
        </button>
      </div>

      <div *ngIf="loading" class="loading-wrap">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && clinicProfile" class="grid-layout">
        <!-- Main Form -->
        <mat-card class="form-card">
          <h2 class="card-title">General Information</h2>

          <div class="form-grid mt-4">
            <div class="form-group span-2">
              <label class="form-label">Clinic / Hospital Name</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput [(ngModel)]="clinicProfile.name" placeholder="Docyra Health Clinic" />
              </mat-form-field>
            </div>

            <div class="form-group span-2">
              <label class="form-label">Clinic Description</label>
              <mat-form-field appearance="outline" class="w-full">
                <textarea
                  matInput
                  rows="3"
                  [(ngModel)]="clinicProfile.description"
                  placeholder="Comprehensive healthcare facility providing outpatient and specialist medical services..."
                ></textarea>
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">Contact Phone</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput [(ngModel)]="clinicProfile.contact.phone" placeholder="+91 98765 43210" />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">Contact Email</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput type="email" [(ngModel)]="clinicProfile.contact.email" placeholder="contact@clinic.com" />
              </mat-form-field>
            </div>

            <div class="form-group span-2">
              <label class="form-label">Website URL</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput [(ngModel)]="clinicProfile.contact.website" placeholder="https://www.clinic.com" />
              </mat-form-field>
            </div>
          </div>

          <h2 class="card-title mt-6">Facility Physical Address</h2>
          <div class="form-grid mt-4">
            <div class="form-group span-2">
              <label class="form-label">Street Address</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput [(ngModel)]="clinicProfile.address.street" placeholder="123 Medical Center Boulevard" />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">City</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput [(ngModel)]="clinicProfile.address.city" placeholder="Bengaluru" />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">State / Province</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput [(ngModel)]="clinicProfile.address.state" placeholder="Karnataka" />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">Postal / ZIP Code</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput [(ngModel)]="clinicProfile.address.postalCode" placeholder="560001" />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">Country</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput [(ngModel)]="clinicProfile.address.country" placeholder="India" />
              </mat-form-field>
            </div>
          </div>
        </mat-card>

        <!-- Status Card -->
        <mat-card class="status-card">
          <h2 class="card-title">Facility Status</h2>

          <div class="facility-status-list mt-4">
            <div class="facility-stat">
              <span class="stat-lbl">Onboarding Status</span>
              <span class="stat-val uppercase text-emerald-600 font-bold">
                {{ clinicProfile.onboardingStatus || 'approved' }}
              </span>
            </div>

            <div class="facility-stat">
              <span class="stat-lbl">Active Status</span>
              <span class="stat-val font-bold" [class.text-emerald-600]="clinicProfile.isActive" [class.text-rose-600]="!clinicProfile.isActive">
                {{ clinicProfile.isActive ? 'Active on Patient App' : 'Suspended' }}
              </span>
            </div>

            <div class="facility-stat">
              <span class="stat-lbl">Patient Feedback Rating</span>
              <span class="stat-val text-amber-600 font-bold">
                ⭐ {{ clinicProfile.rating ? (clinicProfile.rating | number:'1.1-1') : '4.9' }} ({{ clinicProfile.reviewCount || 0 }} reviews)
              </span>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .clinic-profile-page {
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

    .grid-layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    @media (max-width: 900px) {
      .grid-layout {
        grid-template-columns: 1fr;
      }
    }

    .form-card, .status-card {
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

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 600px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    .span-2 {
      grid-column: span 2;
    }

    @media (max-width: 600px) {
      .span-2 {
        grid-column: span 1;
      }
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

    .facility-status-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .facility-stat {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-lbl {
      font-size: 11px;
      color: #5C6B6B;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .stat-val {
      font-size: 14px;
      color: #1A2E2E;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class ClinicProfileComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private notificationService = inject(NotificationService);

  clinicProfile: Clinic | null = null;
  loading = true;
  saving = false;

  ngOnInit(): void {
    this.loadClinic();
  }

  loadClinic(): void {
    this.loading = true;
    this.clinicService.getMyClinicProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.clinicProfile = res.data;
          // Ensure address & contact objects exist
          if (!this.clinicProfile.address) {
            this.clinicProfile.address = { street: '', city: '', state: '', postalCode: '', country: 'India' };
          }
          if (!this.clinicProfile.contact) {
            this.clinicProfile.contact = { phone: '', email: '', website: '' };
          }
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  saveClinic(): void {
    if (!this.clinicProfile) return;

    this.saving = true;
    this.clinicService.updateClinicProfile(this.clinicProfile._id, this.clinicProfile).subscribe({
      next: () => {
        this.saving = false;
        this.notificationService.success('Clinic profile settings saved successfully');
      },
      error: (err) => {
        this.saving = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to save clinic profile');
      },
    });
  }
}
