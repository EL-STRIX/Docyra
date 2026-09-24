export interface Specialization {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  doctorCount?: number;
  clinicCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
