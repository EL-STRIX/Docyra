import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Clinic } from '../../../core/models/clinic.model';
import { Doctor } from '../../../core/models/doctor.model';
import { Specialization } from '../../../core/models/specialization.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-manage-doctors',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StatusBadgeComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="manage-doctors-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Manage Clinic Physicians</h1>
          <p class="page-subtitle">Onboard, configure, and manage medical staff for {{ clinicProfile?.name || 'your clinic' }}.</p>
        </div>
        <button mat-flat-button color="primary" (click)="openAddModal()" class="add-btn">
          <mat-icon>person_add</mat-icon>
          <span>Onboard New Physician</span>
        </button>
      </div>

      <mat-card class="table-card">
        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
        </div>

        <div *ngIf="!loading && doctors.length === 0" class="empty-state">
          <mat-icon class="empty-icon">medical_services</mat-icon>
          <h3>No physicians onboarded yet</h3>
          <p>Click "Onboard New Physician" above to add doctors to your clinic.</p>
        </div>

        <div *ngIf="!loading && doctors.length > 0" class="table-container">
          <table class="doctors-table">
            <thead>
              <tr>
                <th>Physician Name</th>
                <th>Designation & Qualifications</th>
                <th>Consultation Fee</th>
                <th>Experience</th>
                <th>Slot Duration</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of doctors">
                <td>
                  <div class="font-bold text-neutral-900 text-sm">
                    {{ getDoctorDisplayName(doc) }}
                  </div>
                  <div class="text-xs text-neutral-500" *ngIf="getDoctorEmail(doc)">
                    {{ getDoctorEmail(doc) }}
                  </div>
                </td>

                <td>
                  <div class="spec-pill">
                    {{ getDoctorDesignation(doc) }}
                  </div>
                  <div class="text-xs text-neutral-500 mt-0.5" *ngIf="getDoctorQualifications(doc)">
                    {{ getDoctorQualifications(doc) }}
                  </div>
                </td>

                <td>
                  <div class="font-bold text-neutral-900 text-sm">₹{{ doc.consultationFee || 500 }}</div>
                  <div class="text-xs text-neutral-500">Per session</div>
                </td>

                <td>
                  <div class="font-bold text-neutral-800 text-sm">{{ getDoctorExperience(doc) }} Years</div>
                  <div class="text-xs text-neutral-500">Clinical practice</div>
                </td>

                <td class="text-sm font-semibold text-neutral-700">
                  {{ doc.slotDurationMinutes || 30 }} Minutes
                </td>

                <td>
                  <app-status-badge [status]="getDoctorStatus(doc)"></app-status-badge>
                </td>

                <td class="text-right actions-col">
                  <button
                    *ngIf="getDoctorStatus(doc) === 'active'"
                    mat-stroked-button
                    color="warn"
                    (click)="toggleStatus(doc._id, 'suspended')"
                    class="btn-sm action-btn"
                  >
                    <mat-icon class="btn-icon">block</mat-icon>
                    <span>Suspend</span>
                  </button>
                  <button
                    *ngIf="getDoctorStatus(doc) === 'suspended' || getDoctorStatus(doc) === 'pending'"
                    mat-flat-button
                    color="primary"
                    (click)="toggleStatus(doc._id, 'active')"
                    class="btn-sm action-btn"
                  >
                    <mat-icon class="btn-icon">check_circle</mat-icon>
                    <span>Activate</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>

      <!-- Onboard Doctor Modal -->
      <div *ngIf="showAddModal" class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
        <div class="modal-card">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Onboard New Physician</h3>
              <p class="modal-desc">Physicians added under {{ clinicProfile?.name || 'the clinic' }} are auto-approved and available immediately.</p>
            </div>
            <button mat-icon-button (click)="showAddModal = false" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="doctorForm" (ngSubmit)="onAddDoctor()" class="doctor-form mt-4">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Full Name *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="name" placeholder="Dr. Rajesh Patel" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">Work Email Address *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput type="email" formControlName="email" placeholder="rajesh.patel@clinic.com" />
                </mat-form-field>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Contact Phone Number</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="phone" placeholder="+91 98765 43210" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">Designation / Specialization *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select formControlName="specializationId" placeholder="Select Specialization">
                    <mat-option *ngFor="let spec of specializations" [value]="spec._id">
                      {{ spec.name }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Qualifications</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput formControlName="qualifications" placeholder="MBBS, MD (Medicine)" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">Consultation Fee (₹) *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput type="number" formControlName="consultationFee" placeholder="600" />
                </mat-form-field>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Experience (Years) *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput type="number" formControlName="experienceYears" placeholder="8" />
                </mat-form-field>
              </div>

              <div class="form-group">
                <label class="form-label">Consultation Slot Duration *</label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select formControlName="slotDurationMinutes">
                    <mat-option [value]="15">15 Minutes</mat-option>
                    <mat-option [value]="30">30 Minutes</mat-option>
                    <mat-option [value]="45">45 Minutes</mat-option>
                    <mat-option [value]="60">60 Minutes</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Temporary Account Password *</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput type="password" formControlName="password" placeholder="••••••••" />
              </mat-form-field>
            </div>

            <div class="modal-actions">
              <button mat-button type="button" (click)="showAddModal = false">Cancel</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="doctorForm.invalid || creating">
                <mat-spinner *ngIf="creating" diameter="18" class="mr-2"></mat-spinner>
                <span>{{ creating ? 'Onboarding...' : 'Onboard Physician' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-doctors-page {
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
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #A0C6C6;
      margin-bottom: 12px;
    }

    .table-container {
      overflow-x: auto;
    }

    .doctors-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .doctors-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .doctors-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
      vertical-align: middle;
    }

    .spec-pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      background-color: #E6F4F1;
      color: #0F5C54;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .btn-sm {
      font-size: 12px !important;
      height: 32px !important;
      line-height: 32px !important;
      padding: 0 12px !important;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .btn-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
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
      max-width: 620px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
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

    .mr-1 {
      margin-right: 4px;
    }

    .mr-2 {
      margin-right: 8px;
    }
  `],
})
export class ManageDoctorsComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  clinicProfile: Clinic | null = null;
  doctors: Doctor[] = [];
  specializations: Specialization[] = [];
  loading = true;
  showAddModal = false;
  creating = false;

  doctorForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    specializationId: ['', [Validators.required]],
    password: ['DocyraStaff@2026', [Validators.required, Validators.minLength(8)]],
    consultationFee: [500, [Validators.required, Validators.min(0)]],
    slotDurationMinutes: [30, [Validators.required]],
    experienceYears: [5, [Validators.required, Validators.min(0)]],
    qualifications: ['MBBS, MD'],
  });

  ngOnInit(): void {
    this.loadClinicAndDoctors();
    this.loadSpecializations();
  }

  loadClinicAndDoctors(): void {
    this.loading = true;
    this.clinicService.getMyClinicProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.clinicProfile = res.data;
          this.loadDoctors(res.data._id);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadDoctors(clinicId: string): void {
    this.clinicService.getClinicDoctors(clinicId).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.doctors = res.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadSpecializations(): void {
    this.clinicService.getSpecializations().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.specializations = res.data;
          if (this.specializations.length > 0 && !this.doctorForm.get('specializationId')?.value) {
            this.doctorForm.patchValue({ specializationId: this.specializations[0]._id });
          }
        }
      },
    });
  }

  openAddModal(): void {
    if (this.specializations.length > 0 && !this.doctorForm.get('specializationId')?.value) {
      this.doctorForm.patchValue({ specializationId: this.specializations[0]._id });
    }
    this.showAddModal = true;
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.showAddModal = false;
    }
  }

  toggleStatus(doctorId: string, status: 'active' | 'suspended'): void {
    this.clinicService.updateDoctorStatus(doctorId, status).subscribe({
      next: () => {
        this.notificationService.success(`Doctor status changed to ${status}`);
        if (this.clinicProfile) {
          this.loadDoctors(this.clinicProfile._id);
        }
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }

  onAddDoctor(): void {
    if (this.doctorForm.invalid || !this.clinicProfile) return;

    this.creating = true;
    const formVal = this.doctorForm.value;
    const quals = typeof formVal.qualifications === 'string'
      ? formVal.qualifications.split(',').map((q: string) => q.trim()).filter((q: string) => q.length > 0)
      : Array.isArray(formVal.qualifications) ? formVal.qualifications : ['MBBS'];

    const payload = {
      name: formVal.name.trim(),
      email: formVal.email.trim().toLowerCase(),
      phone: formVal.phone ? formVal.phone.trim() : undefined,
      specializationId: formVal.specializationId,
      password: formVal.password,
      consultationFee: Number(formVal.consultationFee) || 500,
      slotDurationMinutes: Number(formVal.slotDurationMinutes) || 30,
      experienceYears: Number(formVal.experienceYears) || 0,
      yearsExperience: Number(formVal.experienceYears) || 0,
      qualifications: quals,
    };

    this.clinicService.createDoctor(this.clinicProfile._id, payload).subscribe({
      next: () => {
        this.creating = false;
        this.showAddModal = false;
        this.doctorForm.reset({
          name: '',
          email: '',
          phone: '',
          specializationId: this.specializations[0]?._id || '',
          password: 'DocyraStaff@2026',
          consultationFee: 500,
          slotDurationMinutes: 30,
          experienceYears: 5,
          qualifications: 'MBBS, MD',
        });
        this.notificationService.success('Physician onboarded & auto-approved successfully!');
        this.loadDoctors(this.clinicProfile!._id);
      },
      error: (err) => {
        this.creating = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to onboard physician');
      },
    });
  }

  getDoctorDisplayName(doc: any): string {
    if (!doc) return 'Physician';
    let name = '';
    if (doc.userId && typeof doc.userId === 'object' && doc.userId.name) {
      name = doc.userId.name;
    } else if (doc.name) {
      name = doc.name;
    } else {
      name = 'Physician';
    }

    if (!/^dr\.?\s+/i.test(name)) {
      name = `Dr. ${name}`;
    }
    return name;
  }

  getDoctorEmail(doc: any): string {
    if (doc.userId && typeof doc.userId === 'object' && doc.userId.email) {
      return doc.userId.email;
    }
    return doc.email || '';
  }

  getDoctorDesignation(doc: any): string {
    if (doc.specializationId && typeof doc.specializationId === 'object' && doc.specializationId.name) {
      return doc.specializationId.name;
    }
    if (typeof doc.specializationId === 'string' && doc.specializationId) {
      const found = this.specializations.find((s) => s._id === doc.specializationId);
      if (found) return found.name;
      return doc.specializationId;
    }
    return 'General Physician';
  }

  getDoctorQualifications(doc: any): string {
    if (Array.isArray(doc.qualifications) && doc.qualifications.length > 0) {
      return doc.qualifications.join(', ');
    }
    if (typeof doc.qualifications === 'string' && doc.qualifications) {
      return doc.qualifications;
    }
    return 'MBBS';
  }

  getDoctorExperience(doc: any): number {
    if (doc.yearsExperience !== undefined && doc.yearsExperience !== null) {
      return doc.yearsExperience;
    }
    if (doc.experienceYears !== undefined && doc.experienceYears !== null) {
      return doc.experienceYears;
    }
    return 0;
  }

  getDoctorStatus(doc: any): string {
    if (doc.status) return doc.status;
    if (doc.userId && typeof doc.userId === 'object' && doc.userId.status) {
      return doc.userId.status;
    }
    return doc.isApproved ? 'active' : 'suspended';
  }
}
