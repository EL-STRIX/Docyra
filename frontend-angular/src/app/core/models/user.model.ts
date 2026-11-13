export type UserRole = 'patient' | 'doctor' | 'clinic_admin' | 'admin';

export interface UserConsent {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  clinicId?: string; // Set for clinic_admin and clinic-affiliated doctors
  status?: 'active' | 'suspended' | 'pending';
  timezone?: string;
  consent?: UserConsent;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  user: User;
  requiresTwoFactor?: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
}
