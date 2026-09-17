import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DoctorService } from '../../../core/services/doctor.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-doctor-appointment-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StatusBadgeComponent],
  template: `
    <div class="detail-page">
      <div class="top-nav">
        <a routerLink="/doctor/schedule" class="back-link">← Back to Schedule</a>
      </div>

      <div *ngIf="loading" class="loading-state">Loading appointment record...</div>

      <div *ngIf="!loading && appointment" class="portal-card detail-card">
        <div class="card-header">
          <div>
            <div class="ref-row">
              <h2>Consultation Record</h2>
              <app-status-badge [status]="appointment.status"></app-status-badge>
            </div>
            <p class="ref-text">ID: {{ appointment._id }} • Booked on {{ formatDate(appointment.createdAt) }}</p>
          </div>

          <div class="header-actions">
            <button *ngIf="appointment.status === 'booked'" (click)="updateStatus('confirmed')" class="btn-action btn-accept">
              ✓ Accept Booking
            </button>
            <button *ngIf="appointment.status === 'confirmed' || appointment.status === 'booked'" (click)="updateStatus('completed')" class="btn-action btn-complete">
              ✓ Mark Completed
            </button>
            <button *ngIf="appointment.status === 'confirmed' || appointment.status === 'booked'" (click)="updateStatus('no_show')" class="btn-action btn-noshow">
              Mark No-Show
            </button>
          </div>
        </div>

        <div class="grid-details">
          <div class="info-section">
            <h4>Patient Information</h4>
            <div class="info-box">
              <div class="info-row">
                <span class="label">Primary Patient:</span>
                <span class="val">{{ appointment.patientId?.firstName }} {{ appointment.patientId?.lastName }}</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="val">{{ appointment.patientId?.email }}</span>
              </div>
              <div *ngIf="appointment.dependentSnapshot?.fullName" class="info-row dep-highlight">
                <span class="label">Consultation For:</span>
                <span class="val font-bold">{{ appointment.dependentSnapshot.fullName }} ({{ appointment.dependentSnapshot.relationship }})</span>
              </div>
            </div>
          </div>

          <div class="info-section">
            <h4>Consultation Details</h4>
            <div class="info-box">
              <div class="info-row">
                <span class="label">Time Slot:</span>
                <span class="val">{{ formatDateTime(appointment.slotId?.slotStart) }}</span>
              </div>
              <div class="info-row">
                <span class="label">Clinic:</span>
                <span class="val">{{ appointment.clinicSnapshot?.name }}</span>
              </div>
              <div class="info-row">
                <span class="label">Chief Complaint:</span>
                <span class="val italic">"{{ appointment.reason || 'General Checkup' }}"</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Clinical Notes / Status update -->
        <div class="notes-section">
          <h4>Doctor Consultation Notes</h4>
          <textarea
            [(ngModel)]="doctorNotes"
            rows="4"
            placeholder="Add internal clinical observation, prescription summary, or followup requirements..."
            class="notes-input"
          ></textarea>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-page { display: flex; flex-direction: column; gap: 20px; max-width: 900px; margin: 0 auto; }
    .back-link { font-size: 13px; font-weight: 700; color: var(--docyra-primary); text-decoration: none; }
    .detail-card { padding: 32px; display: flex; flex-direction: column; gap: 28px; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 1px solid var(--docyra-neutral-border); }
    .ref-row { display: flex; align-items: center; gap: 12px; }
    .ref-row h2 { margin: 0; font-size: 22px; font-weight: 800; }
    .ref-text { margin: 6px 0 0; font-size: 12px; color: var(--docyra-text-secondary); }
    .header-actions { display: flex; gap: 8px; }
    .btn-action { padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; }
    .btn-accept { background: #E6F2F1; color: var(--docyra-primary); }
    .btn-complete { background: #E8F7F0; color: #1E7E53; }
    .btn-noshow { background: #F1F5F9; color: #475569; }
    .grid-details { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .info-section h4 { margin: 0 0 12px; font-size: 13px; text-transform: uppercase; font-weight: 800; color: var(--docyra-text-primary); }
    .info-box { background: #F8FAFC; border: 1px solid var(--docyra-neutral-border); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 10px; font-size: 13px; }
    .info-row { display: flex; justify-content: space-between; }
    .info-row .label { color: #64748B; font-weight: 600; }
    .info-row .val { font-weight: 600; color: var(--docyra-text-primary); }
    .dep-highlight { background: #F3E8FF; padding: 6px 8px; border-radius: 6px; }
    .notes-section h4 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; font-weight: 800; }
    .notes-input { width: 100%; border: 1px solid var(--docyra-neutral-border); border-radius: 12px; padding: 14px; font-size: 13px; outline: none; box-sizing: border-box; }
    .loading-state { text-align: center; padding: 40px; }
  `]
})
export class DoctorAppointmentDetailComponent implements OnInit {
  appointment: any = null;
  loading = true;
  doctorNotes = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private doctorService: DoctorService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.http.get<any>(`http://localhost:5000/api/v1/appointments/${id}`, { withCredentials: true }).subscribe({
        next: (res) => {
          this.loading = false;
          this.appointment = res.data?.appointment || res.data;
        },
        error: () => {
          this.loading = false;
        }
      });
    }
  }

  updateStatus(status: string): void {
    if (!this.appointment?._id) return;
    this.doctorService.updateAppointmentStatus(this.appointment._id, status, this.doctorNotes).subscribe({
      next: (res) => {
        this.appointment.status = status;
      }
    });
  }

  formatDate(iso?: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleDateString('en-US');
  }

  formatDateTime(iso?: string): string {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
