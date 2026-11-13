export interface ClinicAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ClinicContact {
  phone: string;
  email: string;
  website?: string;
}

export interface Clinic {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  address: ClinicAddress;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  contact: ClinicContact;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  subscriptionStatus?: string;
  specializationIds?: Array<{ _id: string; name: string } | string>;
  logoUrl?: string;
  images?: string[];
  isActive: boolean;
  onboardingStatus?: 'pending' | 'approved' | 'rejected' | 'suspended';
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
