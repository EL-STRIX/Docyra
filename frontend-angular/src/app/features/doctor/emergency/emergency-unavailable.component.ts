import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-emergency-unavailable',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="emergency-page">
      <div class="portal-card emergency-card">
        <div class="danger-header">
          <div class="alert-icon">🚨</div>
          <div>
            <h2>Doctor Emergency Unavailability</h2>
            <p>Protocol for unexpected doctor illness, personal emergency, or clinic closure.</p>
          </div>
        </div>

        <div class="warning-box">
          <span class="font-bold">Automated Clinical Impact:</span>
          <ul>
            <li>Cancels all remaining scheduled appointments for today.</li>
            <li>Releases and unbooks today's active slots with status <code>cancelled_emergency</code>.</li>
            <li>Immediately dispatches priority SMS and email notifications to all affected patients.</li>
          </ul>
        </div>

        <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>
        <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>

        <form *ngIf="!successMessage" (ngSubmit)="triggerEmergency()" class="emergency-form">
          <div class="form-group">
            <label>Reason for Immediate Absence</label>
            <textarea
              [(ngModel)]="reason"
              name="reason"
              required
              rows="3"
              placeholder="e.g. Sudden medical emergency, acute illness, family bereavement..."
              class="form-control"
            ></textarea>
          </div>

          <div class="confirmation-box">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="confirmed" name="confirmed" required />
              <span>I confirm that I cannot conduct clinical consultations for the rest of today and authorize automated patient notifications.</span>
            </label>
          </div>

          <div class="btn-group">
            <a routerLink="/doctor/dashboard" class="btn-cancel">Cancel & Keep Active</a>
            <button type="submit" [disabled]="!confirmed || !reason || loading" class="btn-danger">
              {{ loading ? 'Processing Emergency Cancellations...' : '🚨 Trigger Emergency Absence' }}
            </button>
          </div>
        </form>

        <div *ngIf="successMessage" class="pt-4">
          <a routerLink="/doctor/dashboard" class="btn-primary">Return to Dashboard</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .emergency-page { max-width: 680px; margin: 20px auto; }
    .emergency-card { padding: 36px; display: flex; flex-direction: column; gap: 24px; border: 1px solid #FCA5A5; }
    .danger-header { display: flex; align-items: center; gap: 16px; }
    .alert-icon { font-size: 36px; }
    .danger-header h2 { margin: 0 0 4px; font-size: 22px; font-weight: 800; color: #991B1B; }
    .danger-header p { margin: 0; font-size: 13px; color: #7F1D1D; }
    .warning-box { background: #FEF2F2; border-radius: 14px; padding: 18px; border: 1px solid #FEE2E2; font-size: 13px; color: #991B1B; }
    .warning-box ul { margin: 8px 0 0 20px; padding: 0; }
    .warning-box li { margin-bottom: 4px; }
    .alert-error { background: #FDF0EF; color: #DC2626; padding: 12px; border-radius: 10px; font-size: 12px; }
    .alert-success { background: #E8F7F0; color: #1E7E53; padding: 12px; border-radius: 10px; font-size: 12px; }
    .emergency-form { display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--docyra-text-primary); }
    .form-control { padding: 12px; border-radius: 10px; border: 1px solid var(--docyra-neutral-border); font-size: 13px; outline: none; }
    .checkbox-label { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; color: #475569; cursor: pointer; text-transform: none; }
    .btn-group { display: flex; justify-content: flex-end; gap: 12px; align-items: center; }
    .btn-cancel { padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; color: #64748B; }
    .btn-danger { background: #DC2626; color: white; border: none; padding: 12px 22px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: var(--docyra-primary); color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; display: inline-block; font-weight: 700; }
  `]
})
export class EmergencyUnavailableComponent {
  reason = '';
  confirmed = false;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private doctorService: DoctorService,
    private authService: AuthService,
    private router: Router
  ) {}

  triggerEmergency(): void {
    const user = this.authService.userSignal();
    const doctorId = user?._id || 'me';

    this.loading = true;
    this.errorMessage = '';

    this.doctorService.triggerEmergencyUnavailable(doctorId, this.reason).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = `Emergency protocol executed. ${res.data?.cancelledCount || 0} scheduled patient visits have been cancelled with notification alerts sent.`;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to trigger emergency unavailable protocol.';
      }
    });
  }
}
