import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Doctor } from '../../../core/models/doctor.model';
import { Appointment } from '../../../core/models/appointment.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StatusBadgeComponent,
    DateFormatPipe,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatButtonModule,
  ],
  template: `
    <div class="patient-history-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Patient Medical & Visit Records</h1>
          <p class="page-subtitle">Search patients and review chronological consultation histories and diagnoses.</p>
        </div>
      </div>

      <!-- Search & Patient Selector -->
      <mat-card class="search-card">
        <div class="search-wrap">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Search patient name or ID...</mat-label>
            <input matInput [(ngModel)]="searchTerm" (ngModelChange)="filterPatients()" />
            <mat-icon matPrefix class="mr-2 text-neutral-400">search</mat-icon>
          </mat-form-field>
        </div>
      </mat-card>

      <!-- Content Split: Patient List + Selected Patient Timeline -->
      <div class="history-grid">
        <!-- Patient List Column -->
        <mat-card class="patients-list-card">
          <h2 class="card-title">Patients ({{ uniquePatients.length }})</h2>

          <div *ngIf="loading" class="loading-wrap">
            <mat-spinner diameter="30"></mat-spinner>
          </div>

          <div *ngIf="!loading && filteredPatients.length === 0" class="empty-list">
            <p>No patient records found.</p>
          </div>

          <div *ngIf="!loading && filteredPatients.length > 0" class="patients-scroll-list">
            <div
              *ngFor="let p of filteredPatients"
              class="patient-list-item"
              [class.active]="selectedPatientName === p.name"
              (click)="selectPatient(p)"
            >
              <div class="avatar">{{ p.name.charAt(0) }}</div>
              <div class="p-meta">
                <span class="p-name">{{ p.name }}</span>
                <span class="p-visits">{{ p.visitsCount }} visit{{ p.visitsCount > 1 ? 's' : '' }}</span>
              </div>
            </div>
          </div>
        </mat-card>

        <!-- Selected Patient Detail Column -->
        <mat-card class="timeline-card">
          <div *ngIf="!selectedPatientName" class="no-selection">
            <mat-icon class="select-icon">person_search</mat-icon>
            <h3>Select a patient to view consultation history</h3>
            <p>Choose any patient from the left panel to review past visit notes and diagnoses.</p>
          </div>

          <div *ngIf="selectedPatientName" class="patient-detail-view">
            <div class="patient-header">
              <div class="flex items-center gap-3">
                <div class="large-avatar">{{ selectedPatientName.charAt(0) }}</div>
                <div>
                  <h2 class="patient-display-name">{{ selectedPatientName }}</h2>
                  <span class="total-visits-tag">{{ selectedPatientVisits.length }} total recorded visits</span>
                </div>
              </div>
            </div>

            <!-- Timeline of past consultations -->
            <div class="timeline-section">
              <h3 class="timeline-heading">Consultation History & Notes</h3>

              <div class="timeline-list">
                <div *ngFor="let apt of selectedPatientVisits" class="timeline-item">
                  <div class="timeline-badge" [class.completed]="apt.status === 'completed'">
                    <mat-icon>{{ apt.status === 'completed' ? 'check' : 'event' }}</mat-icon>
                  </div>

                  <div class="timeline-content">
                    <div class="timeline-top">
                      <div class="date-text">
                        {{ apt.slotStart | portalDate:'dd MMMM yyyy, h:mm a' }}
                      </div>
                      <app-status-badge [status]="apt.status"></app-status-badge>
                    </div>

                    <div class="reason-box">
                      <span class="lbl">Reason for Visit:</span>
                      <span class="val">{{ apt.reasonForVisit || 'General Consultation' }}</span>
                    </div>

                    <div class="notes-box" *ngIf="apt.notes">
                      <span class="lbl">Doctor's Clinical Notes:</span>
                      <p class="notes-text">{{ apt.notes }}</p>
                    </div>

                    <div class="notes-box empty-notes" *ngIf="!apt.notes">
                      <span class="lbl">Doctor's Clinical Notes:</span>
                      <p class="text-xs text-neutral-400 italic">No notes recorded for this visit.</p>
                    </div>

                    <div class="item-footer">
                      <a [routerLink]="['/doctor/appointments', apt._id]" class="view-apt-link">
                        View Full Appointment #{{ apt._id | slice:-6 }} →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .patient-history-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
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

    .search-card, .patients-list-card, .timeline-card {
      padding: 20px !important;
      border-radius: 12px !important;
      background: #FFFFFF;
      border: 1px solid #E7E5E0;
    }

    .history-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
    }

    @media (max-width: 860px) {
      .history-grid {
        grid-template-columns: 1fr;
      }
    }

    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 16px;
    }

    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 30px;
    }

    .empty-list {
      text-align: center;
      padding: 24px;
      color: #5C6B6B;
      font-size: 13px;
    }

    .patients-scroll-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 560px;
      overflow-y: auto;
    }

    .patient-list-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #E7E5E0;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .patient-list-item:hover {
      background-color: #FAFAF8;
    }

    .patient-list-item.active {
      background-color: #E6F2F1;
      border-color: #0F5C5C;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: #0F5C5C;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
    }

    .p-meta {
      display: flex;
      flex-direction: column;
    }

    .p-name {
      font-size: 13px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .p-visits {
      font-size: 11px;
      color: #5C6B6B;
    }

    .no-selection {
      text-align: center;
      padding: 60px 20px;
    }

    .select-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #A0C6C6;
      margin-bottom: 12px;
    }

    .no-selection h3 {
      font-size: 16px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 6px;
    }

    .no-selection p {
      font-size: 13px;
      color: #5C6B6B;
      margin: 0;
    }

    .large-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: #0F5C5C;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 20px;
    }

    .patient-display-name {
      font-size: 18px;
      font-weight: 800;
      color: #1A2E2E;
      margin: 0 0 2px;
    }

    .total-visits-tag {
      font-size: 11px;
      font-weight: 600;
      color: #0F5C5C;
      background-color: #E6F2F1;
      padding: 2px 8px;
      border-radius: 999px;
    }

    .timeline-section {
      margin-top: 24px;
      border-top: 1px solid #E7E5E0;
      padding-top: 20px;
    }

    .timeline-heading {
      font-size: 14px;
      font-weight: 700;
      color: #1A2E2E;
      margin: 0 0 16px;
    }

    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .timeline-item {
      display: flex;
      gap: 16px;
      position: relative;
    }

    .timeline-badge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #FEF6EC;
      color: #B57416;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .timeline-badge.completed {
      background-color: #EBF7EE;
      color: #2E9E6B;
    }

    .timeline-badge mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .timeline-content {
      flex: 1;
      background-color: #FAFAF8;
      border: 1px solid #E7E5E0;
      border-radius: 8px;
      padding: 16px;
    }

    .timeline-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .date-text {
      font-size: 13px;
      font-weight: 700;
      color: #1A2E2E;
    }

    .reason-box, .notes-box {
      margin-bottom: 8px;
      font-size: 12px;
    }

    .reason-box .lbl, .notes-box .lbl {
      font-weight: 700;
      color: #5C6B6B;
      display: block;
      margin-bottom: 2px;
    }

    .notes-text {
      margin: 0;
      color: #1A2E2E;
      line-height: 1.5;
      background: #FFFFFF;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
    }

    .view-apt-link {
      font-size: 12px;
      font-weight: 700;
      color: #0F5C5C;
      text-decoration: none;
      display: inline-block;
      margin-top: 6px;
    }

    .w-full {
      width: 100%;
    }
  `],
})
export class PatientHistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);

  doctorProfile: Doctor | null = null;
  allAppointments: Appointment[] = [];
  loading = true;

  searchTerm = '';
  uniquePatients: Array<{ name: string; visitsCount: number }> = [];
  filteredPatients: Array<{ name: string; visitsCount: number }> = [];

  selectedPatientName: string | null = null;
  selectedPatientVisits: Appointment[] = [];

  ngOnInit(): void {
    this.loadDoctorRecords();
  }

  loadDoctorRecords(): void {
    this.loading = true;
    this.doctorService.getMyDoctorProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.doctorProfile = res.data;
          this.appointmentService.getDoctorAppointments(res.data._id).subscribe({
            next: (aptRes) => {
              if (aptRes.success && Array.isArray(aptRes.data)) {
                this.allAppointments = aptRes.data;
                this.extractUniquePatients();
              }
              this.loading = false;
            },
            error: () => {
              this.loading = false;
            },
          });
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  extractUniquePatients(): void {
    const patientMap = new Map<string, number>();
    this.allAppointments.forEach((apt) => {
      const name = apt.bookedFor?.name || 'Unknown Patient';
      patientMap.set(name, (patientMap.get(name) || 0) + 1);
    });

    this.uniquePatients = Array.from(patientMap.entries()).map(([name, count]) => ({
      name,
      visitsCount: count,
    }));

    this.filteredPatients = [...this.uniquePatients];

    if (this.uniquePatients.length > 0) {
      this.selectPatient(this.uniquePatients[0]);
    }
  }

  filterPatients(): void {
    if (!this.searchTerm.trim()) {
      this.filteredPatients = [...this.uniquePatients];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredPatients = this.uniquePatients.filter((p) =>
      p.name.toLowerCase().includes(term)
    );
  }

  selectPatient(p: { name: string }): void {
    this.selectedPatientName = p.name;
    this.selectedPatientVisits = this.allAppointments.filter(
      (apt) => apt.bookedFor?.name === p.name
    );
  }
}
