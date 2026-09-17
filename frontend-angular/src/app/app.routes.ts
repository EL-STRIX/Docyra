import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards';
import { PortalLayoutComponent } from './shared/layout/portal-layout/portal-layout.component';

// Auth Components
import { LoginComponent } from './features/auth/login/login.component';
import { TwoFactorComponent } from './features/auth/two-factor/two-factor.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';

// Doctor Components
import { DoctorDashboardComponent } from './features/doctor/dashboard/doctor-dashboard.component';
import { AvailabilityMgmtComponent } from './features/doctor/availability/availability-mgmt.component';
import { DoctorScheduleComponent } from './features/doctor/schedule/doctor-schedule.component';
import { DoctorAppointmentDetailComponent } from './features/doctor/appointment-detail/doctor-appointment-detail.component';
import { EmergencyUnavailableComponent } from './features/doctor/emergency/emergency-unavailable.component';
import { PatientHistoryComponent } from './features/doctor/patient-history/patient-history.component';
import { DoctorProfileSettingsComponent } from './features/doctor/profile/doctor-profile-settings.component';

// Clinic Admin Components
import { ClinicDashboardComponent } from './features/clinic-admin/dashboard/clinic-dashboard.component';
import { ManageDoctorsComponent } from './features/clinic-admin/manage-doctors/manage-doctors.component';
import { ClinicAppointmentsComponent } from './features/clinic-admin/clinic-appointments/clinic-appointments.component';
import { ClinicSettingsComponent } from './features/clinic-admin/clinic-settings/clinic-settings.component';

// Platform Admin Components
import { AdminDashboardComponent } from './features/platform-admin/dashboard/admin-dashboard.component';
import { ManageClinicsComponent } from './features/platform-admin/manage-clinics/manage-clinics.component';
import { DoctorApplicationsComponent } from './features/platform-admin/doctor-applications/doctor-applications.component';
import { ManageSpecializationsComponent } from './features/platform-admin/manage-specializations/manage-specializations.component';
import { ManagePatientsComponent } from './features/platform-admin/manage-patients/manage-patients.component';
import { AuditLogsComponent } from './features/platform-admin/audit-logs/audit-logs.component';
import { AnalyticsReportsComponent } from './features/platform-admin/analytics/analytics-reports.component';
import { AdminSystemSettingsComponent } from './features/platform-admin/system-settings/admin-system-settings.component';

export const routes: Routes = [
  // Public Auth
  { path: 'login', component: LoginComponent },
  { path: 'two-factor', component: TwoFactorComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // Doctor Portal
  {
    path: 'doctor',
    component: PortalLayoutComponent,
    canActivate: [authGuard, roleGuard(['doctor'])],
    children: [
      { path: 'dashboard', component: DoctorDashboardComponent },
      { path: 'availability', component: AvailabilityMgmtComponent },
      { path: 'schedule', component: DoctorScheduleComponent },
      { path: 'appointments/:id', component: DoctorAppointmentDetailComponent },
      { path: 'emergency', component: EmergencyUnavailableComponent },
      { path: 'patients', component: PatientHistoryComponent },
      { path: 'profile', component: DoctorProfileSettingsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Clinic Admin Portal
  {
    path: 'clinic-admin',
    component: PortalLayoutComponent,
    canActivate: [authGuard, roleGuard(['clinic_admin'])],
    children: [
      { path: 'dashboard', component: ClinicDashboardComponent },
      { path: 'doctors', component: ManageDoctorsComponent },
      { path: 'appointments', component: ClinicAppointmentsComponent },
      { path: 'settings', component: ClinicSettingsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Platform Admin Portal
  {
    path: 'admin',
    component: PortalLayoutComponent,
    canActivate: [authGuard, roleGuard(['admin'])],
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'clinics', component: ManageClinicsComponent },
      { path: 'doctor-applications', component: DoctorApplicationsComponent },
      { path: 'specializations', component: ManageSpecializationsComponent },
      { path: 'patients', component: ManagePatientsComponent },
      { path: 'audit-logs', component: AuditLogsComponent },
      { path: 'analytics', component: AnalyticsReportsComponent },
      { path: 'settings', component: AdminSystemSettingsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Fallbacks
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
