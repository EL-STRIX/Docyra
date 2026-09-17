import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tfa-setup-card portal-card">
      <div class="header">
        <h3>Two-Factor Authentication Setup</h3>
        <p>Enhance the security of your privileged healthcare portal account.</p>
      </div>

      <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>

      <div *ngIf="step === 1" class="step-box">
        <button (click)="initiateSetup()" [disabled]="loading" class="btn-primary">
          {{ loading ? 'Generating Key...' : 'Generate 2FA Secret & QR' }}
        </button>
      </div>

      <div *ngIf="step === 2 && tfaData" class="step-box">
        <div class="qr-container">
          <img *ngIf="tfaData.qrCode" [src]="tfaData.qrCode" alt="QR Code" class="qr-img" />
          <div class="secret-box">
            <span class="label">Manual Entry Key:</span>
            <code>{{ tfaData.secret }}</code>
          </div>
        </div>

        <form (ngSubmit)="verifyCode()" class="verify-form">
          <label>Enter 6-digit Code from Authenticator App</label>
          <input
            type="text"
            maxlength="6"
            [(ngModel)]="code"
            name="code"
            required
            placeholder="123456"
            class="code-input"
          />
          <button type="submit" [disabled]="loading || code.length !== 6" class="btn-primary">
            {{ loading ? 'Verifying...' : 'Verify & Enable 2FA' }}
          </button>
        </form>
      </div>

      <div *ngIf="step === 3" class="step-box success-box">
        <div class="success-icon">✅</div>
        <h4>2FA Successfully Activated</h4>
        <p>Your account now requires a TOTP code on every login.</p>
        <button (click)="finish()" class="btn-primary">Return to Dashboard</button>
      </div>
    </div>
  `,
  styles: [`
    .tfa-setup-card {
      max-width: 500px;
      margin: 40px auto;
    }
    .header h3 { margin: 0 0 6px; font-size: 20px; font-weight: 800; color: var(--docyra-text-primary); }
    .header p { margin: 0 0 20px; font-size: 13px; color: var(--docyra-text-secondary); }
    .alert-error { background: #FDF0EF; color: #DC2626; padding: 12px; border-radius: 10px; font-size: 12px; margin-bottom: 16px; }
    .alert-success { background: #E8F7F0; color: #1E7E53; padding: 12px; border-radius: 10px; font-size: 12px; margin-bottom: 16px; }
    .qr-container { display: flex; flex-direction: column; align-items: center; gap: 16px; margin: 20px 0; }
    .qr-img { width: 180px; height: 180px; border-radius: 12px; border: 1px solid #E2E8F0; padding: 8px; }
    .secret-box { text-align: center; }
    .secret-box .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B; display: block; margin-bottom: 4px; }
    .secret-box code { background: #F1F5F9; padding: 6px 12px; border-radius: 8px; font-size: 14px; font-weight: 700; color: var(--docyra-primary); }
    .verify-form { display: flex; flex-direction: column; gap: 12px; }
    .verify-form label { font-size: 12px; font-weight: 700; }
    .code-input { text-align: center; font-size: 22px; font-family: monospace; letter-spacing: 0.25em; padding: 10px; border-radius: 10px; border: 1px solid #CBD5E1; }
    .btn-primary { background: var(--docyra-primary); color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; }
    .success-box { text-align: center; padding: 20px; }
    .success-icon { font-size: 40px; margin-bottom: 12px; }
  `]
})
export class TwoFactorComponent implements OnInit {
  step = 1;
  loading = false;
  tfaData: any = null;
  code = '';
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {}

  initiateSetup(): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService.setup2FA().subscribe({
      next: (res) => {
        this.loading = false;
        this.tfaData = res.data;
        this.step = 2;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to setup 2FA';
      }
    });
  }

  verifyCode(): void {
    if (this.code.length !== 6) return;
    this.loading = true;
    this.errorMessage = '';
    this.authService.verify2FA(this.code).subscribe({
      next: () => {
        this.loading = false;
        this.step = 3;
        this.successMessage = '2FA activated successfully';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid verification code';
      }
    });
  }

  finish(): void {
    this.authService.redirectByRole();
  }
}
