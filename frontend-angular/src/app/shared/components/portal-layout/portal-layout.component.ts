import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
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
    MatBadgeModule,
    MatMenuModule,
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
          <div class="role-badge" [ngClass]="getRoleBadgeClass()">
            {{ getRoleDisplay() }}
          </div>
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
            <!-- Notification Bell -->
            <button
              mat-icon-button
              [matMenuTriggerFor]="notificationMenu"
              class="bell-btn"
              aria-label="Notifications"
            >
              <mat-icon [matBadge]="unreadCount$ | async" [matBadgeHidden]="(unreadCount$ | async) === 0" matBadgeColor="warn">
                notifications
              </mat-icon>
            </button>

            <mat-menu #notificationMenu="matMenu" class="notification-menu-panel">
              <div class="notification-header" (click)="$event.stopPropagation()">
                <h3>Notifications</h3>
                <button mat-button color="primary" (click)="markAllAsRead()">Mark all as read</button>
              </div>
              <mat-divider></mat-divider>
              <div class="notification-list" (click)="$event.stopPropagation()">
                <div *ngIf="(notifications$ | async)?.length === 0" class="no-notifications">
                  No new notifications
                </div>
                <div
                  *ngFor="let ntf of notifications$ | async"
                  class="notification-item"
                  [ngClass]="{ unread: !ntf.read }"
                >
                  <div class="ntf-title">{{ ntf.title }}</div>
                  <div class="ntf-msg">{{ ntf.message }}</div>
                  <div class="ntf-time">{{ ntf.timestamp | date:'shortTime' }}</div>
                </div>
              </div>
            </mat-menu>

            <div class="topbar-divider"></div>

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
      width: 260px;
      background-color: #0B4747;
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh;
      box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
      z-index: 20;
    }

    .sidebar-header {
      padding: 24px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .logo-mark {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background-color: #F2A93B;
      color: #1A2E2E;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
    }

    .brand-name {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: block;
      color: #FFFFFF;
    }

    .portal-tag {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #A0C6C6;
      display: block;
    }

    .role-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .role-badge.doctor {
      background-color: rgba(242, 169, 59, 0.2);
      color: #F2A93B;
      border: 1px solid rgba(242, 169, 59, 0.4);
    }

    .role-badge.clinic {
      background-color: rgba(46, 158, 107, 0.2);
      color: #6EE7B7;
      border: 1px solid rgba(46, 158, 107, 0.4);
    }

    .role-badge.admin {
      background-color: rgba(217, 83, 79, 0.2);
      color: #FCA5A5;
      border: 1px solid rgba(217, 83, 79, 0.4);
    }

    .sidebar-nav {
      flex: 1;
      padding: 20px 12px;
      overflow-y: auto;
    }

    .nav-section-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #7AA5A5;
      padding: 0 12px 8px;
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

    .notification-header {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .notification-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
    }

    .notification-list {
      max-height: 320px;
      overflow-y: auto;
      width: 320px;
    }

    .no-notifications {
      padding: 24px;
      text-align: center;
      color: #5C6B6B;
      font-size: 12px;
    }

    .notification-item {
      padding: 12px 16px;
      border-bottom: 1px solid #F1F3F5;
    }

    .notification-item.unread {
      background-color: #F0FDF4;
    }

    .ntf-title {
      font-size: 12px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .ntf-msg {
      font-size: 11px;
      color: #5C6B6B;
      margin-top: 2px;
    }

    .ntf-time {
      font-size: 10px;
      color: #9CA3AF;
      margin-top: 4px;
    }
  `],
})
export class PortalLayoutComponent {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  currentUser$ = this.authService.currentUser$;
  notifications$ = this.notificationService.notifications$;
  unreadCount$ = this.notificationService.unreadCount$;
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
        { label: 'Manage Doctors', path: '/clinic/doctors', icon: 'medical_services' },
        { label: 'Clinic Appointments', path: '/clinic/appointments', icon: 'event_note' },
        { label: 'Clinic Profile', path: '/clinic/profile', icon: 'domain' },
      ];
    } else if (role === 'admin') {
      this.navItems = [
        { label: 'Admin Dashboard', path: '/admin/dashboard', icon: 'analytics' },
        { label: 'Manage Clinics', path: '/admin/clinics', icon: 'domain' },
        { label: 'Doctor Applications', path: '/admin/applications', icon: 'verified_user' },
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

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
