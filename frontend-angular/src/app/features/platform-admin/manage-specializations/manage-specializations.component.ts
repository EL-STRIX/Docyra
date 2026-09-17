import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-manage-specializations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="specializations-page">
      <div class="page-header">
        <div>
          <h2>Medical Specializations Directory</h2>
          <p>Configure medical departments and clinical specialties</p>
        </div>
        <button (click)="showAddModal = true" class="btn-add">
          + Add Specialization
        </button>
      </div>

      <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>

      <div class="portal-card">
        <div *ngIf="loading" class="loading-state">Loading specializations...</div>

        <table *ngIf="!loading && specializations.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let spec of specializations">
              <td class="font-bold">{{ spec.name }}</td>
              <td>{{ spec.description || 'Clinical department specialization' }}</td>
              <td>
                <span class="badge-active">Active</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add Specialization Modal -->
      <div *ngIf="showAddModal" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Add New Specialization</h3>
            <button (click)="showAddModal = false" class="btn-close">✕</button>
          </div>

          <form (ngSubmit)="handleAdd()" class="modal-form">
            <div class="form-group">
              <label>Specialization Name</label>
              <input type="text" [(ngModel)]="newSpec.name" name="name" required placeholder="e.g. Cardiology, Pediatrics" class="form-control" />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="newSpec.description" name="description" rows="3" class="form-control"></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" (click)="showAddModal = false" class="btn-cancel">Cancel</button>
              <button type="submit" [disabled]="submitting" class="btn-submit">
                {{ submitting ? 'Saving...' : 'Save Specialization' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .specializations-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .btn-add { background: var(--docyra-primary); color: white; border: none; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 12px 16px; border-bottom: 2px solid var(--docyra-neutral-border); font-size: 11px; text-transform: uppercase; color: var(--docyra-text-secondary); font-weight: 700; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .font-bold { font-weight: 700; }
    .badge-active { background: #E8F7F0; color: #1E7E53; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal-card { background: white; border-radius: 20px; padding: 32px; width: 100%; max-width: 480px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { margin: 0; font-size: 20px; font-weight: 800; }
    .btn-close { background: none; border: none; font-size: 18px; cursor: pointer; }
    .modal-form { display: flex; flex-direction: column; gap: 16px; }
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
export class ManageSpecializationsComponent implements OnInit {
  specializations: any[] = [];
  loading = true;
  showAddModal = false;
  submitting = false;
  successMessage = '';
  errorMessage = '';

  newSpec = {
    name: '',
    description: ''
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadSpecializations();
  }

  loadSpecializations(): void {
    this.loading = true;
    this.adminService.getSpecializations().subscribe({
      next: (res) => {
        this.loading = false;
        this.specializations = res.data?.specializations || [];
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  handleAdd(): void {
    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminService.createSpecialization(this.newSpec).subscribe({
      next: () => {
        this.submitting = false;
        this.showAddModal = false;
        this.successMessage = 'Specialization added successfully!';
        this.newSpec = { name: '', description: '' };
        this.loadSpecializations();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Failed to add specialization.';
      }
    });
  }
}
