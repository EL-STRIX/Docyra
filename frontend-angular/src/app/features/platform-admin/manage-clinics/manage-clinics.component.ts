import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-manage-clinics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="manage-clinics-page">
      <div class="page-header">
        <div>
          <h2>Partner Clinics Management</h2>
          <p>Onboard and monitor certified healthcare clinics on Docyra</p>
        </div>
        <button (click)="showCreateModal = true" class="btn-create">
          + Onboard New Clinic
        </button>
      </div>

      <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>

      <div class="portal-card">
        <div *ngIf="loading" class="loading-state">Loading partner clinics...</div>

        <table *ngIf="!loading && clinics.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Clinic Name</th>
              <th>City / Location</th>
              <th>Contact Info</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let cl of clinics">
              <td class="font-bold">{{ cl.name }}</td>
              <td>{{ cl.address?.city }}, {{ cl.address?.country }}</td>
              <td>
                <div>{{ cl.email }}</div>
                <div class="sub-text">{{ cl.phone }}</div>
              </td>
              <td>
                <span [ngClass]="cl.isActive ? 'badge-active' : 'badge-suspended'">
                  {{ cl.isActive ? 'Active' : 'Suspended' }}
                </span>
              </td>
              <td>
                <button (click)="toggleClinicStatus(cl)" class="btn-toggle">
                  {{ cl.isActive ? 'Suspend' : 'Activate' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create Clinic Modal -->
      <div *ngIf="showCreateModal" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Onboard New Partner Clinic</h3>
            <button (click)="showCreateModal = false" class="btn-close">✕</button>
          </div>

          <form (ngSubmit)="handleCreateClinic()" class="modal-form">
            <div class="form-group">
              <label>Clinic Legal Name</label>
              <input type="text" [(ngModel)]="newClinic.name" name="name" required class="form-control" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Official Email</label>
                <input type="email" [(ngModel)]="newClinic.email" name="email" required class="form-control" />
              </div>
              <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" [(ngModel)]="newClinic.phone" name="phone" required class="form-control" />
              </div>
            </div>

            <div class="form-group">
              <label>Street Address</label>
              <input type="text" [(ngModel)]="newClinic.address.street" name="street" class="form-control" />
            </div>

            <div class="form-row-3">
              <div class="form-group">
                <label>City</label>
                <input type="text" [(ngModel)]="newClinic.address.city" name="city" required class="form-control" />
              </div>
              <div class="form-group">
                <label>State</label>
                <input type="text" [(ngModel)]="newClinic.address.state" name="state" class="form-control" />
              </div>
              <div class="form-group">
                <label>Country</label>
                <input type="text" [(ngModel)]="newClinic.address.country" name="country" required class="form-control" />
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" (click)="showCreateModal = false" class="btn-cancel">Cancel</button>
              <button type="submit" [disabled]="submitting" class="btn-submit">
                {{ submitting ? 'Onboarding...' : 'Confirm Clinic Onboarding' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-clinics-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .btn-create { background: var(--docyra-primary); color: white; border: none; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 12px 16px; border-bottom: 2px solid var(--docyra-neutral-border); font-size: 11px; text-transform: uppercase; color: var(--docyra-text-secondary); font-weight: 700; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .font-bold { font-weight: 700; }
    .sub-text { font-size: 11px; color: #64748B; }
    .badge-active { background: #E8F7F0; color: #1E7E53; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .badge-suspended { background: #FDF0EF; color: #DC2626; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .btn-toggle { background: #F1F5F9; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal-card { background: white; border-radius: 20px; padding: 32px; width: 100%; max-width: 520px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { margin: 0; font-size: 20px; font-weight: 800; }
    .btn-close { background: none; border: none; font-size: 18px; cursor: pointer; }
    .modal-form { display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--docyra-text-primary); }
    .form-control { padding: 10px 14px; border-radius: 10px; border: 1px solid var(--docyra-neutral-border); font-size: 13px; outline: none; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
    .btn-cancel { background: #F1F5F9; border: none; padding: 10px 18px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .btn-submit { background: var(--docyra-primary); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .alert-success { background: #E8F7F0; color: #1E7E53; padding: 12px; border-radius: 10px; font-size: 12px; }
    .alert-error { background: #FDF0EF; color: #DC2626; padding: 12px; border-radius: 10px; font-size: 12px; }
    .loading-state { text-align: center; padding: 40px; color: #64748B; }
  `]
})
export class ManageClinicsComponent implements OnInit {
  clinics: any[] = [];
  loading = true;
  showCreateModal = false;
  submitting = false;
  successMessage = '';
  errorMessage = '';

  newClinic = {
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'USA'
    }
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadClinics();
  }

  loadClinics(): void {
    this.loading = true;
    this.adminService.getClinics().subscribe({
      next: (res) => {
        this.loading = false;
        this.clinics = res.data?.clinics || [];
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  toggleClinicStatus(clinic: any): void {
    const newStatus = !clinic.isActive;
    this.adminService.updateClinicStatus(clinic._id, newStatus).subscribe({
      next: () => {
        clinic.isActive = newStatus;
      }
    });
  }

  handleCreateClinic(): void {
    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminService.createClinic(this.newClinic).subscribe({
      next: () => {
        this.submitting = false;
        this.showCreateModal = false;
        this.successMessage = 'Clinic facility onboarded successfully!';
        this.newClinic = { name: '', email: '', phone: '', address: { street: '', city: '', state: '', country: 'USA' } };
        this.loadClinics();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Failed to onboard clinic.';
      }
    });
  }
}
