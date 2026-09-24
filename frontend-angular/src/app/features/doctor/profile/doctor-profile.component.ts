import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Doctor } from '../../../core/models/doctor.model';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="profile-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Doctor Profile & Practice Settings</h1>
          <p class="page-subtitle">Update your professional biography, consultation fee, and clinical qualifications.</p>
        </div>
        <button mat-flat-button color="primary" (click)="saveProfile()" [disabled]="saving || loading">
          <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
          <mat-icon *ngIf="!saving">save</mat-icon>
          <span>Save Profile Changes</span>
        </button>
      </div>

      <div *ngIf="loading" class="loading-wrap">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && doctorProfile" class="profile-grid">
        <!-- Basic Info & Bio Card -->
        <mat-card class="form-card">
          <h2 class="card-title">Professional Information</h2>

          <div class="form-grid mt-4">
            <div class="form-group">
              <label class="form-label">Professional Title</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput [(ngModel)]="doctorProfile.title" placeholder="Dr. / Prof." />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">Consultation Fee (₹)</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput type="number" [(ngModel)]="doctorProfile.consultationFee" placeholder="500" />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">Years of Clinical Experience</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput type="number" [(ngModel)]="doctorProfile.experienceYears" placeholder="10" />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">Medical License Number</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput [(ngModel)]="doctorProfile.licenseNumber" placeholder="MCI-123456" />
              </mat-form-field>
            </div>
          </div>

          <div class="form-group mt-4">
            <label class="form-label">Professional Biography</label>
            <mat-form-field appearance="outline" class="w-full">
              <textarea
                matInput
                rows="4"
                [(ngModel)]="doctorProfile.bio"
                placeholder="Describe your clinical expertise, specializations, and patient care philosophy..."
              ></textarea>
            </mat-form-field>
          </div>

          <div class="form-group mt-4">
            <label class="form-label">Qualifications (Comma separated)</label>
            <mat-form-field appearance="outline" class="w-full">
              <input
                matInput
                [(ngModel)]="qualificationsStr"
                placeholder="MBBS, MD (General Medicine), Fellowship in Cardiology"
              />
            </mat-form-field>
          </div>
        </mat-card>

        <!-- Affiliation & Status Card -->
        <mat-card class="info-card">
          <h2 class="card-title">Practice Affiliation & Rating</h2>

          <div class="stat-box-list mt-4">
            <div class="stat-box">
              <span class="box-lbl">Clinic Affiliation</span>
              <span class="box-val">{{ getClinicName() }}</span>
            </div>

            <div class="stat-box">
              <span class="box-lbl">Practice Status</span>
              <span class="box-val text-emerald-600 uppercase font-bold">{{ doctorProfile.status }}</span>
            </div>

            <div class="stat-box">
              <span class="box-lbl">Patient Rating</span>
              <span class="box-val text-amber-600 font-bold">
                ⭐ {{ doctorProfile.rating ? (doctorProfile.rating | number:'1.1-1') : '5.0' }} ({{ doctorProfile.reviewCount || 0 }} reviews)
              </span>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
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

    .profile-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    @media (max-width: 900px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
    }

    .form-card, .info-card {
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

    .stat-box-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .stat-box {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .box-lbl {
      font-size: 11px;
      color: #5C6B6B;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .box-val {
      font-size: 14px;
      font-weight: 700;
      color: #1A2E2E;
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

  getClinicName(): string {
    if (this.doctorProfile?.clinicId && typeof this.doctorProfile.clinicId === 'object') {
      return (this.doctorProfile.clinicId as any).name || 'Affiliated Clinic';
    }
    return this.doctorProfile?.isIndependent ? 'Independent Practitioner' : 'Affiliated Clinic';
  }

  saveProfile(): void {
    if (!this.doctorProfile) return;

    this.saving = true;
    const quals = this.qualificationsStr
      .split(',')
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    const payload: Partial<Doctor> = {
      title: this.doctorProfile.title,
      bio: this.doctorProfile.bio,
      consultationFee: Number(this.doctorProfile.consultationFee),
      experienceYears: Number(this.doctorProfile.experienceYears),
      licenseNumber: this.doctorProfile.licenseNumber,
      qualifications: quals,
    };

    this.doctorService.updateDoctorProfile(this.doctorProfile._id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.notificationService.success('Doctor profile updated successfully');
      },
      error: (err) => {
        this.saving = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to update profile');
      },
    });
  }
}
