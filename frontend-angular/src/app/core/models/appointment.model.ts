import { User } from './user.model';
import { Doctor } from './doctor.model';
import { Clinic } from './clinic.model';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  medicines: PrescriptionMedicine[];
  generalAdvice?: string;
  followUpDate?: string | null;
  followUpDays?: number | null;
  prescribedAt?: string | null;
}

export interface MedicalTest {
  _id?: string;
  testName: string;
  instructions?: string;
  resultNotes?: string;
  resultFileUrl?: string | null;
  status?: 'ordered' | 'completed' | 'normal' | 'abnormal';
  orderedAt?: string;
}

export interface BookedFor {
  type: 'self' | 'dependent';
  dependentId?: string;
  name: string;
  relationship?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  heightCm?: number;
  weightKg?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  phone?: string;
  email?: string;
}

export interface Appointment {
  _id: string;
  patientId: string | User;
  doctorId: string | Doctor;
  clinicId?: string | Clinic;
  slotId: string;
  slotStart: string; // ISO date string
  slotEnd: string;   // ISO date string
  status: AppointmentStatus;
  bookedFor: BookedFor;
  reasonForVisit?: string;
  notes?: string;
  previousAppointmentId?: any;
  isFollowUp?: boolean;
  prescription?: Prescription;
  medicalTests?: MedicalTest[];
  consultationFee: number;
  paymentStatus: 'pending' | 'completed' | 'refunded';
  cancelledBy?: 'patient' | 'doctor' | 'clinic_admin' | 'system';
  cancellationReason?: string;
  cancelledAt?: string;
  reminderSent24h?: boolean;
  reminderSent1h?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentSlot {
  _id: string;
  doctorId: string;
  clinicId?: string;
  slotStart: string;
  slotEnd: string;
  isBooked: boolean;
  isUnavailableOverride?: boolean;
}
