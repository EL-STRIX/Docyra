export interface AnalyticsSummary {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalClinics: number;
  totalDoctors: number;
  totalPatients: number;
  revenueEstimated: number;
  monthlyTrend?: Array<{
    month: string;
    count: number;
    completed: number;
    cancelled: number;
  }>;
  statusBreakdown?: Record<string, number>;
  specializationBreakdown?: Array<{
    name: string;
    count: number;
  }>;
  topClinics?: Array<{
    clinicId: string;
    name: string;
    city: string;
    appointmentsCount: number;
    rating: number;
  }>;
}

export interface SystemSettings {
  slotDurationDefaultMinutes: number;
  cancellationWindowHours: number;
  currency: string;
  allowIndependentDoctors: boolean;
  twoFactorEnforcedForStaff: boolean;
  maintenanceMode: boolean;
}
