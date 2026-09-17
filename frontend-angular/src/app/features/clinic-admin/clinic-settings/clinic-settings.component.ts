import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';

@Component({
  selector: 'app-clinic-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="clinic-settings-page">
      <div class="page-header">
        <h2>Clinic Profile & Facility Settings</h2>
        <p>Manage facility location, contact numbers, and public clinic information</p>
      </div>

      <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>

      <div class="portal-card settings-card">
        <form (ngSubmit)="saveSettings()" class="settings-form">
          <div class="form-group">
            <label>Clinic Legal Name</label>
            <input type="text" [(ngModel)]="clinic.name" name="name" required class="form-control" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Contact Phone</label>
              <input type="tel" [(ngModel)]="clinic.phone" name="phone" required class="form-control" />
            </div>
            <div class="form-group">
              <label>Official Email</label>
              <input type="email" [(ngModel)]="clinic.email" name="email" required class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label>Street Address</label>
            <input type="text" [(ngModel)]="clinic.address.street" name="street" class="form-control" />
          </div>

          <div class="form-row-3">
            <div class="form-group">
              <label>City</label>
              <input type="text" [(ngModel)]="clinic.address.city" name="city" required class="form-control" />
            </div>
            <div class="form-group">
              <label>State / Region</label>
              <input type="text" [(ngModel)]="clinic.address.state" name="state" class="form-control" />
            </div>
            <div class="form-group">
              <label>Country</label>
              <input type="text" [(ngModel)]="clinic.address.country" name="country" required class="form-control" />
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" [disabled]="saving" class="btn-save">
              {{ saving ? 'Saving Changes...' : 'Save Clinic Details' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .clinic-settings-page { display: flex; flex-direction: column; gap: 24px; max-width: 800px; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .settings-card { padding: 32px; }
    .settings-form { display: flex; flex-direction: column; gap: 20px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--docyra-text-primary); }
    .form-control { padding: 12px; border-radius: 10px; border: 1px solid var(--docyra-neutral-border); font-size: 13px; outline: none; }
    .form-actions { display: flex; justify-content: flex-end; padding-top: 12px; }
    .btn-save { background: var(--docyra-primary); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .alert-success { background: #E8F7F0; color: #1E7E53; padding: 12px; border-radius: 10px; font-size: 12px; }
    .alert-error { background: #FDF0EF; color: #DC2626; padding: 12px; border-radius: 10px; font-size: 12px; }
  `]
})
export class ClinicSettingsComponent implements OnInit {
  clinic = {
    name: 'Docyra City Clinic',
    phone: '+1 (555) 019-2831',
    email: 'contact@cityclinic.docyra.app',
    address: {
      street: '124 Healthcare Boulevard',
      city: 'Metro City',
      state: 'NY',
      country: 'USA'
    }
  };

  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(private clinicService: ClinicService) {}

  ngOnInit(): void {
    this.clinicService.getClinicDetails().subscribe({
      next: (res) => {
        if (res.data?.clinic) {
          this.clinic = res.data.clinic;
        }
      }
    });
  }

  saveSettings(): void {
    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.clinicService.updateClinicDetails(this.clinic).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Clinic facility profile updated successfully!';
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Failed to update clinic settings.';
      }
    });
  }
}
