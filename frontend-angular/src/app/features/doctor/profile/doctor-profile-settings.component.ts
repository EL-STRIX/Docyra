import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-doctor-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-page">
      <div class="page-header">
        <h2>Doctor Profile & Practice Settings</h2>
        <p>Manage your clinical bio, consultation fee, and practitioner details</p>
      </div>

      <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>

      <div class="portal-card profile-card">
        <form (ngSubmit)="saveProfile()" class="profile-form">
          <div class="form-row">
            <div class="form-group">
              <label>First Name</label>
              <input type="text" [(ngModel)]="profileData.firstName" name="firstName" required class="form-control" />
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input type="text" [(ngModel)]="profileData.lastName" name="lastName" required class="form-control" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Consultation Fee ($ USD)</label>
              <input type="number" [(ngModel)]="profileData.consultationFee" name="consultationFee" min="0" class="form-control" />
            </div>
            <div class="form-group">
              <label>Default Slot Duration (Minutes)</label>
              <select [(ngModel)]="profileData.slotDuration" name="slotDuration" class="form-control">
                <option [value]="15">15 Minutes</option>
                <option [value]="30">30 Minutes</option>
                <option [value]="45">45 Minutes</option>
                <option [value]="60">60 Minutes</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Professional Bio & Practice Summary</label>
            <textarea [(ngModel)]="profileData.bio" name="bio" rows="4" class="form-control" placeholder="Share your clinical background, specialties, and board certifications..."></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" [disabled]="saving" class="btn-save">
              {{ saving ? 'Saving Profile...' : 'Save Profile Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .profile-page { display: flex; flex-direction: column; gap: 24px; max-width: 800px; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .profile-card { padding: 32px; }
    .profile-form { display: flex; flex-direction: column; gap: 20px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--docyra-text-primary); }
    .form-control { padding: 12px; border-radius: 10px; border: 1px solid var(--docyra-neutral-border); font-size: 13px; outline: none; }
    .form-actions { display: flex; justify-content: flex-end; padding-top: 12px; }
    .btn-save { background: var(--docyra-primary); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .alert-success { background: #E8F7F0; color: #1E7E53; padding: 12px; border-radius: 10px; font-size: 12px; }
    .alert-error { background: #FDF0EF; color: #DC2626; padding: 12px; border-radius: 10px; font-size: 12px; }
  `]
})
export class DoctorProfileSettingsComponent implements OnInit {
  profileData = {
    firstName: '',
    lastName: '',
    consultationFee: 75,
    slotDuration: 30,
    bio: ''
  };

  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(private authService: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    const user = this.authService.userSignal();
    if (user) {
      this.profileData.firstName = user.firstName || '';
      this.profileData.lastName = user.lastName || '';
    }
  }

  saveProfile(): void {
    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.patch<any>('http://localhost:5000/api/v1/users/me', {
      firstName: this.profileData.firstName,
      lastName: this.profileData.lastName
    }, { withCredentials: true }).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Profile information saved successfully!';
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Failed to update profile settings.';
      }
    });
  }
}
