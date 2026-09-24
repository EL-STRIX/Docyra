import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

import {
  User,
  Clinic,
  DoctorProfile,
  Specialization,
  AvailabilityRule,
  AppointmentSlot,
  Appointment,
  Dependent,
  Review,
  SystemSettings,
  AuditLog,
} from '../src/models/index.js';

import { ROLES, USER_STATUS, CLINIC_SUBSCRIPTION_STATUS } from '../src/config/constants.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/docyra';

export const seedDatabase = async (overrideUri = null) => {
  const uri = overrideUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/docyra';
  try {
    console.log(`Connecting to MongoDB: ${uri}...`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
    console.log('Connected to MongoDB. Clearing existing collections...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Clinic.deleteMany({}),
      DoctorProfile.deleteMany({}),
      Specialization.deleteMany({}),
      AvailabilityRule.deleteMany({}),
      AppointmentSlot.deleteMany({}),
      Appointment.deleteMany({}),
      Dependent.deleteMany({}),
      Review.deleteMany({}),
      SystemSettings.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    const passwordHash = await bcrypt.hash('Password@123', 12);

    console.log('Seeding System Settings...');
    await SystemSettings.create({
      defaultSlotDurationMinutes: 30,
      cancellationWindowHours: 24,
      defaultCurrency: 'INR',
      maxAdvanceBookingDays: 60,
      autoApproveReviews: true,
      maintenanceMode: false,
    });

    console.log('Seeding Platform Admin...');
    const admin = await User.create({
      name: 'Platform Admin',
      email: 'admin@docyra.app',
      passwordHash,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: new Date(),
      twoFactorEnabled: false,
    });

    console.log('Seeding Specializations...');
    const specs = await Specialization.create([
      { name: 'Cardiology', description: 'Heart and cardiovascular care', iconName: 'HeartPulse' },
      { name: 'Dermatology', description: 'Skin, hair, and nail health', iconName: 'Sparkles' },
      { name: 'Pediatrics', description: 'Infant, child, and adolescent care', iconName: 'Baby' },
      { name: 'Orthopedics', description: 'Bones, joints, and musculoskeletal care', iconName: 'Activity' },
      { name: 'General Medicine', description: 'Primary healthcare and preventive wellness', iconName: 'Stethoscope' },
      { name: 'Neurology', description: 'Brain and nervous system disorders', iconName: 'Brain' },
    ]);

    console.log('Seeding Clinics...');
    const clinics = await Clinic.create([
      {
        name: 'Apollo City Care Center',
        address: '104 Healthcare Boulevard, Indiranagar',
        city: 'Bengaluru',
        contactEmail: 'contact@apollocity.docyra.app',
        contactPhone: '+91 80 2525 0101',
        subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
        onboardedByAdminId: admin._id,
        description: 'Comprehensive multi-specialty outpatient care with leading consultants.',
      },
      {
        name: 'MetroCare Wellness Polyclinic',
        address: '42 Park View Road, Bandra West',
        city: 'Mumbai',
        contactEmail: 'desk@metrocare.docyra.app',
        contactPhone: '+91 22 2640 0202',
        subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
        onboardedByAdminId: admin._id,
        description: 'Modern family and pediatric clinic equipped with modern diagnostic facilities.',
      },
      {
        name: 'CareFirst Specialty Clinic',
        address: '77 Residency Road',
        city: 'Hyderabad',
        contactEmail: 'support@carefirst.docyra.app',
        contactPhone: '+91 40 2330 0303',
        subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
        onboardedByAdminId: admin._id,
        description: 'Premier orthopedic and sports medicine outpatient center.',
      },
    ]);

    console.log('Seeding Clinic Administrators...');
    await User.create([
      {
        name: 'Apollo Clinic Manager',
        email: 'apollo.admin@docyra.app',
        passwordHash,
        role: ROLES.CLINIC_ADMIN,
        clinicId: clinics[0]._id,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
      },
      {
        name: 'MetroCare Clinic Manager',
        email: 'metrocare.admin@docyra.app',
        passwordHash,
        role: ROLES.CLINIC_ADMIN,
        clinicId: clinics[1]._id,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    ]);

    console.log('Seeding Doctors and Doctor Profiles...');
    const doctorUsers = await User.create([
      {
        name: 'Dr. Sarah Jenkins',
        email: 'sarah.jenkins@docyra.app',
        passwordHash,
        role: ROLES.DOCTOR,
        clinicId: clinics[0]._id,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
      },
      {
        name: 'Dr. Rajesh Kumar',
        email: 'rajesh.kumar@docyra.app',
        passwordHash,
        role: ROLES.DOCTOR,
        clinicId: clinics[1]._id,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
      },
      {
        name: 'Dr. Vikram Patel',
        email: 'vikram.patel@docyra.app',
        passwordHash,
        role: ROLES.DOCTOR,
        clinicId: null, // Independent doctor
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    ]);

    const doctorProfiles = await DoctorProfile.create([
      {
        userId: doctorUsers[0]._id,
        clinicId: clinics[0]._id,
        specializationId: specs[0]._id, // Cardiology
        qualifications: ['MBBS', 'MD (Cardiology)', 'FACC'],
        bio: 'Senior consultant cardiologist with over 14 years of clinical experience in preventive and interventional cardiology.',
        consultationFee: 800,
        feeCurrency: 'INR',
        yearsExperience: 14,
        avgRating: 4.9,
        totalReviews: 28,
        isApproved: true,
      },
      {
        userId: doctorUsers[1]._id,
        clinicId: clinics[1]._id,
        specializationId: specs[2]._id, // Pediatrics
        qualifications: ['MBBS', 'DCH', 'DNB (Pediatrics)'],
        bio: 'Dedicated pediatrician focused on holistic child development, neonatal care, and immunization programs.',
        consultationFee: 600,
        feeCurrency: 'INR',
        yearsExperience: 9,
        avgRating: 4.8,
        totalReviews: 19,
        isApproved: true,
      },
      {
        userId: doctorUsers[2]._id,
        clinicId: null,
        specializationId: specs[4]._id, // General Medicine
        qualifications: ['MBBS', 'MD (General Medicine)'],
        bio: 'Independent physician specializing in adult internal medicine, hypertension management, and lifestyle health.',
        consultationFee: 500,
        feeCurrency: 'INR',
        clinicAddress: 'Suite 201, Green Glen Layout, Bellandur, Bengaluru',
        yearsExperience: 11,
        avgRating: 4.7,
        totalReviews: 15,
        isApproved: true,
      },
    ]);

    console.log('Seeding Patients and Dependents...');
    const patient1 = await User.create({
      name: 'John Doe',
      email: 'patient.john@example.com',
      passwordHash,
      role: ROLES.PATIENT,
      status: USER_STATUS.ACTIVE,
      phone: '+91 9876543210',
      emailVerifiedAt: new Date(),
    });

    await User.create({
      name: 'Priya Sharma',
      email: 'patient.priya@example.com',
      passwordHash,
      role: ROLES.PATIENT,
      status: USER_STATUS.ACTIVE,
      phone: '+91 9876543211',
      emailVerifiedAt: new Date(),
    });

    await Dependent.create({
      patientId: patient1._id,
      name: 'Tommy Doe',
      relationship: 'Child',
      dateOfBirth: new Date('2018-05-15'),
      gender: 'male',
    });

    console.log('Seeding Availability Rules & Initial Slots...');
    for (const docProfile of doctorProfiles) {
      // Monday through Friday availability
      for (let day = 1; day <= 5; day++) {
        const rule = await AvailabilityRule.create({
          doctorId: docProfile._id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30,
          isActive: true,
        });

        // Generate sample slots for day N in the future
        const slotDate = new Date();
        slotDate.setDate(slotDate.getDate() + day);
        slotDate.setHours(9, 0, 0, 0);

        for (let i = 0; i < 4; i++) {
          const slotStart = new Date(slotDate.getTime() + i * 30 * 60 * 1000);
          const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

          await AppointmentSlot.create({
            doctorId: docProfile._id,
            availabilityRuleId: rule._id,
            slotStart,
            slotEnd,
            isBooked: false,
          });
        }
      }
    }

    console.log('Seeding Sample Completed Appointment and Review...');
    const doc1 = doctorProfiles[0];
    const pastSlotStart = new Date();
    pastSlotStart.setDate(pastSlotStart.getDate() - 3);
    pastSlotStart.setHours(10, 0, 0, 0);
    const pastSlotEnd = new Date(pastSlotStart.getTime() + 30 * 60 * 1000);

    const pastSlot = await AppointmentSlot.create({
      doctorId: doc1._id,
      slotStart: pastSlotStart,
      slotEnd: pastSlotEnd,
      isBooked: true,
    });

    const pastAppointment = await Appointment.create({
      patientId: patient1._id,
      bookedForType: 'self',
      bookedForId: patient1._id,
      doctorId: doc1._id,
      clinicId: clinics[0]._id,
      slotId: pastSlot._id,
      slotStart: pastSlotStart,
      slotEnd: pastSlotEnd,
      status: 'completed',
      reasonForVisit: 'Annual cardiovascular checkup and cholesterol review',
    });

    await Review.create({
      appointmentId: pastAppointment._id,
      patientId: patient1._id,
      doctorId: doc1._id,
      rating: 5,
      comment: 'Excellent doctor! Very thorough examination and explained the preventive steps clearly.',
      status: 'published',
    });

    console.log('✅ Seed completed successfully!');
    console.log('--------------------------------------------------');
    console.log('Admin Account:        admin@docyra.app / Password@123');
    console.log('Clinic Admin (Apollo): apollo.admin@docyra.app / Password@123');
    console.log('Doctor (Dr. Sarah):   sarah.jenkins@docyra.app / Password@123');
    console.log('Patient (John):       patient.john@example.com / Password@123');
    console.log('--------------------------------------------------');

    return true;
  } catch (error) {
    console.error('Seed script error:', error);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDatabase;
