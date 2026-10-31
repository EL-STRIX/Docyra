import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AuthService } from './core/services/auth.service';

// Public Auth Components
import { LoginComponent } from './features/auth/login/login.component';
import { TwoFactorSetupComponent } from './features/auth/two-factor-setup/two-factor-setup.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';

// Shared Layout
import { PortalLayoutComponent } from './shared/components/portal-layout/portal-layout.component';

// Doctor Components (Screen 32-37)
import { DoctorDashboardComponent } from './features/doctor/dashboard/doctor-dashboard.component';
import { AvailabilityManagementComponent } from './features/doctor/availability/availability-management.component';
import { ScheduleCalendarComponent } from './features/doctor/schedule/schedule-calendar.component';
import { DoctorAppointmentDetailComponent } from './features/doctor/appointment-detail/appointment-detail.component';
import { EmergencyUnavailableComponent } from './features/doctor/emergency/emergency-unavailable.component';
import { PatientHistoryComponent } from './features/doctor/patients/patient-history.component';
import { DoctorProfileComponent } from './features/doctor/profile/doctor-profile.component';

// Clinic Admin Components (Screen 38-40, 50)
import { ClinicDashboardComponent } from './features/clinic-admin/dashboard/clinic-dashboard.component';
import { ManageDoctorsComponent } from './features/clinic-admin/doctors/manage-doctors.component';
import { ClinicAppointmentsComponent } from './features/clinic-admin/appointments/clinic-appointments.component';
import { ClinicProfileComponent } from './features/clinic-admin/profile/clinic-profile.component';

// Platform Admin Components (Screen 41-48)
import { AdminDashboardComponent } from './features/admin/dashboard/admin-dashboard.component';
import { ManageClinicsComponent } from './features/admin/clinics/manage-clinics.component';
import { DoctorApplicationsComponent } from './features/admin/applications/doctor-applications.component';
import { ManageSpecializationsComponent } from './features/admin/specializations/manage-specializations.component';
import { ManagePatientsComponent } from './features/admin/patients/manage-patients.component';
import { AuditLogViewerComponent } from './features/admin/audit-logs/audit-log-viewer.component';
import { AnalyticsReportsComponent } from './features/admin/analytics/analytics-reports.component';
import { SystemSettingsComponent } from './features/admin/settings/system-settings.component';

export const routes: Routes = [
  // Public Auth Routes
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },

  // Protected Portal App Shell
  {
    path: '',
    component: PortalLayoutComponent,
    canActivate: [authGuard],
    children: [
      // Default landing redirect based on authenticated user's role
      {
        path: '',
        pathMatch: 'full',
        canActivate: [
          () => {
            const authService = inject(AuthService);
            const router = inject(Router);
            const role = authService.userRole;
            if (role === 'doctor') return router.createUrlTree(['/doctor/dashboard']);
            if (role === 'clinic_admin') return router.createUrlTree(['/clinic/dashboard']);
            if (role === 'admin') return router.createUrlTree(['/admin/dashboard']);
            return router.createUrlTree(['/login']);
          },
        ],
      },

      // Shared authenticated 2FA setup
      { path: '2fa-setup', component: TwoFactorSetupComponent },

      // Doctor Workspace (canActivate role: doctor)
      {
        path: 'doctor',
        canActivate: [roleGuard(['doctor'])],
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', component: DoctorDashboardComponent },
          { path: 'availability', component: AvailabilityManagementComponent },
          { path: 'schedule', component: ScheduleCalendarComponent },
          { path: 'appointments/:id', component: DoctorAppointmentDetailComponent },
          { path: 'emergency', component: EmergencyUnavailableComponent },
          { path: 'patients', component: PatientHistoryComponent },
          { path: 'patients/:id', component: PatientHistoryComponent },
          { path: 'profile', component: DoctorProfileComponent },
        ],
      },

      // Clinic Admin Workspace (canActivate role: clinic_admin)
      {
        path: 'clinic',
        canActivate: [roleGuard(['clinic_admin'])],
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', component: ClinicDashboardComponent },
          { path: 'doctors', component: ManageDoctorsComponent },
          { path: 'appointments', component: ClinicAppointmentsComponent },
          { path: 'profile', component: ClinicProfileComponent },
        ],
      },

      // Platform Admin Workspace (canActivate role: admin)
      {
        path: 'admin',
        canActivate: [roleGuard(['admin'])],
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', component: AdminDashboardComponent },
          { path: 'clinics', component: ManageClinicsComponent },
          { path: 'applications', component: DoctorApplicationsComponent },
          { path: 'specializations', component: ManageSpecializationsComponent },
          { path: 'patients', component: ManagePatientsComponent },
          { path: 'audit-logs', component: AuditLogViewerComponent },
          { path: 'analytics', component: AnalyticsReportsComponent },
          { path: 'settings', component: SystemSettingsComponent },
        ],
      },
    ],
  },

  // Fallbacks
  { path: '**', redirectTo: '/login' },
];
