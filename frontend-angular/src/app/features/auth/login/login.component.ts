import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-page-wrapper">
      <div class="login-card-container">
        <!-- Brand Header -->
        <div class="brand-box">
          <div class="logo-badge">D</div>
          <h1 class="portal-heading">Docyra Operations Portal</h1>
          <p class="portal-subheading">Doctor, Clinic Admin & Platform Administration</p>
        </div>

        <mat-card class="auth-card">
          <mat-card-content class="card-content">
            <!-- Step 1: Email & Password Form -->
            <div *ngIf="!is2faRequired">
              <div class="step-header">
                <h2>Portal Sign In</h2>
                <p>Enter your credentials to access your administrative workspace.</p>
              </div>

              <div *ngIf="errorMessage" class="error-banner">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMessage }}</span>
              </div>

              <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
                <div class="form-group">
                  <label class="form-label">Work Email Address</label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input
                      matInput
                      type="email"
                      formControlName="email"
                      placeholder="doctor@clinic.com"
                      autocomplete="email"
                    />
                    <mat-icon matPrefix class="mr-2 text-neutral-400">mail</mat-icon>
                    <mat-error *ngIf="loginForm.get('email')?.hasError('required')">Email is required</mat-error>
                    <mat-error *ngIf="loginForm.get('email')?.hasError('email')">Please enter a valid email</mat-error>
                  </mat-form-field>
                </div>

                <div class="form-group">
                  <div class="label-row">
                    <label class="form-label">Password</label>
                    <a routerLink="/forgot-password" class="forgot-link">Forgot password?</a>
                  </div>
                  <mat-form-field appearance="outline" class="w-full">
                    <input
                      matInput
                      [type]="hidePassword ? 'password' : 'text'"
                      formControlName="password"
                      placeholder="••••••••"
                      autocomplete="current-password"
                    />
                    <mat-icon matPrefix class="mr-2 text-neutral-400">lock</mat-icon>
                    <button
                      mat-icon-button
                      matSuffix
                      type="button"
                      (click)="hidePassword = !hidePassword"
                      [attr.aria-label]="'Hide password'"
                      [attr.aria-pressed]="hidePassword"
                    >
                      <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                    <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Password is required</mat-error>
                  </mat-form-field>
                </div>

                <button
                  mat-flat-button
                  type="submit"
                  [disabled]="loginForm.invalid || loading"
                  class="submit-btn"
                >
                  <mat-spinner *ngIf="loading" diameter="20" class="btn-spinner"></mat-spinner>
                  <span *ngIf="!loading">Sign In to Portal</span>
                </button>
              </form>
            </div>

            <!-- Step 2: Two-Factor Authentication Challenge -->
            <div *ngIf="is2faRequired" class="two-fa-step">
              <div class="step-header">
                <div class="shield-icon-badge">
                  <mat-icon>security</mat-icon>
                </div>
                <h2>Two-Factor Verification</h2>
                <p>Enter the 6-digit verification code from your authenticator app.</p>
              </div>

              <div *ngIf="errorMessage" class="error-banner">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMessage }}</span>
              </div>

              <form [formGroup]="twoFactorForm" (ngSubmit)="onVerify2fa()" class="auth-form">
                <div class="form-group">
                  <label class="form-label text-center block">6-Digit Authenticator Code</label>
                  <mat-form-field appearance="outline" class="w-full code-input">
                    <input
                      matInput
                      type="text"
                      formControlName="code"
                      maxlength="6"
                      placeholder="000000"
                      class="text-center font-mono tracking-widest text-lg font-bold"
                    />
                    <mat-error *ngIf="twoFactorForm.get('code')?.hasError('required')">Code is required</mat-error>
                    <mat-error *ngIf="twoFactorForm.get('code')?.hasError('pattern')">Must be 6 numeric digits</mat-error>
                  </mat-form-field>
                </div>

                <button
                  mat-flat-button
                  type="submit"
                  [disabled]="twoFactorForm.invalid || loading"
                  class="submit-btn"
                >
                  <mat-spinner *ngIf="loading" diameter="20" class="btn-spinner"></mat-spinner>
                  <span *ngIf="!loading">Verify & Continue</span>
                </button>

                <button
                  mat-button
                  type="button"
                  (click)="cancel2fa()"
                  class="back-btn"
                >
                  ← Back to Email Sign In
                </button>
              </form>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Compliance & Security Notice Footer -->
        <div class="portal-footer-notice">
          <mat-icon class="lock-mini">lock</mat-icon>
          <span>End-to-End Encrypted Session. Authorized Clinical Personnel Only.</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page-wrapper {
      min-height: 100vh;
      background: linear-gradient(135deg, #0F5C5C 0%, #0B4747 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
    }

    .login-card-container {
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .brand-box {
      text-align: center;
      margin-bottom: 24px;
    }

    .logo-badge {
      width: 52px;
      height: 52px;
      background-color: #F2A93B;
      color: #1A2E2E;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 800;
      margin: 0 auto 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .portal-heading {
      color: #FFFFFF;
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 6px;
      letter-spacing: -0.5px;
    }

    .portal-subheading {
      color: #A0C6C6;
      font-size: 13px;
      margin: 0;
    }

    .auth-card {
      width: 100%;
      border-radius: 16px !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
      background-color: #FFFFFF;
      overflow: hidden;
    }

    .card-content {
      padding: 32px !important;
    }

    .step-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .step-header h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 6px;
    }

    .step-header p {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
    }

    .shield-icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: #E6F2F1;
      color: #0F5C5C;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }

    .error-banner {
      background-color: #FDF2F2;
      border: 1px solid #F8CECE;
      color: #D9534F;
      padding: 10px 14px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .forgot-link {
      font-size: 12px;
      font-weight: 600;
      color: #0F5C5C;
      text-decoration: none;
    }

    .forgot-link:hover {
      text-decoration: underline;
    }

    .w-full {
      width: 100%;
    }

    .submit-btn {
      background-color: #0F5C5C !important;
      color: #FFFFFF !important;
      height: 46px;
      font-weight: 700 !important;
      font-size: 14px !important;
      border-radius: 8px !important;
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .submit-btn:hover:not([disabled]) {
      background-color: #0B4747 !important;
    }

    .back-btn {
      margin-top: 8px;
      color: #5C6B6B !important;
      font-size: 13px !important;
    }

    .portal-footer-notice {
      margin-top: 24px;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #A0C6C6;
      font-size: 11px;
      text-align: center;
    }

    .lock-mini {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .code-input input {
      letter-spacing: 6px;
      font-size: 20px;
    }
  `],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  twoFactorForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
  });

  hidePassword = true;
  loading = false;
  errorMessage: string | null = null;
  is2faRequired = false;

  ngOnInit(): void {
    if (this.authService.isAuthenticated && this.authService.userRole) {
      this.authService.redirectAfterLogin(this.authService.userRole);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: (data) => {
        this.loading = false;
        const is2FA = data.requiresTwoFactor || (data as any)?.requires2FA;
        if (is2FA) {
          this.is2faRequired = true;
        } else {
          this.notificationService.success('Logged in successfully');
          this.authService.redirectAfterLogin(data.user.role);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.message || err.error?.message || 'Invalid email or password';
      },
    });
  }

  onVerify2fa(): void {
    if (this.twoFactorForm.invalid) return;

    this.loading = true;
    this.errorMessage = null;

    this.authService.verify2faLogin(this.twoFactorForm.value.code).subscribe({
      next: (user) => {
        this.loading = false;
        this.notificationService.success('Two-factor authentication verified');
        this.authService.redirectAfterLogin(user.role);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.message || err.error?.message || 'Invalid 2FA code. Please try again.';
      },
    });
  }

  cancel2fa(): void {
    this.is2faRequired = false;
    this.twoFactorForm.reset();
    this.errorMessage = null;
  }
}
