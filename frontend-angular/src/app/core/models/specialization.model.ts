export interface Specialization {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  iconName?: string;
  isActive?: boolean;
  doctorCount?: number;
  clinicCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
