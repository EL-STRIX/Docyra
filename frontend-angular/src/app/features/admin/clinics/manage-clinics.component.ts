import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Clinic } from '../../../core/models/clinic.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-manage-clinics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    StatusBadgeComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="manage-clinics-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Manage Healthcare Clinics & Hospitals</h1>
          <p class="page-subtitle">Onboard, configure, and oversee institutional healthcare partners across Docyra.</p>
        </div>
        <button mat-flat-button color="primary" (click)="openOnboardModal()">
          <mat-icon>add_business</mat-icon>
          <span>Onboard New Partner Clinic</span>
        </button>
      </div>

      <!-- Clinics Table Card -->
      <mat-card class="table-card">
        <div class="search-bar">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Search clinic name, city, or phone...</mat-label>
            <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applySearch()" />
            <mat-icon matPrefix class="mr-2 text-neutral-400">search</mat-icon>
          </mat-form-field>
        </div>

        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
        </div>

        <div *ngIf="!loading && filteredClinics.length === 0" class="empty-state">
          <mat-icon class="empty-icon">domain_disabled</mat-icon>
          <p>No clinics found matching your query.</p>
        </div>

        <div *ngIf="!loading && filteredClinics.length > 0" class="table-container">
          <table class="clinics-table">
            <thead>
              <tr>
                <th>Clinic Name</th>
                <th>Location</th>
                <th>Contact Info</th>
                <th>Status</th>
                <th>Rating</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of filteredClinics">
                <td>
                  <div class="font-bold text-neutral-900 text-sm">{{ c.name }}</div>
                  <div class="text-xs text-neutral-500">{{ c.slug }}</div>
                </td>

                <td>
                  <div class="text-sm font-semibold text-neutral-800">{{ getClinicCity(c) }}</div>
                  <div class="text-xs text-neutral-500">{{ getClinicStreet(c) }}</div>
                </td>

                <td>
                  <div class="text-xs font-semibold text-neutral-800">{{ getClinicPhone(c) }}</div>
                  <div class="text-xs text-neutral-500">{{ getClinicEmail(c) }}</div>
                </td>

                <td>
                  <app-status-badge [status]="isClinicActive(c) ? 'active' : 'suspended'"></app-status-badge>
                </td>

                <td class="text-sm font-bold text-amber-600">
                  ⭐ {{ c.rating ? (c.rating | number:'1.1-1') : '5.0' }} ({{ c.reviewCount || 0 }})
                </td>

                <td class="text-right actions-col">
                  <button
                    *ngIf="isClinicActive(c)"
                    mat-stroked-button
                    color="warn"
                    (click)="toggleClinicStatus(c._id, 'suspended')"
                    class="btn-sm"
                  >
                    Suspend
                  </button>
                  <button
                    *ngIf="!isClinicActive(c)"
                    mat-flat-button
                    color="primary"
                    (click)="toggleClinicStatus(c._id, 'active')"
                    class="btn-sm"
                  >
                    Activate
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>

      <!-- Onboard Clinic Modal -->
      <div *ngIf="showModal" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Onboard Healthcare Clinic</h3>
            <p class="modal-desc">Register a new clinic or hospital facility on the Docyra platform.</p>
          </div>

          <form [formGroup]="clinicForm" (ngSubmit)="onSaveClinic()" class="clinic-form mt-4">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Clinic Name</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="name" placeholder="Apex Specialty Hospital" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="phone" placeholder="+91 98765 43210" />
                </mat-form-field>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Contact Email</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput type="email" formControlName="email" placeholder="contact@apexhospital.com" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">City</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="city" placeholder="Bengaluru" />
                </mat-form-field>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Street Address</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="street" placeholder="100 Feet Road, Indiranagar" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">State & ZIP</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="state" placeholder="Karnataka, 560038" />
                </mat-form-field>
              </div>
            </div>

            <div class="modal-actions">
              <button mat-button type="button" (click)="showModal = false">Cancel</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="clinicForm.invalid || saving">
                <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
                <span>Complete Onboarding</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-clinics-page {
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

    .table-card {
      padding: 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      color: #5C6B6B;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #A0C6C6;
      margin-bottom: 8px;
    }

    .table-container {
      overflow-x: auto;
    }

    .clinics-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .clinics-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .clinics-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
    }

    .btn-sm {
      font-size: 12px !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 12px !important;
    }

    .text-right {
      text-align: right;
    }

    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      padding: 20px;
    }

    .modal-card {
      background: #FFFFFF;
      border-radius: 14px;
      padding: 28px;
      max-width: 560px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 4px;
    }

    .modal-desc {
      font-size: 12px;
      color: #5C6B6B;
      margin: 0;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 600px) {
      .grid-2 {
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

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class ManageClinicsComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  clinics: Clinic[] = [];
  filteredClinics: Clinic[] = [];
  loading = true;
  searchTerm = '';

  showModal = false;
  saving = false;

  clinicForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    city: ['Bengaluru', [Validators.required]],
    street: ['', [Validators.required]],
    state: ['Karnataka', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadClinics();
  }

  loadClinics(): void {
    this.loading = true;
    this.adminService.getClinics().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.clinics = res.data;
          this.applySearch();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  isClinicActive(c: any): boolean {
    if (typeof c?.isActive === 'boolean') return c.isActive;
    return c?.subscriptionStatus === 'active' || c?.status === 'active';
  }

  getClinicCity(c: any): string {
    if (c?.city) return c.city;
    if (typeof c?.address === 'object' && c?.address?.city) return c.address.city;
    if (typeof c?.address === 'string' && c?.address) return c.address;
    return 'India';
  }

  getClinicStreet(c: any): string {
    if (typeof c?.address === 'object' && c?.address?.street) return c.address.street;
    if (c?.street) return c.street;
    return '';
  }

  getClinicPhone(c: any): string {
    if (c?.contactPhone) return c.contactPhone;
    if (typeof c?.contact === 'object' && c?.contact?.phone) return c.contact.phone;
    return '-';
  }

  getClinicEmail(c: any): string {
    if (c?.contactEmail) return c.contactEmail;
    if (typeof c?.contact === 'object' && c?.contact?.email) return c.contact.email;
    return '-';
  }

  applySearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredClinics = [...this.clinics];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredClinics = this.clinics.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        this.getClinicCity(c).toLowerCase().includes(term) ||
        this.getClinicPhone(c).includes(term)
    );
  }

  openOnboardModal(): void {
    this.clinicForm.reset({
      city: 'Bengaluru',
      state: 'Karnataka',
    });
    this.showModal = true;
  }

  toggleClinicStatus(clinicId: string, newStatus: string): void {
    this.adminService.updateClinicStatus(clinicId, newStatus).subscribe({
      next: () => {
        this.notificationService.success(`Clinic status updated to ${newStatus}`);
        this.loadClinics();
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to update clinic status');
      },
    });
  }

  onSaveClinic(): void {
    if (this.clinicForm.invalid) return;

    this.saving = true;
    const v = this.clinicForm.value;
    const payload: Partial<Clinic> = {
      name: v.name,
      contact: {
        phone: v.phone,
        email: v.email,
      },
      address: {
        street: v.street,
        city: v.city,
        state: v.state,
        postalCode: '560001',
        country: 'India',
      },
      isActive: true,
      onboardingStatus: 'approved',
    };

    this.adminService.createClinic(payload).subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.notificationService.success('Clinic onboarded successfully!');
        this.loadClinics();
      },
      error: (err) => {
        this.saving = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to onboard clinic');
      },
    });
  }
}
