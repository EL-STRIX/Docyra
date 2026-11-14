import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Appointment } from '../../../core/models/appointment.model';
import { Doctor } from '../../../core/models/doctor.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { format, isToday, isTomorrow, isPast, parseISO, differenceInHours } from 'date-fns';

export type DashboardTab = 'upcoming' | 'today' | 'recent' | 'completed' | 'all';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StatusBadgeComponent,
    DateFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dashboard-page">
      <!-- Welcome & Action Header -->
      <div class="header-section">
        <div>
          <h1 class="page-title">Welcome back, {{ getDoctorWelcomeName() }}</h1>
          <p class="page-subtitle">
            Practice overview and patient consultations for {{ todayFormatted }}.
          </p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="refreshDashboard()" [disabled]="loading" class="action-btn-refresh">
            <mat-icon [class.spin-animation]="loading">refresh</mat-icon>
            <span>Refresh</span>
          </button>
          <a routerLink="/doctor/emergency" mat-stroked-button color="warn" class="emergency-btn">
            <mat-icon>event_busy</mat-icon>
            <span>Emergency Block</span>
          </a>
          <a routerLink="/doctor/availability" mat-flat-button color="primary">
            <mat-icon>schedule</mat-icon>
            <span>Availability Rules</span>
          </a>
        </div>
      </div>

      <!-- Next Consultation Alert Banner -->
      <div *ngIf="nextAppointment" class="next-consultation-banner">
        <div class="banner-icon-box">
          <mat-icon>notifications_active</mat-icon>
        </div>
        <div class="banner-text">
          <div class="banner-badge">NEXT SCHEDULED VISIT</div>
          <div class="banner-heading">
            <span class="patient-highlight">{{ getPatientName(nextAppointment) }}</span>
            <span class="banner-time">
              • {{ getRelativeDateLabel(nextAppointment) }} at {{ nextAppointment.slotStart | portalDate:'h:mm a' }}
            </span>
            <span *ngIf="nextAppointment.bookedFor?.type === 'dependent'" class="dependent-pill">
              {{ nextAppointment.bookedFor.relationship || 'Family' }}
            </span>
          </div>
          <div class="banner-reason">
            Reason: {{ nextAppointment.reasonForVisit || 'General Medical Consultation' }}
          </div>
        </div>
        <div class="banner-actions">
          <a [routerLink]="['/doctor/appointments', nextAppointment._id]" mat-flat-button color="primary">
            Manage Visit →
          </a>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <!-- Upcoming Visits -->
        <mat-card class="stat-card cursor-pointer" (click)="setTab('upcoming')">
          <div class="stat-icon-wrap upcoming">
            <mat-icon>event_available</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Upcoming Visits</span>
            <span class="stat-value">{{ upcomingAppointments.length }}</span>
            <span class="stat-sub">Next scheduled slots</span>
          </div>
        </mat-card>

        <!-- Today's Visits -->
        <mat-card class="stat-card cursor-pointer" (click)="setTab('today')">
          <div class="stat-icon-wrap primary">
            <mat-icon>today</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Today's Visits</span>
            <span class="stat-value">{{ todayAppointments.length }}</span>
            <span class="stat-sub">{{ todayAppointments.length === 0 ? 'No visits today' : 'Scheduled today' }}</span>
          </div>
        </mat-card>

        <!-- Total Patient Bookings -->
        <mat-card class="stat-card cursor-pointer" (click)="setTab('all')">
          <div class="stat-icon-wrap accent">
            <mat-icon>book_online</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Bookings</span>
            <span class="stat-value">{{ appointments.length }}</span>
            <span class="stat-sub">Instant confirmed</span>
          </div>
        </mat-card>

        <!-- Completed Visits -->
        <mat-card class="stat-card cursor-pointer" (click)="setTab('completed')">
          <div class="stat-icon-wrap success">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Completed Visits</span>
            <span class="stat-value">{{ completedCount }}</span>
            <span class="stat-sub">Past consultations</span>
          </div>
        </mat-card>

        <!-- Rating -->
        <mat-card class="stat-card">
          <div class="stat-icon-wrap rating">
            <mat-icon>star</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Doctor Rating</span>
            <span class="stat-value">
              {{ doctorProfile?.rating ? (doctorProfile?.rating | number:'1.1-1') + ' / 5.0' : '5.0 / 5.0' }}
            </span>
            <span class="stat-sub">{{ doctorProfile?.reviewCount || 0 }} reviews</span>
          </div>
        </mat-card>
      </div>

      <!-- Main Layout Split -->
      <div class="content-split">
        <!-- Main Consultations Section -->
        <mat-card class="main-card">
          <div class="card-header-bar">
            <div>
              <h2 class="card-title">Patient Consultations & Schedule</h2>
              <p class="card-desc">Review upcoming appointments, newly booked visits, and today's schedule</p>
            </div>
            <a routerLink="/doctor/schedule" class="view-all-link">Full Calendar →</a>
          </div>

          <!-- Tab Navigation Bar -->
          <div class="tab-pills-bar">
            <button
              class="tab-pill"
              [class.active]="activeTab === 'upcoming'"
              (click)="setTab('upcoming')"
            >
              <mat-icon class="tab-icon">calendar_month</mat-icon>
              <span>Upcoming</span>
              <span class="tab-count">{{ upcomingAppointments.length }}</span>
            </button>

            <button
              class="tab-pill"
              [class.active]="activeTab === 'today'"
              (click)="setTab('today')"
            >
              <mat-icon class="tab-icon">today</mat-icon>
              <span>Today</span>
              <span class="tab-count">{{ todayAppointments.length }}</span>
            </button>

            <button
              class="tab-pill"
              [class.active]="activeTab === 'recent'"
              (click)="setTab('recent')"
            >
              <mat-icon class="tab-icon">history</mat-icon>
              <span>Recent Bookings</span>
              <span class="tab-count">{{ recentBookings.length }}</span>
            </button>

            <button
              class="tab-pill"
              [class.active]="activeTab === 'completed'"
              (click)="setTab('completed')"
            >
              <mat-icon class="tab-icon">check_circle</mat-icon>
              <span>Completed</span>
              <span class="tab-count">{{ completedCount }}</span>
            </button>

            <button
              class="tab-pill"
              [class.active]="activeTab === 'all'"
              (click)="setTab('all')"
            >
              <mat-icon class="tab-icon">list_alt</mat-icon>
              <span>All Records</span>
              <span class="tab-count">{{ appointments.length }}</span>
            </button>
          </div>

          <!-- Loading State -->
          <div *ngIf="loading" class="loading-wrap">
            <mat-spinner diameter="36"></mat-spinner>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loading && filteredAppointments.length === 0" class="empty-state">
            <mat-icon class="empty-icon">event_available</mat-icon>
            <h3>{{ getEmptyStateTitle() }}</h3>
            <p>{{ getEmptyStateMessage() }}</p>
            <div *ngIf="activeTab === 'today' && upcomingAppointments.length > 0" class="mt-4">
              <button mat-stroked-button color="primary" (click)="setTab('upcoming')">
                View {{ upcomingAppointments.length }} Upcoming Consultation(s) →
              </button>
            </div>
          </div>

          <!-- Appointment List -->
          <div *ngIf="!loading && filteredAppointments.length > 0" class="appointment-list">
            <div *ngFor="let apt of filteredAppointments; trackBy: trackByAppointment" class="appointment-row">
              <!-- Date & Time Column -->
              <div class="time-col">
                <div class="date-badge" [ngClass]="getDateBadgeClass(apt)">
                  {{ getRelativeDateLabel(apt) }}
                </div>
                <span class="slot-time">
                  {{ apt.slotStart | portalDate:'h:mm a' }}
                </span>
                <span class="slot-duration">
                  {{ getDurationText(apt) }}
                </span>
              </div>

              <!-- Patient Details Column -->
              <div class="patient-col">
                <div class="patient-name">
                  <span class="name-text">{{ getPatientName(apt) }}</span>
                  <span *ngIf="apt.bookedFor?.type === 'dependent'" class="dependent-pill">
                    {{ apt.bookedFor.relationship || 'Family' }}
                  </span>
                  <span *ngIf="isRecentBooking(apt)" class="new-booking-tag">NEW BOOKING</span>
                </div>

                <div class="patient-meta" *ngIf="getPatientContact(apt)">
                  <mat-icon class="meta-icon">contact_phone</mat-icon>
                  <span>{{ getPatientContact(apt) }}</span>
                </div>

                <div class="patient-reason">
                  <span class="font-medium text-neutral-800">Reason:</span>
                  {{ apt.reasonForVisit || 'General Medical Consultation' }}
                </div>

                <div class="booking-timestamp" *ngIf="apt.createdAt">
                  Booked on {{ apt.createdAt | portalDate:'dd MMM yyyy, h:mm a' }}
                </div>
              </div>

              <!-- Fee & Status Column -->
              <div class="fee-status-col">
                <div class="fee-display">
                  ₹{{ apt.consultationFee || doctorProfile?.consultationFee || 500 }}
                </div>
                <div class="status-wrap">
                  <app-status-badge [status]="apt.status"></app-status-badge>
                </div>
              </div>

              <!-- Actions Column -->
              <div class="actions-col">
                <!-- Manage Details -->
                <a
                  [routerLink]="['/doctor/appointments', apt._id]"
                  mat-stroked-button
                  color="primary"
                  class="action-btn"
                >
                  Manage
                </a>

                <!-- Confirmed Action: Mark Completed -->
                <button
                  *ngIf="apt.status === 'confirmed'"
                  mat-flat-button
                  color="primary"
                  (click)="markCompleted(apt._id)"
                  class="action-btn-sm"
                  title="Mark Visit Completed"
                  [disabled]="actionLoadingId === apt._id"
                >
                  <mat-icon>done</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </mat-card>

        <!-- Side Widgets -->
        <div class="side-widgets">
          <!-- Recent Activity / Bookings Widget -->
          <mat-card class="widget-card">
            <div class="widget-header">
              <mat-icon class="widget-header-icon">fiber_new</mat-icon>
              <h3 class="widget-title">Recent Patient Bookings</h3>
            </div>
            
            <div *ngIf="recentBookings.length === 0" class="empty-widget">
              <p>No recent bookings recorded.</p>
            </div>

            <div *ngIf="recentBookings.length > 0" class="recent-mini-list">
              <div *ngFor="let item of recentBookings.slice(0, 4)" class="recent-mini-item">
                <div class="mini-patient">
                  <div class="mini-name">{{ getPatientName(item) }}</div>
                  <div class="mini-time">
                    {{ item.slotStart | portalDate:'dd MMM, h:mm a' }}
                  </div>
                </div>
                <div class="mini-actions">
                  <app-status-badge [status]="item.status"></app-status-badge>
                  <a [routerLink]="['/doctor/appointments', item._id]" class="mini-link">
                    View
                  </a>
                </div>
              </div>
            </div>
          </mat-card>

          <!-- Practice Overview Widget -->
          <mat-card class="widget-card">
            <div class="widget-header">
              <mat-icon class="widget-header-icon">business</mat-icon>
              <h3 class="widget-title">Practice Overview</h3>
            </div>
            <div class="profile-summary">
              <div class="summary-item">
                <span class="lbl">Affiliated Clinic:</span>
                <span class="val">{{ getClinicName() }}</span>
              </div>
              <div class="summary-item">
                <span class="lbl">Consultation Fee:</span>
                <span class="val">₹{{ doctorProfile?.consultationFee || 500 }}</span>
              </div>
              <div class="summary-item">
                <span class="lbl">Slot Duration:</span>
                <span class="val">{{ doctorProfile?.slotDurationMinutes || 30 }} Minutes</span>
              </div>
              <div class="summary-item">
                <span class="lbl">Booking Mode:</span>
                <span class="val font-semibold text-emerald-700">
                  Instant Confirmed (RedBus model)
                </span>
              </div>
              <div class="summary-item">
                <span class="lbl">Specialization:</span>
                <span class="val">{{ getSpecializationName() }}</span>
              </div>
            </div>

            <div class="widget-actions">
              <a routerLink="/doctor/profile" mat-stroked-button class="w-full">
                Edit Practice Settings
              </a>
            </div>
          </mat-card>

          <!-- Quick Actions Widget -->
          <mat-card class="widget-card">
            <div class="widget-header">
              <mat-icon class="widget-header-icon">flash_on</mat-icon>
              <h3 class="widget-title">Quick Actions</h3>
            </div>
            <div class="quick-links-list">
              <a routerLink="/doctor/schedule" class="quick-link-row">
                <mat-icon class="link-icon">calendar_month</mat-icon>
                <span>Full Appointment Calendar</span>
              </a>
              <a routerLink="/doctor/availability" class="quick-link-row">
                <mat-icon class="link-icon">tune</mat-icon>
                <span>Working Hours & Slots</span>
              </a>
              <a routerLink="/doctor/emergency" class="quick-link-row text-rose-600">
                <mat-icon class="link-icon text-rose-600">block</mat-icon>
                <span>Emergency Block-Out</span>
              </a>
            </div>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .header-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .page-title {
      font-size: 22px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 4px;
    }

    .page-subtitle {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .emergency-btn {
      color: #D9534F !important;
      border-color: rgba(217, 83, 79, 0.4) !important;
    }

    .action-btn-refresh {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .spin-animation {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% {
        transform: rotate(360deg);
      }
    }

    /* Next Consultation Alert Banner */
    .next-consultation-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #0F5C5C 0%, #0A4343 100%);
      color: #FFFFFF;
      padding: 18px 24px;
      border-radius: 12px;
      gap: 20px;
      box-shadow: 0 4px 12px rgba(15, 92, 92, 0.15);
    }

    .banner-icon-box {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .banner-icon-box mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #F8B84E;
    }

    .banner-text {
      flex: 1;
    }

    .banner-badge {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #A0C6C6;
      margin-bottom: 2px;
    }

    .banner-heading {
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .patient-highlight {
      color: #FFFFFF;
      font-weight: 800;
    }

    .banner-time {
      color: #E6F2F1;
      font-weight: 500;
      font-size: 14px;
    }

    .banner-reason {
      font-size: 12px;
      color: #D1E5E5;
      margin-top: 4px;
    }

    .banner-actions button, .banner-actions a {
      background: #FFFFFF !important;
      color: #0F5C5C !important;
      font-weight: 700 !important;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .stat-card {
      padding: 16px 18px !important;
      border-radius: 12px !important;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 14px;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .stat-card.cursor-pointer:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border-color: #0F5C5C;
    }

    .stat-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon-wrap.upcoming {
      background-color: #E0F2FE;
      color: #0284C7;
    }

    .stat-icon-wrap.primary {
      background-color: #E6F2F1;
      color: #0F5C5C;
    }

    .stat-icon-wrap.accent {
      background-color: #FEF6EC;
      color: #B57416;
    }

    .stat-icon-wrap.success {
      background-color: #EBF7EE;
      color: #2E9E6B;
    }

    .stat-icon-wrap.rating {
      background-color: #FFFBEB;
      color: #F59E0B;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 11px;
      font-weight: 700;
      color: #5C6B6B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 800;
      color: #1A2E2E;
      line-height: 1.2;
      margin-top: 2px;
    }

    .stat-sub {
      font-size: 11px;
      color: #8C9999;
      margin-top: 2px;
    }

    /* Content Split */
    .content-split {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    @media (max-width: 960px) {
      .content-split {
        grid-template-columns: 1fr;
      }
    }

    .main-card, .widget-card {
      padding: 20px 24px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .card-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 2px;
    }

    .card-desc {
      font-size: 12px;
      color: #5C6B6B;
      margin: 0;
    }

    .view-all-link {
      font-size: 12px;
      font-weight: 700;
      color: #0F5C5C;
      text-decoration: none;
    }

    /* Tab Pills Bar */
    .tab-pills-bar {
      display: flex;
      gap: 8px;
      padding-bottom: 16px;
      margin-bottom: 16px;
      border-bottom: 1px solid #F0EFEA;
      overflow-x: auto;
    }

    .tab-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid #E7E5E0;
      background: #FAFAF8;
      color: #5C6B6B;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .tab-pill:hover {
      background: #F4F3EF;
      color: #1A2E2E;
    }

    .tab-pill.active {
      background: #0F5C5C;
      color: #FFFFFF;
      border-color: #0F5C5C;
    }

    .tab-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .tab-count {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.08);
      font-weight: 700;
    }

    .tab-pill.active .tab-count {
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
    }

    .badge-alert {
      background: #FEF3C7 !important;
      color: #B45309 !important;
    }

    /* Appointment List & Rows */
    .appointment-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .appointment-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-radius: 10px;
      border: 1px solid #E7E5E0;
      background: #FAFAF8;
      gap: 16px;
      transition: background 0.15s ease;
    }

    .appointment-row:hover {
      background: #F6F5F2;
    }

    .time-col {
      display: flex;
      flex-direction: column;
      min-width: 95px;
      gap: 2px;
    }

    .date-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .date-badge.badge-today {
      background: #E6F2F1;
      color: #0F5C5C;
    }

    .date-badge.badge-tomorrow {
      background: #E0F2FE;
      color: #0369A1;
    }

    .date-badge.badge-future {
      background: #F3F4F6;
      color: #4B5563;
    }

    .slot-time {
      font-size: 13px;
      font-weight: 800;
      color: #1A2E2E;
    }

    .slot-duration {
      font-size: 10px;
      color: #8C9999;
    }

    .patient-col {
      flex: 1;
    }

    .patient-name {
      font-size: 14px;
      font-weight: 700;
      color: #1A2E2E;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .dependent-pill {
      font-size: 9px;
      font-weight: 700;
      background-color: #E6F2F1;
      color: #0F5C5C;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: capitalize;
    }

    .new-booking-tag {
      font-size: 9px;
      font-weight: 800;
      background-color: #FEF3C7;
      color: #B45309;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.4px;
    }

    .patient-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #5C6B6B;
      margin-top: 2px;
    }

    .meta-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }

    .patient-reason {
      font-size: 11px;
      color: #5C6B6B;
      margin-top: 3px;
    }

    .booking-timestamp {
      font-size: 10px;
      color: #9CA3AF;
      margin-top: 2px;
    }

    .fee-status-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      min-width: 90px;
    }

    .fee-display {
      font-size: 13px;
      font-weight: 800;
      color: #1A2E2E;
    }

    .actions-col {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .action-btn {
      font-size: 12px !important;
      padding: 0 12px !important;
      height: 32px !important;
      line-height: 32px !important;
    }

    .action-btn-sm {
      min-width: 32px !important;
      width: 32px !important;
      height: 32px !important;
      padding: 0 !important;
    }

    .success-btn {
      background-color: #2E9E6B !important;
      color: #FFFFFF !important;
    }

    /* Side Widgets */
    .side-widgets {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .widget-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
    }

    .widget-header-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #0F5C5C;
    }

    .widget-title {
      font-size: 14px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0;
    }

    .recent-mini-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .recent-mini-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 10px;
      border-bottom: 1px solid #F0EFEA;
      gap: 8px;
    }

    .recent-mini-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .mini-name {
      font-size: 13px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .mini-time {
      font-size: 11px;
      color: #5C6B6B;
    }

    .mini-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .mini-link {
      font-size: 11px;
      font-weight: 700;
      color: #0F5C5C;
      text-decoration: none;
    }

    .profile-summary {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .summary-item .lbl {
      color: #5C6B6B;
    }

    .summary-item .val {
      font-weight: 700;
      color: #1A2E2E;
      text-align: right;
    }

    .widget-actions {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid #F0EFEA;
    }

    .w-full {
      width: 100%;
    }

    .quick-links-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .quick-link-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #1A2E2E;
      text-decoration: none;
      transition: background 0.15s ease;
    }

    .quick-link-row:hover {
      background: #F4F3EF;
      color: #0F5C5C;
    }

    .link-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #5C6B6B;
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .empty-state {
      text-align: center;
      padding: 36px 20px;
    }

    .empty-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #A0C6C6;
      margin-bottom: 8px;
    }

    .empty-state h3 {
      font-size: 15px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 4px;
    }

    .empty-state p {
      font-size: 12px;
      color: #5C6B6B;
      margin: 0;
    }

    .empty-widget {
      font-size: 12px;
      color: #8C9999;
      text-align: center;
      padding: 12px 0;
    }
  `],
})
export class DoctorDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  private notificationService = inject(NotificationService);

  currentUser$ = this.authService.currentUser$;
  doctorProfile: Doctor | null = null;
  appointments: Appointment[] = [];
  todayAppointments: Appointment[] = [];
  upcomingAppointments: Appointment[] = [];
  recentBookings: Appointment[] = [];
  completedAppointments: Appointment[] = [];
  nextAppointment: Appointment | null = null;

  activeTab: DashboardTab = 'upcoming';
  loading = true;
  actionLoadingId: string | null = null;
  todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');

  ngOnInit(): void {
    this.loadDoctorDashboard();
  }

  loadDoctorDashboard(): void {
    this.loading = true;
    this.doctorService.getMyDoctorProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.doctorProfile = res.data;
          this.loadAppointments(this.doctorProfile._id);
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  refreshDashboard(): void {
    if (this.doctorProfile) {
      this.loadAppointments(this.doctorProfile._id);
    } else {
      this.loadDoctorDashboard();
    }
  }

  loadAppointments(doctorId: string): void {
    this.appointmentService.getDoctorAppointments(doctorId, { limit: 100 } as any).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.appointments = res.data;
          this.processAppointments(this.appointments);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  processAppointments(data: Appointment[]): void {
    // 1. Today's appointments
    this.todayAppointments = data.filter((apt) => {
      try {
        return isToday(parseISO(apt.slotStart));
      } catch {
        return false;
      }
    });

    // 2. Upcoming appointments (today or future, not cancelled/no-show)
    this.upcomingAppointments = data
      .filter((apt) => {
        try {
          const d = parseISO(apt.slotStart);
          const isCurrentOrFuture = !isPast(d) || isToday(d);
          return isCurrentOrFuture && apt.status !== 'cancelled' && apt.status !== 'no_show';
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime());

    // 3. Recent Bookings (sorted by creation date descending)
    this.recentBookings = [...data].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.slotStart).getTime();
      const timeB = new Date(b.createdAt || b.slotStart).getTime();
      return timeB - timeA;
    });

    // 4. Completed Appointments
    this.completedAppointments = data.filter((apt) => apt.status === 'completed');

    // 5. Next scheduled consultation (first upcoming non-completed visit)
    this.nextAppointment =
      this.upcomingAppointments.find((apt) => apt.status !== 'completed') || null;

    // Intelligent default tab selection:
    // If there are visits scheduled today, show today. Otherwise show upcoming.
    if (this.todayAppointments.length > 0) {
      this.activeTab = 'today';
    } else if (this.upcomingAppointments.length > 0) {
      this.activeTab = 'upcoming';
    } else {
      this.activeTab = 'recent';
    }
  }

  setTab(tab: DashboardTab): void {
    this.activeTab = tab;
  }

  get filteredAppointments(): Appointment[] {
    switch (this.activeTab) {
      case 'today':
        return this.todayAppointments;
      case 'upcoming':
        return this.upcomingAppointments;
      case 'recent':
        return this.recentBookings;
      case 'completed':
        return this.completedAppointments;
      case 'all':
      default:
        return this.appointments;
    }
  }

  get completedCount(): number {
    return this.appointments.filter((apt) => apt.status === 'completed').length;
  }

  trackByAppointment(index: number, apt: Appointment): string {
    return apt._id;
  }

  getDoctorWelcomeName(): string {
    const user = this.authService.currentUser;
    let name = user?.name || (this.doctorProfile as any)?.name || 'Doctor';
    if (!/^dr\.?\s+/i.test(name)) {
      name = `Dr. ${name}`;
    }
    return name;
  }

  getPatientName(apt: Appointment): string {
    if (apt.bookedFor && apt.bookedFor.name) return apt.bookedFor.name;
    if (typeof apt.patientId === 'object' && apt.patientId && (apt.patientId as any).name) {
      return (apt.patientId as any).name;
    }
    return 'Patient';
  }

  getPatientContact(apt: Appointment): string {
    if (apt.bookedFor && (apt.bookedFor as any).phone) return (apt.bookedFor as any).phone;
    if (typeof apt.patientId === 'object' && apt.patientId) {
      const p = apt.patientId as any;
      return p.phone || p.email || '';
    }
    return '';
  }

  getRelativeDateLabel(apt: Appointment): string {
    try {
      const date = parseISO(apt.slotStart);
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      return format(date, 'dd MMM yyyy');
    } catch {
      return 'Scheduled';
    }
  }

  getDateBadgeClass(apt: Appointment): string {
    try {
      const date = parseISO(apt.slotStart);
      if (isToday(date)) return 'badge-today';
      if (isTomorrow(date)) return 'badge-tomorrow';
      return 'badge-future';
    } catch {
      return 'badge-future';
    }
  }

  getDurationText(apt: Appointment): string {
    const mins = this.doctorProfile?.slotDurationMinutes || 30;
    return `${mins} mins`;
  }

  isRecentBooking(apt: Appointment): boolean {
    if (!apt.createdAt) return false;
    try {
      const hoursAgo = differenceInHours(new Date(), parseISO(apt.createdAt));
      return hoursAgo <= 48;
    } catch {
      return false;
    }
  }

  getEmptyStateTitle(): string {
    switch (this.activeTab) {
      case 'today':
        return 'No appointments scheduled for today';
      case 'upcoming':
        return 'No upcoming consultations found';
      case 'completed':
        return 'No completed consultations yet';
      case 'recent':
        return 'No recent bookings recorded';
      default:
        return 'No appointment records available';
    }
  }

  getEmptyStateMessage(): string {
    switch (this.activeTab) {
      case 'today':
        return 'Your calendar is free for today.';
      case 'upcoming':
        return 'All upcoming slots are open or have not been booked yet.';
      case 'completed':
        return 'Completed consultations will appear here once visits conclude.';
      case 'recent':
        return 'New bookings will show up here as soon as patients confirm slots.';
      default:
        return 'Your practice schedule currently has no recorded visits.';
    }
  }

  getClinicName(): string {
    if (this.doctorProfile?.clinicId && typeof this.doctorProfile.clinicId === 'object') {
      return (this.doctorProfile.clinicId as any).name || 'Affiliated Clinic';
    }
    return this.doctorProfile?.isIndependent ? 'Independent Practice' : 'Clinic Affiliated';
  }

  getSpecializationName(): string {
    if (this.doctorProfile?.specializationId && typeof this.doctorProfile.specializationId === 'object') {
      return (this.doctorProfile.specializationId as any).name || 'General Medicine';
    }
    return 'General Medicine';
  }

  markCompleted(id: string): void {
    this.actionLoadingId = id;
    this.appointmentService.updateAppointmentStatus(id, 'completed', 'Completed during consultation').subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.notificationService.success('Appointment marked as completed');
        if (this.doctorProfile) {
          this.loadAppointments(this.doctorProfile._id);
        }
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.notificationService.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }
}
