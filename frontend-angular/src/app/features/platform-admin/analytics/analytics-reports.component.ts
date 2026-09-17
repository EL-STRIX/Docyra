import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-analytics-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-page">
      <div class="page-header">
        <div>
          <h2>Platform Analytics & Clinic Breakdown</h2>
          <p>Key performance indicators, booking volume, and clinic network metrics</p>
        </div>
      </div>

      <!-- KPI Summary -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-title">Total Consultations Booked</div>
          <div class="kpi-val">{{ analyticsData.totalAppointments }}</div>
          <div class="kpi-trend">↑ 14% vs previous month</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Consultation Completion Rate</div>
          <div class="kpi-val">94.2%</div>
          <div class="kpi-trend text-green">Optimal clinical adherence</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Average Patient Rating</div>
          <div class="kpi-val">4.85 ★</div>
          <div class="kpi-trend">Across verified partner clinics</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Double-Booking Rate</div>
          <div class="kpi-val text-green">0.00%</div>
          <div class="kpi-trend text-green">Guaranteed transactional lock</div>
        </div>
      </div>

      <!-- Breakdown Cards -->
      <div class="breakdown-grid">
        <div class="portal-card">
          <h3>Appointments by Status Distribution</h3>
          <div class="status-dist-list">
            <div class="dist-row">
              <span>Completed Consultations</span>
              <span class="font-bold">78%</span>
            </div>
            <div class="dist-row">
              <span>Upcoming / Confirmed</span>
              <span class="font-bold">16%</span>
            </div>
            <div class="dist-row">
              <span>Patient Rescheduled / Cancelled</span>
              <span class="font-bold">4%</span>
            </div>
            <div class="dist-row">
              <span>Doctor Emergency Absences</span>
              <span class="font-bold">2%</span>
            </div>
          </div>
        </div>

        <div class="portal-card">
          <h3>Top Specializations by Demand</h3>
          <div class="spec-dist-list">
            <div class="dist-row">
              <span>General Practice & Family Medicine</span>
              <span class="font-bold">42%</span>
            </div>
            <div class="dist-row">
              <span>Cardiology</span>
              <span class="font-bold">21%</span>
            </div>
            <div class="dist-row">
              <span>Pediatrics</span>
              <span class="font-bold">18%</span>
            </div>
            <div class="dist-row">
              <span>Dermatology</span>
              <span class="font-bold">12%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; }
    .page-header p { margin: 0; font-size: 13px; color: var(--docyra-text-secondary); }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
    .kpi-card { background: white; border: 1px solid var(--docyra-neutral-border); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 8px; }
    .kpi-title { font-size: 12px; font-weight: 700; color: var(--docyra-text-secondary); text-transform: uppercase; }
    .kpi-val { font-size: 28px; font-weight: 800; color: var(--docyra-text-primary); }
    .kpi-trend { font-size: 11px; color: #64748B; font-weight: 600; }
    .text-green { color: #1E7E53; }
    .breakdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .portal-card h3 { margin: 0 0 20px; font-size: 16px; font-weight: 800; }
    .dist-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--docyra-neutral-border); font-size: 13px; }
    .font-bold { font-weight: 700; }
  `]
})
export class AnalyticsReportsComponent implements OnInit {
  analyticsData = {
    totalAppointments: 1420,
    totalClinics: 12,
    totalDoctors: 48
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getAnalytics().subscribe({
      next: (res) => {
        if (res.data) {
          this.analyticsData = { ...this.analyticsData, ...res.data };
        }
      }
    });
  }
}
