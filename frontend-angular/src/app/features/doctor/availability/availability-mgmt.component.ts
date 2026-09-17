import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { AuthService } from '../../../core/services/auth.service';

interface DaySchedule {
  dayOfWeek: number; // 0=Sunday, 1=Monday...
  dayName: string;
  isActive: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

@Component({
  selector: 'app-availability-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="availability-page">
      <div class="page-header">
        <div>
          <h2>Weekly Availability Rules</h2>
          <p>Configure recurring consultation hours for automated 60-day slot rolling generation</p>
        </div>
        <button (click)="saveSchedule()" [disabled]="saving" class="btn-save">
          {{ saving ? 'Saving Schedule...' : 'Save Availability' }}
        </button>
      </div>

      <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>

      <div class="schedule-matrix portal-card">
        <div class="matrix-header">
          <h3>Recurring Weekly Shift Matrix</h3>
          <p>Nightly cron generates open slots based on these active day windows.</p>
        </div>

        <div class="days-list">
          <div *ngFor="let day of schedule" class="day-row" [class.inactive]="!day.isActive">
            <div class="day-toggle">
              <label class="switch">
                <input type="checkbox" [(ngModel)]="day.isActive" />
                <span class="slider"></span>
              </label>
              <span class="day-label">{{ day.dayName }}</span>
            </div>

            <div class="time-controls" *ngIf="day.isActive">
              <div class="time-group">
                <span class="label">Consultation Hours</span>
                <div class="input-pair">
                  <input type="time" [(ngModel)]="day.startTime" class="time-input" />
                  <span>to</span>
                  <input type="time" [(ngModel)]="day.endTime" class="time-input" />
                </div>
              </div>

              <div class="time-group">
                <span class="label">Lunch / Break Hours</span>
                <div class="input-pair">
                  <input type="time" [(ngModel)]="day.breakStart" class="time-input" />
                  <span>to</span>
                  <input type="time" [(ngModel)]="day.breakEnd" class="time-input" />
                </div>
              </div>
            </div>

            <div class="off-label" *ngIf="!day.isActive">
              Doctor Not Available (Day Off)
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .availability-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; color: var(--docyra-text-primary); }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .btn-save { background: var(--docyra-primary); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .alert-success { background: #E8F7F0; color: #1E7E53; padding: 12px; border-radius: 10px; font-size: 12px; }
    .alert-error { background: #FDF0EF; color: #DC2626; padding: 12px; border-radius: 10px; font-size: 12px; }
    .schedule-matrix { padding: 28px; }
    .matrix-header h3 { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
    .matrix-header p { margin: 0 0 24px; font-size: 12px; color: var(--docyra-text-secondary); }
    .days-list { display: flex; flex-direction: column; gap: 14px; }
    .day-row { display: flex; align-items: center; justify-content: space-between; padding: 18px; border-radius: 14px; border: 1px solid var(--docyra-neutral-border); background: #ffffff; transition: all 0.2s; }
    .day-row.inactive { background: #F8FAFC; opacity: 0.7; }
    .day-toggle { display: flex; align-items: center; gap: 16px; min-width: 160px; }
    .day-label { font-size: 14px; font-weight: 700; color: var(--docyra-text-primary); }
    .time-controls { display: flex; align-items: center; gap: 32px; }
    .time-group { display: flex; flex-direction: column; gap: 4px; }
    .time-group .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B; }
    .input-pair { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .time-input { padding: 6px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 13px; outline: none; }
    .off-label { font-size: 12px; font-weight: 600; color: #94A3B8; font-style: italic; }
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #CBD5E1; transition: .3s; border-radius: 24px; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .slider { background-color: var(--docyra-primary); }
    input:checked + .slider:before { transform: translateX(20px); }
  `]
})
export class AvailabilityMgmtComponent implements OnInit {
  schedule: DaySchedule[] = [
    { dayOfWeek: 1, dayName: 'Monday', isActive: true, startTime: '09:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00' },
    { dayOfWeek: 2, dayName: 'Tuesday', isActive: true, startTime: '09:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00' },
    { dayOfWeek: 3, dayName: 'Wednesday', isActive: true, startTime: '09:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00' },
    { dayOfWeek: 4, dayName: 'Thursday', isActive: true, startTime: '09:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00' },
    { dayOfWeek: 5, dayName: 'Friday', isActive: true, startTime: '09:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00' },
    { dayOfWeek: 6, dayName: 'Saturday', isActive: false, startTime: '10:00', endTime: '14:00' },
    { dayOfWeek: 0, dayName: 'Sunday', isActive: false, startTime: '10:00', endTime: '14:00' }
  ];

  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(private doctorService: DoctorService, private authService: AuthService) {}

  ngOnInit(): void {}

  saveSchedule(): void {
    const user = this.authService.userSignal();
    const doctorId = user?._id || 'me';

    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.doctorService.updateAvailability(doctorId, this.schedule).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Availability rules updated successfully! Generated slots reflect your new shift windows.';
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Failed to save availability rules.';
      }
    });
  }
}
