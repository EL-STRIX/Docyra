import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Clinic } from '../../../core/models/clinic.model';
import { Doctor } from '../../../core/models/doctor.model';
import { Appointment } from '../../../core/models/appointment.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-clinic-appointments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    DateFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="clinic-appointments-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Clinic Master Appointments</h1>
          <p class="page-subtitle">Unified register of all consultations across all doctors at {{ clinicProfile?.name || 'the clinic' }}.</p>
        </div>
      </div>

      <!-- Filter Controls -->
      <mat-card class="filter-card">
        <div class="filter-grid">
          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Search patient, doctor, reason...</mat-label>
              <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" placeholder="Type to filter..." />
              <mat-icon matPrefix class="mr-2 text-neutral-400">search</mat-icon>
            </mat-form-field>
          </div>

          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Filter by Physician</mat-label>
              <mat-select [(ngModel)]="selectedDoctorId" (selectionChange)="applyFilters()">
                <mat-option value="all">All Physicians</mat-option>
                <mat-option *ngFor="let doc of doctors" [value]="doc._id">
                  {{ getDoctorDisplayName(doc) }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="filter-item">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilters()">
                <mat-option value="all">All Statuses</mat-option>
                <mat-option value="confirmed">Confirmed</mat-option>
                <mat-option value="completed">Completed</mat-option>
                <mat-option value="pending">Pending</mat-option>
                <mat-option value="cancelled">Cancelled</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </mat-card>

      <!-- Appointments List Table -->
      <mat-card class="table-card">
        <div *ngIf="loading" class="loading-wrap">
          <mat-spinner diameter="36"></mat-spinner>
        </div>

        <div *ngIf="!loading && filteredAppointments.length === 0" class="empty-state">
          <mat-icon class="empty-icon">event_note</mat-icon>
          <h3>No appointments match your filter criteria</h3>
          <p>Try selecting a different doctor or clearing search parameters.</p>
        </div>

        <div *ngIf="!loading && filteredAppointments.length > 0" class="table-container">
          <table class="clinic-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Patient</th>
                <th>Assigned Physician</th>
                <th>Reason</th>
                <th>Consultation Fee</th>
                <th>Status</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let apt of filteredAppointments" class="table-row-clickable" (click)="openAppointmentDetails(apt)">
                <td>
                  <div class="font-bold text-sm text-neutral-800">
                    {{ apt.slotStart | portalDate:'dd MMM yyyy' }}
                  </div>
                  <div class="text-xs font-semibold text-teal-700">
                    {{ apt.slotStart | portalDate:'h:mm a' }}
                  </div>
                </td>

                <td>
                  <div class="font-bold text-neutral-900 text-sm">
                    {{ getPatientName(apt) }}
                    <span *ngIf="apt.bookedFor?.type === 'dependent'" class="dependent-pill">
                      {{ apt.bookedFor.relationship || 'Dependent' }}
                    </span>
                  </div>
                  <div class="text-xs text-neutral-500" *ngIf="getPatientPhone(apt)">
                    {{ getPatientPhone(apt) }}
                  </div>
                </td>

                <td>
                  <div class="font-bold text-neutral-900 text-sm">
                    {{ getDoctorName(apt) }}
                  </div>
                  <div *ngIf="getDoctorSpecialization(apt)" class="text-xs font-semibold text-teal-700 mt-0.5">
                    {{ getDoctorSpecialization(apt) }}
                  </div>
                </td>

                <td>
                  <div class="font-medium text-neutral-800 text-sm">
                    {{ apt.reasonForVisit || apt.notes || 'General Consultation' }}
                  </div>
                </td>

                <td>
                  <div class="font-bold text-sm text-neutral-900">₹{{ getAppointmentPrice(apt) }}</div>
                  <span class="payment-badge" [ngClass]="getPaymentStatusClass(apt)">
                    {{ getPaymentStatusDisplay(apt) }}
                  </span>
                </td>

                <td>
                  <app-status-badge [status]="apt.status"></app-status-badge>
                </td>

                <td class="text-right" (click)="$event.stopPropagation()">
                  <button mat-stroked-button color="primary" class="btn-sm action-btn" (click)="openAppointmentDetails(apt)">
                    <mat-icon class="btn-icon">visibility</mat-icon>
                    <span>View</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>

      <!-- Appointment Details Modal (Essential Info Only) -->
      <div *ngIf="selectedAppointment" class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
        <div class="appointment-modal-card">
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="header-left">
              <div class="apt-badge-row">
                <span class="apt-ref-id">#{{ selectedAppointment._id.slice(-6) }}</span>
                <app-status-badge [status]="selectedAppointment.status"></app-status-badge>
              </div>
              <h3 class="modal-title">Appointment Summary</h3>
            </div>
            <button mat-icon-button (click)="selectedAppointment = null" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <!-- Schedule Highlight Banner -->
            <div class="schedule-banner">
              <div class="schedule-icon-wrap">
                <mat-icon>event</mat-icon>
              </div>
              <div class="schedule-details">
                <div class="schedule-date">
                  {{ selectedAppointment.slotStart | portalDate:'EEEE, dd MMMM yyyy' }}
                </div>
                <div class="schedule-time">
                  {{ selectedAppointment.slotStart | portalDate:'h:mm a' }}
                  <span *ngIf="selectedAppointment.slotEnd"> - {{ selectedAppointment.slotEnd | portalDate:'h:mm a' }}</span>
                </div>
              </div>
            </div>

            <!-- Two-Column Needed Details -->
            <div class="details-grid">
              <!-- Patient Details Card -->
              <div class="detail-card">
                <div class="detail-card-header">
                  <mat-icon class="card-ic">person</mat-icon>
                  <span>Patient Information</span>
                </div>
                <div class="detail-rows">
                  <div class="detail-row">
                    <span class="detail-lbl">Patient Name</span>
                    <span class="detail-val font-bold text-neutral-900">
                      {{ getPatientName(selectedAppointment) }}
                      <span *ngIf="selectedAppointment.bookedFor?.type === 'dependent'" class="dependent-pill">
                        {{ selectedAppointment.bookedFor.relationship || 'Dependent' }}
                      </span>
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-lbl">Booking Type</span>
                    <span class="detail-val">
                      {{ selectedAppointment.bookedFor.type === 'dependent' ? 'Family Dependent' : 'Self Booking' }}
                    </span>
                  </div>
                  <div class="detail-row" *ngIf="getPatientPhone(selectedAppointment)">
                    <span class="detail-lbl">Phone Number</span>
                    <span class="detail-val font-medium text-neutral-800">
                      {{ getPatientPhone(selectedAppointment) }}
                    </span>
                  </div>
                  <div class="detail-row" *ngIf="getPatientEmail(selectedAppointment)">
                    <span class="detail-lbl">Email Address</span>
                    <span class="detail-val font-medium text-neutral-800">
                      {{ getPatientEmail(selectedAppointment) }}
                    </span>
                  </div>
                  <div class="detail-row" *ngIf="selectedAppointment.bookedFor.gender">
                    <span class="detail-lbl">Gender</span>
                    <span class="detail-val capitalize">
                      {{ selectedAppointment.bookedFor.gender }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Physician & Billing Card -->
              <div class="detail-card">
                <div class="detail-card-header">
                  <mat-icon class="card-ic">medical_services</mat-icon>
                  <span>Physician & Consultation Fee</span>
                </div>
                <div class="detail-rows">
                  <div class="detail-row">
                    <span class="detail-lbl">Attending Physician</span>
                    <span class="detail-val font-bold text-teal-800">
                      {{ getDoctorName(selectedAppointment) }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-lbl">Department / Specialty</span>
                    <span class="detail-val">
                      {{ getDoctorSpecialization(selectedAppointment) || 'General Practice' }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-lbl">Consultation Fee</span>
                    <span class="detail-val font-bold text-neutral-900">
                      ₹{{ getAppointmentPrice(selectedAppointment) }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-lbl">Payment Status</span>
                    <span class="detail-val">
                      <span class="payment-badge" [ngClass]="getPaymentStatusClass(selectedAppointment)">
                        {{ getPaymentStatusDisplay(selectedAppointment) }}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Reason for Visit -->
            <div class="visit-info-card">
              <div class="detail-card-header">
                <mat-icon class="card-ic">article</mat-icon>
                <span>Reason for Visit</span>
              </div>
              <div class="visit-reason-text">
                {{ selectedAppointment.reasonForVisit || 'General Medical Consultation' }}
              </div>
              <div class="visit-notes" *ngIf="selectedAppointment.notes && selectedAppointment.notes !== selectedAppointment.reasonForVisit">
                <span class="notes-lbl">Patient Notes:</span>
                <span class="notes-content">{{ selectedAppointment.notes }}</span>
              </div>
            </div>

            <!-- Cancellation Details (Only if cancelled) -->
            <div class="cancel-info-card" *ngIf="selectedAppointment.status === 'cancelled'">
              <div class="cancel-header">
                <mat-icon class="text-rose-600">cancel</mat-icon>
                <span class="font-bold text-rose-800">Cancellation Record</span>
              </div>
              <p class="cancel-text" *ngIf="selectedAppointment.cancellationReason">
                Reason: {{ selectedAppointment.cancellationReason }}
              </p>
              <div class="cancel-meta" *ngIf="selectedAppointment.cancelledAt || selectedAppointment.cancelledBy">
                <span *ngIf="selectedAppointment.cancelledBy">Cancelled by: {{ selectedAppointment.cancelledBy | titlecase }}</span>
                <span *ngIf="selectedAppointment.cancelledAt">• {{ selectedAppointment.cancelledAt | portalDate:'dd MMM yyyy, h:mm a' }}</span>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button mat-button (click)="selectedAppointment = null">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .clinic-appointments-page {
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

    .filter-card, .table-card {
      padding: 20px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .filter-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .filter-grid {
        grid-template-columns: 1fr;
      }
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

    .clinic-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .clinic-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6B6B;
      border-bottom: 2px solid #E7E5E0;
      background: #FAFAF8;
    }

    .clinic-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #E7E5E0;
      font-size: 13px;
      vertical-align: middle;
    }

    .dependent-pill {
      font-size: 9px;
      font-weight: 700;
      background-color: #FEF6EC;
      color: #B57416;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 4px;
    }

    .payment-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-top: 4px;
    }

    .payment-paid {
      background-color: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }

    .payment-pending {
      background-color: #FFFBEB;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    .payment-refunded {
      background-color: #FEF2F2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .w-full {
      width: 100%;
    }

    .table-row-clickable {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .table-row-clickable:hover {
      background-color: #F8FAF9;
    }

    .btn-sm {
      font-size: 12px !important;
      height: 32px !important;
      padding: 0 10px !important;
      line-height: 32px !important;
    }

    .action-btn {
      color: #0F5C54 !important;
      border-color: #0F5C54 !important;
    }

    .btn-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      margin-right: 4px;
    }

    /* Modal Backdrop & Card */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .appointment-modal-card {
      background: #FFFFFF;
      border-radius: 16px;
      max-width: 640px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      border: 1px solid #E5E7EB;
    }

    .modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #FFFFFF;
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .apt-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .apt-ref-id {
      font-size: 12px;
      font-weight: 800;
      font-family: monospace;
      color: #0F5C54;
      background: #E6F4F1;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0;
    }

    .close-btn {
      color: #9CA3AF;
    }

    .modal-body {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .schedule-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 18px;
      background: #F0FDFA;
      border: 1px solid #CCFBF1;
      border-radius: 12px;
    }

    .schedule-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #0F5C54;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .schedule-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .schedule-date {
      font-size: 14px;
      font-weight: 800;
      color: #0F5C54;
    }

    .schedule-time {
      font-size: 13px;
      font-weight: 600;
      color: #115E59;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    @media (max-width: 600px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
    }

    .detail-card {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .detail-card-header {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0F5C54;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid #E7E5E0;
      padding-bottom: 6px;
    }

    .card-ic {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .detail-rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      font-size: 12px;
    }

    .detail-lbl {
      color: #6B7280;
      font-weight: 500;
    }

    .detail-val {
      color: #1F2937;
      text-align: right;
    }

    .visit-info-card {
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .visit-reason-text {
      font-size: 13px;
      font-weight: 600;
      color: #1F2937;
    }

    .visit-notes {
      font-size: 12px;
      color: #4B5563;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      padding: 8px 12px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .notes-lbl {
      font-size: 11px;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
    }

    .notes-content {
      line-height: 1.4;
    }

    .cancel-info-card {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .cancel-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }

    .cancel-text {
      font-size: 12px;
      color: #991B1B;
      margin: 0;
      font-weight: 500;
    }

    .cancel-meta {
      font-size: 11px;
      color: #B91C1C;
    }

    .modal-footer {
      padding: 14px 24px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: flex-end;
      background: #F9FAFB;
    }
  `],
})
export class ClinicAppointmentsComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private appointmentService = inject(AppointmentService);

  clinicProfile: Clinic | null = null;
  doctors: Doctor[] = [];
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  loading = true;
  selectedAppointment: Appointment | null = null;

  searchTerm = '';
  selectedDoctorId = 'all';
  statusFilter = 'all';

  ngOnInit(): void {
    this.loadClinicData();
  }

  loadClinicData(): void {
    this.loading = true;
    this.clinicService.getMyClinicProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.clinicProfile = res.data;
          this.loadDoctors(res.data._id);
          this.loadAppointments(res.data._id);
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
      },
    });
  }

  loadAppointments(clinicId: string): void {
    this.appointmentService.getClinicAppointments(clinicId, { limit: 50 }).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.appointments = res.data;
          this.applyFilters();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    let result = [...this.appointments];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.bookedFor?.name?.toLowerCase().includes(term) ||
          a.reasonForVisit?.toLowerCase().includes(term) ||
          a.notes?.toLowerCase().includes(term) ||
          this.getDoctorName(a).toLowerCase().includes(term)
      );
    }

    if (this.selectedDoctorId !== 'all') {
      result = result.filter((a) => {
        const docId = typeof a.doctorId === 'object' ? (a.doctorId as any)._id : a.doctorId;
        return String(docId) === String(this.selectedDoctorId);
      });
    }

    if (this.statusFilter !== 'all') {
      result = result.filter((a) => a.status === this.statusFilter);
    }

    this.filteredAppointments = result;
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

    const spec = doc.specializationId?.name || (typeof doc.specializationId === 'string' ? doc.specializationId : '');
    if (spec) {
      return `${name} (${spec})`;
    }
    return name;
  }

  getDoctorName(apt: Appointment): string {
    if (apt.doctorId && typeof apt.doctorId === 'object') {
      const d = apt.doctorId as any;
      let name = '';
      if (d.userId && typeof d.userId === 'object' && d.userId.name) {
        name = d.userId.name;
      } else if (d.name) {
        name = d.name;
      }
      if (name) {
        if (!/^dr\.?\s+/i.test(name)) {
          name = `Dr. ${name}`;
        }
        return name;
      }
    }
    return 'Physician';
  }

  getDoctorSpecialization(apt: Appointment): string {
    if (apt.doctorId && typeof apt.doctorId === 'object') {
      const d = apt.doctorId as any;
      return d.specializationId?.name || '';
    }
    return '';
  }

  getAppointmentPrice(apt: Appointment): number {
    if (apt.consultationFee !== undefined && apt.consultationFee !== null) {
      return apt.consultationFee;
    }
    if (apt.doctorId && typeof apt.doctorId === 'object') {
      const d = apt.doctorId as any;
      if (d.consultationFee !== undefined && d.consultationFee !== null) {
        return d.consultationFee;
      }
    }
    return 500;
  }

  getPaymentStatusClass(apt: Appointment): string {
    if (apt.paymentStatus === 'completed') return 'payment-paid';
    if (apt.paymentStatus === 'refunded') return 'payment-refunded';
    return 'payment-pending';
  }

  getPaymentStatusDisplay(apt: Appointment): string {
    if (apt.paymentStatus === 'completed') return 'Paid Online';
    if (apt.paymentStatus === 'refunded') return 'Refunded';
    return 'Pay at Clinic';
  }

  openAppointmentDetails(apt: Appointment): void {
    this.selectedAppointment = apt;
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.selectedAppointment = null;
    }
  }

  getPatientName(apt: Appointment): string {
    if (apt?.bookedFor?.name) return apt.bookedFor.name;
    if (apt?.patientId && typeof apt.patientId === 'object' && (apt.patientId as any).name) {
      return (apt.patientId as any).name;
    }
    return 'Patient';
  }

  getPatientPhone(apt: Appointment): string {
    if (apt?.bookedFor?.phone) return apt.bookedFor.phone;
    if (apt?.patientId && typeof apt.patientId === 'object' && (apt.patientId as any).phone) {
      return (apt.patientId as any).phone;
    }
    return '';
  }

  getPatientEmail(apt: Appointment): string {
    if (apt?.bookedFor?.email) return apt.bookedFor.email;
    if (apt?.patientId && typeof apt.patientId === 'object' && (apt.patientId as any).email) {
      return (apt.patientId as any).email;
    }
    return '';
  }
}
