import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

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
  Waitlist,
  AuditLog,
  SystemSettings,
} from '../src/models/index.js';

import { seedDatabase } from './seed.js';

const runVerification = async () => {
  console.log('=== PHASE 1 DEFINITION OF DONE VERIFICATION ===');

  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  try {
    // 1. Run Seed Script
    console.log('1. Running seed script...');
    await seedDatabase();

    // Reconnect to verify collections
    await mongoose.connect(uri);

    const counts = {
      users: await User.countDocuments(),
      clinics: await Clinic.countDocuments(),
      doctorProfiles: await DoctorProfile.countDocuments(),
      specializations: await Specialization.countDocuments(),
      availabilityRules: await AvailabilityRule.countDocuments(),
      appointmentSlots: await AppointmentSlot.countDocuments(),
      appointments: await Appointment.countDocuments(),
      dependents: await Dependent.countDocuments(),
      reviews: await Review.countDocuments(),
      systemSettings: await SystemSettings.countDocuments(),
    };

    console.log('2. Seeded collection counts:', counts);
    if (counts.users < 5 || counts.clinics < 2 || counts.appointmentSlots < 10) {
      throw new Error('Seed count verification failed');
    }

    // 2. Verify Unique Compound Index on AppointmentSlot
    console.log('3. Verifying R7.1 Unique Compound Index on AppointmentSlot...');
    await AppointmentSlot.init();

    const sampleSlot = await AppointmentSlot.findOne();
    if (!sampleSlot) throw new Error('No sample slot found');

    let duplicateRejected = false;
    try {
      await AppointmentSlot.create({
        doctorId: sampleSlot.doctorId,
        slotStart: sampleSlot.slotStart,
        slotEnd: sampleSlot.slotEnd,
        isBooked: false,
      });
    } catch (err) {
      if (err.code === 11000) {
        duplicateRejected = true;
      } else {
        throw err;
      }
    }

    if (!duplicateRejected) {
      throw new Error('FAILED: Duplicate slot was NOT rejected by unique compound index!');
    }
    console.log('✅ R7.1 Unique compound index successfully rejected duplicate slot insert.');

    console.log('=== ALL PHASE 1 DEFINITION OF DONE CHECKS PASSED! ===');
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoServer.stop();
  }
};

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 1 Verification Failed:', err);
    process.exit(1);
  });
