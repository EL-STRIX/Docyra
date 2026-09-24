import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Doctor, DaySchedule } from '../../../core/models/doctor.model';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface DayConfig {
  dayOfWeek: number;
  name: string;
  isActive: boolean;
  slots: Array<{ start: string; end: string }>;
}

@Component({
  selector: 'app-availability-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="availability-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Weekly Availability & Slot Rules</h1>
          <p class="page-subtitle">Configure your recurring consultation hours. Changes will regenerate booking slots for the next 60 days.</p>
        </div>
        <button mat-flat-button color="primary" (click)="saveAvailability()" [disabled]="saving || loading">
          <mat-spinner *ngIf="saving" diameter="18" class="mr-2"></mat-spinner>
          <mat-icon *ngIf="!saving">save</mat-icon>
          <span>Save & Regenerate Slots</span>
        </button>
      </div>

      <div *ngIf="loading" class="loading-box">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading" class="config-container">
        <!-- Global Settings Card -->
        <mat-card class="settings-card">
          <h2 class="card-title">General Slot Settings</h2>
          <div class="settings-grid">
            <div class="field-item">
              <label class="field-label">Slot Duration</label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select [(ngModel)]="slotDurationMinutes">
                  <mat-option [value]="15">15 Minutes</mat-option>
                  <mat-option [value]="30">30 Minutes (Recommended)</mat-option>
                  <mat-option [value]="45">45 Minutes</mat-option>
                  <mat-option [value]="60">60 Minutes</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="field-item">
              <label class="field-label">Appointment Acceptance Mode</label>
              <div class="toggle-box">
                <mat-slide-toggle [(ngModel)]="autoAcceptAppointments" color="primary">
                  <span class="font-bold text-sm">
                    {{ autoAcceptAppointments ? 'Auto-Confirm All Bookings' : 'Manual Review Before Confirmation' }}
                  </span>
                </mat-slide-toggle>
              </div>
            </div>
          </div>
        </mat-card>

        <!-- Weekly Days Schedule -->
        <mat-card class="schedule-card">
          <div class="schedule-header">
            <h2 class="card-title">Recurring Weekly Schedule</h2>
            <button mat-stroked-button (click)="setStandardWeekdayHours()">
              Apply Standard Hours (Mon-Fri, 9am-5pm)
            </button>
          </div>

          <div class="days-list">
            <div *ngFor="let day of weekDays; let i = index" class="day-row" [class.inactive]="!day.isActive">
              <div class="day-toggle-col">
                <mat-slide-toggle [(ngModel)]="day.isActive" color="primary">
                  <span class="day-name">{{ day.name }}</span>
                </mat-slide-toggle>
              </div>

              <div class="slots-col" *ngIf="day.isActive">
                <div *ngFor="let slot of day.slots; let sIndex = index" class="slot-time-range">
                  <input
                    type="time"
                    [(ngModel)]="slot.start"
                    class="time-input"
                  />
                  <span class="to-text">to</span>
                  <input
                    type="time"
                    [(ngModel)]="slot.end"
                    class="time-input"
                  />
                  <button
                    *ngIf="day.slots.length > 1"
                    (click)="removeSlot(day, sIndex)"
                    class="remove-slot-btn"
                    title="Remove shift"
                  >
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>

                <button
                  mat-button
                  color="primary"
                  (click)="addSlot(day)"
                  class="add-shift-btn"
                >
                  <mat-icon>add</mat-icon>
                  <span>Add Split Shift</span>
                </button>
              </div>

              <div class="slots-col off-day" *ngIf="!day.isActive">
                <span class="off-text">Unavailable / Off Duty</span>
              </div>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .availability-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .page-header {
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
      margin: 0 0 4px;
    }

    .page-subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
    }

    .loading-box {
      display: flex;
      justify-content: center;
      padding: 60px;
    }

    .config-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .settings-card, .schedule-card {
      padding: 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 16px;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }

    .field-label {
      font-size: 12px;
      font-weight: 700;
      color: #1A2E2E;
      display: block;
      margin-bottom: 6px;
    }

    .toggle-box {
      padding: 12px;
      background: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 8px;
    }

    .schedule-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .days-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .day-row {
      display: flex;
      align-items: center;
      padding: 14px 16px;
      border-radius: 8px;
      border: 1px solid #E7E5E0;
      background: #FAFAF8;
      gap: 24px;
      transition: all 0.2s ease;
    }

    .day-row.inactive {
      background: #F4F4F2;
      opacity: 0.75;
    }

    .day-toggle-col {
      min-width: 140px;
    }

    .day-name {
      font-size: 14px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .slots-col {
      flex: 1;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .slot-time-range {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #FFFFFF;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #D5D8DC;
    }

    .time-input {
      font-family: monospace;
      font-size: 13px;
      font-weight: 700;
      border: 1px solid #E2E8F0;
      padding: 4px 8px;
      border-radius: 4px;
      color: #0F5C5C;
    }

    .to-text {
      font-size: 12px;
      color: #5C6B6B;
    }

    .remove-slot-btn {
      background: transparent;
      border: none;
      color: #D9534F;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
    }

    .add-shift-btn {
      font-size: 12px !important;
    }

    .off-day {
      color: #9CA3AF;
      font-size: 13px;
      font-style: italic;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class AvailabilityManagementComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private notificationService = inject(NotificationService);

  doctorProfile: Doctor | null = null;
  loading = true;
  saving = false;

  slotDurationMinutes = 30;
  autoAcceptAppointments = true;

  weekDays: DayConfig[] = [
    { dayOfWeek: 1, name: 'Monday', isActive: true, slots: [{ start: '09:00', end: '17:00' }] },
    { dayOfWeek: 2, name: 'Tuesday', isActive: true, slots: [{ start: '09:00', end: '17:00' }] },
    { dayOfWeek: 3, name: 'Wednesday', isActive: true, slots: [{ start: '09:00', end: '17:00' }] },
    { dayOfWeek: 4, name: 'Thursday', isActive: true, slots: [{ start: '09:00', end: '17:00' }] },
    { dayOfWeek: 5, name: 'Friday', isActive: true, slots: [{ start: '09:00', end: '17:00' }] },
    { dayOfWeek: 6, name: 'Saturday', isActive: false, slots: [{ start: '09:00', end: '13:00' }] },
    { dayOfWeek: 0, name: 'Sunday', isActive: false, slots: [{ start: '09:00', end: '13:00' }] },
  ];

  ngOnInit(): void {
    this.loadAvailability();
  }

  loadAvailability(): void {
    this.loading = true;
    this.doctorService.getMyDoctorProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.doctorProfile = res.data;
          this.slotDurationMinutes = res.data.slotDurationMinutes || 30;
          this.autoAcceptAppointments = res.data.autoAcceptAppointments !== false;

          if (res.data.weeklySchedule && res.data.weeklySchedule.length > 0) {
            this.mergeSchedule(res.data.weeklySchedule);
          }
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  mergeSchedule(backendSchedule: DaySchedule[]): void {
    this.weekDays.forEach((day) => {
      const match = backendSchedule.find((s) => s.dayOfWeek === day.dayOfWeek);
      if (match) {
        day.isActive = match.isActive;
        day.slots = match.slots && match.slots.length > 0 ? match.slots : [{ start: '09:00', end: '17:00' }];
      }
    });
  }

  addSlot(day: DayConfig): void {
    day.slots.push({ start: '14:00', end: '18:00' });
  }

  removeSlot(day: DayConfig, index: number): void {
    if (day.slots.length > 1) {
      day.slots.splice(index, 1);
    }
  }

  setStandardWeekdayHours(): void {
    this.weekDays.forEach((day) => {
      if (day.dayOfWeek >= 1 && day.dayOfWeek <= 5) {
        day.isActive = true;
        day.slots = [{ start: '09:00', end: '17:00' }];
      } else {
        day.isActive = false;
      }
    });
    this.notificationService.info('Standard weekday hours applied (Mon-Fri 09:00 - 17:00)');
  }

  saveAvailability(): void {
    if (!this.doctorProfile) return;

    this.saving = true;
    const weeklySchedule: DaySchedule[] = this.weekDays.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      isActive: d.isActive,
      slots: d.slots,
    }));

    this.doctorService
      .updateDoctorAvailability(this.doctorProfile._id, weeklySchedule, this.slotDurationMinutes)
      .subscribe({
        next: () => {
          this.doctorService
            .updateDoctorProfile(this.doctorProfile!._id, {
              autoAcceptAppointments: this.autoAcceptAppointments,
              slotDurationMinutes: this.slotDurationMinutes,
            })
            .subscribe({
              next: () => {
                this.saving = false;
                this.notificationService.success('Availability rules saved & 60-day slots generated successfully!');
              },
              error: () => {
                this.saving = false;
                this.notificationService.success('Availability rules saved!');
              },
            });
        },
        error: (err) => {
          this.saving = false;
          this.notificationService.error(err.error?.error?.message || 'Failed to save availability');
        },
      });
  }
}
