import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-manage-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="patients-page">
      <div class="page-header">
        <div>
          <h2>Patient Registry & Directory</h2>
          <p>Inspect registered patient accounts and healthcare profiles</p>
        </div>

        <input
          type="text"
          [(ngModel)]="searchQuery"
          (input)="filterPatients()"
          placeholder="Search by patient name or email..."
          class="search-input"
        />
      </div>

      <div class="portal-card">
        <div *ngIf="loading" class="loading-state">Loading registered patients...</div>

        <div *ngIf="!loading && filteredPatients.length === 0" class="empty-state">
          No patients found matching the search criteria.
        </div>

        <table *ngIf="!loading && filteredPatients.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Verification</th>
              <th>Joined Date</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of filteredPatients">
              <td class="font-bold">{{ p.firstName }} {{ p.lastName }}</td>
              <td>{{ p.email }}</td>
              <td>{{ p.phone || 'N/A' }}</td>
              <td>
                <span [ngClass]="p.isVerified ? 'badge-verified' : 'badge-unverified'">
                  {{ p.isVerified ? 'Email Verified' : 'Pending Verification' }}
                </span>
              </td>
              <td>{{ formatDate(p.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .patients-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .search-input { width: 300px; padding: 10px 16px; border-radius: 10px; border: 1px solid var(--docyra-neutral-border); font-size: 13px; outline: none; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 12px 16px; border-bottom: 2px solid var(--docyra-neutral-border); font-size: 11px; text-transform: uppercase; color: var(--docyra-text-secondary); font-weight: 700; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .font-bold { font-weight: 700; }
    .badge-verified { background: #E8F7F0; color: #1E7E53; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
    .badge-unverified { background: #FEF6E9; color: #C07B12; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
    .loading-state, .empty-state { text-align: center; padding: 40px; color: #64748B; font-size: 13px; }
  `]
})
export class ManagePatientsComponent implements OnInit {
  patients: any[] = [];
  filteredPatients: any[] = [];
  searchQuery = '';
  loading = true;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    this.adminService.getPatients().subscribe({
      next: (res) => {
        this.loading = false;
        this.patients = res.data?.patients || [];
        this.filteredPatients = this.patients;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filterPatients(): void {
    if (!this.searchQuery.trim()) {
      this.filteredPatients = this.patients;
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredPatients = this.patients.filter((p) => {
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      const email = (p.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }

  formatDate(iso?: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleDateString('en-US');
  }
}
