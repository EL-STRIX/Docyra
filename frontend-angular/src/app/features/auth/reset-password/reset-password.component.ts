import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-reset-password',
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
    <div class="reset-page-wrapper">
      <div class="reset-card-container">
        <div class="brand-box">
          <div class="logo-badge">D</div>
          <h1 class="portal-heading">Set New Password</h1>
          <p class="portal-subheading">Docyra Operations Portal</p>
        </div>

        <mat-card class="auth-card">
          <mat-card-content class="card-content">
            <div *ngIf="!success">
              <div class="step-header">
                <h2>Create New Password</h2>
                <p>Ensure your new password contains at least 8 characters including uppercase, lowercase, and numbers.</p>
              </div>

              <div *ngIf="errorMessage" class="error-banner">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMessage }}</span>
              </div>

              <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="auth-form">
                <div class="form-group">
                  <label class="form-label">New Password</label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input
                      matInput
                      [type]="hidePassword ? 'password' : 'text'"
                      formControlName="password"
                      placeholder="••••••••"
                      autocomplete="new-password"
                    />
                    <mat-icon matPrefix class="mr-2 text-neutral-400">lock</mat-icon>
                    <button
                      mat-icon-button
                      matSuffix
                      type="button"
                      (click)="hidePassword = !hidePassword"
                    >
                      <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                    <mat-error *ngIf="resetForm.get('password')?.hasError('required')">Password is required</mat-error>
                    <mat-error *ngIf="resetForm.get('password')?.hasError('minlength')">Must be at least 8 characters</mat-error>
                  </mat-form-field>
                </div>

                <div class="form-group">
                  <label class="form-label">Confirm New Password</label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input
                      matInput
                      [type]="hidePassword ? 'password' : 'text'"
                      formControlName="confirmPassword"
                      placeholder="••••••••"
                      autocomplete="new-password"
                    />
                    <mat-icon matPrefix class="mr-2 text-neutral-400">lock</mat-icon>
                    <mat-error *ngIf="resetForm.get('confirmPassword')?.hasError('required')">Confirm password is required</mat-error>
                  </mat-form-field>
                </div>

                <button
                  mat-flat-button
                  type="submit"
                  [disabled]="resetForm.invalid || loading"
                  class="submit-btn"
                >
                  <mat-spinner *ngIf="loading" diameter="20" class="btn-spinner"></mat-spinner>
                  <span *ngIf="!loading">Reset Password</span>
                </button>
              </form>
            </div>

            <div *ngIf="success" class="success-box">
              <div class="success-icon-badge">
                <mat-icon>check_circle</mat-icon>
              </div>
              <h2>Password Updated</h2>
              <p>Your password has been changed successfully. You can now sign in with your new credentials.</p>
              <a routerLink="/login" class="return-btn">Proceed to Sign In</a>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .reset-page-wrapper {
      min-height: 100vh;
      background: linear-gradient(135deg, #0F5C5C 0%, #0B4747 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
    }

    .reset-card-container {
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
    }

    .portal-heading {
      color: #FFFFFF;
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 6px;
    }

    .portal-subheading {
      color: #A0C6C6;
      font-size: 13px;
      margin: 0;
    }

    .auth-card {
      width: 100%;
      border-radius: 16px !important;
      background-color: #FFFFFF;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
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

    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .w-full {
      width: 100%;
    }

    .submit-btn {
      background-color: #0F5C5C !important;
      color: #FFFFFF !important;
      height: 46px;
      font-weight: 700 !important;
      border-radius: 8px !important;
    }

    .success-box {
      text-align: center;
    }

    .success-icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: #EBF7EE;
      color: #2E9E6B;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .success-box h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 8px;
    }

    .success-box p {
      font-size: 13px;
      color: #5C6B6B;
      line-height: 1.6;
      margin: 0 0 20px;
    }

    .return-btn {
      display: inline-block;
      background-color: #0F5C5C;
      color: #FFFFFF;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }
  `],
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  resetForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  token = '';
  hidePassword = true;
  loading = false;
  success = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
  }

  onSubmit(): void {
    if (this.resetForm.invalid) return;

    const { password, confirmPassword } = this.resetForm.value;
    if (password !== confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    this.authService.resetPassword(this.token, password).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.notificationService.success('Password reset successfully');
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error?.message || 'Invalid or expired reset token';
      },
    });
  }
}
