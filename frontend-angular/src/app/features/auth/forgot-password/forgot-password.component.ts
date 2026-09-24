import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-forgot-password',
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
    <div class="forgot-page-wrapper">
      <div class="forgot-card-container">
        <div class="brand-box">
          <div class="logo-badge">D</div>
          <h1 class="portal-heading">Password Recovery</h1>
          <p class="portal-subheading">Docyra Clinical & Operations Portal</p>
        </div>

        <mat-card class="auth-card">
          <mat-card-content class="card-content">
            <div *ngIf="!submitted">
              <div class="step-header">
                <h2>Reset Your Password</h2>
                <p>Enter your registered email address and we'll send you instructions to reset your password.</p>
              </div>

              <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="auth-form">
                <div class="form-group">
                  <label class="form-label">Email Address</label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input
                      matInput
                      type="email"
                      formControlName="email"
                      placeholder="doctor@clinic.com"
                      autocomplete="email"
                    />
                    <mat-icon matPrefix class="mr-2 text-neutral-400">mail</mat-icon>
                    <mat-error *ngIf="forgotForm.get('email')?.hasError('required')">Email is required</mat-error>
                    <mat-error *ngIf="forgotForm.get('email')?.hasError('email')">Please enter a valid email</mat-error>
                  </mat-form-field>
                </div>

                <button
                  mat-flat-button
                  type="submit"
                  [disabled]="forgotForm.invalid || loading"
                  class="submit-btn"
                >
                  <mat-spinner *ngIf="loading" diameter="20" class="btn-spinner"></mat-spinner>
                  <span *ngIf="!loading">Send Reset Link</span>
                </button>

                <div class="text-center mt-4">
                  <a routerLink="/login" class="back-link">← Return to Sign In</a>
                </div>
              </form>
            </div>

            <div *ngIf="submitted" class="success-box">
              <div class="success-icon-badge">
                <mat-icon>mark_email_read</mat-icon>
              </div>
              <h2>Check Your Inbox</h2>
              <p>
                If an account exists for <strong>{{ submittedEmail }}</strong>, you will receive password reset instructions shortly.
              </p>
              <a routerLink="/login" class="return-btn">Return to Sign In</a>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .forgot-page-wrapper {
      min-height: 100vh;
      background: linear-gradient(135deg, #0F5C5C 0%, #0B4747 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
    }

    .forgot-card-container {
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

    .back-link {
      font-size: 13px;
      color: #0F5C5C;
      font-weight: 600;
      text-decoration: none;
    }

    .back-link:hover {
      text-decoration: underline;
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
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  loading = false;
  submitted = false;
  submittedEmail = '';

  onSubmit(): void {
    if (this.forgotForm.invalid) return;

    this.loading = true;
    const email = this.forgotForm.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
        this.submittedEmail = email;
      },
      error: () => {
        // Even on error, show the submitted notice for enumeration protection
        this.loading = false;
        this.submitted = true;
        this.submittedEmail = email;
      },
    });
  }
}
