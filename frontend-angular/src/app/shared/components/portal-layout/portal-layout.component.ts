import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

interface NavMenuItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
  ],
  template: `
    <div class="portal-wrapper">
      <!-- Sidebar Navigation -->
      <aside class="portal-sidebar">
        <div class="sidebar-header">
          <div class="brand-logo">
            <span class="logo-mark">D</span>
            <div class="brand-text">
              <span class="brand-name">Docyra</span>
              <span class="portal-tag">PORTAL</span>
            </div>
          </div>
          <span class="role-badge" [ngClass]="getRoleBadgeClass()">
            {{ getRoleBadgeLabel() }}
          </span>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-title">NAVIGATION</div>
          <ul>
            <li *ngFor="let item of navItems; trackBy: trackByNav">
              <a
                [routerLink]="item.path"
                routerLinkActive="active"
                class="nav-link"
              >
                <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            </li>
          </ul>
        </nav>

        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar">
              {{ (currentUser$ | async)?.name?.charAt(0) || 'U' }}
            </div>
            <div class="user-meta">
              <span class="user-name">{{ (currentUser$ | async)?.name || 'User' }}</span>
              <span class="user-email">{{ (currentUser$ | async)?.email || '' }}</span>
            </div>
          </div>
          <button (click)="logout()" class="logout-btn" title="Sign Out">
            <mat-icon>logout</mat-icon>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Body Area -->
      <div class="portal-main-content">
        <!-- Top App Bar -->
        <header class="portal-topbar">
          <div class="topbar-left">
            <h1 class="page-context-title">{{ getRoleDisplay() }} Workspace</h1>
          </div>
          <div class="topbar-right">
            <!-- Quick Action Link to 2FA Settings -->
            <a
              *ngIf="(currentUser$ | async)?.isTwoFactorEnabled === false"
              routerLink="/2fa-setup"
              class="security-warning-chip"
            >
              <mat-icon class="warn-icon">security</mat-icon>
              <span>Enable 2FA</span>
            </a>
          </div>
        </header>

        <!-- Page Content View -->
        <main class="page-container">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .portal-wrapper {
      display: flex;
      min-height: 100vh;
      background-color: #FAFAF8;
    }

    .portal-sidebar {
      width: 250px;
      background-color: #1A2E2E;
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
      position: sticky;
      top: 0;
      height: 100vh;
      max-height: 100vh;
      z-index: 50;
    }

    .sidebar-header {
      padding: 16px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      flex-shrink: 0;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex-shrink: 0;
    }

    .logo-mark {
      width: 32px;
      height: 32px;
      background-color: #F2A93B;
      color: #1A2E2E;
      font-weight: 900;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .brand-name {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.4px;
      color: #FFFFFF;
      line-height: 1.15;
    }

    .portal-tag {
      font-size: 9px;
      font-weight: 800;
      color: #F2A93B;
      letter-spacing: 1.2px;
      display: block;
      margin-top: 1px;
      line-height: 1;
    }

    .role-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2.5px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      white-space: nowrap;
      flex-shrink: 0;
      line-height: 1.2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: auto;
    }

    .role-badge.doctor {
      background-color: #2E9E6B;
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .role-badge.clinic {
      background-color: #0F5C5C;
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .role-badge.admin {
      background-color: #F2A93B;
      color: #1A2E2E;
    }

    .sidebar-nav {
      flex: 1;
      padding: 20px 14px;
      overflow-y: auto;
      min-height: 0;
    }

    .sidebar-nav::-webkit-scrollbar {
      width: 4px;
    }

    .sidebar-nav::-webkit-scrollbar-track {
      background: transparent;
    }

    .sidebar-nav::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    .sidebar-nav::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .nav-section-title {
      font-size: 10px;
      font-weight: 800;
      color: #8BA8A8;
      letter-spacing: 1px;
      margin-bottom: 10px;
      padding-left: 10px;
    }

    .sidebar-nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      color: #C2D8D8;
      text-decoration: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .nav-link:hover {
      background-color: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
    }

    .nav-link.active {
      background-color: #0F5C5C;
      color: #FFFFFF;
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      border-left: 3px solid #F2A93B;
    }

    .nav-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: auto;
      flex-shrink: 0;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background-color: #0F5C5C;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
    }

    .user-meta {
      overflow: hidden;
    }

    .user-name {
      font-size: 12px;
      font-weight: 700;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      font-size: 10px;
      color: #8BA8A8;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid rgba(217, 83, 79, 0.4);
      color: #F87171;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
      justify-content: center;
    }

    .logout-btn:hover {
      background-color: rgba(217, 83, 79, 0.15);
      color: #FCA5A5;
    }

    .portal-main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .portal-topbar {
      height: 64px;
      background-color: #FFFFFF;
      border-bottom: 1px solid #E7E5E0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .page-context-title {
      font-size: 16px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .topbar-divider {
      width: 1px;
      height: 24px;
      background-color: #E7E5E0;
    }

    .security-warning-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background-color: #FEF6EC;
      color: #B57416;
      border: 1px solid #FCDFB5;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .security-warning-chip:hover {
      background-color: #FEE7C8;
    }

    .warn-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .page-container {
      flex: 1;
      padding: 32px;
      max-width: 1400px;
      width: 100%;
      box-sizing: border-box;
    }
  `],
})
export class PortalLayoutComponent {
  private authService = inject(AuthService);

