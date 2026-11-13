import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Appointment, AppointmentStatus } from '../../../core/models/appointment.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-doctor-appointment-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StatusBadgeComponent,
    DateFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  template: `
    <div class="detail-page">
      <div class="breadcrumb-bar">
        <a routerLink="/doctor/schedule" class="back-link">
          <mat-icon>arrow_back</mat-icon>
          <span>Back to Schedule</span>
        </a>
      </div>

      <div *ngIf="loading" class="loading-box">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && appointment" class="content-container">
        <!-- Top Status & Actions Header -->
        <div class="detail-header-card">
          <div class="header-main">
            <div>
              <div class="flex items-center gap-3">
                <h1 class="page-title">Appointment #{{ appointment._id | slice:-6 }}</h1>
                <app-status-badge [status]="appointment.status"></app-status-badge>
              </div>
              <p class="subtitle">
                Scheduled on {{ appointment.slotStart | portalDate:'EEEE, dd MMMM yyyy, h:mm a' }}
              </p>
            </div>

            <!-- Contextual Status Actions -->
            <div class="status-action-btns">
              <!-- Pending actions -->
              <ng-container *ngIf="appointment.status === 'pending'">
                <button mat-flat-button color="primary" (click)="updateStatus('confirmed')" [disabled]="updating">
                  <mat-icon>check</mat-icon>
                  <span>Accept Booking</span>
                </button>
                <button mat-stroked-button color="warn" (click)="showCancelModal = true" [disabled]="updating">
                  <mat-icon>close</mat-icon>
                  <span>Reject</span>
                </button>
              </ng-container>

              <!-- Confirmed actions -->
              <ng-container *ngIf="appointment.status === 'confirmed'">
                <button mat-flat-button color="primary" (click)="updateStatus('completed')" [disabled]="updating">
                  <mat-icon>done_all</mat-icon>
                  <span>Mark Completed</span>
                </button>
                <button mat-stroked-button (click)="updateStatus('no_show')" [disabled]="updating">
                  <mat-icon>person_off</mat-icon>
                  <span>Mark No-Show</span>
                </button>
                <button mat-stroked-button color="warn" (click)="showCancelModal = true" [disabled]="updating">
                  <mat-icon>cancel</mat-icon>
                  <span>Cancel Visit</span>
                </button>
              </ng-container>
            </div>
          </div>
        </div>

        <!-- Grid of Details -->
        <div class="details-grid">
          <!-- Patient & Visit Info -->
          <mat-card class="section-card">
            <h2 class="section-heading">Patient & Consultation Info</h2>

            <div class="info-list">
              <div class="info-row">
                <span class="info-lbl">Booked For:</span>
                <span class="info-val font-bold">
                  {{ getPatientName() }}
                  <span class="type-chip" [class.dependent]="appointment.bookedFor.type === 'dependent'">
                    {{ appointment.bookedFor.type === 'dependent' ? 'Dependent (' + (appointment.bookedFor.relationship || 'Family') + ')' : 'Self' }}
                  </span>
                </span>
              </div>

              <div class="info-row" *ngIf="appointment.bookedFor.dateOfBirth">
                <span class="info-lbl">Date of Birth:</span>
                <span class="info-val">{{ appointment.bookedFor.dateOfBirth | portalDate:'dd MMM yyyy' }}</span>
              </div>

              <div class="info-row">
                <span class="info-lbl">Reason for Visit:</span>
                <span class="info-val">{{ appointment.reasonForVisit || 'General Health Consultation' }}</span>
              </div>

              <div class="info-row">
                <span class="info-lbl">Consultation Fee:</span>
                <span class="info-val font-bold">₹{{ appointment.consultationFee }}</span>
              </div>

              <div class="info-row">
                <span class="info-lbl">Payment Status:</span>
                <span class="info-val capitalize font-bold" [class.text-emerald-600]="appointment.paymentStatus === 'completed'">
                  {{ appointment.paymentStatus }}
                </span>
              </div>

              <div class="info-row" *ngIf="appointment.cancelledBy">
                <span class="info-lbl text-rose-600">Cancellation Info:</span>
                <span class="info-val text-rose-600">
                  Cancelled by {{ appointment.cancelledBy }} (Reason: {{ appointment.cancellationReason || 'Not specified' }})
                </span>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-neutral-200" *ngIf="getPatientId()">
              <a [routerLink]="['/doctor/patients', getPatientId()]" mat-stroked-button color="primary" class="w-full">
                <mat-icon>history</mat-icon>
                <span>View Patient Medical History</span>
              </a>
            </div>
          </mat-card>

          <!-- Clinical Notes Card -->
          <mat-card class="section-card">
            <h2 class="section-heading">Doctor's Clinical Notes</h2>
            <p class="section-desc">Record consultation observations, prescriptions, or follow-up notes.</p>

            <mat-form-field appearance="outline" class="w-full mt-3">
              <mat-label>Clinical Visit Notes</mat-label>
              <textarea
                matInput
                rows="6"
                [(ngModel)]="visitNotes"
                placeholder="Enter patient diagnosis, advice, and next steps..."
              ></textarea>
            </mat-form-field>

            <button
              mat-flat-button
              color="primary"
              (click)="saveNotes()"
              [disabled]="savingNotes || visitNotes === appointment.notes"
              class="mt-2"
            >
              <mat-spinner *ngIf="savingNotes" diameter="18" class="mr-2"></mat-spinner>
              <span>Save Clinical Notes</span>
            </button>
          </mat-card>
        </div>
      </div>

      <!-- Cancellation / Rejection Modal -->
      <div *ngIf="showCancelModal" class="modal-backdrop">
        <div class="modal-card">
          <h3 class="modal-title">Cancel / Reject Appointment</h3>
          <p class="modal-desc">
            Please provide a cancellation reason. The patient will be notified immediately via real-time alert and email/SMS.
          </p>

          <mat-form-field appearance="outline" class="w-full mt-4">
            <mat-label>Reason for cancellation</mat-label>
            <textarea
              matInput
              rows="3"
              [(ngModel)]="cancelReason"
              placeholder="e.g. Schedule conflict, doctor unavailable..."
            ></textarea>
          </mat-form-field>

          <div class="modal-actions">
            <button mat-button (click)="showCancelModal = false">Nevermind</button>
            <button
              mat-flat-button
              color="warn"
              (click)="cancelAppointment()"
              [disabled]="!cancelReason.trim() || updating"
            >
              Confirm Cancellation
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #0F5C5C;
      font-weight: 700;
      font-size: 13px;
      text-decoration: none;
    }

    .loading-box {
      display: flex;
      justify-content: center;
      padding: 60px;
    }

    .content-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .detail-header-card {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E7E5E0;
      padding: 24px;
    }

    .header-main {
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
      margin: 0;
    }

    .subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 4px 0 0;
    }

    .status-action-btns {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 860px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
    }

    .section-card {
      padding: 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .section-heading {
      font-size: 16px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 4px;
    }

    .section-desc {
      font-size: 12px;
      color: #5C6B6B;
      margin: 0 0 16px;
    }

    .info-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      border-bottom: 1px solid #F1F3F5;
      padding-bottom: 10px;
    }

    .info-lbl {
      color: #5C6B6B;
    }

    .info-val {
      color: #1A2E2E;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .type-chip {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .type-chip.dependent {
      background: #FEF6EC;
      color: #B57416;
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
      margin: 0 0 6px;
    }

    .modal-desc {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0 0 16px;
      line-height: 1.5;
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
export class DoctorAppointmentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appointmentService = inject(AppointmentService);
  private notificationService = inject(NotificationService);

  appointmentId = '';
  appointment: Appointment | null = null;
  loading = true;
  updating = false;
  savingNotes = false;

  visitNotes = '';
  showCancelModal = false;
  cancelReason = '';

  ngOnInit(): void {
    this.appointmentId = this.route.snapshot.paramMap.get('id') || '';
    if (this.appointmentId) {
      this.loadAppointment();
    }
  }

  loadAppointment(): void {
    this.loading = true;
    this.appointmentService.getAppointmentById(this.appointmentId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.appointment = res.data;
          this.visitNotes = res.data.notes || '';
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Failed to load appointment details');
      },
    });
  }

  getPatientName(): string {
    if (this.appointment?.bookedFor?.name) return this.appointment.bookedFor.name;
    if (typeof this.appointment?.patientId === 'object' && this.appointment?.patientId && (this.appointment.patientId as any).name) {
      return (this.appointment.patientId as any).name;
    }
    return 'Patient';
  }

  getPatientId(): string | null {
    if (!this.appointment?.patientId) return null;
    if (typeof this.appointment.patientId === 'object') {
      return (this.appointment.patientId as any)._id;
    }
    return String(this.appointment.patientId);
  }

  updateStatus(status: AppointmentStatus): void {
    this.updating = true;
    this.appointmentService.updateAppointmentStatus(this.appointmentId, status, this.visitNotes).subscribe({
      next: (res) => {
        this.updating = false;
        if (res.success && res.data) {
          this.appointment = res.data;
          this.notificationService.success(`Appointment status updated to ${status}`);
        }
      },
      error: (err) => {
        this.updating = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }

  saveNotes(): void {
    this.savingNotes = true;
    this.appointmentService.updateAppointmentStatus(this.appointmentId, this.appointment!.status, this.visitNotes).subscribe({
      next: (res) => {
        this.savingNotes = false;
        if (res.success && res.data) {
          this.appointment = res.data;
          this.notificationService.success('Clinical notes saved successfully');
        }
      },
      error: (err) => {
        this.savingNotes = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to save notes');
      },
    });
  }

  cancelAppointment(): void {
    if (!this.cancelReason.trim()) return;

    this.updating = true;
    this.appointmentService.cancelAppointment(this.appointmentId, this.cancelReason).subscribe({
      next: (res) => {
        this.updating = false;
        this.showCancelModal = false;
        if (res.success && res.data) {
          this.appointment = res.data;
          this.notificationService.warning('Appointment cancelled');
        }
      },
      error: (err) => {
        this.updating = false;
        this.notificationService.error(err.error?.error?.message || 'Failed to cancel appointment');
      },
    });
  }
}
