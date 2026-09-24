import { User } from './user.model';
import { Clinic } from './clinic.model';
import { Specialization } from './specialization.model';

export interface TimeSlotConfig {
  start: string; // e.g. "09:00"
  end: string;   // e.g. "17:00"
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  isActive: boolean;
  slots: TimeSlotConfig[];
}

export interface Doctor {
  _id: string;
  userId: string | User;
  clinicId?: string | Clinic;
  specializationId?: string | Specialization;
  title?: string;
  name?: string;
  bio?: string;
  qualifications?: string[];
  experienceYears?: number;
  consultationFee: number;
  slotDurationMinutes: number; // default 30
  isIndependent: boolean;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  autoAcceptAppointments: boolean;
  weeklySchedule?: DaySchedule[];
  unavailabilityOverrides?: Array<{
    date: string; // YYYY-MM-DD
    reason?: string;
    allDay?: boolean;
    startTime?: string;
    endTime?: string;
  }>;
  rating?: number;
  reviewCount?: number;
  licenseNumber?: string;
  licenseDocumentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DoctorApplication {
  _id: string;
  doctorId: string;
  doctor?: Doctor;
  user?: User;
  licenseNumber: string;
  licenseDocumentUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  rejectionReason?: string;
  appliedAt: string;
  reviewedAt?: string;
}
