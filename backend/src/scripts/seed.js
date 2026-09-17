const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const logger = require('../utils/logger');
const {
  User,
  Clinic,
  DoctorProfile,
  Specialization,
  AvailabilityRule,
  AppointmentSlot,
  Appointment,
  Dependent,
  Review,
  SystemSettings
} = require('../models');
const { ROLES, USER_STATUS, CLINIC_STATUS, APPOINTMENT_STATUS } = require('../config/constants');

const seedData = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to database for seeding...');

    // Clean existing collections
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
      SystemSettings.deleteMany({})
    ]);

    logger.info('Cleared existing collections');

    const passwordHash = await bcrypt.hash('Docyra@123456', 12);

    // 1. System Settings
    const _systemSettings = await SystemSettings.create({
      defaultSlotDurationMinutes: 30,
      cancellationWindowHours: 2,
      defaultCurrency: 'INR',
      waitlistClaimWindowMinutes: 30,
      termsVersion: '1.0'
    });
    logger.info('Created System Settings');

    // 2. Specializations
    const specializations = await Specialization.insertMany([
      { name: 'General Medicine', description: 'Comprehensive primary health care and routine check-ups', icon: 'stethoscope' },
      { name: 'Cardiology', description: 'Heart, blood vessels, and cardiovascular health management', icon: 'heart-pulse' },
      { name: 'Dermatology', description: 'Skin, hair, and nail diagnosis and medical treatments', icon: 'sparkles' },
      { name: 'Orthopedics', description: 'Bones, joints, ligaments, tendons, and muscles', icon: 'bone' },
      { name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents', icon: 'baby' },
      { name: 'Neurology', description: 'Brain, spinal cord, and nervous system disorders', icon: 'brain' }
    ]);
    logger.info(`Seeded ${specializations.length} specializations`);

    const specMap = {};
    specializations.forEach(s => { specMap[s.name] = s._id; });

    // 3. Platform Admin
    const adminUser = await User.create({
      name: 'Platform Admin',
      email: 'admin@docyra.app',
      passwordHash,
      role: ROLES.ADMIN,
      phone: '+91 9876543210',
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: new Date(),
      twoFactorEnabled: false
    });
    logger.info('Created Platform Admin: admin@docyra.app');

    // 4. Clinics
    const clinics = await Clinic.insertMany([
      {
        name: 'Apex Health & Multi-Specialty Clinic',
        address: '102 Marina Bay Avenue, Bandra West',
        city: 'Mumbai',
        contactEmail: 'contact@apexhealth.in',
        contactPhone: '+91 22 2640 1122',
        subscriptionStatus: CLINIC_STATUS.ACTIVE,
        onboardedByAdminId: adminUser._id,
        specializationIds: [specMap['Cardiology'], specMap['Dermatology'], specMap['General Medicine']]
      },
      {
        name: 'Metro Care Healthcare Clinic',
        address: '45 Koramangala 5th Block, 80 Feet Road',
        city: 'Bangalore',
        contactEmail: 'support@metrocare.in',
        contactPhone: '+91 80 4122 3344',
        subscriptionStatus: CLINIC_STATUS.ACTIVE,
        onboardedByAdminId: adminUser._id,
        specializationIds: [specMap['General Medicine'], specMap['Pediatrics'], specMap['Orthopedics']]
      },
      {
        name: 'CityLife Wellness & Family Clinic',
        address: '18 South Extension Part II',
        city: 'New Delhi',
        contactEmail: 'hello@citylifeclinic.com',
        contactPhone: '+91 11 2955 8899',
        subscriptionStatus: CLINIC_STATUS.ACTIVE,
        onboardedByAdminId: adminUser._id,
        specializationIds: [specMap['Dermatology'], specMap['Neurology']]
      }
    ]);
    logger.info(`Seeded ${clinics.length} clinics`);

    // 5. Clinic Admins
    const _clinicAdmin1 = await User.create({
      name: 'Apex Clinic Manager',
      email: 'apex.admin@docyra.app',
      passwordHash,
      role: ROLES.CLINIC_ADMIN,
      clinicId: clinics[0]._id,
      phone: '+91 9820011223',
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: new Date()
    });

    const _clinicAdmin2 = await User.create({
      name: 'Metro Care Manager',
      email: 'metro.admin@docyra.app',
      passwordHash,
      role: ROLES.CLINIC_ADMIN,
      clinicId: clinics[1]._id,
      phone: '+91 9845033445',
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: new Date()
    });
    logger.info('Created 2 Clinic Admins');

    // 6. Doctors (3 Clinic-Affiliated, 1 Independent)
    const doctorUsers = await User.insertMany([
      {
        name: 'Dr. Rajesh Sharma',
        email: 'dr.sharma@docyra.app',
        passwordHash,
        role: ROLES.DOCTOR,
        clinicId: clinics[0]._id,
        phone: '+91 9811122233',
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date()
      },
      {
        name: 'Dr. Priya Patel',
        email: 'dr.patel@docyra.app',
        passwordHash,
        role: ROLES.DOCTOR,
        clinicId: clinics[0]._id,
        phone: '+91 9822233344',
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date()
      },
      {
        name: 'Dr. Vikram Verma',
        email: 'dr.verma@docyra.app',
        passwordHash,
        role: ROLES.DOCTOR,
        clinicId: clinics[1]._id,
        phone: '+91 9833344455',
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date()
      },
      {
        name: 'Dr. Ananya Sen',
        email: 'dr.sen@docyra.app',
        passwordHash,
        role: ROLES.DOCTOR,
        clinicId: null, // Independent
        phone: '+91 9844455566',
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date()
      }
    ]);

    // Doctor Profiles
    await DoctorProfile.create([
      {
        userId: doctorUsers[0]._id,
        clinicId: clinics[0]._id,
        specializationId: specMap['Cardiology'],
        qualifications: ['MBBS', 'MD (Cardiology)', 'FACC'],
        bio: 'Senior Consultant Cardiologist with 15+ years experience in preventive cardiology and heart health.',
        consultationFee: 800,
        feeCurrency: 'INR',
        yearsExperience: 15,
        avgRating: 4.9,
        totalReviews: 24,
        isApproved: true
      },
      {
        userId: doctorUsers[1]._id,
        clinicId: clinics[0]._id,
        specializationId: specMap['Dermatology'],
        qualifications: ['MBBS', 'MD (Dermatology)'],
        bio: 'Dermatologist and Aesthetic Specialist focusing on clinical skin health, acne management, and allergies.',
        consultationFee: 600,
        feeCurrency: 'INR',
        yearsExperience: 10,
        avgRating: 4.8,
        totalReviews: 18,
        isApproved: true
      },
      {
        userId: doctorUsers[2]._id,
        clinicId: clinics[1]._id,
        specializationId: specMap['General Medicine'],
        qualifications: ['MBBS', 'DNB (Family Medicine)'],
        bio: 'Dedicated primary care physician skilled in chronic disease management and preventive healthcare.',
        consultationFee: 500,
        feeCurrency: 'INR',
        yearsExperience: 8,
        avgRating: 4.7,
        totalReviews: 32,
        isApproved: true
      },
      {
        userId: doctorUsers[3]._id,
        clinicId: null,
        specializationId: specMap['Neurology'],
        qualifications: ['MBBS', 'DM (Neurology)'],
        bio: 'Independent Consultant Neurologist specializing in migraine, neuropathy, and movement disorders.',
        consultationFee: 1200,
        feeCurrency: 'INR',
        clinicAddress: 'Sen Neurological Clinic, Suite 402, Park Street, Kolkata',
        yearsExperience: 12,
        avgRating: 4.9,
        totalReviews: 15,
        isApproved: true
      }
    ]);
    logger.info(`Seeded ${doctorUsers.length} doctor profiles`);

    // 7. Availability Rules & Slots
    const availabilityRules = [];
    const generatedSlots = [];

    // Setup Monday to Friday availability for each doctor (9 AM - 1 PM)
    for (const doc of doctorUsers) {
      for (let day = 1; day <= 5; day++) {
        availabilityRules.push({
          doctorId: doc._id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '13:00',
          slotDurationMinutes: 30,
          isActive: true
        });
      }
    }
    const _insertedRules = await AvailabilityRule.insertMany(availabilityRules);

    // Generate slots for next 3 days
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const slotDate = new Date();
      slotDate.setDate(now.getDate() + dayOffset);
      const dayOfWeek = slotDate.getDay();

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        for (const doc of doctorUsers) {
          // Generate 4 slots per day (09:00, 09:30, 10:00, 10:30)
          for (let hour = 9; hour < 11; hour++) {
            for (let min = 0; min < 60; min += 30) {
              const start = new Date(slotDate);
              start.setHours(hour, min, 0, 0);
              const end = new Date(slotDate);
              end.setHours(hour, min + 30, 0, 0);

              generatedSlots.push({
                doctorId: doc._id,
                slotStart: start,
                slotEnd: end,
                isBooked: false
              });
            }
          }
        }
      }
    }
    const insertedSlots = await AppointmentSlot.insertMany(generatedSlots);
    logger.info(`Generated ${insertedSlots.length} appointment slots across doctors`);

    // 8. Patients & Dependents
    const patient1 = await User.create({
      name: 'John Doe',
      email: 'patient.john@docyra.app',
      passwordHash,
      role: ROLES.PATIENT,
      phone: '+91 9988776655',
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: new Date()
    });

    const _dependent1 = await Dependent.create({
      patientId: patient1._id,
      name: 'Emma Doe',
      relationship: 'Daughter',
      dateOfBirth: new Date('2018-05-15')
    });
    logger.info('Created test patient John Doe and dependent Emma Doe');

    // 9. Book one test appointment
    const bookedSlot = insertedSlots[0];
    bookedSlot.isBooked = true;
    await bookedSlot.save();

    const sampleAppointment = await Appointment.create({
      patientId: patient1._id,
      bookedForType: 'self',
      bookedForId: patient1._id,
      bookedForModel: 'User',
      doctorId: bookedSlot.doctorId,
      clinicId: clinics[0]._id,
      slotId: bookedSlot._id,
      slotStart: bookedSlot.slotStart,
      slotEnd: bookedSlot.slotEnd,
      status: APPOINTMENT_STATUS.CONFIRMED,
      reasonForVisit: 'Routine cardiovascular checkup and consultation.'
    });

    logger.info(`Sample confirmed appointment booked: ID ${sampleAppointment._id}`);
    logger.info('✅ Database seeding complete successfully!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error(`❌ Seeding error: ${err.message}`, err);
    process.exit(1);
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
