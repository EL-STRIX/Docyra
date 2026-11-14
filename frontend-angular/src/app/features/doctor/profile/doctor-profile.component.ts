import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Doctor } from '../../../core/models/doctor.model';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-doctor-profile-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="profile-page">
      <!-- Top Action Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Doctor Profile & Professional Credentials</h1>
          <p class="page-subtitle">
            Update your clinical identity, medical qualifications, consultation fee, and chamber address.
          </p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="loadProfile()" [disabled]="saving || loading">
            <mat-icon>refresh</mat-icon>
            <span>Reset</span>
          </button>
          <button mat-flat-button color="primary" (click)="saveProfile()" [disabled]="saving || loading">
            <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
            <mat-icon *ngIf="!saving">check</mat-icon>
            <span>Save Profile</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-wrap">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && doctorProfile" class="profile-content">
        <!-- Identity Summary Banner Card -->
        <mat-card class="doctor-identity-card">
          <div class="identity-layout">
            <div class="avatar-box">
              <mat-icon class="avatar-icon">medical_services</mat-icon>
            </div>
            <div class="identity-info">
              <div class="identity-title-row">
                <h2 class="doctor-display-name">
                  {{ doctorProfile.title || 'Dr.' }} {{ doctorProfile.name || 'Doctor' }}
                </h2>
                <span class="specialization-badge">{{ getSpecializationName() }}</span>
              </div>
              <div class="identity-badges-row">
                <span class="badge-item">
                  <mat-icon class="badge-icon">badge</mat-icon>
                  License: {{ doctorProfile.licenseNumber || 'Not specified' }}
                </span>
                <span class="badge-item">
                  <mat-icon class="badge-icon">history_edu</mat-icon>
                  {{ doctorProfile.experienceYears || 0 }} Years Experience
                </span>
                <span class="badge-item">
                  <mat-icon class="badge-icon">payments</mat-icon>
                  Fee: ₹{{ doctorProfile.consultationFee || 500 }}
                </span>
              </div>
            </div>
          </div>
        </mat-card>

        <!-- Form Cards Container -->
        <div class="sections-container">
          <!-- Section 1: Personal & Contact Information -->
          <mat-card class="section-card">
            <div class="section-header">
              <div class="section-icon-box primary">
                <mat-icon>person</mat-icon>
              </div>
              <div>
                <h3 class="section-title">Personal & Contact Information</h3>
                <p class="section-desc">Basic profile and communication details visible to patients</p>
              </div>
            </div>

            <div class="fields-grid mt-4">
              <div class="form-group col-span-1">
                <label class="form-label">Title</label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select [(ngModel)]="doctorProfile.title">
                    <mat-option value="Dr.">Dr.</mat-option>
                    <mat-option value="Prof.">Prof.</mat-option>
                    <mat-option value="Assoc. Prof.">Assoc. Prof.</mat-option>
                    <mat-option value="Consultant">Consultant</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="form-group col-span-2">
                <label class="form-label">Full Doctor Name</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput [(ngModel)]="doctorProfile.name" placeholder="Vikram Patel" />
                </mat-form-field>
              </div>

              <div class="form-group col-span-2">
                <label class="form-label">Contact Phone Number</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput [(ngModel)]="doctorProfile.phone" placeholder="+91 98765 43210" />
                </mat-form-field>
              </div>

              <div class="form-group col-span-2">
                <label class="form-label">Registered Account Email</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput [value]="doctorProfile.email" disabled />
                  <mat-icon matSuffix class="verified-icon" title="Verified Account">verified</mat-icon>
                </mat-form-field>
              </div>
            </div>
          </mat-card>

          <!-- Section 2: Clinical Credentials & Practice Details -->
          <mat-card class="section-card">
            <div class="section-header">
              <div class="section-icon-box accent">
                <mat-icon>verified_user</mat-icon>
              </div>
              <div>
                <h3 class="section-title">Clinical Credentials & Practice Details</h3>
                <p class="section-desc">Medical council registration, degrees, fees, and consultation address</p>
              </div>
            </div>

            <div class="fields-grid mt-4">
              <div class="form-group col-span-2">
                <label class="form-label">Medical Council / License Number</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input
                    matInput
                    [(ngModel)]="doctorProfile.licenseNumber"
                    placeholder="MCI-123456 / SMC-78901"
                  />
                </mat-form-field>
              </div>

              <div class="form-group col-span-1">
                <label class="form-label">Clinical Experience (Years)</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input
                    matInput
                    type="number"
                    min="0"
                    [(ngModel)]="doctorProfile.experienceYears"
                    placeholder="10"
                  />
                </mat-form-field>
              </div>

              <div class="form-group col-span-1">
                <label class="form-label">Consultation Fee (₹ INR)</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input
                    matInput
                    type="number"
                    min="0"
                    [(ngModel)]="doctorProfile.consultationFee"
                    placeholder="500"
                  />
                </mat-form-field>
              </div>

              <div class="form-group col-span-4">
                <label class="form-label">Medical Qualifications & Degrees (Comma separated)</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input
                    matInput
                    [(ngModel)]="qualificationsStr"
                    placeholder="MBBS, MD (General Medicine), DNB, Fellowship in Cardiology"
                  />
                </mat-form-field>
              </div>

              <div class="form-group col-span-4">
                <label class="form-label">Clinic / Consultation Chamber Address</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input
                    matInput
                    [(ngModel)]="doctorProfile.clinicAddress"
                    placeholder="Room 304, Metro Health Hub, M.G. Road, Bangalore"
                  />
                </mat-form-field>
              </div>
            </div>
          </mat-card>

          <!-- Section 3: Professional Biography & Clinical Summary -->
          <mat-card class="section-card">
            <div class="section-header">
              <div class="section-icon-box bio-icon">
                <mat-icon>history_edu</mat-icon>
              </div>
              <div>
                <h3 class="section-title">Professional Biography & Clinical Care Philosophy</h3>
                <p class="section-desc">Summarize your clinical expertise and special patient care areas</p>
              </div>
            </div>

            <div class="form-group mt-4">
              <mat-form-field appearance="outline" class="w-full">
                <textarea
                  matInput
                  rows="4"
                  [(ngModel)]="doctorProfile.bio"
                  placeholder="Describe your medical background, treatment specializations, clinical interests, and approach to patient care..."
                ></textarea>
              </mat-form-field>
            </div>
          </mat-card>
        </div>

        <!-- Bottom Save Action Bar -->
        <div class="bottom-action-bar">
          <button mat-flat-button color="primary" class="save-btn-large" (click)="saveProfile()" [disabled]="saving || loading">
            <mat-spinner *ngIf="saving" diameter="20" class="mr-2"></mat-spinner>
            <mat-icon *ngIf="!saving">check_circle</mat-icon>
            <span>Save Profile Changes</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1040px;
      margin: 0 auto;
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 60px;
    }

    .profile-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Identity Banner Card */
    .doctor-identity-card {
      padding: 20px 24px !important;
      border-radius: 12px !important;
      background: linear-gradient(135deg, #0F5C5C 0%, #0A4343 100%);
      color: #FFFFFF;
      border: none !important;
      box-shadow: 0 4px 12px rgba(15, 92, 92, 0.12);
    }

    .identity-layout {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .avatar-box {
      width: 56px;
      height: 56px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .avatar-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #F8B84E;
    }

    .identity-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .identity-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .doctor-display-name {
      font-size: 20px;
      font-weight: 800;
      color: #FFFFFF;
      margin: 0;
    }

    .specialization-badge {
      background: rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    .identity-badges-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .badge-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: #D1E5E5;
      font-weight: 500;
    }

    .badge-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #A0C6C6;
    }

    /* Form Section Cards */
    .sections-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .section-card {
      padding: 22px 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid #F0EFEA;
    }

    .section-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .section-icon-box.primary {
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .section-icon-box.accent {
      background: #FEF6EC;
      color: #B57416;
    }

    .section-icon-box.bio-icon {
      background: #EBF7EE;
      color: #2E9E6B;
    }

    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0;
    }

    .section-desc {
      font-size: 12px;
      color: #5C6B6B;
      margin: 2px 0 0;
    }

    .fields-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }

    @media (max-width: 768px) {
      .fields-grid {
        grid-template-columns: 1fr;
      }
      .col-span-1, .col-span-2, .col-span-4 {
        grid-column: span 1 !important;
      }
    }

    .col-span-1 {
      grid-column: span 1;
    }

    .col-span-2 {
      grid-column: span 2;
    }

    .col-span-4 {
      grid-column: span 4;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .verified-icon {
      color: #0F5C5C;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .bottom-action-bar {
      display: flex;
      justify-content: flex-end;
      padding-top: 10px;
    }

    .save-btn-large {
      padding: 0 28px !important;
      height: 44px !important;
      font-size: 14px !important;
      font-weight: 700 !important;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class DoctorProfileComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private notificationService = inject(NotificationService);

  doctorProfile: Doctor | null = null;
  qualificationsStr = '';
  loading = true;
  saving = false;

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.doctorService.getMyDoctorProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.doctorProfile = res.data;
          this.qualificationsStr = res.data.qualifications?.join(', ') || '';
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  getSpecializationName(): string {
    if (this.doctorProfile?.specializationId && typeof this.doctorProfile.specializationId === 'object') {
      return (this.doctorProfile.specializationId as any).name || 'General Medicine';
    }
    return 'General Medicine';
  }

  saveProfile(): void {
    if (!this.doctorProfile) return;

    this.saving = true;
    const quals = this.qualificationsStr
      .split(',')
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    const payload: Partial<Doctor> = {
      title: this.doctorProfile.title || 'Dr.',
      name: this.doctorProfile.name,
      phone: this.doctorProfile.phone,
      bio: this.doctorProfile.bio || '',
      consultationFee: Number(this.doctorProfile.consultationFee) || 0,
      experienceYears: Number(this.doctorProfile.experienceYears) || 0,
      yearsExperience: Number(this.doctorProfile.experienceYears) || 0,
      licenseNumber: this.doctorProfile.licenseNumber || '',
      clinicAddress: this.doctorProfile.clinicAddress || '',
      qualifications: quals,
    };

    this.doctorService.updateDoctorProfile(this.doctorProfile._id, payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success && res.data) {
          this.doctorProfile = res.data;
          this.qualificationsStr = res.data.qualifications?.join(', ') || '';
        }
        this.notificationService.success('Doctor profile updated successfully');
      },
      error: (err) => {
        this.saving = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to update profile');
      },
    });
  }
}
