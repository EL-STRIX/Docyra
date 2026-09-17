import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="portal-container">
      <!-- Top Navigation Bar -->
      <header class="portal-header">
        <div class="portal-brand">
          <div class="portal-logo-badge">D</div>
          <span>Docyra Portal</span>
          <span class="role-chip" [ngClass]="getRoleChipClass()">
            {{ getRoleDisplay() }}
          </span>
        </div>

        <div class="header-right">
          <div class="user-meta">
            <span class="user-name">{{ user()?.firstName }} {{ user()?.lastName }}</span>
            <span class="user-email">{{ user()?.email }}</span>
          </div>
          <button (click)="logout()" class="btn-logout">
            Sign Out
          </button>
        </div>
      </header>

      <div class="portal-body">
        <!-- Sidebar Navigation -->
        <aside class="portal-sidebar">
          <nav class="nav-group">
            <!-- Doctor Links -->
            <ng-container *ngIf="userRole() === 'doctor'">
              <a routerLink="/doctor/dashboard" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">📊</span> Dashboard
              </a>
              <a routerLink="/doctor/schedule" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">📅</span> My Schedule
              </a>
              <a routerLink="/doctor/availability" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">⏰</span> Availability Rules
              </a>
              <a routerLink="/doctor/emergency" routerLinkActive="active" class="nav-item emergency-link">
                <span class="nav-icon">🚨</span> Emergency Mode
              </a>
              <a routerLink="/doctor/profile" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">⚙️</span> Profile Settings
              </a>
            </ng-container>

            <!-- Clinic Admin Links -->
            <ng-container *ngIf="userRole() === 'clinic_admin'">
              <a routerLink="/clinic-admin/dashboard" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">📊</span> Clinic Dashboard
              </a>
              <a routerLink="/clinic-admin/doctors" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">👨‍⚕️</span> Manage Doctors
              </a>
              <a routerLink="/clinic-admin/appointments" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">📋</span> Clinic Appointments
              </a>
              <a routerLink="/clinic-admin/settings" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">🏢</span> Clinic Settings
              </a>
            </ng-container>

            <!-- Platform Admin Links -->
            <ng-container *ngIf="userRole() === 'admin'">
              <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">📈</span> Admin Overview
              </a>
              <a routerLink="/admin/clinics" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">🏥</span> Manage Clinics
              </a>
              <a routerLink="/admin/doctor-applications" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">📝</span> Doctor Applications
              </a>
              <a routerLink="/admin/specializations" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">🩺</span> Specializations
              </a>
              <a routerLink="/admin/patients" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">👥</span> Patients Directory
              </a>
              <a routerLink="/admin/audit-logs" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">🛡️</span> Audit Logs (PHI)
              </a>
              <a routerLink="/admin/analytics" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">📊</span> Analytics & Reports
              </a>
              <a routerLink="/admin/settings" routerLinkActive="active" class="nav-item">
                <span class="nav-icon">⚙️</span> System Settings
              </a>
            </ng-container>
          </nav>
        </aside>

        <!-- Main View Area -->
        <main class="portal-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .portal-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .portal-header {
      height: 64px;
      background: #ffffff;
      border-bottom: 1px solid var(--docyra-neutral-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .portal-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 800;
      color: var(--docyra-primary);
    }
    .role-chip {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .chip-doctor { background: #E6F2F1; color: var(--docyra-primary); }
    .chip-clinic-admin { background: #FEF6E9; color: #C07B12; }
    .chip-admin { background: #F3E8FF; color: #6B21A8; }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .user-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .user-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--docyra-text-primary);
    }
    .user-email {
      font-size: 11px;
      color: var(--docyra-text-secondary);
    }
    .btn-logout {
      background: #F8FAFC;
      border: 1px solid var(--docyra-neutral-border);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: var(--docyra-text-primary);
      transition: all 0.15s ease;
      &:hover {
        background: #FEE2E2;
        color: #DC2626;
        border-color: #FCA5A5;
      }
    }
    .portal-body {
      display: flex;
      flex: 1;
    }
    .portal-sidebar {
      width: 260px;
      background: #ffffff;
      border-right: 1px solid var(--docyra-neutral-border);
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
    }
    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      color: var(--docyra-text-secondary);
      text-decoration: none;
      transition: all 0.15s ease;
      &:hover {
        background: var(--docyra-primary-light);
        color: var(--docyra-primary);
      }
      &.active {
        background: var(--docyra-primary);
        color: #ffffff;
      }
    }
    .emergency-link {
      color: #DC2626;
      &:hover {
        background: #FEE2E2;
        color: #B91C1C;
      }
    }
    .nav-icon {
      font-size: 16px;
    }
    .portal-content {
      flex: 1;
      padding: 32px;
      background: var(--docyra-neutral-bg);
      overflow-y: auto;
    }
  `]
})
export class PortalLayoutComponent {
  public user = this.authService.userSignal;
  public userRole = this.authService.userRole;

  constructor(private authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }

  getRoleDisplay(): string {
    const role = this.userRole();
    if (role === 'doctor') return 'Doctor Portal';
    if (role === 'clinic_admin') return 'Clinic Admin';
    if (role === 'admin') return 'Platform Admin';
    return 'Portal';
  }

  getRoleChipClass(): string {
    const role = this.userRole();
    if (role === 'doctor') return 'chip-doctor';
    if (role === 'clinic_admin') return 'chip-clinic-admin';
    if (role === 'admin') return 'chip-admin';
    return '';
  }
}
