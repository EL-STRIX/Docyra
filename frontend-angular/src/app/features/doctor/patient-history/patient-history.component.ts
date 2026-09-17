import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
    <div class="history-page">
      <div class="page-header">
        <div>
          <h2>Patient Clinical History</h2>
          <p>Consultation timeline and past medical encounters</p>
        </div>

        <input
          type="text"
          [(ngModel)]="searchQuery"
          (input)="filterHistory()"
          placeholder="Search patient by name or email..."
          class="search-input"
        />
      </div>

      <div class="portal-card">
        <div *ngIf="loading" class="loading-state">Loading patient records...</div>

        <div *ngIf="!loading && filteredRecords.length === 0" class="empty-state">
          No past consultation records found.
        </div>

        <table *ngIf="!loading && filteredRecords.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient Name</th>
              <th>Chief Complaint</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rec of filteredRecords">
              <td>{{ formatDate(rec.slotId?.slotStart) }}</td>
              <td class="font-bold">{{ rec.patientId?.firstName }} {{ rec.patientId?.lastName }}</td>
              <td>{{ rec.reason || 'General Health Consultation' }}</td>
              <td>
                <app-status-badge [status]="rec.status"></app-status-badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .history-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .search-input { width: 320px; padding: 10px 16px; border-radius: 10px; border: 1px solid var(--docyra-neutral-border); font-size: 13px; outline: none; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    .data-table th { padding: 14px 16px; border-bottom: 2px solid var(--docyra-neutral-border); font-size: 11px; text-transform: uppercase; color: var(--docyra-text-secondary); font-weight: 700; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .font-bold { font-weight: 700; }
    .empty-state { text-align: center; padding: 40px; color: #64748B; font-size: 13px; }
    .loading-state { text-align: center; padding: 40px; color: #64748B; }
  `]
})
export class PatientHistoryComponent implements OnInit {
  records: any[] = [];
  filteredRecords: any[] = [];
  searchQuery = '';
  loading = true;

  constructor(private doctorService: DoctorService) {}

  ngOnInit(): void {
    this.doctorService.getSchedule().subscribe({
      next: (res) => {
        this.loading = false;
        this.records = res.data?.appointments || [];
        this.filteredRecords = this.records;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filterHistory(): void {
    if (!this.searchQuery.trim()) {
      this.filteredRecords = this.records;
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredRecords = this.records.filter((r) => {
      const name = `${r.patientId?.firstName} ${r.patientId?.lastName}`.toLowerCase();
      const email = (r.patientId?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }

  formatDate(iso?: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium' });
  }
}
