import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Specialization } from '../../../core/models/specialization.model';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-manage-specializations',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="manage-specializations-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Medical Specialties & Departments</h1>
          <p class="page-subtitle">Configure clinical specializations displayed on the patient discovery portal.</p>
        </div>
        <button mat-flat-button color="primary" (click)="openCreateModal()">
          <mat-icon>add</mat-icon>
          <span>Add New Specialization</span>
        </button>
      </div>

      <!-- Specializations Grid / Table -->
      <mat-card class="table-card">
        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
        </div>

        <div *ngIf="!loading && specializations.length === 0" class="empty-state">
          <mat-icon class="empty-icon">category</mat-icon>
          <p>No specializations added yet.</p>
        </div>

        <div *ngIf="!loading && specializations.length > 0" class="table-container">
          <table class="spec-table">
            <thead>
              <tr>
                <th>Specialization Name</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Doctors</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of specializations">
                <td>
                  <div class="font-bold text-neutral-900 text-sm">{{ s.name }}</div>
                </td>
                <td>
                  <code class="slug-code">{{ s.slug }}</code>
                </td>
                <td class="text-sm text-neutral-600">
                  {{ s.description || 'Clinical specialty' }}
                </td>
                <td class="text-sm font-semibold text-teal-800">
                  {{ s.doctorCount || 0 }} Doctors
                </td>
                <td class="text-right actions-col">
                  <button mat-button color="primary" (click)="openEditModal(s)" class="btn-sm mr-2">
                    Edit
                  </button>
                  <button mat-button color="warn" (click)="deleteSpec(s._id)" class="btn-sm">
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>

      <!-- Add/Edit Modal -->
      <div *ngIf="showModal" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">{{ editingSpecId ? 'Edit Specialization' : 'Add Specialization' }}</h3>
          </div>

          <form [formGroup]="specForm" (ngSubmit)="saveSpec()" class="spec-form mt-4">
            <div class="form-group">
              <label class="form-label">Specialization Name</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput formControlName="name" placeholder="e.g. Cardiology" />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">URL Slug</label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput formControlName="slug" placeholder="e.g. cardiology" />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <mat-form-field appearance="outline" class="w-full">
                <textarea matInput rows="3" formControlName="description" placeholder="Department description..."></textarea>
              </mat-form-field>
            </div>

            <div class="modal-actions">
              <button mat-button type="button" (click)="showModal = false">Cancel</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="specForm.invalid || saving">
                <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
                <span>Save Specialization</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-specializations-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
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

    .spec-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .spec-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .spec-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
    }

    .slug-code {
      font-size: 12px;
      background: #FAFAF8;
      padding: 2px 6px;
      border: 1px solid #E7E5E0;
      border-radius: 4px;
    }

    .btn-sm {
      font-size: 12px !important;
      height: 32px !important;
      line-height: 32px !important;
    }

    .mr-2 {
      margin-right: 8px;
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
      max-width: 480px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
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
export class ManageSpecializationsComponent implements OnInit {
  private adminService = inject(AdminService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  specializations: Specialization[] = [];
  loading = true;
  showModal = false;
  editingSpecId: string | null = null;
  saving = false;

  specForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    slug: ['', [Validators.required]],
    description: [''],
  });

  ngOnInit(): void {
    this.loadSpecializations();
  }

  loadSpecializations(): void {
    this.loading = true;
    this.adminService.getSpecializations().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.specializations = res.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  openCreateModal(): void {
    this.editingSpecId = null;
    this.specForm.reset();
    this.showModal = true;
  }

  openEditModal(spec: Specialization): void {
    this.editingSpecId = spec._id;
    this.specForm.patchValue({
      name: spec.name,
      slug: spec.slug,
      description: spec.description,
    });
    this.showModal = true;
  }

  saveSpec(): void {
    if (this.specForm.invalid) return;

    this.saving = true;
    if (this.editingSpecId) {
      this.adminService.updateSpecialization(this.editingSpecId, this.specForm.value).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.notificationService.success('Specialization updated');
          this.loadSpecializations();
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(err.error?.error?.message || 'Failed to update specialization');
        },
      });
    } else {
      this.adminService.createSpecialization(this.specForm.value).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.notificationService.success('Specialization created');
          this.loadSpecializations();
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(err.error?.error?.message || 'Failed to create specialization');
        },
      });
    }
  }

  deleteSpec(id: string): void {
    if (!confirm('Are you sure you want to remove this specialization?')) return;

    this.adminService.deleteSpecialization(id).subscribe({
      next: () => {
        this.notificationService.success('Specialization deleted');
        this.loadSpecializations();
      },
      error: (err) => {
        this.notificationService.error(err.error?.error?.message || 'Failed to delete specialization');
      },
    });
  }
}
