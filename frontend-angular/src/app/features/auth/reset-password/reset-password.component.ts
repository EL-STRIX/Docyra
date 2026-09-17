import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="brand-logo">D</div>
          <h2>Set New Password</h2>
          <p>Create a strong password for your portal account.</p>
        </div>

        <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>
        <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>

        <form *ngIf="!successMessage" (ngSubmit)="handleResetPassword()" class="auth-form">
          <div class="form-group">
            <label>New Password (min 8 chars)</label>
            <input
              type="password"
              [(ngModel)]="newPassword"
              name="newPassword"
              required
              minlength="8"
              placeholder="••••••••••••"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              [(ngModel)]="confirmPassword"
              name="confirmPassword"
              required
              placeholder="••••••••••••"
              class="form-control"
            />
          </div>

          <button type="submit" [disabled]="loading || newPassword !== confirmPassword || newPassword.length < 8" class="btn-primary-auth">
            {{ loading ? 'Updating...' : 'Set New Password' }}
          </button>
        </form>

        <div *ngIf="successMessage" class="text-center pt-4">
          <a routerLink="/login" class="btn-primary-auth block-link">
            Proceed to Sign In
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0F5C5C 0%, #0B4747 100%); padding: 24px; }
    .auth-card { width: 100%; max-width: 440px; background: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2); }
    .auth-header { text-align: center; margin-bottom: 28px; }
    .brand-logo { width: 52px; height: 52px; border-radius: 14px; background: var(--docyra-primary); color: #ffffff; font-size: 26px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
    h2 { margin: 0 0 6px; font-size: 22px; font-weight: 800; color: var(--docyra-text-primary); }
    p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .alert-error { background: #FDF0EF; color: #DC2626; padding: 12px; border-radius: 12px; font-size: 12px; margin-bottom: 20px; }
    .alert-success { background: #E8F7F0; color: #1E7E53; padding: 12px; border-radius: 12px; font-size: 12px; margin-bottom: 20px; }
    .auth-form { display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 12px; font-weight: 700; color: var(--docyra-text-primary); text-transform: uppercase; }
    .form-control { padding: 12px 16px; border-radius: 12px; border: 1px solid var(--docyra-neutral-border); font-size: 14px; outline: none; }
    .btn-primary-auth { background: var(--docyra-primary); color: #ffffff; border: none; padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; text-align: center; }
    .block-link { display: block; width: 100%; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private route: ActivatedRoute, private authService: AuthService) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Invalid or missing password reset token.';
    }
  }

  handleResetPassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.resetPassword({ token: this.token, newPassword: this.newPassword }).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res.data?.message || 'Password successfully reset!';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to reset password.';
      }
    });
  }
}
