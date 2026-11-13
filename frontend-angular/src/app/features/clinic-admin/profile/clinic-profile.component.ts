import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Clinic } from '../../../core/models/clinic.model';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export const INDIAN_STATES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

interface ClinicFormData {
  name: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

@Component({
  selector: 'app-clinic-profile',
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
    <div class="clinic-profile-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge-icon">
            <mat-icon>domain</mat-icon>
          </div>
          <div>
            <h1 class="page-title">Clinic Profile & Details</h1>
            <p class="page-subtitle">Update public directory information, direct contact, and physical location for your clinic.</p>
          </div>
        </div>
        <div class="header-actions">
          <button
            mat-flat-button
            color="primary"
            (click)="saveClinic()"
            [disabled]="saving || loading || !form.name.trim()"
            class="save-btn"
          >
            <mat-spinner *ngIf="saving" diameter="18" class="btn-spinner"></mat-spinner>
            <mat-icon *ngIf="!saving">save</mat-icon>
            <span>{{ saving ? 'Saving Changes...' : 'Save Profile' }}</span>
          </button>
        </div>
      </div>

      <!-- Loading Spinner -->
      <div *ngIf="loading" class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <p class="loading-text">Loading clinic details...</p>
      </div>

      <!-- Main Profile Form -->
      <div *ngIf="!loading" class="form-wrapper">
        <!-- Section 1: Facility Information -->
        <mat-card class="section-card">
          <div class="section-header">
            <div class="section-icon-wrap primary">
              <mat-icon>local_hospital</mat-icon>
            </div>
            <div>
              <h2 class="section-title">Facility Information</h2>
              <p class="section-subtitle">Basic identification and public overview of the medical center.</p>
            </div>
          </div>

          <div class="fields-grid mt-4">
            <div class="form-field-group full-width">
              <label class="field-label">Clinic / Hospital Name <span class="required">*</span></label>
              <mat-form-field appearance="outline" class="w-full">
                <input
                  matInput
                  [(ngModel)]="form.name"
                  name="clinicName"
                  placeholder="e.g. Apollo City Care Center"
                  required
                />
                <mat-icon matPrefix class="field-prefix-icon">business</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-field-group full-width">
              <label class="field-label">About the Facility / Bio</label>
              <mat-form-field appearance="outline" class="w-full">
                <textarea
                  matInput
                  rows="3"
                  [(ngModel)]="form.description"
                  name="clinicDescription"
                  placeholder="Provide an overview of clinic specialties, facilities, and patient care standards..."
                ></textarea>
                <mat-icon matPrefix class="field-prefix-icon textarea-icon">description</mat-icon>
              </mat-form-field>
            </div>
          </div>
        </mat-card>

        <!-- Section 2: Contact Information -->
        <mat-card class="section-card">
          <div class="section-header">
            <div class="section-icon-wrap accent">
              <mat-icon>contact_phone</mat-icon>
            </div>
            <div>
              <h2 class="section-title">Contact Information</h2>
              <p class="section-subtitle">Official phone and email address used by patients for communications.</p>
            </div>
          </div>

          <div class="fields-grid mt-4">
            <div class="form-field-group">
              <label class="field-label">Contact Phone Number <span class="required">*</span></label>
              <mat-form-field appearance="outline" class="w-full">
                <input
                  matInput
                  type="tel"
                  [(ngModel)]="form.phone"
                  name="clinicPhone"
                  placeholder="+91 98765 43210"
                  required
                />
                <mat-icon matPrefix class="field-prefix-icon">phone</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-field-group">
              <label class="field-label">Contact Email Address <span class="required">*</span></label>
              <mat-form-field appearance="outline" class="w-full">
                <input
                  matInput
                  type="email"
                  [(ngModel)]="form.email"
                  name="clinicEmail"
                  placeholder="contact@clinic.docyra.app"
                  required
                />
                <mat-icon matPrefix class="field-prefix-icon">email</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-field-group full-width">
              <label class="field-label">Official Website URL (Optional)</label>
              <mat-form-field appearance="outline" class="w-full">
                <input
                  matInput
                  type="url"
                  [(ngModel)]="form.website"
                  name="clinicWebsite"
                  placeholder="https://www.clinic.com"
                />
                <mat-icon matPrefix class="field-prefix-icon">language</mat-icon>
              </mat-form-field>
            </div>
          </div>
        </mat-card>

        <!-- Section 3: Physical Location & Address -->
        <mat-card class="section-card">
          <div class="section-header">
            <div class="section-icon-wrap success">
              <mat-icon>location_on</mat-icon>
            </div>
            <div>
              <h2 class="section-title">Physical Address (India)</h2>
              <p class="section-subtitle">Clinic address shown to patients for in-person appointments and navigation.</p>
            </div>
          </div>

          <div class="fields-grid mt-4">
            <div class="form-field-group full-width">
              <label class="field-label">Street / Building Address <span class="required">*</span></label>
              <mat-form-field appearance="outline" class="w-full">
                <input
                  matInput
                  [(ngModel)]="form.street"
                  name="clinicStreet"
                  placeholder="e.g. 104 Healthcare Boulevard, 2nd Floor, Indiranagar"
                  required
                />
                <mat-icon matPrefix class="field-prefix-icon">home</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-field-group">
              <label class="field-label">City <span class="required">*</span></label>
              <mat-form-field appearance="outline" class="w-full">
                <input
                  matInput
                  [(ngModel)]="form.city"
                  name="clinicCity"
                  placeholder="e.g. Bengaluru"
                  required
                />
                <mat-icon matPrefix class="field-prefix-icon">location_city</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-field-group">
              <label class="field-label">State / Union Territory <span class="required">*</span></label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select
                  [(ngModel)]="form.state"
                  name="clinicState"
                  placeholder="Select Indian State"
                  required
                >
                  <mat-option *ngFor="let s of indianStates" [value]="s">
                    {{ s }}
                  </mat-option>
                </mat-select>
                <mat-icon matPrefix class="field-prefix-icon">map</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-field-group">
              <label class="field-label">Postal / PIN Code <span class="required">*</span></label>
              <mat-form-field appearance="outline" class="w-full">
                <input
                  matInput
                  maxlength="6"
                  [(ngModel)]="form.postalCode"
                  name="clinicPostalCode"
                  placeholder="e.g. 560001"
                  required
                />
                <mat-icon matPrefix class="field-prefix-icon">markunread_mailbox</mat-icon>
              </mat-form-field>
            </div>

            <div class="form-field-group">
              <label class="field-label">Country</label>
              <mat-form-field appearance="outline" class="w-full readonly-field">
                <input
                  matInput
                  [value]="form.country"
                  readonly
                  disabled
                  name="clinicCountry"
                />
                <mat-icon matPrefix class="field-prefix-icon flag-icon">flag</mat-icon>
                <span matSuffix class="country-badge">🇮🇳 India Only</span>
              </mat-form-field>
            </div>
          </div>
        </mat-card>

        <!-- Bottom Action Bar -->
        <div class="bottom-action-bar">
          <button
            mat-button
            type="button"
            (click)="resetForm()"
            [disabled]="saving || loading"
            class="reset-btn"
          >
            Reset Form
          </button>
          <button
            mat-flat-button
            color="primary"
            (click)="saveClinic()"
            [disabled]="saving || loading || !form.name.trim()"
            class="save-btn-bottom"
          >
            <mat-spinner *ngIf="saving" diameter="18" class="btn-spinner"></mat-spinner>
            <mat-icon *ngIf="!saving">check_circle</mat-icon>
            <span>{{ saving ? 'Saving Changes...' : 'Save Clinic Profile' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .clinic-profile-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 920px;
      margin: 0 auto;
      padding-bottom: 40px;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      background: #FFFFFF;
      padding: 20px 24px;
      border-radius: 14px;
      border: 1px solid #E7E5E0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-badge-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0F5C5C 0%, #0B4747 100%);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(15, 92, 92, 0.25);
    }

    .header-badge-icon mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
    }

    .page-title {
      font-size: 20px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 4px;
      letter-spacing: -0.3px;
    }

    .page-subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
    }

    .save-btn {
      padding: 0 22px !important;
      height: 42px !important;
      font-weight: 700 !important;
      border-radius: 8px !important;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: #0F5C5C !important;
      color: #FFFFFF !important;
      box-shadow: 0 2px 6px rgba(15, 92, 92, 0.3) !important;
      transition: all 0.2s ease;
    }

    .save-btn:hover:not([disabled]) {
      background-color: #0B4747 !important;
      transform: translateY(-1px);
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      background: #FFFFFF;
      border-radius: 14px;
      border: 1px solid #E7E5E0;
    }

    .loading-text {
      margin-top: 16px;
      font-size: 14px;
      color: #5C6B6B;
      font-weight: 600;
    }

    .form-wrapper {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .section-card {
      padding: 24px !important;
      border-radius: 14px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03) !important;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding-bottom: 16px;
      border-bottom: 1px solid #F1F3F5;
      margin-bottom: 20px;
    }

    .section-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .section-icon-wrap mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .section-icon-wrap.primary {
      background-color: rgba(15, 92, 92, 0.1);
      color: #0F5C5C;
    }

    .section-icon-wrap.accent {
      background-color: rgba(242, 169, 59, 0.12);
      color: #D97706;
    }

    .section-icon-wrap.success {
      background-color: rgba(16, 185, 129, 0.12);
      color: #059669;
    }

    .section-title {
      font-size: 16px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 2px;
      letter-spacing: -0.2px;
    }

    .section-subtitle {
      font-size: 12px;
      color: #5C6B6B;
      margin: 0;
    }

    .fields-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }

