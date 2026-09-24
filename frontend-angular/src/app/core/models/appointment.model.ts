import { User } from './user.model';
import { Doctor } from './doctor.model';
import { Clinic } from './clinic.model';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface BookedFor {
  type: 'self' | 'dependent';
  dependentId?: string;
  name: string;
  relationship?: string;
  dateOfBirth?: string;
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
