export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'patient' | 'doctor' | 'clinic_admin' | 'admin';
  clinicId?: string;
  twoFactorEnabled?: boolean;
  phone?: string;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export interface Clinic {
  _id: string;
  name: string;
  address: {
    street?: string;
    city: string;
    state?: string;
    zipCode?: string;
    country: string;
  };
  phone: string;
  email: string;
  isActive: boolean;
  totalDoctors?: number;
  totalAppointments?: number;
  createdAt?: string;
}

export interface Specialization {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  doctorCount?: number;
}

export interface DoctorProfile {
  _id: string;
  userId: User | string;
  clinicId?: Clinic | string;
  specializationId?: Specialization | string;
  bio?: string;
  qualifications?: string[];
  experienceYears?: number;
  consultationFee?: number;
  slotDuration?: number;
  isIndependent?: boolean;
  applicationStatus?: 'pending' | 'approved' | 'rejected';
  licenseNumber?: string;
  licenseDocumentUrl?: string;
  avgRating?: number;
  totalReviews?: number;
  createdAt?: string;
}

export interface AppointmentSlot {
  _id: string;
  doctorId: string;
  slotStart: string;
  slotEnd: string;
  isBooked: boolean;
  isLocked?: boolean;
  dateStr?: string;
}

export interface Appointment {
  _id: string;
  patientId: User | string;
  doctorId: DoctorProfile | string;
  clinicId?: Clinic | string;
  slotId: AppointmentSlot | string;
  status: 'booked' | 'confirmed' | 'rejected' | 'completed' | 'no_show' | 'cancelled_by_patient' | 'cancelled_by_doctor' | 'cancelled_by_admin' | 'cancelled_emergency';
  reason?: string;
  cancellationReason?: string;
  doctorSnapshot?: {
    fullName: string;
    specialization: string;
  };
  clinicSnapshot?: {
    name: string;
    city: string;
  };
  dependentSnapshot?: {
    fullName: string;
    relationship: string;
  };
  hasReview?: boolean;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  performedBy: {
    _id: string;
    email: string;
    role: string;
  };
  targetType: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
}

export interface SystemSettings {
  defaultSlotDurationMinutes: number;
  cancellationCutoffHours: number;
  currency: string;
  maintenanceMode: boolean;
  require2FAForStaff: boolean;
}
