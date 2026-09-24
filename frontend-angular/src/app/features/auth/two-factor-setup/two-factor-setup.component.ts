import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TwoFactorSetupResponse } from '../../../core/models/user.model';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-two-factor-setup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="two-fa-page-container">
      <div class="page-header">
        <h1 class="text-2xl font-bold text-neutral-800">Two-Factor Authentication (2FA)</h1>
        <p class="text-sm text-neutral-500">Enhance your clinical account security with Time-Based One-Time Passwords (TOTP).</p>
      </div>

      <div class="grid-container">
        <!-- Status Card -->
        <mat-card class="settings-card">
          <mat-card-header>
            <div class="card-icon-title">
              <mat-icon [class.enabled]="(currentUser$ | async)?.isTwoFactorEnabled" [class.disabled]="!(currentUser$ | async)?.isTwoFactorEnabled">
                {{ (currentUser$ | async)?.isTwoFactorEnabled ? 'verified_user' : 'gpp_maybe' }}
              </mat-icon>
              <div>
                <h2>Current Security Status</h2>
                <p>Status: <strong>{{ (currentUser$ | async)?.isTwoFactorEnabled ? 'Active & Protected' : 'Not Enabled' }}</strong></p>
              </div>
            </div>
          </mat-card-header>

          <mat-card-content class="mt-4">
            <div *ngIf="!(currentUser$ | async)?.isTwoFactorEnabled && !setupData">
              <p class="info-text">
                Two-Factor Authentication is strongly recommended for all clinical staff and administrative accounts to protect sensitive patient health information (PHI).
              </p>
              <button mat-flat-button color="primary" (click)="beginSetup()" [disabled]="loading" class="mt-4">
                <mat-spinner *ngIf="loading" diameter="18" class="mr-2"></mat-spinner>
                <span>Setup Authenticator App</span>
              </button>
            </div>

            <!-- Enrollment flow -->
            <div *ngIf="setupData && !(currentUser$ | async)?.isTwoFactorEnabled" class="enrollment-box">
              <div class="step-guide">
                <div class="step-badge">1</div>
                <div>
                  <h3 class="font-bold text-sm text-neutral-800">Scan QR Code</h3>
                  <p class="text-xs text-neutral-500">Scan this code using Google Authenticator, 1Password, or Microsoft Authenticator.</p>
                </div>
              </div>

              <div class="qr-code-wrapper" *ngIf="setupData.qrCodeUrl">
                <img [src]="setupData.qrCodeUrl" alt="2FA QR Code" class="qr-img" />
              </div>

              <div class="secret-text-box">
                <span class="text-xs text-neutral-500">Manual Entry Key:</span>
                <code class="secret-code">{{ setupData.secret }}</code>
              </div>

              <div class="step-guide mt-6">
                <div class="step-badge">2</div>
                <div>
                  <h3 class="font-bold text-sm text-neutral-800">Enter 6-Digit Code</h3>
                  <p class="text-xs text-neutral-500">Verify by entering the generated code below.</p>
                </div>
              </div>

              <form [formGroup]="verifyForm" (ngSubmit)="confirmEnable()" class="verify-form mt-3">
                <mat-form-field appearance="outline" class="w-full">
                  <input
                    matInput
                    type="text"
                    formControlName="code"
                    maxlength="6"
                    placeholder="000000"
                    class="text-center font-mono tracking-widest font-bold"
                  />
                  <mat-error *ngIf="verifyForm.get('code')?.hasError('required')">Code is required</mat-error>
                  <mat-error *ngIf="verifyForm.get('code')?.hasError('pattern')">Must be 6 digits</mat-error>
                </mat-form-field>

                <div class="btn-row">
                  <button mat-flat-button color="primary" type="submit" [disabled]="verifyForm.invalid || verifying">
                    <mat-spinner *ngIf="verifying" diameter="18" class="mr-2"></mat-spinner>
                    <span>Confirm & Activate 2FA</span>
                  </button>
                  <button mat-button type="button" (click)="cancelSetup()">Cancel</button>
                </div>
              </form>
            </div>

            <!-- Disable 2FA flow if currently enabled -->
            <div *ngIf="(currentUser$ | async)?.isTwoFactorEnabled" class="disable-box">
              <p class="text-sm text-neutral-600">
                2FA is currently active on your account. If you need to switch devices or disable TOTP, enter your current 6-digit code below.
              </p>

              <form [formGroup]="disableForm" (ngSubmit)="disable2fa()" class="disable-form mt-4">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Current 6-Digit Authenticator Code</mat-label>
                  <input
                    matInput
                    type="text"
                    formControlName="code"
                    maxlength="6"
                    placeholder="000000"
                    class="font-mono"
                  />
                  <mat-error *ngIf="disableForm.get('code')?.hasError('required')">Code is required to disable</mat-error>
                </mat-form-field>

                <button mat-stroked-button color="warn" type="submit" [disabled]="disableForm.invalid || disabling">
                  <mat-spinner *ngIf="disabling" diameter="18" class="mr-2"></mat-spinner>
                  <span>Disable Two-Factor Authentication</span>
                </button>
              </form>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .two-fa-page-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-size: 24px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 6px;
    }

    .page-header p {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
    }

    .settings-card {
      border-radius: 12px !important;
      padding: 24px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .card-icon-title {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .card-icon-title mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
    }

    .card-icon-title mat-icon.enabled {
      color: #2E9E6B;
    }

    .card-icon-title mat-icon.disabled {
      color: #F2A93B;
    }

    .card-icon-title h2 {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 4px;
      color: #1A2E2E;
    }

    .card-icon-title p {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
    }

    .info-text {
      font-size: 13px;
      line-height: 1.6;
      color: #5C6B6B;
    }

    .enrollment-box {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #E7E5E0;
    }

    .step-guide {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }

    .step-badge {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: #0F5C5C;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .qr-code-wrapper {
      display: flex;
      justify-content: center;
      margin: 16px 0;
      padding: 16px;
      background: #FFFFFF;
      border: 1px dashed #BCE0DE;
      border-radius: 12px;
      width: fit-content;
    }

    .qr-img {
      width: 180px;
      height: 180px;
      object-fit: contain;
    }

    .secret-text-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #FAFAF8;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #E7E5E0;
    }

    .secret-code {
      font-size: 12px;
      font-weight: 700;
      color: #0F5C5C;
      letter-spacing: 1px;
    }

    .verify-form, .disable-form {
      max-width: 360px;
    }

    .btn-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class TwoFactorSetupComponent implements OnInit {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  currentUser$ = this.authService.currentUser$;
  setupData: TwoFactorSetupResponse | null = null;
  loading = false;
  verifying = false;
  disabling = false;

  verifyForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
  });

  disableForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
  });

  ngOnInit(): void {
    // Component initialized
  }

  beginSetup(): void {
    this.loading = true;
    this.authService.setup2fa().subscribe({
      next: (data) => {
        this.setupData = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Failed to generate 2FA setup details');
      },
    });
  }

  confirmEnable(): void {
    if (this.verifyForm.invalid) return;

    this.verifying = true;
    this.authService.confirm2fa(this.verifyForm.value.code).subscribe({
      next: () => {
        this.verifying = false;
        this.setupData = null;
        this.notificationService.success('Two-factor authentication enabled successfully!');
      },
      error: (err) => {
        this.verifying = false;
        this.notificationService.error(err.error?.error?.message || 'Invalid verification code');
      },
    });
  }

  cancelSetup(): void {
    this.setupData = null;
    this.verifyForm.reset();
  }

  disable2fa(): void {
    if (this.disableForm.invalid) return;

    this.disabling = true;
    this.authService.disable2fa(this.disableForm.value.code).subscribe({
      next: () => {
        this.disabling = false;
        this.disableForm.reset();
        this.notificationService.success('Two-factor authentication disabled');
      },
      error: (err) => {
        this.disabling = false;
        this.notificationService.error(err.error?.error?.message || 'Invalid code to disable 2FA');
      },
    });
  }
}
