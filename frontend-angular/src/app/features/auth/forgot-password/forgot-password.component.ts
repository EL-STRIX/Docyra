import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="brand-logo">D</div>
          <h2>Reset Portal Password</h2>
          <p>Enter your staff email address to receive password reset instructions.</p>
        </div>

        <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>
        <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>

        <form (ngSubmit)="handleForgotPassword()" class="auth-form">
          <div class="form-group">
            <label>Work Email</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="doctor@clinic.com"
              class="form-control"
            />
          </div>

          <button type="submit" [disabled]="loading || !email" class="btn-primary-auth">
            {{ loading ? 'Sending link...' : 'Send Password Reset Link' }}
          </button>

          <a routerLink="/login" class="back-link">
            ← Return to Sign In
          </a>
        </form>
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
    .btn-primary-auth { background: var(--docyra-primary); color: #ffffff; border: none; padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .back-link { text-align: center; font-size: 12px; color: var(--docyra-primary); text-decoration: none; font-weight: 600; }
  `]
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService) {}

  handleForgotPassword(): void {
    if (!this.email) return;
    this.loading = true;
    this.errorMessage = '';

    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res.data?.message || 'If an account exists, a reset link has been dispatched.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to dispatch reset link.';
      }
    });
  }
}