    @media (max-width: 640px) {
      .fields-grid {
        grid-template-columns: 1fr;
      }
    }

    .form-field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-field-group.full-width {
      grid-column: 1 / -1;
    }

    .field-label {
      font-size: 13px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .required {
      color: #DC2626;
      margin-left: 2px;
    }

    .field-prefix-icon {
      margin-right: 8px;
      color: #8C9E9E;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .textarea-icon {
      align-self: flex-start;
      margin-top: 10px;
    }

    .w-full {
      width: 100%;
    }

    .readonly-field input {
      color: #5C6B6B !important;
      font-weight: 600;
    }

    .country-badge {
      font-size: 12px;
      font-weight: 700;
      background: #F0FDF4;
      color: #166534;
      border: 1px solid #BBF7D0;
      padding: 4px 8px;
      border-radius: 6px;
      margin-right: 8px;
      white-space: nowrap;
    }

    .bottom-action-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 14px;
      padding: 16px 24px;
      background: #FFFFFF;
      border-radius: 14px;
      border: 1px solid #E7E5E0;
    }

    .reset-btn {
      color: #5C6B6B !important;
      font-weight: 600 !important;
    }

    .save-btn-bottom {
      padding: 0 24px !important;
      height: 44px !important;
      font-weight: 700 !important;
      border-radius: 8px !important;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: #0F5C5C !important;
      color: #FFFFFF !important;
      box-shadow: 0 2px 6px rgba(15, 92, 92, 0.3) !important;
    }