  currentUser$ = this.authService.currentUser$;
  navItems: NavMenuItem[] = [];

  constructor() {
    this.updateNavItems(this.authService.userRole);
    this.authService.currentUser$.subscribe((user) => {
      this.updateNavItems(user?.role);
    });
  }

  private updateNavItems(role?: string | null): void {
    if (role === 'doctor') {
      this.navItems = [
        { label: 'Doctor Dashboard', path: '/doctor/dashboard', icon: 'dashboard' },
        { label: 'Availability Rules', path: '/doctor/availability', icon: 'event_available' },
        { label: 'Schedule & Calendar', path: '/doctor/schedule', icon: 'calendar_month' },
        { label: 'Emergency Unavailable', path: '/doctor/emergency', icon: 'event_busy' },
        { label: 'Patient History', path: '/doctor/patients', icon: 'people' },
        { label: 'Profile & Settings', path: '/doctor/profile', icon: 'person' },
      ];
    } else if (role === 'clinic_admin') {
      this.navItems = [
        { label: 'Clinic Dashboard', path: '/clinic/dashboard', icon: 'dashboard' },
        { label: 'Doctor Applications', path: '/clinic/applications', icon: 'how_to_reg' },
        { label: 'Manage Doctors', path: '/clinic/doctors', icon: 'medical_services' },
        { label: 'Clinic Appointments', path: '/clinic/appointments', icon: 'event_note' },
        { label: 'Clinic Profile', path: '/clinic/profile', icon: 'domain' },
      ];
    } else if (role === 'admin') {
      this.navItems = [
        { label: 'Admin Dashboard', path: '/admin/dashboard', icon: 'analytics' },
        { label: 'Manage Clinics', path: '/admin/clinics', icon: 'domain' },
        { label: 'Specializations', path: '/admin/specializations', icon: 'category' },
        { label: 'Manage Patients', path: '/admin/patients', icon: 'groups' },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'history' },
        { label: 'Analytics & Reports', path: '/admin/analytics', icon: 'trending_up' },
        { label: 'System Settings', path: '/admin/settings', icon: 'settings' },
      ];
    } else {
      this.navItems = [];
    }
  }

  trackByNav(index: number, item: NavMenuItem): string {
    return item.path;
  }

  getRoleDisplay(): string {
    const role = this.authService.userRole;
    switch (role) {
      case 'doctor':
        return 'Doctor Portal';
      case 'clinic_admin':
        return 'Clinic Admin';
      case 'admin':
        return 'Platform Admin';
      default:
        return 'Portal';
    }
  }

  getRoleBadgeLabel(): string {
    const role = this.authService.userRole;
    switch (role) {
      case 'doctor':
        return 'Doctor';
      case 'clinic_admin':
        return 'Clinic';
      case 'admin':
        return 'Admin';
      default:
        return 'Portal';
    }
  }

  getRoleBadgeClass(): string {
    const role = this.authService.userRole;
    switch (role) {
      case 'doctor':
        return 'doctor';
      case 'clinic_admin':
        return 'clinic';
      case 'admin':
        return 'admin';
      default:
        return '';
    }
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
