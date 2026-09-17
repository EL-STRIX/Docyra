import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-manage-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="manage-doctors-page">
      <div class="page-header">
        <div>
          <h2>Manage Clinic Doctors</h2>
          <p>Roster of practitioners onboarded directly under your clinic</p>
        </div>
        <button (click)="showAddModal = true" class="btn-add">
          + Onboard Doctor
        </button>
      </div>

      <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>

      <div class="portal-card">
        <div *ngIf="loading" class="loading-state">Loading clinic doctors...</div>

        <div *ngIf="!loading && doctors.length === 0" class="empty-state">
          No doctors currently registered under this clinic. Click "Onboard Doctor" to add your first practitioner.
        </div>

        <table *ngIf="!loading && doctors.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Doctor Name</th>
              <th>Email</th>
              <th>Specialization</th>
              <th>Consultation Fee</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let doc of doctors">
              <td class="font-bold">
                Dr. {{ doc.userId?.firstName }} {{ doc.userId?.lastName }}
              </td>
              <td>{{ doc.userId?.email }}</td>
              <td>{{ doc.specializationId?.name || 'General Practice' }}</td>
              <td>\${{ doc.consultationFee || 50 }}</td>
              <td>
                <span class="status-active">Active</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add Doctor Modal -->
      <div *ngIf="showAddModal" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Onboard Clinic Doctor</h3>
            <button (click)="showAddModal = false" class="btn-close">✕</button>
          </div>

          <form (ngSubmit)="handleAddDoctor()" class="modal-form">
            <div class="form-row">
              <div class="form-group">
                <label>First Name</label>
                <input type="text" [(ngModel)]="newDoctor.firstName" name="firstName" required class="form-control" />
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" [(ngModel)]="newDoctor.lastName" name="lastName" required class="form-control" />
              </div>
            </div>

            <div class="form-group">
              <label>Doctor Email (Login Credential)</label>
              <input type="email" [(ngModel)]="newDoctor.email" name="email" required class="form-control" />
            </div>

            <div class="form-group">
              <label>Temporary Password</label>
              <input type="password" [(ngModel)]="newDoctor.password" name="password" required minlength="8" class="form-control" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Specialization</label>
                <select [(ngModel)]="newDoctor.specializationId" name="specializationId" required class="form-control">
                  <option value="">-- Select Specialization --</option>
                  <option *ngFor="let spec of specializations" [value]="spec._id">{{ spec.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Consultation Fee ($ USD)</label>
                <input type="number" [(ngModel)]="newDoctor.consultationFee" name="consultationFee" required min="0" class="form-control" />
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" (click)="showAddModal = false" class="btn-cancel">Cancel</button>
              <button type="submit" [disabled]="submitting" class="btn-submit">
                {{ submitting ? 'Adding Doctor...' : 'Confirm & Onboard Doctor' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-doctors-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .btn-add { background: var(--docyra-primary); color: white; border: none; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 12px 16px; border-bottom: 2px solid var(--docyra-neutral-border); font-size: 11px; text-transform: uppercase; color: var(--docyra-text-secondary); font-weight: 700; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .font-bold { font-weight: 700; }
    .status-active { background: #E8F7F0; color: #1E7E53; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal-card { background: white; border-radius: 20px; padding: 32px; width: 100%; max-width: 520px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { margin: 0; font-size: 20px; font-weight: 800; }
    .btn-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #64748B; }
    .modal-form { display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--docyra-text-primary); }
    .form-control { padding: 10px 14px; border-radius: 10px; border: 1px solid var(--docyra-neutral-border); font-size: 13px; outline: none; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
    .btn-cancel { background: #F1F5F9; border: none; padding: 10px 18px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .btn-submit { background: var(--docyra-primary); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .alert-success { background: #E8F7F0; color: #1E7E53; padding: 12px; border-radius: 10px; font-size: 12px; }
    .alert-error { background: #FDF0EF; color: #DC2626; padding: 12px; border-radius: 10px; font-size: 12px; }
    .loading-state, .empty-state { text-align: center; padding: 40px; color: #64748B; font-size: 13px; }
  `]
})
export class ManageDoctorsComponent implements OnInit {
  doctors: any[] = [];
  specializations: any[] = [];
  loading = true;
  showAddModal = false;
  submitting = false;
  successMessage = '';
  errorMessage = '';

  newDoctor = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    specializationId: '',
    consultationFee: 60
  };

  constructor(private clinicService: ClinicService, private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadDoctors();
    this.adminService.getSpecializations().subscribe({
      next: (res) => {
        this.specializations = res.data?.specializations || [];
      }
    });
  }

  loadDoctors(): void {
    this.loading = true;
    this.clinicService.getClinicDoctors().subscribe({
      next: (res) => {
        this.loading = false;
        this.doctors = res.data?.doctors || [];
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  handleAddDoctor(): void {
    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.clinicService.addClinicDoctor(this.newDoctor).subscribe({
      next: () => {
        this.submitting = false;
        this.showAddModal = false;
        this.successMessage = 'Doctor onboarded successfully under your clinic!';
        this.newDoctor = { firstName: '', lastName: '', email: '', password: '', specializationId: '', consultationFee: 60 };
        this.loadDoctors();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Failed to onboard doctor.';
      }
    });
  }
}
