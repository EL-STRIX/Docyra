import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <!-- Brand Header -->
        <div class="auth-header">
          <div class="brand-logo">D</div>
          <h2>Docyra Portal</h2>
          <p>Privileged Access for Doctors, Clinic Admins & Staff</p>
        </div>

        <!-- Alerts -->
        <div *ngIf="errorMessage" class="alert-error">
          {{ errorMessage }}
        </div>

        <!-- Step 1: Email & Password -->
        <form *ngIf="!requires2FA" (ngSubmit)="handleLogin()" class="auth-form">
          <div class="form-group">
            <label>Work Email Address</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="doctor@clinic.com"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <div class="label-row">
              <label>Password</label>
              <a routerLink="/forgot-password" class="forgot-link">Forgot?</a>
            </div>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              placeholder="••••••••••••"
              class="form-control"
            />
          </div>

          <button type="submit" [disabled]="loading" class="btn-primary-auth">
            {{ loading ? 'Authenticating...' : 'Sign In to Portal' }}
          </button>
        </form>

        <!-- Step 2: Two-Factor Authentication Challenge -->
        <form *ngIf="requires2FA" (ngSubmit)="handle2FAVerify()" class="auth-form animate-fade">
          <div class="tfa-banner">
            <span class="tfa-icon">🛡️</span>
            <div>
              <div class="tfa-title">Two-Factor Authentication</div>
              <div class="tfa-desc">Enter the 6-digit verification code from your authenticator app.</div>
            </div>
          </div>

          <div class="form-group text-center">
            <input
              type="text"
              maxlength="6"
              [(ngModel)]="totpCode"
              name="totpCode"
              required
              placeholder="123456"
              class="form-control totp-input"
            />
          </div>

          <button type="submit" [disabled]="loading || totpCode.length !== 6" class="btn-primary-auth">
            {{ loading ? 'Verifying...' : 'Complete Secure Login' }}
          </button>

          <button type="button" (click)="requires2FA = false" class="btn-secondary-auth">
            Back to Password Login
          </button>
        </form>

        <div class="auth-footer">
          Docyra Clinic Management & Healthcare Security Protocol
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0F5C5C 0%, #0B4747 100%);
      padding: 24px;
    }
    .auth-card {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    }
    .auth-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .brand-logo {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: var(--docyra-primary);
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 8px 16px rgba(15, 92, 92, 0.25);
    }
    h2 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 800;
      color: var(--docyra-text-primary);
    }
    p {
      margin: 0;
      font-size: 13px;
      color: var(--docyra-text-secondary);
    }
    .alert-error {
      background: #FDF0EF;
      border: 1px solid #FCA5A5;
      color: #DC2626;
      padding: 12px;
      border-radius: 12px;
      font-size: 12px;
      margin-bottom: 20px;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: 12px;
      font-weight: 700;
      color: var(--docyra-text-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .forgot-link {
      font-size: 12px;
      color: var(--docyra-primary);
      text-decoration: none;
      font-weight: 600;
      &:hover { text-decoration: underline; }
    }
    .form-control {
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid var(--docyra-neutral-border);
      font-size: 14px;
      outline: none;
      transition: all 0.2s;
      &:focus {
        border-color: var(--docyra-primary);
        box-shadow: 0 0 0 3px var(--docyra-primary-light);
      }
    }
    .totp-input {
      text-align: center;
      font-size: 24px;
      letter-spacing: 0.3em;
      font-weight: 800;
      font-family: monospace;
    }
    .tfa-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px;
      background: #E6F2F1;
      border-radius: 14px;
    }
    .tfa-icon { font-size: 24px; }
    .tfa-title { font-size: 13px; font-weight: 700; color: #0F5C5C; }
    .tfa-desc { font-size: 11px; color: #5C6B6B; margin-top: 2px; }
    .btn-primary-auth {
      background: var(--docyra-primary);
      color: #ffffff;
      border: none;
      padding: 14px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      &:hover:not(:disabled) {
        background: var(--docyra-primary-dark);
      }
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
    .btn-secondary-auth {
      background: transparent;
      border: none;
      color: var(--docyra-text-secondary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      &:hover { text-decoration: underline; }
    }
    .auth-footer {
      margin-top: 28px;
      text-align: center;
      font-size: 11px;
      color: #94A3B8;
    }
    .animate-fade {
      animation: fadeIn 0.25s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  totpCode = '';
  tempToken = '';
  requires2FA = false;
  loading = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  handleLogin(): void {
    if (!this.email || !this.password) return;

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.data?.requires2FA) {
          this.requires2FA = true;
          this.tempToken = res.data.tempToken;
        } else {
          this.authService.redirectByRole();
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Authentication failed. Please verify credentials.';
      }
    });
  }

  handle2FAVerify(): void {
    if (this.totpCode.length !== 6) return;

    this.loading = true;
    this.errorMessage = '';

    this.authService.verify2FA(this.totpCode, this.tempToken).subscribe({
      next: () => {
        this.loading = false;
        this.authService.redirectByRole();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid 6-digit TOTP verification code.';
      }
    });
  }
}