    .save-btn-bottom:hover:not([disabled]) {
      background-color: #0B4747 !important;
    }

    .btn-spinner {
      margin-right: 8px;
    }
  `],
})
export class ClinicProfileComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private notificationService = inject(NotificationService);

  indianStates = INDIAN_STATES;
  clinicId: string = '';
  loading = true;
  saving = false;

  form: ClinicFormData = {
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    street: '',
    city: '',
    state: 'Karnataka',
    postalCode: '',
    country: 'India',
  };

  private originalForm: ClinicFormData = { ...this.form };

  ngOnInit(): void {
    this.loadClinic();
  }

  loadClinic(): void {
    this.loading = true;
    this.clinicService.getMyClinicProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const c = res.data;
          this.clinicId = c._id;

          // Normalize address (string or object)
          let street = '';
          let city = c.city || '';
          let state = c.state || '';
          let postalCode = c.postalCode || '';

          if (typeof c.address === 'object' && c.address !== null) {
            street = c.address.street || '';
            if (!city) city = c.address.city || '';
            if (!state) state = c.address.state || '';
            if (!postalCode) postalCode = c.address.postalCode || '';
          } else if (typeof c.address === 'string') {
            street = c.address;
          }

          // Normalize contact
          let phone = c.contactPhone || '';
          let email = c.contactEmail || '';
          let website = c.website || '';

          if (c.contact && typeof c.contact === 'object') {
            if (!phone) phone = c.contact.phone || '';
            if (!email) email = c.contact.email || '';
            if (!website) website = c.contact.website || '';
          }

          // If state is not found or empty, match city or default to Karnataka
          if (!state && city && city.toLowerCase() === 'bengaluru') {
            state = 'Karnataka';
          } else if (!state && city && city.toLowerCase() === 'mumbai') {
            state = 'Maharashtra';
          } else if (!state && city && city.toLowerCase() === 'hyderabad') {
            state = 'Telangana';
          } else if (!state) {
            state = 'Karnataka';
          }

          this.form = {
            name: c.name || '',
            description: c.description || '',
            phone,
            email,
            website,
            street,
            city,
            state,
            postalCode,
            country: 'India',
          };

          this.originalForm = { ...this.form };
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Failed to load clinic profile details');
      },
    });
  }

  saveClinic(): void {
    if (!this.clinicId) {
      this.notificationService.error('Cannot save: Clinic ID not found');
      return;
    }

    if (!this.form.name.trim()) {
      this.notificationService.warning('Clinic name is required');
      return;
    }

    if (!this.form.phone.trim()) {
      this.notificationService.warning('Contact phone number is required');
      return;
    }

    if (!this.form.email.trim()) {
      this.notificationService.warning('Contact email is required');
      return;
    }

    this.saving = true;

    // Build unified payload satisfying both flat and nested schemas
    const payload = {
      name: this.form.name.trim(),
      description: this.form.description?.trim() || '',
      address: this.form.street?.trim() || '',
      city: this.form.city?.trim() || '',
      state: this.form.state || 'Karnataka',
      postalCode: this.form.postalCode?.trim() || '',
      country: 'India',
      contactPhone: this.form.phone?.trim() || '',
      contactEmail: this.form.email?.trim() || '',
      website: this.form.website?.trim() || '',
      contact: {
        phone: this.form.phone?.trim() || '',
        email: this.form.email?.trim() || '',
        website: this.form.website?.trim() || '',
      },
    };

    this.clinicService.updateClinicProfile(this.clinicId, payload as any).subscribe({
      next: (res) => {
        this.saving = false;
        this.originalForm = { ...this.form };
        this.notificationService.success('Clinic profile details saved successfully');
      },
      error: (err) => {
        this.saving = false;
        const msg = err.error?.error?.message || err.error?.message || err.message || 'Failed to save clinic profile';
        this.notificationService.error(msg);
      },
    });
  }

  resetForm(): void {
    this.form = { ...this.originalForm };
    this.notificationService.info('Form reverted to last saved state');
  }
}
