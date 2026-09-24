import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Doctor } from '../../../core/models/doctor.model';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { format } from 'date-fns';

@Component({
  selector: 'app-emergency-unavailable',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="emergency-page">
      <div class="page-header">
        <div class="header-icon-wrap">
          <mat-icon>emergency</mat-icon>
        </div>
        <div>
          <h1 class="page-title">Emergency Unavailability Declaration</h1>
          <p class="page-subtitle">
            Instantly block out your calendar and initiate automated cancellation notices for affected patients.
          </p>
        </div>
      </div>

      <div class="content-grid">
        <!-- Action Form Card -->
        <mat-card class="form-card">
          <div class="warning-alert-box">
            <mat-icon class="warn-icon">warning</mat-icon>
            <div>
              <h3 class="font-bold text-sm text-amber-900">Immediate Patient Impact Warning</h3>
              <p class="text-xs text-amber-800 mt-1 leading-relaxed">
                Declaring emergency unavailability will cancel all confirmed and pending appointments on the selected date.
                Affected patients will receive immediate SMS/email alerts and automatic waitlist priority.
              </p>
            </div>
          </div>

          <form (ngSubmit)="submitEmergencyBlock()" class="emergency-form mt-6">
            <div class="form-group">
              <label class="form-label">Date of Unavailability</label>
              <mat-form-field appearance="outline" class="w-full">
                <input
                  matInput
                  type="date"
                  [(ngModel)]="selectedDate"
                  name="selectedDate"
                  [min]="minDate"
                  required
                />
              </mat-form-field>
            </div>

            <div class="form-group">
              <label class="form-label">Reason for Emergency Unavailability</label>
              <mat-form-field appearance="outline" class="w-full">
                <textarea
                  matInput
                  rows="4"
                  [(ngModel)]="reason"
                  name="reason"
                  placeholder="e.g. Medical emergency, urgent hospital duty, personal illness..."
                  required
                ></textarea>
                <mat-hint>This reason will be included in the patient cancellation notification.</mat-hint>
              </mat-form-field>
            </div>

            <div class="pt-4">
              <button
                mat-flat-button
                color="warn"
                type="submit"
                [disabled]="submitting || !reason.trim() || !selectedDate"
                class="declare-btn"
              >
                <mat-spinner *ngIf="submitting" diameter="20" class="mr-2"></mat-spinner>
                <mat-icon *ngIf="!submitting">cancel</mat-icon>
                <span>Declare Emergency & Cancel Affected Slots</span>
              </button>
            </div>
          </form>
        </mat-card>

        <!-- Existing Unavailability Overrides -->
        <mat-card class="history-card">
          <h2 class="card-title">Recent Unavailability Overrides</h2>
          <p class="card-desc">History of previously blocked dates</p>

          <div *ngIf="overrides.length === 0" class="empty-overrides">
            <mat-icon class="empty-icon">check_circle</mat-icon>
            <p>No active unavailability overrides recorded.</p>
          </div>

          <div *ngIf="overrides.length > 0" class="overrides-list">
            <div *ngFor="let item of overrides" class="override-item">
              <div class="override-date">
                <mat-icon>event_busy</mat-icon>
                <span>{{ item.date }}</span>
              </div>
              <div class="override-reason">{{ item.reason || 'Emergency block' }}</div>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .emergency-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1000px;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background-color: #FDF2F2;
      color: #D9534F;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
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

    .content-grid {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 24px;
    }

    @media (max-width: 860px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    .form-card, .history-card {
      padding: 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .warning-alert-box {
      background-color: #FEF6EC;
      border: 1px solid #FCDFB5;
      padding: 16px;
      border-radius: 8px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .warn-icon {
      color: #B57416;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .emergency-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .declare-btn {
      width: 100%;
      height: 46px;
      font-weight: 700 !important;
      font-size: 14px !important;
    }

    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 2px;
    }

    .card-desc {
      font-size: 12px;
      color: #5C6B6B;
      margin: 0 0 16px;
    }

    .empty-overrides {
      text-align: center;
      padding: 32px 16px;
      color: #5C6B6B;
      font-size: 13px;
    }

    .empty-icon {
      color: #2E9E6B;
      font-size: 36px;
      width: 36px;
      height: 36px;
      margin-bottom: 8px;
    }

    .overrides-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .override-item {
      padding: 12px;
      border-radius: 8px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
    }

    .override-date {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #D9534F;
    }

    .override-date mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .override-reason {
      font-size: 12px;
      color: #5C6B6B;
      margin-top: 4px;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class EmergencyUnavailableComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private notificationService = inject(NotificationService);

  doctorProfile: Doctor | null = null;
  selectedDate = format(new Date(), 'yyyy-MM-dd');
  minDate = format(new Date(), 'yyyy-MM-dd');
  reason = '';
  submitting = false;

  ngOnInit(): void {
    this.loadDoctor();
  }

  loadDoctor(): void {
    this.doctorService.getMyDoctorProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.doctorProfile = res.data;
        }
      },
    });
  }

  get overrides(): Array<{ date: string; reason?: string }> {
    return this.doctorProfile?.unavailabilityOverrides || [];
  }

  submitEmergencyBlock(): void {
    if (!this.doctorProfile || !this.selectedDate || !this.reason.trim()) return;

    this.submitting = true;
    this.doctorService
      .setEmergencyUnavailable(this.doctorProfile._id, this.selectedDate, this.reason)
      .subscribe({
        next: () => {
          this.submitting = false;
          this.notificationService.warning(
            `Emergency unavailability declared for ${this.selectedDate}. Impacted appointments have been cancelled and patients notified.`
          );
          this.reason = '';
          this.loadDoctor();
        },
        error: (err) => {
          this.submitting = false;
          this.notificationService.error(err.error?.error?.message || 'Failed to declare emergency unavailability');
        },
      });
  }
}
